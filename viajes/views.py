from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from vehiculos.models import Vehiculo
from .models import Viaje
from .serializers import ViajeSerializer

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def viajes_api(request):
    if request.method == 'GET':
        viajes = Viaje.objects.all().order_by('fecha_hora')
        serializer = ViajeSerializer(viajes, many=True)
        return Response(serializer.data)

    if request.method == 'POST':
        vehiculo_id = request.data.get('vehiculo')

        try:
            vehiculo = Vehiculo.objects.get(id = vehiculo_id)

        except Vehiculo.DoesNotExist:
            return Response(
                {'detail' : 'Vehiculo no encontrado.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if vehiculo.propietario.id != request.user.id:
            return Response(
                {'detail' : 'Solo puede publicar viajes con sus propios vehiculos.'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = ViajeSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save(
                conductor = request.user,
                cupos_disponibles = request.data.get('cupos_disponibles')
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

        viaje = Viaje.objects.get(id = id)

    except Viaje.DoesNotExist:
        return Response(
            {'detail' : 'Viaje no encontrado'},
            status=status.HTTP_404_NOT_FOUND
        )

    if request.method == 'GET':
        serializer = ViajeSerializer(viaje)
        return Response(serializer.data)

    if viaje.conductor_id != request.user.id and not request.user.is_staff:
        return Response(
            {'deatil' : 'No tiene permiso para modificar'},
            status=status.HTTP_403_FORBIDDEN
        )

    if request.method in ['PUT', 'PATCH']:
        serializer = ViajeSerializer(viaje, data = request.data, partial=(request.method == 'PATCH'))

        if serializer.is_valid():
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