from django.core.paginator import InvalidPage, Paginator
from django.db import IntegrityError
from django.db.models import Q
from django.db.models.deletion import ProtectedError
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Vehiculo
from .serializers import VehiculoSerializer


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def vehiculos_api(request):
    soporte = request.user.groups.filter(name='Soporte').exists()

    if request.method == 'GET':
        vehiculos = Vehiculo.objects.order_by('id')
        if not request.user.is_staff and not soporte:
            vehiculos = vehiculos.filter(propietario=request.user)

        buscar = request.query_params.get('search', '').strip()
        if buscar:
            # Q permite buscar en placa, marca o modelo con el mismo texto.
            vehiculos = vehiculos.filter(
                Q(placa__icontains=buscar) | Q(marca__icontains=buscar) | Q(modelo__icontains=buscar),
            )

        paginator = Paginator(vehiculos, 10)
        try:
            pagina = paginator.page(request.query_params.get('page', 1))
        except InvalidPage:
            return Response({'detail': 'Pagina no valida.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = VehiculoSerializer(pagina.object_list, many=True)
        return Response({
            'count': paginator.count,
            'page': pagina.number,
            'total_pages': paginator.num_pages,
            'results': serializer.data,
        })

    if soporte and not request.user.is_staff:
        return Response({'detail': 'Soporte solo tiene acceso de lectura.'}, status=status.HTTP_403_FORBIDDEN)

    serializer = VehiculoSerializer(data=request.data)
    if serializer.is_valid():
        try:
            serializer.save(propietario=request.user)
        except IntegrityError:
            # ATOMIC_REQUESTS revierte el guardado fallido al terminar la peticion.
            return Response({'detail': 'Conflicto al guardar el vehiculo.'}, status=status.HTTP_409_CONFLICT)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def vehiculo_detalle_api(request, pk):
    soporte = request.user.groups.filter(name='Soporte').exists()
    if soporte and not request.user.is_staff and request.method != 'GET':
        return Response({'detail': 'Soporte solo tiene acceso de lectura.'}, status=status.HTTP_403_FORBIDDEN)

    try:
        vehiculo = Vehiculo.objects.get(pk=pk)
    except Vehiculo.DoesNotExist:
        return Response({'detail': 'Vehiculo no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

    if not request.user.is_staff and not soporte and vehiculo.propietario_id != request.user.pk:
        return Response({'detail': 'Solo puede gestionar sus propios vehiculos.'}, status=status.HTTP_403_FORBIDDEN)

    if request.method == 'GET':
        serializer = VehiculoSerializer(vehiculo)
        return Response(serializer.data)

    if request.method in ['PUT', 'PATCH']:
        serializer = VehiculoSerializer(
            vehiculo, data=request.data, partial=request.method == 'PATCH',
        )
        if serializer.is_valid():
            try:
                serializer.save()
            except IntegrityError:
                return Response({'detail': 'Conflicto al guardar el vehiculo.'}, status=status.HTTP_409_CONFLICT)
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    try:
        vehiculo.delete()
    except ProtectedError:
        return Response({'detail': 'No se puede eliminar un vehiculo con viajes asociados.'},
                        status=status.HTTP_409_CONFLICT)
    return Response(status=status.HTTP_204_NO_CONTENT)
