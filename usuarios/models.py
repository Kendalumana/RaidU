from django.db import models
from django.contrib.auth.models import User


class PerfilUsuario(models.Model):
    usuario = models.OneToOneField(
        User, on_delete=models.PROTECT, related_name='perfil',
    )
    telefono = models.CharField(max_length=20, blank=True, default='')

    def __str__(self):
        return self.usuario.username
