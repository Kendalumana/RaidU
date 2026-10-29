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

    def test_solo_publicado_al_crear(self):
        for estado in ['lleno', 'en_curso', 'finalizado', 'cancelado']:
            with self.subTest(estado=estado):
                self.assertEqual(self.crear(estado=estado).status_code, 400)
        respuesta = self.crear(cupos_disponibles=0)
        self.assertEqual(respuesta.status_code, 201)
        self.assertEqual(respuesta.data['estado'], 'publicado')
        self.assertEqual(respuesta.data['cupos_disponibles'], 4)

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
