from config.paginacion import respuesta_paginada
from django.db import transaction
from django.db.models import Sum, Q
from django.db.models.deletion import ProtectedError
from django.utils import timezone
from django.shortcuts import get_object_or_404

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from usuarios.permisos import es_soporte
from .models import Viaje
from .serializers import ViajeSerializer, FiltrosViajeSerializer
from reservas.services import recalcular_viaje


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def participantes_viaje(request, id):
    viaje = get_object_or_404(Viaje.objects.select_related('conductor'), pk=id)
    reservas = viaje.reservas.filter(estado='confirmada').select_related('pasajero')
    if viaje.conductor_id != request.user.id and not reservas.filter(pasajero=request.user).exists():
        return Response({'detail': 'Solo los participantes pueden consultar este viaje.'}, status=403)
    if viaje.estado != Viaje.Estado.FINALIZADO:
        return Response({'detail': 'Solo se pueden calificar viajes finalizados.'}, status=400)

    def participante(usuario, rol):
        return {'id': usuario.pk, 'nombre': usuario.get_full_name().strip() or f'Usuario {usuario.pk}', 'correo': usuario.email, 'rol': rol}

    personas = [participante(viaje.conductor, 'conductor')]
    personas.extend(participante(reserva.pasajero, 'pasajero') for reserva in reservas)
    return Response({'participantes': [persona for persona in personas if persona['id'] != request.user.id]})


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def viajes_api(request):

    if request.method == 'GET':
        filtros = FiltrosViajeSerializer(data=request.query_params)
        filtros.is_valid(raise_exception=True)
        datos = filtros.validated_data
        if datos.get('mis_viajes'):
            viajes = Viaje.objects.filter(
                Q(conductor=request.user) | Q(reservas__pasajero=request.user, reservas__estado='confirmada')
            ).distinct()
        else:
            viajes = Viaje.objects.all()
        if datos.get("disponibles") or datos.get("reservables"):
            viajes = viajes.filter(estado=Viaje.Estado.PUBLICADO, fecha_hora__gt=timezone.now(), cupos_disponibles__gt=0)
        if datos.get("reservables"):
            viajes = viajes.exclude(conductor=request.user).exclude(reservas__pasajero=request.user)
        campos = {'sede_origen': 'sede_origen', 'sede_destino': 'sede_destino', 'fecha': 'fecha_hora__date', 'estado': 'estado', 'cupos_minimos': 'cupos_disponibles__gte'}
        for parametro, campo in campos.items():
            if parametro in datos:
                viajes = viajes.filter(**{campo: datos[parametro]})
        viajes = viajes.select_related("conductor", "vehiculo").order_by(datos.get('ordering', 'fecha_hora'), 'id')

        return respuesta_paginada(
            viajes,
            ViajeSerializer,
            request.query_params.get('page', 1)
        )

    if request.method == 'POST':

        if es_soporte(request.user):

            return Response(
                {
                    'detail':
                    'El usuario de soporte solo tiene permisos de lectura.'
                },
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = ViajeSerializer(data=request.data)

        if serializer.is_valid():
            vehiculo = serializer.validated_data.get('vehiculo')

            if vehiculo.propietario_id != request.user.id:
                return Response(
                    {
                        'detail':
                        'Solo puede publicar viajes con sus propios vehiculos.'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            cupos_totales = serializer.validated_data.get(
                'cupos_totales'
            )

            serializer.save(
                conductor=request.user,
                cupos_disponibles=cupos_totales
            )

            return Response(
                serializer.data,
                status=status.HTTP_201_CREATED
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def mis_viajes_api(request):
    filtros = FiltrosViajeSerializer(data=request.query_params)
    filtros.is_valid(raise_exception=True)
    datos = filtros.validated_data

    # Consulta personal: viajes conducidos o con reserva confirmada, sin duplicados
    viajes = Viaje.objects.filter(
        Q(conductor=request.user) | Q(reservas__pasajero=request.user, reservas__estado='confirmada')
    ).distinct()

    campos = {'sede_origen': 'sede_origen', 'sede_destino': 'sede_destino', 'fecha': 'fecha_hora__date', 'estado': 'estado', 'cupos_minimos': 'cupos_disponibles__gte'}
    for parametro, campo in campos.items():
        if parametro in datos:
            viajes = viajes.filter(**{campo: datos[parametro]})
    viajes = viajes.select_related("conductor", "vehiculo").order_by(datos.get('ordering', 'fecha_hora'), 'id')

    return respuesta_paginada(
        viajes,
        ViajeSerializer,
        request.query_params.get('page', 1)
    )


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
@transaction.atomic
def detalle_viaje(request, id):

    try:
        viajes = Viaje.objects.all()
        if request.method != 'GET':
            viajes = viajes.select_for_update()
        viaje = viajes.get(id=id)

    except Viaje.DoesNotExist:
        return Response(
            {'detail': 'Viaje no encontrado.'},
            status=status.HTTP_404_NOT_FOUND
        )


    if request.method == 'GET':
        serializer = ViajeSerializer(viaje)
        return Response(serializer.data)


    if es_soporte(request.user):

        return Response(
            {
                'detail':
                'El usuario de soporte solo tiene permisos de lectura.'
            },
            status=status.HTTP_403_FORBIDDEN
        )


    if viaje.conductor_id != request.user.id and not request.user.is_staff:
        return Response(
            {'detail': 'No tiene permiso para modificar este viaje.'},
            status=status.HTTP_403_FORBIDDEN
        )


    if request.method in ['PUT', 'PATCH']:

        if viaje.estado in ['finalizado', 'cancelado']:
            return Response(
                {
                    'detail':
                    'No se puede modificar un viaje finalizado o cancelado.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        nuevo_estado = request.data.get(
            'estado',
            viaje.estado
        )

        transiciones = {
            'publicado': [
                'publicado',
                'lleno',
                'en_curso',
                'cancelado'
            ],
            'lleno': [
                'lleno',
                'publicado',
                'en_curso',
                'cancelado'
            ],
            'en_curso': [
                'en_curso',
                'finalizado'
            ],
        }

        if nuevo_estado not in transiciones.get(
            viaje.estado,
            []
        ):
            return Response(
                {'detail': 'Cambio de estado no permitido.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = ViajeSerializer(
            viaje,
            data=request.data,
            partial=(request.method == 'PATCH')
        )

        if serializer.is_valid():
            vehiculo = serializer.validated_data.get(
                'vehiculo',
                viaje.vehiculo
            )

            if vehiculo.propietario_id != viaje.conductor_id:
                return Response(
                    {
                        'detail':
                        'El vehiculo debe pertenecer al conductor del viaje.'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            ocupados = viaje.reservas.filter(estado='confirmada').aggregate(
                total=Sum('cupos')
            )['total'] or 0
            cupos_totales = serializer.validated_data.get('cupos_totales', viaje.cupos_totales)
            if cupos_totales < ocupados:
                return Response({'detail': 'Los cupos no pueden ser menores a las reservas confirmadas.'}, status=400)
            serializer.save(cupos_disponibles=cupos_totales - ocupados)
            if viaje.estado == 'cancelado':
                viaje.reservas.filter(estado='confirmada').update(estado='cancelada', monto_simulado=0)
            recalcular_viaje(viaje)

            return Response(serializer.data)

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


    if request.method == 'DELETE':
        try:
            viaje.delete()
        except ProtectedError:
            return Response({'detail': 'El viaje tiene historial de reservas; cancele el viaje para conservarlo.'}, status=409)

        return Response(
            status=status.HTTP_204_NO_CONTENT
        )
