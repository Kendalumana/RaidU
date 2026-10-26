from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from rest_framework.test import APITestCase


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
