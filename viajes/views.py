from django.core.paginator import Paginator
from django.db import transaction
from django.db.models.deletion import ProtectedError

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Viaje
from .serializers import ViajeSerializer, FiltrosViajeSerializer


def respuesta_paginada(queryset, serializer_class, page_number):
    paginator = Paginator(queryset, 10)
    page = paginator.get_page(page_number)
    serializer = serializer_class(page.object_list, many=True)

    return Response({
        'pagina_actual': page.number,
        'total_paginas': paginator.num_pages,
        'total_registros': paginator.count,
        'resultados': serializer.data
    })


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def viajes_api(request):

    if request.method == 'GET':
        filtros = FiltrosViajeSerializer(data=request.query_params)
        filtros.is_valid(raise_exception=True)
        datos = filtros.validated_data
        viajes = Viaje.objects.all()
        campos = {'sede_origen': 'sede_origen', 'sede_destino': 'sede_destino', 'fecha': 'fecha_hora__date', 'estado': 'estado', 'cupos_minimos': 'cupos_disponibles__gte'}
        for parametro, campo in campos.items():
            if parametro in datos:
                viajes = viajes.filter(**{campo: datos[parametro]})
        viajes = viajes.order_by(datos.get('ordering', 'fecha_hora'), 'id')

        return respuesta_paginada(
            viajes,
            ViajeSerializer,
            request.query_params.get('page', 1)
        )


    if request.method == 'POST':

        if request.user.groups.filter(
            name='Soporte'
        ).exists() and not request.user.is_staff:

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


    if request.user.groups.filter(
        name='Soporte'
    ).exists() and not request.user.is_staff:

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

            ocupados = viaje.cupos_totales - viaje.cupos_disponibles
            cupos_totales = serializer.validated_data.get('cupos_totales', viaje.cupos_totales)
            disponibles = cupos_totales - ocupados
            estado = serializer.validated_data.get('estado', viaje.estado)
            if estado in ['publicado', 'lleno']:
                estado = 'lleno' if disponibles == 0 else 'publicado'
            serializer.save(cupos_disponibles=disponibles, estado=estado)

            return Response(serializer.data)

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


    if request.method == 'DELETE':
        if viaje.cupos_disponibles < viaje.cupos_totales:
            return Response({'detail': 'No se puede eliminar un viaje con cupos ocupados.'}, status=409)
        try:
            viaje.delete()
        except ProtectedError:
            return Response({'detail': 'No se puede eliminar un viaje con registros asociados.'}, status=409)

        return Response(
            status=status.HTTP_204_NO_CONTENT
        )
