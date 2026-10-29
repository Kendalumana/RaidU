from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models


class Vehiculo(models.Model):
    propietario = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='vehiculos',
    )
    placa = models.CharField(max_length=15, unique=True)
    marca = models.CharField(max_length=60)
    modelo = models.CharField(max_length=60)
    # Capacidad de pasajeros; el conductor no se incluye.
    capacidad = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    activo = models.BooleanField(default=True)

    class Meta:
        constraints = [
            models.CheckConstraint(condition=models.Q(capacidad__lte=5),
                                   name='vehiculo_capacidad_maxima'),
            models.CheckConstraint(condition=models.Q(capacidad__gte=1),
                                   name='vehiculo_capacidad_positiva'),
        ]

    def __str__(self):
        return self.placa
