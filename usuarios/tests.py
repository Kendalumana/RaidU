from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.management import call_command
from django.core.management.base import CommandError
from io import StringIO
from unittest.mock import patch
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from .models import PerfilUsuario


class UsuariosCuentaTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        Usuario = get_user_model()
        cls.password = 'RutaSegura!2026_X9'
        cls.usuario = Usuario.objects.create_user(
            username='cuenta@ucr.ac.cr', email='cuenta@ucr.ac.cr', password=cls.password,
        )
        cls.perfil = PerfilUsuario.objects.create(usuario=cls.usuario, telefono='88880001')
        cls.otro = Usuario.objects.create_user(username='otro@ucr.ac.cr')
        cls.admin = Usuario.objects.create_user(username='admin', is_staff=True)
        cls.soporte = Usuario.objects.create_user(username='soporte')
        cls.soporte.groups.add(Group.objects.create(name='Soporte'))

    def autenticar(self, usuario):
        token, _ = Token.objects.get_or_create(user=usuario)
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + token.key)
        return token.key

    def registro(self, **cambios):
        datos = {'email': 'NUEVA@ucr.ac.cr', 'password': self.password,
                 'first_name': 'Prueba', 'last_name': 'Cuenta', 'telefono': '88880002'}
        datos.update(cambios)
        return self.client.post('/api/usuarios/registro/', datos, format='json')

    def test_registro_normaliza_correo_y_guarda_password_seguro(self):
        respuesta = self.registro()
        self.assertEqual(respuesta.status_code, 201)
        usuario = get_user_model().objects.get(username='nueva@ucr.ac.cr')
        self.assertEqual(usuario.email, 'nueva@ucr.ac.cr')
        self.assertTrue(usuario.check_password(self.password))
        self.assertEqual(usuario.perfil.telefono, '88880002')
        self.assertNotIn('password', respuesta.data['usuario'])
        self.assertEqual(Token.objects.get(user=usuario).key, respuesta.data['token'])

    def test_registro_rechaza_correo_externo(self):
        respuesta = self.registro(email='cuenta@example.com')
        self.assertEqual(respuesta.status_code, 400)
        self.assertIn('email', respuesta.data)

    def test_registro_rechaza_duplicado_sin_distinguir_mayusculas(self):
        respuesta = self.registro(email='CUENTA@ucr.ac.cr')
        self.assertEqual(respuesta.status_code, 400)
        self.assertIn('email', respuesta.data)

    def test_registro_rechaza_password_debil(self):
        respuesta = self.registro(password='123')
        self.assertEqual(respuesta.status_code, 400)
        self.assertIn('password', respuesta.data)

    def test_registro_no_permite_asignarse_privilegios(self):
        respuesta = self.registro(is_staff=True, is_superuser=True, groups=[1])
        self.assertEqual(respuesta.status_code, 201)
        usuario = get_user_model().objects.get(pk=respuesta.data['usuario']['id'])
        self.assertFalse(usuario.is_staff)
        self.assertFalse(usuario.is_superuser)
        self.assertFalse(usuario.groups.exists())

    def test_login_y_acceso_con_token_real(self):
        respuesta = self.client.post('/api/token/', {
            'username': self.usuario.username, 'password': self.password,
        }, format='json')
        self.assertEqual(respuesta.status_code, 200)
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + respuesta.data['token'])
        perfil = self.client.get('/api/perfil/')
        self.assertEqual(perfil.status_code, 200)
        self.assertEqual(perfil.data['id'], self.usuario.pk)

    def test_login_rechaza_password_incorrecto(self):
        respuesta = self.client.post('/api/token/', {
            'username': self.usuario.username, 'password': 'incorrecta',
        }, format='json')
        self.assertEqual(respuesta.status_code, 400)
        self.assertNotIn('token', respuesta.data)

    def test_perfil_requiere_autenticacion(self):
        self.assertEqual(self.client.get('/api/perfil/').status_code, 401)
        self.assertEqual(self.client.patch('/api/perfil/', {}, format='json').status_code, 401)

    def test_token_invalido_no_permite_acceso(self):
        self.client.credentials(HTTP_AUTHORIZATION='Token invalido')
        self.assertEqual(self.client.get('/api/perfil/').status_code, 401)

    def test_patch_perfil_actualiza_solo_campos_permitidos(self):
        self.autenticar(self.usuario)
        respuesta = self.client.patch('/api/perfil/', {
            'first_name': 'Ana', 'last_name': 'Prueba', 'telefono': '88889999',
            'id': self.otro.pk, 'email': 'cambio@ucr.ac.cr', 'is_active': False,
            'is_staff': True, 'is_superuser': True, 'groups': [1], 'password': 'otra',
        }, format='json')
        self.assertEqual(respuesta.status_code, 200)
        self.usuario.refresh_from_db()
        self.otro.refresh_from_db()
        self.perfil.refresh_from_db()
        self.assertEqual(self.usuario.first_name, 'Ana')
        self.assertEqual(self.usuario.last_name, 'Prueba')
        self.assertEqual(self.perfil.telefono, '88889999')
        self.assertEqual(self.usuario.email, 'cuenta@ucr.ac.cr')
        self.assertTrue(self.usuario.is_active)
        self.assertTrue(self.usuario.check_password(self.password))
        self.assertFalse(self.usuario.is_staff)
        self.assertFalse(self.usuario.is_superuser)
        self.assertFalse(self.usuario.groups.exists())
        self.assertEqual(self.otro.first_name, '')

    def test_baja_propia_conserva_historial_y_revoca_acceso(self):
        from datetime import timedelta
        from django.utils import timezone
        from vehiculos.models import Vehiculo
        from viajes.models import Viaje
        vehiculo = Vehiculo.objects.create(propietario=self.usuario, placa='BAJ101',
                                           marca='Toyota', modelo='Yaris', capacidad=4)
        viaje = Viaje.objects.create(
            conductor=self.usuario, vehiculo=vehiculo,
            sede_origen=Viaje.Sede.PUNTARENAS, sede_destino=Viaje.Sede.ESPARZA,
            fecha_hora=timezone.now() + timedelta(days=1),
            cupos_totales=4, cupos_disponibles=4, costo_total='6000.00',
        )
        self.autenticar(self.usuario)
        respuesta = self.client.delete(f'/api/usuarios/{self.usuario.pk}/')
        self.assertEqual(respuesta.status_code, 204)
        self.assertEqual(respuesta.content, b'')
        self.usuario.refresh_from_db()
        self.assertFalse(self.usuario.is_active)
        self.assertTrue(PerfilUsuario.objects.filter(pk=self.perfil.pk).exists())
        self.assertTrue(Vehiculo.objects.filter(pk=vehiculo.pk, propietario=self.usuario).exists())
        self.assertTrue(Viaje.objects.filter(pk=viaje.pk, conductor=self.usuario).exists())
        self.assertFalse(Token.objects.filter(user=self.usuario).exists())
        self.assertEqual(self.client.get('/api/perfil/').status_code, 401)
        self.assertEqual(self.client.get('/api/vehiculos/').status_code, 401)
        self.client.credentials()
        login = self.client.post('/api/token/', {
            'username': self.usuario.username, 'password': self.password,
        }, format='json')
        self.assertEqual(login.status_code, 400)
        self.assertNotIn('token', login.data)

    def test_cuenta_inactiva_con_token_existente_no_accede(self):
        self.autenticar(self.usuario)
        self.usuario.is_active = False
        self.usuario.save(update_fields=['is_active'])
        self.assertEqual(self.client.get('/api/perfil/').status_code, 401)

    def test_regular_no_puede_desactivar_a_otro(self):
        self.autenticar(self.usuario)
        self.assertEqual(self.client.delete(f'/api/usuarios/{self.otro.pk}/').status_code, 403)
        self.otro.refresh_from_db()
        self.assertTrue(self.otro.is_active)

    def test_soporte_solo_lectura_incluso_para_baja_propia(self):
        self.autenticar(self.soporte)
        for usuario in [self.usuario, self.soporte]:
            with self.subTest(usuario=usuario.pk):
                self.assertEqual(self.client.delete(f'/api/usuarios/{usuario.pk}/').status_code, 403)

    def test_administrador_puede_desactivar_y_repetir_baja(self):
        self.autenticar(self.usuario)
        self.autenticar(self.admin)
        url = f'/api/usuarios/{self.usuario.pk}/'
        self.assertEqual(self.client.delete(url).status_code, 204)
        self.assertEqual(self.client.delete(url).status_code, 204)
        self.usuario.refresh_from_db()
        self.assertFalse(self.usuario.is_active)
        self.assertFalse(Token.objects.filter(user=self.usuario).exists())
        listado = self.client.get('/api/usuarios/')
        cuenta = next(u for u in listado.data['results'] if u['id'] == self.usuario.pk)
        self.assertFalse(cuenta['activo'])

    def test_baja_anonima_requiere_autenticacion(self):
        self.assertEqual(self.client.delete(f'/api/usuarios/{self.usuario.pk}/').status_code, 401)

    def test_baja_inexistente_devuelve_404_al_administrador(self):
        self.autenticar(self.admin)
        self.assertEqual(self.client.delete('/api/usuarios/999999/').status_code, 404)


class UsuariosPaginacionTests(APITestCase):
    def setUp(self):
        Usuario = get_user_model()
        self.admin = Usuario.objects.create_user(username='admin', is_staff=True)
        self.regular = Usuario.objects.create_user(username='regular')
        self.soporte = Usuario.objects.create_user(username='soporte')
        grupo = Group.objects.create(name='Soporte')
        self.soporte.groups.add(grupo)
        for numero in range(9):
            Usuario.objects.create_user(username='estudiante' + str(numero))
        self.client.force_authenticate(user=self.admin)

    def test_primera_pagina(self):
        respuesta = self.client.get('/api/usuarios/')
        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.data['count'], 12)
        self.assertEqual(respuesta.data['total_pages'], 2)
        self.assertEqual(len(respuesta.data['results']), 10)
        self.assertEqual(respuesta.data['results'][0]['id'], self.admin.id)

    def test_segunda_pagina(self):
        respuesta = self.client.get('/api/usuarios/?page=2')
        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.data['page'], 2)
        self.assertEqual(len(respuesta.data['results']), 2)
        self.assertEqual(respuesta.data['results'][0]['username'], 'estudiante7')
        self.assertEqual(respuesta.data['results'][1]['username'], 'estudiante8')

    def test_pagina_con_texto(self):
        respuesta = self.client.get('/api/usuarios/?page=abc')
        self.assertEqual(respuesta.status_code, 404)

    def test_pagina_fuera_de_rango(self):
        respuesta = self.client.get('/api/usuarios/?page=3')
        self.assertEqual(respuesta.status_code, 404)

    def test_pagina_cero(self):
        respuesta = self.client.get('/api/usuarios/?page=0')
        self.assertEqual(respuesta.status_code, 404)

    def test_soporte_puede_listar(self):
        self.client.force_authenticate(user=self.soporte)
        respuesta = self.client.get('/api/usuarios/?page=2')
        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(len(respuesta.data['results']), 2)

    def test_usuario_regular_no_puede_listar(self):
        self.client.force_authenticate(user=self.regular)
        respuesta = self.client.get('/api/usuarios/')
        self.assertEqual(respuesta.status_code, 403)

    def test_anonimo_necesita_autenticacion(self):
        self.client.force_authenticate(user=None)
        respuesta = self.client.get('/api/usuarios/')
        self.assertEqual(respuesta.status_code, 401)


class RolesEntreModulosTests(APITestCase):
    def test_soporte_solo_lectura_y_prioridad_de_administrador(self):
        grupo = Group.objects.create(name='Soporte')
        for nombre, administrador, soporte in [
            ('regular', False, False), ('soporte', False, True),
            ('admin', True, False), ('admin_soporte', True, True),
        ]:
            usuario = get_user_model().objects.create_user(username=nombre, is_staff=administrador)
            if soporte:
                usuario.groups.add(grupo)
            self.client.force_authenticate(usuario)
            with self.subTest(rol=nombre, modulo='usuarios'):
                esperado = 200 if administrador or soporte else 403
                self.assertEqual(self.client.get('/api/usuarios/').status_code, esperado)
            for modulo in ['vehiculos', 'viajes', 'reservas', 'calificaciones']:
                with self.subTest(rol=nombre, modulo=modulo):
                    url = f'/api/{modulo}/'
                    self.assertEqual(self.client.get(url).status_code, 200)
                    # Sin campos obligatorios, una escritura permitida llega a validacion (400).
                    # Soporte debe ser rechazado antes de validar los datos (403).
                    esperado = 403 if soporte and not administrador else 400
                    self.assertEqual(self.client.post(url, {}, format='json').status_code, esperado)


class DatosDemoTests(APITestCase):
    def test_demo_exige_clave_explicita(self):
        with patch.dict('os.environ', {'DEMO_PASSWORD': ''}):
            with self.assertRaises(CommandError):
                call_command('cargar_demo', stdout=StringIO())
        self.assertEqual(get_user_model().objects.count(), 0)

    def test_demo_repetible_y_roles_correctos(self):
        clave = 'DemoLocal!Prueba2026'
        salida = StringIO()
        with patch.dict('os.environ', {'DEMO_PASSWORD': clave}):
            call_command('cargar_demo', stdout=salida)
            call_command('cargar_demo', stdout=salida)
        self.assertEqual(get_user_model().objects.count(), 5)
        self.assertEqual(PerfilUsuario.objects.count(), 5)
        admin = get_user_model().objects.get(username='demo_admin@ucr.ac.cr')
        soporte = get_user_model().objects.get(username='demo_soporte@ucr.ac.cr')
        self.assertTrue(admin.is_staff)
        self.assertTrue(soporte.groups.filter(name='Soporte').exists())
        self.assertFalse(soporte.is_staff)
        self.assertTrue(admin.check_password(clave))
        self.assertNotIn(clave, salida.getvalue())
