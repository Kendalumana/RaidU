from django.conf import settings
from django.db import models


class Lugar(models.Model):
    # Las cuatro sedes y recintos se cargan en la migracion 0002_lugares_iniciales.
    class Tipo(models.TextChoices):
        SEDE = 'sede', 'Sede'
        LOCALIDAD = 'localidad', 'Localidad'

    nombre = models.CharField(max_length=150, unique=True)
    tipo = models.CharField(max_length=10, choices=Tipo.choices)
    activo = models.BooleanField(default=True)

    class Meta:
        constraints = [
            models.CheckConstraint(condition=models.Q(tipo__in=['sede', 'localidad']),
                                   name='lugar_tipo_valido'),
        ]

    def __str__(self):
        return self.nombre


class Viaje(models.Model):
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
    origen = models.ForeignKey(Lugar, on_delete=models.PROTECT, related_name='viajes_origen')
    destino = models.ForeignKey(Lugar, on_delete=models.PROTECT, related_name='viajes_destino')
    fecha_hora = models.DateTimeField()
    cupos_totales = models.PositiveSmallIntegerField()
    cupos_disponibles = models.PositiveSmallIntegerField()
    costo_total = models.DecimalField(max_digits=10, decimal_places=2)
    estado = models.CharField(max_length=10, choices=Estado.choices, default=Estado.PUBLICADO)

    class Meta:
        constraints = [
            models.CheckConstraint(condition=~models.Q(origen=models.F('destino')),
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
        return f'{self.origen} - {self.destino} ({self.fecha_hora})'
