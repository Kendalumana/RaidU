from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import Client, TestCase
from django.utils import timezone

from reservas.models import Reserva
from vehiculos.models import Vehiculo
from viajes.models import Viaje


class AdminNegocioTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.conductor = User.objects.create_superuser(username='admin_conductor', password='clave-ficticia')
        self.pasajero = User.objects.create_superuser(username='admin_pasajero', password='clave-ficticia')
        self.vehiculo = Vehiculo.objects.create(propietario=self.conductor, placa='ADM101', marca='Toyota', modelo='Yaris', capacidad=4)
        self.fecha = timezone.localtime(timezone.now() + timedelta(days=1)).replace(microsecond=0)
        self.viaje = Viaje.objects.create(conductor=self.conductor, vehiculo=self.vehiculo,
            sede_origen='puntarenas', sede_destino='esparza', fecha_hora=self.fecha,
            cupos_totales=4, cupos_disponibles=4, costo_total='6000.00')
        self.client.force_login(self.pasajero)

    def datos_viaje(self, **cambios):
        return dict(vehiculo=self.vehiculo.pk, sede_origen='puntarenas', sede_destino='esparza',
            fecha_hora_0=self.fecha.strftime('%Y-%m-%d'), fecha_hora_1=self.fecha.strftime('%H:%M:%S'),
            cupos_totales=4, costo_total='6000.00', estado='publicado', _save='Guardar') | cambios

    def reservar(self, cupos=1):
        return self.client.post('/admin/reservas/reserva/add/', {
            'viaje': self.viaje.pk, 'cupos': cupos, 'estado': 'confirmada', '_save': 'Guardar'})

    def test_crear_reserva_y_recalcular_costo_desde_admin(self):
        self.assertEqual(self.reservar(2).status_code, 302)
        reserva = Reserva.objects.get()
        self.assertEqual(reserva.pasajero, self.pasajero)
        self.assertEqual(reserva.monto_simulado, 6000)
        self.viaje.refresh_from_db()
        self.assertEqual(self.viaje.cupos_disponibles, 2)
        self.client.force_login(self.conductor)
        cambio = self.client.post(f'/admin/viajes/viaje/{self.viaje.pk}/change/', self.datos_viaje(costo_total='9000.00'))
        self.assertEqual(cambio.status_code, 302)
        reserva.refresh_from_db()
        self.assertEqual(reserva.monto_simulado, 9000)

    def test_sobreventa_y_duplicado_se_muestran_en_formulario(self):
        respuesta = self.reservar(5)
        self.assertEqual(respuesta.status_code, 200)
        self.assertContains(respuesta, 'No hay suficientes cupos')
        self.assertFalse(Reserva.objects.exists())
        self.assertEqual(self.reservar().status_code, 302)
        respuesta = self.reservar()
        self.assertEqual(respuesta.status_code, 200)
        self.assertContains(respuesta, 'Ya existe una reserva')
        self.assertEqual(Reserva.objects.count(), 1)

    def test_delete_reserva_cancela_y_conserva_historial(self):
        self.assertEqual(self.reservar().status_code, 302)
        reserva = Reserva.objects.get()
        respuesta = self.client.post(f'/admin/reservas/reserva/{reserva.pk}/delete/', {'post': 'yes'})
        self.assertEqual(respuesta.status_code, 302)
        reserva.refresh_from_db()
        self.assertEqual(reserva.estado, 'cancelada')
        self.assertEqual(reserva.monto_simulado, 0)
        self.viaje.refresh_from_db()
        self.assertEqual(self.viaje.cupos_disponibles, 4)

    def test_crear_viaje_y_rechazar_vehiculo_ajeno(self):
        respuesta = self.client.post('/admin/viajes/viaje/add/', self.datos_viaje())
        self.assertEqual(respuesta.status_code, 200)
        self.assertContains(respuesta, 'Solo puede publicar viajes con sus propios vehiculos')
        self.assertEqual(Viaje.objects.count(), 1)
        self.client.force_login(self.conductor)
        respuesta = self.client.post('/admin/viajes/viaje/add/', self.datos_viaje())
        self.assertEqual(respuesta.status_code, 302)
        nuevo = Viaje.objects.latest('id')
        self.assertEqual(nuevo.conductor, self.conductor)
        self.assertEqual(nuevo.cupos_disponibles, 4)

    def test_viaje_cancelado_no_se_modifica_y_cancelar_libera_reservas(self):
        self.assertEqual(self.reservar().status_code, 302)
        self.client.force_login(self.conductor)
        url = f'/admin/viajes/viaje/{self.viaje.pk}/change/'
        self.assertEqual(self.client.post(url, self.datos_viaje(estado='cancelado')).status_code, 302)
        self.assertEqual(Reserva.objects.get().estado, 'cancelada')
        respuesta = self.client.post(url, self.datos_viaje(estado='cancelado', costo_total='9999.00'))
        self.assertEqual(respuesta.status_code, 200)
        self.assertContains(respuesta, 'No se puede modificar un viaje finalizado o cancelado')
        self.viaje.refresh_from_db()
        self.assertEqual(self.viaje.costo_total, 6000)

    def test_reserva_de_viaje_iniciado_no_se_cancela_desde_admin(self):
        self.assertEqual(self.reservar().status_code, 302)
        reserva = Reserva.objects.get()
        self.viaje.estado = 'en_curso'
        self.viaje.save()
        respuesta = self.client.post(f'/admin/reservas/reserva/{reserva.pk}/delete/', {'post': 'yes'}, follow=True)
        self.assertEqual(respuesta.status_code, 200)
        self.assertContains(respuesta, 'Solo se pueden reservar o cancelar viajes futuros sin iniciar')
        reserva.refresh_from_db()
        self.assertEqual(reserva.estado, 'confirmada')

    def test_staff_sin_permisos_no_crea(self):
        usuario = get_user_model().objects.create_user(username='sin_permisos', is_staff=True)
        self.client.force_login(usuario)
        self.assertEqual(self.reservar().status_code, 403)
        self.assertFalse(Reserva.objects.exists())

    def test_formulario_conserva_proteccion_csrf(self):
        cliente = Client(enforce_csrf_checks=True)
        cliente.force_login(self.pasajero)
        self.assertEqual(cliente.get('/admin/reservas/reserva/add/').status_code, 200)
        datos = {'viaje': self.viaje.pk, 'cupos': 1, 'estado': 'confirmada', '_save': 'Guardar'}
        self.assertEqual(cliente.post('/admin/reservas/reserva/add/', datos).status_code, 403)
        datos['csrfmiddlewaretoken'] = cliente.cookies['csrftoken'].value
        self.assertEqual(cliente.post('/admin/reservas/reserva/add/', datos).status_code, 302)
        self.assertEqual(Reserva.objects.count(), 1)

    def test_editar_reserva_recalcula_cupos_y_rechaza_reactivacion(self):
        self.assertEqual(self.reservar().status_code, 302)
        reserva = Reserva.objects.get()
        url = f'/admin/reservas/reserva/{reserva.pk}/change/'
        datos = {'cupos': 3, 'estado': 'confirmada', '_save': 'Guardar'}
        self.assertEqual(self.client.post(url, datos).status_code, 302)
        self.viaje.refresh_from_db()
        self.assertEqual(self.viaje.cupos_disponibles, 1)
        self.assertEqual(self.client.post(url, datos | {'estado': 'cancelada'}).status_code, 302)
        respuesta = self.client.post(url, datos)
        self.assertEqual(respuesta.status_code, 200)
        self.assertContains(respuesta, 'No se puede reactivar')
        reserva.refresh_from_db()
        self.assertEqual(reserva.estado, 'cancelada')
        self.assertEqual(reserva.monto_simulado, 0)
