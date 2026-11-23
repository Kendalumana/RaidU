from django.contrib.auth import get_user_model
from django.core.paginator import InvalidPage, Paginator
from django.db import transaction
from django.db.models import Q
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import PerfilUsuario
from .permisos import es_soporte
from .serializers import PerfilSerializer, RegistroSerializer, UsuarioSerializer


@api_view(['POST'])
@permission_classes([AllowAny])
def registro_api(request):
    serializer = RegistroSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    usuario = serializer.save()
    token = Token.objects.create(user=usuario)
    return Response({
        'usuario': UsuarioSerializer(usuario).data, 'token': token.key,
    }, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def perfil_api(request):
    perfil, creado = PerfilUsuario.objects.get_or_create(usuario=request.user)
    if request.method == 'PATCH':
        serializer = PerfilSerializer(request.user, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
    return Response(UsuarioSerializer(request.user).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def usuarios_api(request):
    if not request.user.is_staff and not es_soporte(request.user):
        return Response({'detail': 'Se requiere administrador o soporte.'}, status=status.HTTP_403_FORBIDDEN)
    usuarios = get_user_model().objects.select_related('perfil').order_by('id')

    buscar = request.query_params.get('search', '').strip()
    if buscar:
        usuarios = usuarios.filter(
            Q(first_name__icontains=buscar) | Q(last_name__icontains=buscar)
            | Q(email__icontains=buscar) | Q(username__icontains=buscar)
        )

    estado = request.query_params.get('estado', 'todos')
    if estado == 'activo':
        usuarios = usuarios.filter(is_active=True)
    elif estado == 'inactivo':
        usuarios = usuarios.filter(is_active=False)
    elif estado != 'todos':
        return Response({'detail': 'Estado de usuario no valido.'}, status=status.HTTP_400_BAD_REQUEST)

    rol = request.query_params.get('rol', 'todos')
    if rol == 'admin':
        usuarios = usuarios.filter(is_staff=True)
    elif rol == 'soporte':
        usuarios = usuarios.filter(is_staff=False, groups__name='Soporte')
    elif rol == 'estudiante':
        usuarios = usuarios.filter(is_staff=False).exclude(groups__name='Soporte')
    elif rol != 'todos':
        return Response({'detail': 'Rol de usuario no valido.'}, status=status.HTTP_400_BAD_REQUEST)

    correo = request.query_params.get('correo', 'todos')
    if correo == 'institucional':
        usuarios = usuarios.filter(email__iendswith='@ucr.ac.cr')
    elif correo == 'no_institucional':
        usuarios = usuarios.exclude(email__iendswith='@ucr.ac.cr')
    elif correo != 'todos':
        return Response({'detail': 'Tipo de correo no valido.'}, status=status.HTTP_400_BAD_REQUEST)

    usuarios = usuarios.distinct()
    paginator = Paginator(usuarios, 10)
    try:
        pagina = paginator.page(request.query_params.get('page', 1))
    except InvalidPage:
        return Response({'detail': 'Pagina no valida.'}, status=status.HTTP_404_NOT_FOUND)
    return Response({
        'count': paginator.count,
        'page': pagina.number,
        'total_pages': paginator.num_pages,
        'results': UsuarioSerializer(pagina.object_list, many=True).data,
    })


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def usuario_baja_api(request, pk):
    soporte = es_soporte(request.user)
    if not request.user.is_staff and (soporte or request.user.pk != pk):
        return Response({'detail': 'Solo puede desactivar su propia cuenta; Soporte solo tiene lectura.'},
                        status=status.HTTP_403_FORBIDDEN)

    with transaction.atomic():
        try:
            usuario = get_user_model().objects.get(pk=pk)
        except get_user_model().DoesNotExist:
            return Response({'detail': 'Usuario no encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        usuario.is_active = False
        usuario.save(update_fields=['is_active'])
        Token.objects.filter(user=usuario).delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
