from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from rest_framework import serializers
from rest_framework.authtoken.serializers import AuthTokenSerializer

from .models import PerfilUsuario


Usuario = get_user_model()


class TokenUsuarioOCorreoSerializer(AuthTokenSerializer):
    def validate(self, attrs):
        acceso = attrs.get('username', '')
        if '@' in acceso and not Usuario.objects.filter(username=acceso).exists():
            usuarios = list(Usuario.objects.filter(email__iexact=acceso)
                            .values_list('username', flat=True)[:2])
            if len(usuarios) == 1:
                attrs['username'] = usuarios[0]
        return super().validate(attrs)


class UsuarioSerializer(serializers.ModelSerializer):
    telefono = serializers.CharField(source='perfil.telefono', read_only=True)
    activo = serializers.BooleanField(source='is_active', read_only=True)
    es_admin = serializers.BooleanField(source='is_staff', read_only=True)
    es_soporte = serializers.SerializerMethodField()
    es_conductor = serializers.SerializerMethodField()
    cantidad_vehiculos = serializers.SerializerMethodField()
    rol = serializers.SerializerMethodField()

    class Meta:
        model = Usuario
        fields = ['id', 'username', 'email', 'first_name', 'last_name',
                  'telefono', 'activo', 'es_admin', 'es_soporte', 'es_conductor',
                  'cantidad_vehiculos', 'rol']
        read_only_fields = fields

    def get_es_soporte(self, obj):
        return not obj.is_staff and obj.groups.filter(name='Soporte').exists()

    def get_es_conductor(self, obj):
        return obj.vehiculos.filter(activo=True).exists()

    def get_cantidad_vehiculos(self, obj):
        return obj.vehiculos.filter(activo=True).count()

    def get_rol(self, obj):
        if obj.is_staff:
            return 'admin'
        if obj.groups.filter(name='Soporte').exists():
            return 'soporte'
        return 'estudiante'


class RegistroSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario
        fields = ['email', 'password', 'first_name', 'last_name', 'telefono']
    email = serializers.EmailField(max_length=150)
    password = serializers.CharField(write_only=True, trim_whitespace=False)
    telefono = serializers.CharField(max_length=20, required=False, allow_blank=True)


    def validate_email(self, valor):
        correo = valor.lower()
        if not correo.endswith('@ucr.ac.cr'):
            raise serializers.ValidationError('Utilice un correo institucional @ucr.ac.cr.')
        if Usuario.objects.filter(username__iexact=correo).exists() or Usuario.objects.filter(email__iexact=correo).exists():
            raise serializers.ValidationError('Este correo ya esta registrado.')
        return correo

    def validate(self, datos):
        usuario = Usuario(
            username=datos['email'], email=datos['email'],
            first_name=datos.get('first_name', ''), last_name=datos.get('last_name', ''),
        )
        try:
            validate_password(datos['password'], usuario)
        except ValidationError as error:
            raise serializers.ValidationError({'password': error.messages})
        return datos

    def create(self, datos):
        usuario = Usuario.objects.create_user(
            username=datos['email'],
            email=datos['email'],
            password=datos['password'],
            first_name=datos.get('first_name', ''),
            last_name=datos.get('last_name', ''),
        )
        PerfilUsuario.objects.create(
            usuario=usuario,
            telefono=datos.get('telefono', ''),
        )
        return usuario


class PerfilSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    telefono = serializers.CharField(max_length=20, required=False, allow_blank=True)

    def update(self, usuario, datos):
        usuario.first_name = datos.get('first_name', usuario.first_name)
        usuario.last_name = datos.get('last_name', usuario.last_name)
        usuario.save()

        perfil, creado = PerfilUsuario.objects.get_or_create(usuario=usuario)
        perfil.telefono = datos.get('telefono', perfil.telefono)
        perfil.save()
        return usuario
