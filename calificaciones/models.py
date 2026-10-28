from django.conf import settings
from django.db import models


class Calificacion(models.Model):
    viaje = models.ForeignKey(
        'viajes.Viaje',
        on_delete=models.CASCADE,
        related_name='calificaciones'
    )

    calificador = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='calificaciones_realizadas'
    )

    calificado = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='calificaciones_recibidas'
    )

    puntaje = models.PositiveSmallIntegerField()

    comentario = models.TextField(
        blank=True
    )

    fecha = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['viaje', 'calificador', 'calificado'],
                name='calificacion_unica_por_viaje'
            )
        ]

    def __str__(self):
        return f'{self.calificador} calificó a 'f'{self.calificado} con {self.puntaje}'