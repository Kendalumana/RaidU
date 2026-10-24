from django.contrib.auth import get_user_model
from django.core.paginator import InvalidPage, Paginator
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import PerfilUsuario
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
    if not request.user.is_staff and not request.user.groups.filter(name='Soporte').exists():
        return Response({'detail': 'Se requiere administrador o soporte.'}, status=status.HTTP_403_FORBIDDEN)
    usuarios = get_user_model().objects.select_related('perfil').order_by('id')
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
