from django.conf import settings
from django.db import models


class Reserva(models.Model):
    class Estado(models.TextChoices):
        CONFIRMADA = 'confirmada', 'Confirmada'
        CANCELADA = 'cancelada', 'Cancelada'

    viaje = models.ForeignKey('viajes.Viaje', on_delete=models.PROTECT, related_name='reservas')
    pasajero = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT,
                                 related_name='reservas')
    cupos = models.PositiveSmallIntegerField()
    monto_simulado = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    estado = models.CharField(max_length=10, choices=Estado.choices, default=Estado.CONFIRMADA)
    fecha = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['viaje', 'pasajero'], name='reserva_unica_por_viaje'),
            models.CheckConstraint(condition=models.Q(cupos__gte=1), name='reserva_cupos_positivos'),
            models.CheckConstraint(condition=models.Q(monto_simulado__gte=0), name='reserva_monto_valido'),
            models.CheckConstraint(condition=models.Q(estado__in=['confirmada', 'cancelada']),
                                   name='reserva_estado_valido'),
        ]

    def __str__(self):
        return f'{self.pasajero} - viaje {self.viaje_id} ({self.estado})'
