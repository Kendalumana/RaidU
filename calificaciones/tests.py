from datetime import timedelta

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.utils import timezone
from rest_framework.test import APITestCase

from reservas.models import Reserva
from vehiculos.models import Vehiculo
from viajes.models import Viaje
from .models import Calificacion


class CalificacionesAPITests(APITestCase):
    def setUp(self):
        Usuario = get_user_model()
        self.conductor = Usuario.objects.create_user(username='cal_conductor')
        self.pasajero = Usuario.objects.create_user(username='cal_pasajero')
        self.otro = Usuario.objects.create_user(username='cal_otro')
        self.admin = Usuario.objects.create_user(username='cal_admin', is_staff=True)
        self.soporte = Usuario.objects.create_user(username='cal_soporte')
        self.soporte.groups.add(Group.objects.create(name='Soporte'))
        vehiculo = Vehiculo.objects.create(propietario=self.conductor, placa='CAL101', marca='Toyota', modelo='Yaris', capacidad=4)
        self.viaje = Viaje.objects.create(conductor=self.conductor, vehiculo=vehiculo, sede_origen='puntarenas', sede_destino='esparza',
                                          fecha_hora=timezone.now()-timedelta(days=1), cupos_totales=4, cupos_disponibles=3,
                                          costo_total='6000.00', estado='finalizado')
        self.reserva = Reserva.objects.create(viaje=self.viaje, pasajero=self.pasajero, cupos=1)
        self.client.force_authenticate(self.pasajero)

    def calificar(self, **cambios):
        datos = dict(viaje=self.viaje.pk, calificado=self.conductor.pk, puntaje=5)
        return self.client.post('/api/calificaciones/', datos | cambios, format='json')

    def test_creacion_duplicado_y_promedio(self):
        respuesta = self.calificar(calificador=self.otro.pk)
        self.assertEqual(respuesta.status_code, 201)
        self.assertEqual(respuesta.data['calificador'], self.pasajero.pk)
        self.assertEqual(self.calificar().status_code, 400)
        promedio = self.client.get(f'/api/calificaciones/promedio/{self.conductor.pk}/')
        self.assertEqual(promedio.data['promedio'], 5)
        self.assertEqual(promedio.data['total_calificaciones'], 1)
        self.assertIsNone(self.client.get(f'/api/calificaciones/promedio/{self.otro.pk}/').data['promedio'])
        self.assertEqual(self.client.get('/api/calificaciones/promedio/999999/').status_code, 404)

    def test_puntajes_autocalificacion_y_participacion(self):
        for puntaje in [0, 6, -1, 'abc', 1.5]:
            with self.subTest(puntaje=puntaje):
                self.assertEqual(self.calificar(puntaje=puntaje).status_code, 400)
        self.assertEqual(self.calificar(calificado=self.pasajero.pk).status_code, 400)
        self.assertEqual(self.calificar(calificado=self.otro.pk).status_code, 400)
        self.client.force_authenticate(self.otro)
        self.assertEqual(self.calificar().status_code, 400)
        self.client.force_authenticate(self.pasajero)
        self.reserva.estado = 'cancelada'
        self.reserva.save()
        self.assertEqual(self.calificar().status_code, 400)

    def test_solo_viajes_finalizados(self):
        for estado in ['publicado', 'lleno', 'en_curso', 'cancelado']:
            self.viaje.estado = estado
            self.viaje.save()
            self.assertEqual(self.calificar().status_code, 400)

    def test_permisos_edicion_y_borrado(self):
        respuesta = self.calificar()
        url = f"/api/calificaciones/{respuesta.data['id']}/"
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(url).status_code, 401)
        for usuario in [self.otro, self.soporte]:
            self.client.force_authenticate(usuario)
            self.assertEqual(self.client.get(url).status_code, 200)
            self.assertEqual(self.client.patch(url, {'puntaje': 4}).status_code, 403)
            self.assertEqual(self.client.delete(url).status_code, 403)
        self.client.force_authenticate(self.pasajero)
        self.assertEqual(self.client.patch(url, {'puntaje': 6}).status_code, 400)
        self.assertEqual(self.client.patch(url, {'puntaje': 4}).status_code, 200)
        self.assertEqual(self.client.patch(url, {'calificado': self.otro.pk}).status_code, 400)
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.delete(url).status_code, 204)
        self.assertEqual(self.client.get(url).status_code, 404)

    def test_filtros_invalidos_responden_400(self):
        self.client.raise_request_exception = False
        for query in ['puntaje=abc', 'puntaje=0', 'puntaje=6', 'puntaje=1.5', 'viaje=abc',
                      'calificador=-1', 'calificado='+'9'*30, 'ordering=otro']:
            with self.subTest(query=query):
                self.assertEqual(self.client.get('/api/calificaciones/?'+query).status_code, 400)

    def test_solo_autor_edita_incluso_si_otra_cuenta_es_admin(self):
        otra = self.calificar()
        self.assertEqual(otra.status_code, 201)
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.patch(
            f"/api/calificaciones/{otra.data['id']}/", {'puntaje': 4}, format='json'
        ).status_code, 403)
        self.client.force_authenticate(self.pasajero)
        Reserva.objects.create(viaje=self.viaje, pasajero=self.admin, cupos=1)
        respuesta = self.calificar(calificado=self.admin.pk)
        self.assertEqual(respuesta.status_code, 201)
        url = f"/api/calificaciones/{respuesta.data['id']}/"
        datos = {'viaje': self.viaje.pk, 'calificado': self.admin.pk, 'puntaje': 4}
        self.client.force_authenticate(self.admin)
        for metodo in [self.client.put, self.client.patch]:
            with self.subTest(metodo=metodo.__name__):
                self.assertEqual(metodo(url, datos, format='json').status_code, 403)
        self.assertEqual(Calificacion.objects.get(pk=respuesta.data['id']).puntaje, 5)
        self.client.force_authenticate(self.pasajero)
        self.assertEqual(self.client.patch(url, {'puntaje': 3}, format='json').status_code, 200)

    def test_administrador_edita_su_propia_calificacion(self):
        Reserva.objects.create(viaje=self.viaje, pasajero=self.admin, cupos=1)
        self.client.force_authenticate(self.admin)
        respuesta = self.calificar()
        self.assertEqual(respuesta.status_code, 201)
        self.assertEqual(self.client.patch(
            f"/api/calificaciones/{respuesta.data['id']}/", {'puntaje': 4}, format='json'
        ).status_code, 200)

    def test_filtros_orden_y_paginacion(self):
        for i in range(11):
            usuario = get_user_model().objects.create_user(username=f'cal_filtro{i}')
            Calificacion.objects.create(viaje=self.viaje, calificador=usuario, calificado=self.conductor, puntaje=1+i%5)
        url = f'/api/calificaciones/?viaje={self.viaje.pk}&calificado={self.conductor.pk}&ordering=-puntaje'
        respuesta = self.client.get(url)
        self.assertEqual(respuesta.data['total_registros'], 11)
        self.assertEqual(len(respuesta.data['resultados']), 10)
        self.assertEqual(respuesta.data['resultados'][0]['puntaje'], 5)
        self.assertEqual(len(self.client.get(url+'&page=2').data['resultados']), 1)
        self.assertEqual(self.client.get(url+'&puntaje=5').data['total_registros'], 2)
