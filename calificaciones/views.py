from django.core.paginator import Paginator
from django.contrib.auth import get_user_model
from django.db.models import Avg

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from usuarios.permisos import es_soporte
from .models import Calificacion
from .serializers import CalificacionSerializer


def respuesta_paginada(queryset, serializer_class, page_number):
    paginator = Paginator(queryset, 10)
    page = paginator.get_page(page_number)

    serializer = serializer_class(
        page.object_list,
        many=True
    )

    return Response({
        'pagina_actual': page.number,
        'total_paginas': paginator.num_pages,
        'total_registros': paginator.count,
        'resultados': serializer.data
    })


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def calificaciones_api(request):

    if request.method == 'GET':
        calificaciones = Calificacion.objects.all().order_by('-fecha')

        viaje = request.query_params.get('viaje')
        calificado = request.query_params.get('calificado')
        calificador = request.query_params.get('calificador')
        puntaje = request.query_params.get('puntaje')
        ordering = request.query_params.get('ordering')

        if viaje:
            calificaciones = calificaciones.filter(
                viaje_id=viaje
            )

        if calificado:
            calificaciones = calificaciones.filter(
                calificado_id=calificado
            )

        if calificador:
            calificaciones = calificaciones.filter(
                calificador_id=calificador
            )

        if puntaje:
            calificaciones = calificaciones.filter(
                puntaje=puntaje
            )

        if ordering == 'fecha':
            calificaciones = calificaciones.order_by('fecha')

        if ordering == '-fecha':
            calificaciones = calificaciones.order_by('-fecha')

        if ordering == 'puntaje':
            calificaciones = calificaciones.order_by('puntaje')

        if ordering == '-puntaje':
            calificaciones = calificaciones.order_by('-puntaje')

        return respuesta_paginada(
            calificaciones,
            CalificacionSerializer,
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

        serializer = CalificacionSerializer(
            data=request.data,
            context={'request': request}
        )

        if serializer.is_valid():

            serializer.save(
                calificador=request.user
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
def detalle_calificacion(request, id):

    try:
        calificacion = Calificacion.objects.get(id=id)

    except Calificacion.DoesNotExist:
        return Response(
            {'detail': 'Calificacion no encontrada.'},
            status=status.HTTP_404_NOT_FOUND
        )


    if request.method == 'GET':
        serializer = CalificacionSerializer(calificacion)

        return Response(serializer.data)


    if es_soporte(request.user):

        return Response(
            {
                'detail':
                'El usuario de soporte solo tiene permisos de lectura.'
            },
            status=status.HTTP_403_FORBIDDEN
        )


    if (
        calificacion.calificador_id != request.user.id
        and not request.user.is_staff
    ):
        return Response(
            {
                'detail':
                'No tiene permiso para modificar esta calificacion.'
            },
            status=status.HTTP_403_FORBIDDEN
        )


    if request.method in ['PUT', 'PATCH']:

        serializer = CalificacionSerializer(
            calificacion,
            data=request.data,
            partial=(request.method == 'PATCH'),
            context={'request': request}
        )

        if serializer.is_valid():
            serializer.save()

            return Response(serializer.data)

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


    if request.method == 'DELETE':
        calificacion.delete()

        return Response(
            status=status.HTTP_204_NO_CONTENT
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def promedio_usuario(request, usuario_id):

    Usuario = get_user_model()

    if not Usuario.objects.filter(id=usuario_id).exists():
        return Response(
            {'detail': 'Usuario no encontrado.'},
            status=status.HTTP_404_NOT_FOUND
        )

    calificaciones = Calificacion.objects.filter(
        calificado_id=usuario_id
    )

    resultado = calificaciones.aggregate(
        promedio=Avg('puntaje')
    )

    promedio = resultado.get('promedio')

    if promedio is not None:
        promedio = round(promedio, 2)

    return Response({
        'usuario': usuario_id,
        'promedio': promedio,
        'total_calificaciones': calificaciones.count()
    })
