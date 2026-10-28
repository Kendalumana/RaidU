from django.core.paginator import Paginator

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Viaje
from .serializers import ViajeSerializer


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
        viajes = Viaje.objects.all().order_by('fecha_hora')

        sede_origen = request.query_params.get('sede_origen')
        sede_destino = request.query_params.get('sede_destino')
        fecha = request.query_params.get('fecha')
        estado = request.query_params.get('estado')
        cupos_minimos = request.query_params.get('cupos_minimos')
        ordering = request.query_params.get('ordering')

        if sede_origen:
            viajes = viajes.filter(sede_origen=sede_origen)

        if sede_destino:
            viajes = viajes.filter(sede_destino=sede_destino)

        if fecha:
            viajes = viajes.filter(fecha_hora__date=fecha)

        if estado:
            viajes = viajes.filter(estado=estado)

        if cupos_minimos:
            viajes = viajes.filter(
                cupos_disponibles__gte=cupos_minimos
            )

        if ordering == 'fecha_hora':
            viajes = viajes.order_by('fecha_hora')

        if ordering == '-fecha_hora':
            viajes = viajes.order_by('-fecha_hora')

        if ordering == 'costo_total':
            viajes = viajes.order_by('costo_total')

        if ordering == '-costo_total':
            viajes = viajes.order_by('-costo_total')

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
def detalle_viaje(request, id):

    try:
        viaje = Viaje.objects.get(id=id)

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

            if 'cupos_totales' in serializer.validated_data:
                cupos_totales = serializer.validated_data.get(
                    'cupos_totales'
                )

                serializer.save(
                    cupos_disponibles=cupos_totales
                )

            else:
                serializer.save()

            return Response(serializer.data)

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


    if request.method == 'DELETE':
        viaje.delete()

        return Response(
            status=status.HTTP_204_NO_CONTENT
        )