from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from rest_framework.test import APITestCase


class UsuariosPaginacionTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        usuario = get_user_model()
        cls.admin = usuario.objects.create_user(username='admin', is_staff=True)
        cls.regular = usuario.objects.create_user(username='regular')
        cls.soporte = usuario.objects.create_user(username='soporte')
        cls.soporte.groups.add(Group.objects.create(name='Soporte'))
        for numero in range(9):
            usuario.objects.create_user(username=f'estudiante{numero}')
        cls.ids = list(usuario.objects.order_by('id').values_list('id', flat=True))

    def setUp(self):
        self.client.force_authenticate(self.admin)

    def test_primera_pagina_contiene_diez_usuarios(self):
        respuesta = self.client.get('/api/usuarios/')
        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.data['count'], 12)
        self.assertEqual(respuesta.data['page'], 1)
        self.assertEqual(respuesta.data['total_pages'], 2)
        self.assertEqual([u['id'] for u in respuesta.data['results']], self.ids[:10])

    def test_segunda_pagina_contiene_usuarios_restantes(self):
        respuesta = self.client.get('/api/usuarios/?page=2')
        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.data['page'], 2)
        self.assertEqual([u['id'] for u in respuesta.data['results']], self.ids[10:])

    def test_paginas_invalidas_responden_404(self):
        for pagina in ('0', '-1', '3', 'abc', '1.5'):
            with self.subTest(pagina=pagina):
                self.assertEqual(self.client.get('/api/usuarios/', {'page': pagina}).status_code, 404)

    def test_soporte_puede_consultar_pagina(self):
        self.client.force_authenticate(self.soporte)
        respuesta = self.client.get('/api/usuarios/?page=2')
        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(len(respuesta.data['results']), 2)

    def test_usuario_regular_no_puede_listar(self):
        self.client.force_authenticate(self.regular)
        self.assertEqual(self.client.get('/api/usuarios/').status_code, 403)

    def test_anonimo_necesita_autenticacion(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get('/api/usuarios/').status_code, 401)
