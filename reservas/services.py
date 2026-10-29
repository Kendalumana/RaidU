from decimal import Decimal, ROUND_DOWN

from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.exceptions import APIException, ValidationError

from viajes.models import Viaje
from .models import Reserva


class ConflictoReserva(APIException):
    status_code = 409
    default_detail = 'La reserva entra en conflicto con los cupos del viaje.'


def recalcular_viaje(viaje):
    # El llamador mantiene bloqueada la fila del viaje durante la transaccion.
    reservas = list(viaje.reservas.filter(estado='confirmada').order_by('id'))
    ocupados = sum(reserva.cupos for reserva in reservas)
    viaje.cupos_disponibles = viaje.cupos_totales - ocupados
    if viaje.estado in ['publicado', 'lleno']:
        viaje.estado = 'lleno' if viaje.cupos_disponibles == 0 else 'publicado'
    viaje.save(update_fields=['cupos_disponibles', 'estado'])
    restante = viaje.costo_total
    for indice, reserva in enumerate(reservas):
        # La ultima reserva absorbe los centavos para conservar el costo exacto.
        monto = restante
        if indice < len(reservas) - 1:
            monto = (viaje.costo_total * reserva.cupos / ocupados).quantize(
                Decimal('0.01'), rounding=ROUND_DOWN,
            )
        reserva.monto_simulado = monto
        restante -= monto
    if reservas:
        Reserva.objects.bulk_update(reservas, ['monto_simulado'])


@transaction.atomic
def guardar_reserva(datos, pasajero=None, instancia=None):
    viaje_id = instancia.viaje_id if instancia else datos['viaje'].pk
    viaje = get_object_or_404(Viaje.objects.select_for_update(), pk=viaje_id)
    reserva = Reserva.objects.get(pk=instancia.pk) if instancia else None
    estado = datos.get('estado', reserva.estado if reserva else 'confirmada')
    if reserva and reserva.estado == 'cancelada':
        if estado != 'cancelada' or datos.get('cupos', reserva.cupos) != reserva.cupos:
            raise ValidationError({'estado': 'No se puede reactivar ni modificar una reserva cancelada.'})
        return reserva
    if viaje.estado not in ['publicado', 'lleno'] or viaje.fecha_hora <= timezone.now():
        raise ValidationError({'viaje': 'Solo se pueden reservar o cancelar viajes futuros sin iniciar.'})
    if not reserva:
        if pasajero.pk == viaje.conductor_id:
            raise ValidationError({'viaje': 'No puede reservar su propio viaje.'})
        if viaje.reservas.filter(pasajero=pasajero).exists():
            raise ConflictoReserva('Ya existe una reserva de este pasajero para el viaje.')
        reserva = Reserva(viaje=viaje, pasajero=pasajero)
        anteriores = 0
    else:
        anteriores = reserva.cupos
    cupos = datos.get('cupos', reserva.cupos)
    if estado == 'confirmada' and cupos > viaje.cupos_disponibles + anteriores:
        raise ConflictoReserva('No hay suficientes cupos disponibles.')
    reserva.cupos = cupos
    reserva.estado = estado
    if estado == 'cancelada':
        reserva.monto_simulado = 0
    reserva.save()
    recalcular_viaje(viaje)
    reserva.refresh_from_db()
    return reserva
