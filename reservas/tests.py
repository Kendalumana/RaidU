from datetime import timedelta
from concurrent.futures import ThreadPoolExecutor
from decimal import Decimal
from threading import Barrier

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.db import IntegrityError, close_old_connections, transaction
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient, APITestCase, APITransactionTestCase

from vehiculos.models import Vehiculo
from viajes.models import Viaje


class ReservasAPITests(APITestCase):
    def setUp(self):
        Usuario = get_user_model()
        self.conductor = Usuario.objects.create_user(username='conductor')
        self.pasajero = Usuario.objects.create_user(username='pasajero')
        self.otro = Usuario.objects.create_user(username='otro')
        self.admin = Usuario.objects.create_user(username='admin', is_staff=True)
        self.soporte = Usuario.objects.create_user(username='soporte')
        self.soporte.groups.add(Group.objects.create(name='Soporte'))
        vehiculo = Vehiculo.objects.create(
            propietario=self.conductor, placa='RES101', marca='Toyota',
            modelo='Yaris', capacidad=4,
        )
        self.viaje = Viaje.objects.create(
            conductor=self.conductor, vehiculo=vehiculo,
            sede_origen='puntarenas', sede_destino='esparza',
            fecha_hora=timezone.now() + timedelta(days=1),
            cupos_totales=4, cupos_disponibles=4, costo_total='6000.00',
        )
        self.client.force_authenticate(self.pasajero)

    def reservar(self, cupos=1, **datos):
        return self.client.post('/api/reservas/',
                                dict(viaje=self.viaje.pk, cupos=cupos, **datos),
                                format='json')

    def test_crear_toma_pasajero_del_token_y_calcula_monto(self):
        respuesta = self.reservar(2, pasajero=self.otro.pk, monto_simulado='0.01')
        self.assertEqual(respuesta.status_code, 201)
        self.assertEqual(respuesta.data['pasajero'], self.pasajero.pk)
        self.assertEqual(respuesta.data['monto_simulado'], '6000.00')
        self.viaje.refresh_from_db()
        self.assertEqual(self.viaje.cupos_disponibles, 2)

    def test_recalcula_por_cupos_y_cancela_una_sola_vez(self):
        primera = self.reservar(1)
        self.assertEqual(primera.status_code, 201)
        self.client.force_authenticate(self.otro)
        segunda = self.reservar(3)
        self.assertEqual(segunda.status_code, 201)
        self.assertEqual(segunda.data['monto_simulado'], '4500.00')
        self.viaje.refresh_from_db()
        self.assertEqual((self.viaje.estado, self.viaje.cupos_disponibles), ('lleno', 0))
        url = f"/api/reservas/{segunda.data['id']}/"
        for _ in range(2):
            self.assertEqual(self.client.delete(url).status_code, 204)
        self.viaje.refresh_from_db()
        self.assertEqual((self.viaje.estado, self.viaje.cupos_disponibles), ('publicado', 3))
        self.client.force_authenticate(self.pasajero)
        detalle = self.client.get(f"/api/reservas/{primera.data['id']}/")
        self.assertEqual(detalle.data['monto_simulado'], '6000.00')

    def test_duplicado_sin_cupos_y_conductor(self):
        self.assertEqual(self.reservar(3).status_code, 201)
        self.assertEqual(self.reservar().status_code, 409)
        self.client.force_authenticate(self.otro)
        self.assertEqual(self.reservar(2).status_code, 409)
        self.client.force_authenticate(self.conductor)
        self.assertEqual(self.reservar().status_code, 400)

    def test_viajes_no_reservables_y_cupos_invalidos(self):
        for cupos in [0, -1, 'abc', 1.5]:
            with self.subTest(cupos=cupos):
                self.assertEqual(self.reservar(cupos).status_code, 400)
        for estado in ['en_curso', 'finalizado', 'cancelado']:
            self.viaje.estado = estado
            self.viaje.save()
            self.assertEqual(self.reservar().status_code, 400)
        self.viaje.estado = 'publicado'
        self.viaje.fecha_hora = timezone.now() - timedelta(hours=1)
        self.viaje.save()
        self.assertEqual(self.reservar().status_code, 400)

    def test_permisos_y_filtros(self):
        reserva = self.reservar()
        self.assertEqual(reserva.status_code, 201)
        url = f"/api/reservas/{reserva.data['id']}/"
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get('/api/reservas/').status_code, 401)
        self.client.force_authenticate(self.otro)
        self.assertEqual(self.client.get('/api/reservas/').data['total_registros'], 0)
        self.assertEqual(self.client.get(url).status_code, 403)
        self.assertEqual(self.client.patch(url, {'cupos': 2}).status_code, 403)
        self.client.force_authenticate(self.soporte)
        self.assertEqual(self.client.get(url).status_code, 200)
        self.assertEqual(self.client.patch(url, {'cupos': 2}).status_code, 403)
        self.assertEqual(self.reservar().status_code, 403)
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.patch(url, {'cupos': 2}).status_code, 200)
        filtros = f'?viaje={self.viaje.pk}&estado=confirmada&pasajero={self.pasajero.pk}'
        self.assertEqual(self.client.get('/api/reservas/' + filtros).data['total_registros'], 1)
        self.assertEqual(self.client.get('/api/reservas/?viaje=abc').status_code, 400)
        self.assertEqual(self.client.get('/api/reservas/99999/').status_code, 404)

    def test_patch_cupos_cancelacion_y_campos_inmutables(self):
        reserva = self.reservar(2)
        self.assertEqual(reserva.status_code, 201)
        url = f"/api/reservas/{reserva.data['id']}/"
        self.assertEqual(self.client.patch(url, {'cupos': 5}).status_code, 409)
        self.assertEqual(self.client.patch(url, {'cupos': 3}).status_code, 200)
        self.assertEqual(self.client.patch(url, {'viaje': 9999}).status_code, 400)
        self.assertEqual(self.client.patch(url, {'pasajero': self.otro.pk}).status_code, 400)
        self.assertEqual(self.client.patch(url, {'estado': 'cancelada'}).status_code, 200)
        self.assertEqual(self.client.patch(url, {'estado': 'confirmada'}).status_code, 400)
        self.assertEqual(self.reservar().status_code, 409)

    def test_integracion_viajes_protege_cupos_costo_y_borrado(self):
        self.assertEqual(self.reservar(3).status_code, 201)
        self.client.force_authenticate(self.conductor)
        url = f'/api/viajes/{self.viaje.pk}/'
        self.assertEqual(self.client.patch(url, {'cupos_totales': 2}).status_code, 400)
        respuesta = self.client.patch(url, {'cupos_totales': 4, 'costo_total': '9000.00'})
        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.data['cupos_disponibles'], 1)
        self.assertEqual(self.client.delete(url).status_code, 409)
        self.client.force_authenticate(self.pasajero)
        self.assertEqual(self.client.get('/api/reservas/').data['resultados'][0]['monto_simulado'], '9000.00')

    def test_cancelar_viaje_cancela_reservas_y_calificar_exige_participacion(self):
        self.assertEqual(self.reservar().status_code, 201)
        self.viaje.estado = 'finalizado'
        self.viaje.save()
        datos = dict(viaje=self.viaje.pk, calificado=self.conductor.pk, puntaje=5)
        self.assertEqual(self.client.post('/api/calificaciones/', datos).status_code, 201)
        self.client.force_authenticate(self.otro)
        self.assertEqual(self.client.post('/api/calificaciones/', datos).status_code, 400)
        self.viaje.estado = 'publicado'
        self.viaje.save()
        self.client.force_authenticate(self.conductor)
        self.assertEqual(self.client.patch(f'/api/viajes/{self.viaje.pk}/', {'estado': 'cancelado'}).status_code, 200)
        self.client.force_authenticate(self.pasajero)
        self.assertEqual(self.client.get('/api/reservas/').data['resultados'][0]['estado'], 'cancelada')

    def test_paginacion_diez_y_filtros_combinados(self):
        from .models import Reserva
        usuarios = [get_user_model().objects.create_user(username=f'pag{i}') for i in range(11)]
        Reserva.objects.bulk_create([Reserva(viaje=self.viaje, pasajero=u, cupos=1, estado='cancelada') for u in usuarios])
        self.client.force_authenticate(self.admin)
        pagina = self.client.get('/api/reservas/?estado=cancelada')
        self.assertEqual(pagina.data['total_registros'], 11)
        self.assertEqual(len(pagina.data['resultados']), 10)
        pagina = self.client.get('/api/reservas/?estado=cancelada&page=2')
        self.assertEqual(len(pagina.data['resultados']), 1)
        filtros = f'?viaje={self.viaje.pk}&pasajero={usuarios[0].pk}&estado=confirmada'
        self.assertEqual(self.client.get('/api/reservas/' + filtros).data['total_registros'], 0)

    def test_montos_con_redondeo_suman_costo_exacto(self):
        from .models import Reserva
        self.viaje.costo_total = Decimal('100.00')
        self.viaje.save()
        for usuario in [self.pasajero, self.otro, self.admin]:
            self.client.force_authenticate(usuario)
            self.assertEqual(self.reservar().status_code, 201)
        montos = list(Reserva.objects.order_by('id').values_list('monto_simulado', flat=True))
        self.assertEqual(montos, [Decimal('33.33'), Decimal('33.33'), Decimal('33.34')])

    def test_restricciones_base_de_datos(self):
        from .models import Reserva
        datos = dict(viaje=self.viaje, pasajero=self.pasajero, cupos=1)
        for cambio in [dict(cupos=0), dict(estado='otro'), dict(monto_simulado=-1)]:
            with self.subTest(cambio=cambio), self.assertRaises(IntegrityError), transaction.atomic():
                Reserva.objects.create(**(datos | cambio))
        Reserva.objects.create(**datos)
        with self.assertRaises(IntegrityError), transaction.atomic():
            Reserva.objects.create(**datos)

    def test_token_real_y_reserva_despues_del_inicio(self):
        token = Token.objects.create(user=self.pasajero)
        self.client.force_authenticate(None)
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + token.key)
        reserva = self.reservar()
        self.assertEqual(reserva.status_code, 201)
        url = f"/api/reservas/{reserva.data['id']}/"
        self.viaje.estado = 'en_curso'
        self.viaje.save()
        self.assertEqual(self.client.delete(url).status_code, 400)
        self.assertEqual(self.client.patch(url, {'cupos': 2}).status_code, 400)

    def test_put_y_calificacion_con_pasajero_cancelado(self):
        reserva = self.reservar()
        self.assertEqual(reserva.status_code, 201)
        url = f"/api/reservas/{reserva.data['id']}/"
        self.assertEqual(self.client.put(url, {'viaje': self.viaje.pk, 'cupos': 2}).status_code, 200)
        self.assertEqual(self.client.delete(url).status_code, 204)
        self.viaje.estado = 'finalizado'
        self.viaje.save()
        self.client.force_authenticate(self.conductor)
        datos = dict(viaje=self.viaje.pk, calificado=self.pasajero.pk, puntaje=4)
        self.assertEqual(self.client.post('/api/calificaciones/', datos).status_code, 400)


class ReservasConcurrenciaTests(APITransactionTestCase):
    setUp = ReservasAPITests.setUp

    def simultaneas(self, usuarios, metodo='post', url='/api/reservas/'):
        barrera = Barrier(2)

        def enviar(usuario):
            close_old_connections()
            try:
                cliente = APIClient()
                cliente.force_authenticate(usuario)
                barrera.wait(timeout=10)
                respuesta = getattr(cliente, metodo)(url, {'viaje': self.viaje.pk, 'cupos': 1}, format='json')
                return respuesta.status_code
            finally:
                close_old_connections()

        with ThreadPoolExecutor(max_workers=2) as pool:
            return sorted(pool.map(enviar, usuarios))

    def test_dos_pasajeros_compiten_por_ultimo_cupo_mysql(self):
        self.viaje.cupos_totales = self.viaje.cupos_disponibles = 1
        self.viaje.save()
        self.assertEqual(self.simultaneas([self.pasajero, self.otro]), [201, 409])
        self.viaje.refresh_from_db()
        self.assertEqual(self.viaje.cupos_disponibles, 0)
        self.assertEqual(self.viaje.reservas.filter(estado='confirmada').count(), 1)

    def test_duplicado_y_doble_cancelacion_simultanea_mysql(self):
        self.assertEqual(self.simultaneas([self.pasajero, self.pasajero]), [201, 409])
        reserva = self.viaje.reservas.get()
        self.assertEqual(self.simultaneas([self.pasajero, self.pasajero], 'delete', f'/api/reservas/{reserva.pk}/'), [204, 204])
        self.viaje.refresh_from_db()
        self.assertEqual(self.viaje.cupos_disponibles, 4)
