from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.db import IntegrityError
from django.db.models.deletion import ProtectedError
from rest_framework.test import APITestCase
from .models import Vehiculo


class VehiculoTests(APITestCase):
    def setUp(self):
        Usuario = get_user_model()
        self.usuario = Usuario.objects.create_user(username='ana')
        self.otro = Usuario.objects.create_user(username='luis')
        self.admin = Usuario.objects.create_user(username='admin', is_staff=True)
        self.soporte = Usuario.objects.create_user(username='soporte')
        self.soporte.groups.add(Group.objects.create(name='Soporte'))
        self.vehiculo = Vehiculo.objects.create(
            propietario=self.usuario, placa='ABC123', marca='Toyota', modelo='Yaris', capacidad=4,
        )
        self.ajeno = Vehiculo.objects.create(
            propietario=self.otro, placa='XYZ789', marca='Honda', modelo='Civic', capacidad=3,
        )
        self.url = f'/api/vehiculos/{self.vehiculo.id}/'
        self.datos = {'placa': ' def456 ', 'marca': 'Nissan', 'modelo': 'Versa', 'capacidad': 4}
        self.client.force_authenticate(user=self.usuario)

    def test_crud(self):
        self.datos['placa'] = ' ghi789 '
        respuesta = self.client.post('/api/vehiculos/', self.datos, format='json')
        self.assertEqual(respuesta.status_code, 201)
        self.assertEqual(respuesta.data['placa'], 'GHI789')
        self.assertEqual(respuesta.data['propietario'], self.usuario.id)
        self.assertEqual(Vehiculo.objects.count(), 3)
        respuesta = self.client.get(self.url)
        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.data['placa'], 'ABC123')
        respuesta = self.client.get('/api/vehiculos/999999/')
        self.assertEqual(respuesta.status_code, 404)

        self.datos['placa'] = 'DEF456'
        respuesta = self.client.put(self.url, self.datos, format='json')
        self.assertEqual(respuesta.status_code, 200)
        self.vehiculo.refresh_from_db()
        self.assertEqual(self.vehiculo.placa, 'DEF456')
        datos = {'marca': 'Mazda', 'propietario': self.otro.id}
        respuesta = self.client.patch(self.url, datos, format='json')
        self.assertEqual(respuesta.status_code, 200)
        self.vehiculo.refresh_from_db()
        self.assertEqual(self.vehiculo.marca, 'Mazda')
        self.assertEqual(self.vehiculo.placa, 'DEF456')
        self.assertEqual(self.vehiculo.propietario, self.usuario)
        respuesta = self.client.delete(self.url)
        self.assertEqual(respuesta.status_code, 204)
        self.assertFalse(Vehiculo.objects.filter(id=self.vehiculo.id).exists())

    def test_validaciones(self):
        respuesta = self.client.post('/api/vehiculos/', {}, format='json')
        self.assertEqual(respuesta.status_code, 400)
        respuesta = self.client.put(self.url, {'marca': 'Mazda'}, format='json')
        self.assertEqual(respuesta.status_code, 400)
        self.datos['placa'] = ' abc123 '
        respuesta = self.client.post('/api/vehiculos/', self.datos, format='json')
        self.assertEqual(respuesta.status_code, 400)
        self.assertIn('placa', respuesta.data)
        self.datos['placa'] = 'DEF456'
        self.datos['capacidad'] = 0
        respuesta = self.client.post('/api/vehiculos/', self.datos, format='json')
        self.assertEqual(respuesta.status_code, 400)
        self.assertIn('capacidad', respuesta.data)
        respuesta = self.client.patch(self.url, {'capacidad': -1}, format='json')
        self.assertEqual(respuesta.status_code, 400)
        respuesta = self.client.patch(self.url, {'placa': 'XYZ789'}, format='json')
        self.assertEqual(respuesta.status_code, 400)
        respuesta = self.client.patch(self.url, {'marca': ''}, format='json')
        self.assertEqual(respuesta.status_code, 400)
        self.vehiculo.refresh_from_db()
        self.assertEqual(self.vehiculo.placa, 'ABC123')
        self.assertEqual(self.vehiculo.capacidad, 4)

    def test_permisos(self):
        self.client.force_authenticate(user=self.otro)
        respuesta = self.client.get(self.url)
        self.assertEqual(respuesta.status_code, 403)
        respuesta = self.client.patch(self.url, {'marca': 'Mazda'}, format='json')
        self.assertEqual(respuesta.status_code, 403)
        respuesta = self.client.delete(self.url)
        self.assertEqual(respuesta.status_code, 403)
        self.client.force_authenticate(user=None)
        respuesta = self.client.get('/api/vehiculos/')
        self.assertEqual(respuesta.status_code, 401)
        respuesta = self.client.post('/api/vehiculos/', self.datos, format='json')
        self.assertEqual(respuesta.status_code, 401)

        self.client.force_authenticate(user=self.soporte)
        respuesta = self.client.get('/api/vehiculos/')
        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.data['count'], 2)
        respuesta = self.client.post('/api/vehiculos/', self.datos, format='json')
        self.assertEqual(respuesta.status_code, 403)
        respuesta = self.client.patch(self.url, {'marca': 'Mazda'}, format='json')
        self.assertEqual(respuesta.status_code, 403)
        respuesta = self.client.delete(self.url)
        self.assertEqual(respuesta.status_code, 403)

        self.client.force_authenticate(user=self.admin)
        respuesta = self.client.patch(self.url, {'marca': 'Mazda'}, format='json')
        self.assertEqual(respuesta.status_code, 200)
        self.vehiculo.refresh_from_db()
        self.assertEqual(self.vehiculo.marca, 'Mazda')

    def test_busqueda_y_paginacion(self):
        respuesta = self.client.get('/api/vehiculos/?search=toyo')
        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.data['count'], 1)
        self.assertEqual(respuesta.data['results'][0]['id'], self.vehiculo.id)
        respuesta = self.client.get('/api/vehiculos/?search=Honda')
        self.assertEqual(respuesta.data['count'], 0)
        for numero in range(10):
            ultimo = Vehiculo.objects.create(
                propietario=self.usuario, placa='PAG' + str(numero),
                marca='Toyota', modelo='Corolla', capacidad=4,
            )
        respuesta = self.client.get('/api/vehiculos/?page=2')
        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.data['count'], 11)
        self.assertEqual(len(respuesta.data['results']), 1)
        self.assertEqual(respuesta.data['results'][0]['id'], ultimo.id)
        respuesta = self.client.get('/api/vehiculos/?page=abc')
        self.assertEqual(respuesta.status_code, 404)

    def test_base_de_datos_impide_capacidad_cero(self):
        self.vehiculo.capacidad = 0
        with self.assertRaises(IntegrityError):
            self.vehiculo.save()

    def test_base_de_datos_impide_placa_duplicada(self):
        self.vehiculo.placa = self.ajeno.placa
        with self.assertRaises(IntegrityError):
            self.vehiculo.save()

    def test_no_borrar_propietario_con_vehiculo(self):
        with self.assertRaises(ProtectedError):
            self.usuario.delete()

    def test_borrar_vehiculo_con_viaje_devuelve_conflicto_y_conserva_datos(self):
        from datetime import timedelta
        from django.utils import timezone
        from viajes.models import Viaje

        viaje = Viaje.objects.create(
            conductor=self.usuario, vehiculo=self.vehiculo,
            sede_origen=Viaje.Sede.PUNTARENAS, sede_destino=Viaje.Sede.ESPARZA,
            fecha_hora=timezone.now() + timedelta(days=1),
            cupos_totales=4, cupos_disponibles=4, costo_total='6000.00',
        )
        for usuario in [self.usuario, self.admin]:
            with self.subTest(usuario=usuario.pk):
                self.client.force_authenticate(user=usuario)
                respuesta = self.client.delete(self.url)
                self.assertEqual(respuesta.status_code, 409)
                self.assertIn('detail', respuesta.data)
                self.assertTrue(Vehiculo.objects.filter(pk=self.vehiculo.pk).exists())
                self.assertTrue(Viaje.objects.filter(pk=viaje.pk).exists())
