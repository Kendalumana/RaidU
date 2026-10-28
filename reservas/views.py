from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError

from usuarios.permisos import es_soporte
from config.paginacion import respuesta_paginada
from .models import Reserva
from .serializers import ReservaSerializer
from .services import guardar_reserva


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def reservas_api(request):
    if request.method == 'GET':
        reservas = Reserva.objects.select_related('viaje', 'pasajero').order_by('-fecha', '-id')
        if not request.user.is_staff and not es_soporte(request.user):
            reservas = reservas.filter(pasajero=request.user)
        for campo in ['viaje', 'pasajero']:
            valor = request.query_params.get(campo)
            if valor is not None:
                if not valor.isascii() or not valor.isdigit() or len(valor) > 19 or not 0 < int(valor) <= 9223372036854775807:
                    raise ValidationError({campo: 'Indique un identificador entero positivo.'})
                reservas = reservas.filter(**{campo + '_id': int(valor)})
        estado = request.query_params.get('estado')
        if estado is not None:
            if estado not in Reserva.Estado.values:
                raise ValidationError({'estado': 'Estado de reserva invalido.'})
            reservas = reservas.filter(estado=estado)
        return respuesta_paginada(reservas, ReservaSerializer, request.query_params.get('page', 1))
    if es_soporte(request.user):
        return Response({'detail': 'El usuario de soporte solo tiene permisos de lectura.'}, status=403)
    serializer = ReservaSerializer(data=request.data, context={'request': request})
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data, status=201)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def detalle_reserva(request, id):
    reserva = get_object_or_404(Reserva, pk=id)
    if not request.user.is_staff and not es_soporte(request.user) and reserva.pasajero_id != request.user.id:
        return Response({'detail': 'No tiene permiso para consultar o modificar esta reserva.'}, status=403)
    if request.method == 'GET':
        return Response(ReservaSerializer(reserva).data)
    if es_soporte(request.user):
        return Response({'detail': 'El usuario de soporte solo tiene permisos de lectura.'}, status=403)
    if request.method == 'DELETE':
        guardar_reserva({'estado': 'cancelada'}, instancia=reserva)
        return Response(status=204)
    serializer = ReservaSerializer(reserva, data=request.data,
                                   partial=request.method == 'PATCH', context={'request': request})
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)
