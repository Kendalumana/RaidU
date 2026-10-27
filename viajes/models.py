from django.conf import settings
from django.db import models


class Viaje(models.Model):
    class Sede(models.TextChoices):
        RODRIGO_FACIO = 'rodrigo_facio', 'Sede Rodrigo Facio Brenes'
        SAN_RAMON = 'san_ramon', 'Sede de Occidente (San Ramón)'
        ESPARZA = 'esparza', 'Recinto de Esparza'
        PUNTARENAS = 'puntarenas', 'Sede del Pacífico (Puntarenas)'

    class Estado(models.TextChoices):
        PUBLICADO = 'publicado', 'Publicado'
        LLENO = 'lleno', 'Lleno'
        EN_CURSO = 'en_curso', 'En curso'
        FINALIZADO = 'finalizado', 'Finalizado'
        CANCELADO = 'cancelado', 'Cancelado'

    conductor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT,
                                  related_name='viajes_conducidos')
    vehiculo = models.ForeignKey('vehiculos.Vehiculo', on_delete=models.PROTECT,
                                related_name='viajes')
    sede_origen = models.CharField(max_length=20, choices=Sede.choices)
    sede_destino = models.CharField(max_length=20, choices=Sede.choices)
    lugar_origen = models.CharField(max_length=150, blank=True, default='')
    lugar_destino = models.CharField(max_length=150, blank=True, default='')
    fecha_hora = models.DateTimeField()
    cupos_totales = models.PositiveSmallIntegerField()
    cupos_disponibles = models.PositiveSmallIntegerField()
    costo_total = models.DecimalField(max_digits=10, decimal_places=2)
    estado = models.CharField(max_length=10, choices=Estado.choices, default=Estado.PUBLICADO)

    class Meta:
        constraints = [
            models.CheckConstraint(condition=~models.Q(sede_origen=models.F('sede_destino')),
                                   name='viaje_lugares_distintos'),
            models.CheckConstraint(condition=models.Q(cupos_totales__gte=1),
                                   name='viaje_cupos_totales_positivos'),
            models.CheckConstraint(condition=models.Q(cupos_disponibles__gte=0)
                                   & models.Q(cupos_disponibles__lte=models.F('cupos_totales')),
                                   name='viaje_cupos_disponibles_validos'),
            models.CheckConstraint(condition=models.Q(costo_total__gt=0),
                                   name='viaje_costo_positivo'),
            models.CheckConstraint(condition=models.Q(estado__in=[
                'publicado', 'lleno', 'en_curso', 'finalizado', 'cancelado']),
                name='viaje_estado_valido'),
        ]

    def __str__(self):
        return f'{self.get_sede_origen_display()} - {self.get_sede_destino_display()} ({self.fecha_hora})'
