from django.contrib import admin
from django.urls import path, include
from rest_framework.authtoken.views import ObtainAuthToken

from usuarios.serializers import TokenUsuarioOCorreoSerializer

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/token/', ObtainAuthToken.as_view(serializer_class=TokenUsuarioOCorreoSerializer), name='api_token'),
    path('api/', include('usuarios.urls')),
    path('api/vehiculos/', include('vehiculos.urls')),
    # Enrutamiento base preparado para las futuras aplicaciones del proyecto (/api/):
    path('api/viajes/', include('viajes.urls')),
    path('api/reservas/', include('reservas.urls')),
    path('api/calificaciones/', include('calificaciones.urls')),
]
