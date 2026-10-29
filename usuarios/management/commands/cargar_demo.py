import os

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from usuarios.models import PerfilUsuario


class Command(BaseCommand):
    help = 'Crea o actualiza cinco cuentas ficticias para la demostracion local.'

    @transaction.atomic
    def handle(self, *args, **options):
        password = os.environ.get('DEMO_PASSWORD')
        if not password:
            raise CommandError('Configure DEMO_PASSWORD para las cuentas ficticias.')
        soporte, _ = Group.objects.get_or_create(name='Soporte')
        for rol in ['conductor', 'pasajero', 'otro', 'soporte', 'admin']:
            correo = f'demo_{rol}@ucr.ac.cr'
            usuario, _ = get_user_model().objects.get_or_create(username=correo)
            usuario.email = correo
            usuario.is_active = True
            usuario.is_staff = rol == 'admin'
            usuario.set_password(password)
            usuario.save()
            PerfilUsuario.objects.get_or_create(usuario=usuario)
            if rol == 'soporte':
                usuario.groups.add(soporte)
            self.stdout.write(f'{rol}: {correo}')
        self.stdout.write(self.style.SUCCESS('Cuentas ficticias listas. La clave no se muestra.'))
