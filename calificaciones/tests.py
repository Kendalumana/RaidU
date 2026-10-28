from datetime import timedelta
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from vehiculos.models import Vehiculo
from viajes.models import Viaje
from .models import Calificacion


class CalificacionesAPITest(APITestCase):

    def setUp(self):
        Usuario = get_user_model()

        self.usuario1 = Usuario.objects.create_user(username='usuario1',password='123456')
        self.usuario2 = Usuario.objects.create_user(username='usuario2',password='123456')
        self.vehiculo = Vehiculo.objects.create(propietario=self.usuario1,capacidad=4,activo=True)

        self.viaje_finalizado = Viaje.objects.create(
            conductor=self.usuario1,
            vehiculo=self.vehiculo,
            sede_origen='Puntarenas',
            sede_destino='Esparza',
            fecha_hora=timezone.now() - timedelta(hours=2),
            cupos_totales=4,
            cupos_disponibles=0,
            costo_total=Decimal('5000.00'),
            estado='finalizado'
        )

        self.viaje_publicado = Viaje.objects.create(
            conductor=self.usuario1,
            vehiculo=self.vehiculo,
            sede_origen='Puntarenas',
            sede_destino='San Ramón',
            fecha_hora=timezone.now() + timedelta(days=1),
            cupos_totales=4,
            cupos_disponibles=4,
            costo_total=Decimal('5000.00'),
            estado='publicado'
        )

        self.url = '/api/calificaciones/'


    def test_crear_calificacion(self):
        self.client.force_authenticate(user=self.usuario1)

        datos = {
            'viaje': self.viaje_finalizado.id,
            'calificado': self.usuario2.id,
            'puntaje': 5,
            'comentario': 'Excelente viaje.'
        }

        respuesta = self.client.post(self.url,datos,format='json')
        self.assertEqual(respuesta.status_code,status.HTTP_201_CREATED)


    def test_puntaje_invalido(self):
        self.client.force_authenticate(user=self.usuario1)

        datos = {
            'viaje': self.viaje_finalizado.id,
            'calificado': self.usuario2.id,
            'puntaje': 6
        }

        respuesta = self.client.post(self.url,datos,format='json')
        self.assertEqual(respuesta.status_code,status.HTTP_400_BAD_REQUEST)


    def test_no_autocalificacion(self):
        self.client.force_authenticate(user=self.usuario1)

        datos = {
            'viaje': self.viaje_finalizado.id,
            'calificado': self.usuario1.id,
            'puntaje': 5
        }

        respuesta = self.client.post(self.url,datos,format='json')
        self.assertEqual(respuesta.status_code,status.HTTP_400_BAD_REQUEST)


    def test_no_calificacion_duplicada(self):
        Calificacion.objects.create(
            viaje=self.viaje_finalizado,
            calificador=self.usuario1,
            calificado=self.usuario2,
            puntaje=4
        )

        self.client.force_authenticate(user=self.usuario1)

        datos = {
            'viaje': self.viaje_finalizado.id,
            'calificado': self.usuario2.id,
            'puntaje': 5
        }

        respuesta = self.client.post(self.url,datos,format='json')
        self.assertEqual(respuesta.status_code,status.HTTP_400_BAD_REQUEST)


    def test_no_calificar_viaje_no_finalizado(self):
        self.client.force_authenticate(user=self.usuario1)

        datos = {
            'viaje': self.viaje_publicado.id,
            'calificado': self.usuario2.id,
            'puntaje': 5
        }

        respuesta = self.client.post(self.url,datos,format='json')
        self.assertEqual(respuesta.status_code,status.HTTP_400_BAD_REQUEST)


    def test_promedio_usuario(self):
        Calificacion.objects.create(viaje=self.viaje_finalizado,calificador=self.
                                    usuario1,calificado=self.usuario2,puntaje=5
        )

        self.client.force_authenticate(user=self.usuario1)
        respuesta = self.client.get(f'/api/calificaciones/promedio/{self.usuario2.id}/')
        self.assertEqual(respuesta.status_code,status.HTTP_200_OK)
        self.assertEqual(respuesta.data['promedio'],5.0)