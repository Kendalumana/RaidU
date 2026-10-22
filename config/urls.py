from django.contrib import admin
from django.urls import path, include
from rest_framework.authtoken.views import obtain_auth_token

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/token/', obtain_auth_token, name='api_token'),
    path('api/', include('usuarios.urls')),
    # Enrutamiento base preparado para las futuras aplicaciones del proyecto (/api/):
    # path('api/vehiculos/', include('vehiculos.urls')),
    # path('api/viajes/', include('viajes.urls')),
    # path('api/reservas/', include('reservas.urls')),
    # path('api/calificaciones/', include('calificaciones.urls')),
]
