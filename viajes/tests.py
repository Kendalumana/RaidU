from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import DataError, IntegrityError, transaction
from django.db.models.deletion import ProtectedError
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APITestCase

from vehiculos.models import Vehiculo
from .models import Viaje

class ModelosViajesTests(TestCase):
    def setUp(self):
        self.conductor = get_user_model().objects.create_user(username='conductor')
        self.otro = get_user_model().objects.create_user(username='otro')
        self.vehiculo = Vehiculo.objects.create(
            propietario=self.conductor, placa='VIA101', marca='Toyota',
            modelo='Yaris', capacidad=4,
        )

    def viaje(self, **cambios):
        datos = dict(conductor=self.conductor, vehiculo=self.vehiculo,
                     sede_origen=Viaje.Sede.PUNTARENAS, sede_destino=Viaje.Sede.ESPARZA,
                     fecha_hora=timezone.now() + timedelta(days=1),
                     cupos_totales=4, cupos_disponibles=4,
                     costo_total=Decimal('6000.00'))
        datos.update(cambios)
        return Viaje(**datos)

    def test_crea_viaje_publicado(self):
        viaje = self.viaje()
        viaje.full_clean()
        viaje.save()
        self.assertEqual(Viaje.objects.get(pk=viaje.pk).estado, 'publicado')

    def test_restricciones_en_base_de_datos(self):
        for cambios in [dict(sede_destino=Viaje.Sede.PUNTARENAS), dict(cupos_totales=0),
                        dict(cupos_disponibles=5),
                        dict(costo_total=0), dict(estado='invalido')]:
            with self.subTest(cambios=cambios):
                with self.assertRaises(IntegrityError), transaction.atomic():
                    self.viaje(**cambios).save()

    def test_protege_relaciones_del_viaje(self):
        self.viaje().save()
        for objeto in [self.conductor, self.vehiculo]:
            with self.subTest(modelo=type(objeto).__name__):
                with self.assertRaises(ProtectedError):
                    objeto.delete()

    def test_mysql_rechaza_cupos_negativos(self):
        with self.assertRaises(DataError), transaction.atomic():
            self.viaje(cupos_disponibles=-1).save()

    def test_fecha_historica_sin_cambios_no_impide_validar(self):
        viaje = self.viaje()
        viaje.save()
        Viaje.objects.filter(pk=viaje.pk).update(fecha_hora=timezone.now()-timedelta(days=1))
        viaje.refresh_from_db()
        viaje.estado = Viaje.Estado.FINALIZADO
        viaje.full_clean()

    def test_cuatro_sedes_y_detalles_opcionales(self):
        self.assertEqual(set(Viaje.Sede.values), {'rodrigo_facio', 'san_ramon', 'esparza', 'puntarenas'})
        viaje = self.viaje()
        viaje.full_clean()
        viaje.save()
        self.assertEqual(viaje.lugar_origen, '')
        self.assertEqual(viaje.lugar_destino, '')
        viaje.lugar_origen = 'Entrada principal'
        viaje.lugar_destino = 'Parada del recinto'
        viaje.save()
        viaje.refresh_from_db()
        self.assertEqual(viaje.lugar_destino, 'Parada del recinto')


class ViajesAPITests(APITestCase):
    def setUp(self):
        self.usuario = get_user_model().objects.create_user(username='api_conductor')
        self.otro = get_user_model().objects.create_user(username='api_otro')
        self.vehiculo = Vehiculo.objects.create(propietario=self.usuario, placa='API101', marca='Toyota', modelo='Yaris', capacidad=4)
        self.datos = dict(vehiculo=self.vehiculo.pk, sede_origen='puntarenas', sede_destino='esparza',
                          fecha_hora=(timezone.now()+timedelta(days=1)).isoformat(), cupos_totales=4, costo_total='6000.00')
        self.client.force_authenticate(self.usuario)

    def crear(self, **cambios):
        return self.client.post('/api/viajes/', self.datos | cambios, format='json')

    def test_participantes_solo_para_integrantes_de_viaje_finalizado(self):
        from reservas.models import Reserva

        self.usuario.first_name = 'Ana'
        self.usuario.email = 'ana@ucr.ac.cr'
        self.usuario.save()
        self.otro.first_name = 'Luis'
        self.otro.email = 'luis@ucr.ac.cr'
        self.otro.save()
        creado = self.crear()
        viaje = Viaje.objects.get(pk=creado.data['id'])
        reserva = Reserva.objects.create(viaje=viaje, pasajero=self.otro, cupos=1)
        url = f'/api/viajes/{viaje.pk}/participantes/'
        self.assertEqual(self.client.get(url).status_code, 400)
        viaje.estado = Viaje.Estado.FINALIZADO
        viaje.save(update_fields=['estado'])
        self.assertEqual(self.client.get(url).data['participantes'], [
            {'id': self.otro.pk, 'nombre': 'Luis', 'correo': 'luis@ucr.ac.cr', 'rol': 'pasajero'},
        ])
        self.client.force_authenticate(self.otro)
        self.assertEqual(self.client.get(url).data['participantes'], [
            {'id': self.usuario.pk, 'nombre': 'Ana', 'correo': 'ana@ucr.ac.cr', 'rol': 'conductor'},
        ])
        reserva.estado = Reserva.Estado.CANCELADA
        reserva.save(update_fields=['estado'])
        self.assertEqual(self.client.get(url).status_code, 403)
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(url).status_code, 401)

    def test_catalogo_disponible_y_mis_viajes(self):
        disponible = self.crear().data['id']
        for cambios in [{'estado': 'finalizado'}, {'estado': 'cancelado'}, {'estado': 'en_curso'},
                        {'cupos_disponibles': 0}, {'fecha_hora': timezone.now() - timedelta(minutes=1)}]:
            viaje = self.crear().data['id']
            Viaje.objects.filter(pk=viaje).update(**cambios)
        catalogo = self.client.get('/api/viajes/', {'disponibles': 'true'}).data
        self.assertEqual([v['id'] for v in catalogo['resultados']], [disponible])
        self.assertEqual(self.client.get('/api/viajes/mis-viajes/').data['total_registros'], 6)

    def test_solo_publicado_al_crear(self):
        for estado in ['lleno', 'en_curso', 'finalizado', 'cancelado']:
            with self.subTest(estado=estado):
                self.assertEqual(self.crear(estado=estado).status_code, 400)
        respuesta = self.crear(cupos_disponibles=0)
        self.assertEqual(respuesta.status_code, 201)
        self.assertEqual(respuesta.data['estado'], 'publicado')
        self.assertEqual(respuesta.data['cupos_disponibles'], 4)

    def test_nombre_opcional_se_guarda_y_actualiza(self):
        respuesta = self.crear(nombre='Viaje a la U')
        self.assertEqual(respuesta.status_code, 201)
        url = f"/api/viajes/{respuesta.data['id']}/"
        self.assertEqual(self.client.get(url).data['nombre'], 'Viaje a la U')
        self.assertEqual(self.client.patch(url, {'nombre': 'Regreso'}, format='json').data['nombre'], 'Regreso')
        self.assertEqual(self.crear().data['nombre'], '')

    def test_filtros_invalidos_responden_400(self):
        self.client.raise_request_exception = False
        for query in ['cupos_minimos=abc', 'cupos_minimos=-1', 'cupos_minimos=1.5', 'cupos_minimos='+'9'*30,
                      'fecha=ayer', 'fecha=2026-02-30', 'estado=otro', 'sede_origen=otra', 'ordering=otro']:
            with self.subTest(query=query):
                self.assertEqual(self.client.get('/api/viajes/?'+query).status_code, 400)

    def test_filtros_orden_y_paginacion(self):
        for i in range(11):
            self.assertEqual(self.crear(costo_total=str(100+i)).status_code, 201)
        respuesta = self.client.get('/api/viajes/?sede_origen=puntarenas&sede_destino=esparza&cupos_minimos=0&ordering=-costo_total')
        self.assertEqual(respuesta.data['total_registros'], 11)
        self.assertEqual(len(respuesta.data['resultados']), 10)
        self.assertEqual(respuesta.data['resultados'][0]['costo_total'], '110.00')
        self.assertEqual(len(self.client.get('/api/viajes/?page=2').data['resultados']), 1)
        self.assertEqual(self.client.get('/api/viajes/?sede_origen=esparza').data['total_registros'], 0)

    def test_validaciones_creacion_y_patch(self):
        for cambios in [dict(cupos_totales=0), dict(cupos_totales=5), dict(costo_total=0), dict(sede_destino='puntarenas'),
                        dict(vehiculo='abc'), dict(fecha_hora=(timezone.now()-timedelta(days=1)).isoformat())]:
            with self.subTest(cambios=cambios):
                self.assertEqual(self.crear(**cambios).status_code, 400)
        viaje = self.crear()
        url = f"/api/viajes/{viaje.data['id']}/"
        self.assertEqual(self.client.patch(url, {'cupos_totales': 5}).status_code, 400)
        self.assertEqual(self.client.patch(url, {'estado': 'finalizado'}).status_code, 400)
        self.assertEqual(self.client.patch(url, {'estado': 'en_curso'}).status_code, 200)
        self.assertEqual(self.client.patch(url, {'estado': 'finalizado'}).status_code, 200)
        self.assertEqual(self.client.patch(url, {'lugar_destino': 'Otro'}).status_code, 400)

    def test_permisos_y_borrado(self):
        viaje = self.crear()
        url = f"/api/viajes/{viaje.data['id']}/"
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(url).status_code, 401)
        self.client.force_authenticate(self.otro)
        self.assertEqual(self.client.patch(url, {'costo_total': '5000.00'}).status_code, 403)
        self.assertEqual(self.crear().status_code, 400)
        self.client.force_authenticate(self.usuario)
        self.assertEqual(self.client.delete(url).status_code, 204)
        self.assertEqual(self.client.get(url).status_code, 404)

    def test_rechaza_estado_incompatible_con_cupos(self):
        respuesta = self.crear()
        url = f"/api/viajes/{respuesta.data['id']}/"
        self.assertEqual(self.client.patch(url, {'estado': 'lleno'}).status_code, 400)
        self.client.force_authenticate(self.otro)
        self.assertEqual(self.client.post('/api/reservas/', {
            'viaje': respuesta.data['id'], 'cupos': 4,
        }).status_code, 201)
        self.client.force_authenticate(self.usuario)
        self.assertEqual(self.client.patch(url, {'estado': 'publicado'}).status_code, 400)

    def test_no_borra_viaje_con_reserva_confirmada(self):
        respuesta = self.crear()
        self.client.force_authenticate(self.otro)
        self.assertEqual(self.client.post('/api/reservas/', {
            'viaje': respuesta.data['id'], 'cupos': 1,
        }).status_code, 201)
        self.client.force_authenticate(self.usuario)
        self.assertEqual(self.client.delete(f"/api/viajes/{respuesta.data['id']}/").status_code, 409)
        self.assertTrue(Viaje.objects.filter(pk=respuesta.data['id']).exists())

    def test_cambiar_capacidad_actualiza_estado_y_conserva_ocupados(self):
        respuesta = self.crear()
        url = f"/api/viajes/{respuesta.data['id']}/"
        self.client.force_authenticate(self.otro)
        self.assertEqual(self.client.post('/api/reservas/', {
            'viaje': respuesta.data['id'], 'cupos': 2,
        }).status_code, 201)
        self.client.force_authenticate(self.usuario)
        self.assertEqual(self.client.patch(url, {'cupos_totales': 1}).status_code, 400)
        for capacidad, disponibles, estado in [(2, 0, 'lleno'), (4, 2, 'publicado')]:
            with self.subTest(capacidad=capacidad):
                cambio = self.client.patch(url, {'cupos_totales': capacidad})
                self.assertEqual(cambio.status_code, 200)
                self.assertEqual(cambio.data['cupos_disponibles'], disponibles)
                self.assertEqual(cambio.data['estado'], estado)
                viaje = Viaje.objects.get(pk=respuesta.data['id'])
                self.assertEqual(viaje.estado, estado)
                self.assertEqual(viaje.cupos_disponibles, disponibles)

    def test_mis_viajes_participante(self):
        self.otro.email = 'conductor@ucr.ac.cr'
        self.otro.save(update_fields=['email'])
        resp1 = self.crear(costo_total='1500.00')
        viaje1_id = resp1.data['id']

        vehiculo_otro = Vehiculo.objects.create(
            propietario=self.otro, placa='OTR202', marca='Nissan', modelo='Sentra', capacidad=4
        )
        self.client.force_authenticate(self.otro)
        resp2 = self.client.post('/api/viajes/', {
            'vehiculo': vehiculo_otro.pk,
            'sede_origen': 'san_ramon',
            'sede_destino': 'rodrigo_facio',
            'fecha_hora': (timezone.now() + timedelta(days=2)).isoformat(),
            'cupos_totales': 3,
            'costo_total': '3000.00',
        }, format='json')
        viaje2_id = resp2.data['id']

        resp3 = self.client.post('/api/viajes/', {
            'vehiculo': vehiculo_otro.pk,
            'sede_origen': 'esparza',
            'sede_destino': 'puntarenas',
            'fecha_hora': (timezone.now() + timedelta(days=3)).isoformat(),
            'cupos_totales': 2,
            'costo_total': '2000.00',
        }, format='json')
        viaje3_id = resp3.data['id']

        self.client.force_authenticate(self.usuario)
        self.client.post('/api/reservas/', {
            'viaje': viaje2_id,
            'cupos': 1,
        }, format='json')

        res_mis = self.client.get('/api/viajes/mis-viajes/')
        self.assertEqual(res_mis.status_code, 200)
        ids_mis = [v['id'] for v in res_mis.data['resultados']]
        self.assertIn(viaje1_id, ids_mis)
        self.assertIn(viaje2_id, ids_mis)
        self.assertNotIn(viaje3_id, ids_mis)
        reservables = self.client.get('/api/viajes/', {'reservables': 'true'})
        self.assertEqual([v['id'] for v in reservables.data['resultados']], [viaje3_id])

        reservado = next(v for v in res_mis.data['resultados'] if v['id'] == viaje2_id)
        self.assertEqual(reservado['conductor_correo'], self.otro.email)
        self.assertEqual(reservado['vehiculo_placa'], vehiculo_otro.placa)
        self.assertEqual(len(ids_mis), len(set(ids_mis)))

        res_param = self.client.get('/api/viajes/?mis_viajes=true')
        self.assertEqual(res_param.status_code, 200)
        ids_param = [v['id'] for v in res_param.data['resultados']]
        self.assertEqual(ids_mis, ids_param)

        res_todos = self.client.get('/api/viajes/')
        ids_todos = [v['id'] for v in res_todos.data['resultados']]
        self.assertIn(viaje1_id, ids_todos)
        self.assertIn(viaje2_id, ids_todos)
        self.assertIn(viaje3_id, ids_todos)
