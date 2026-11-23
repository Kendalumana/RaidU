from django.urls import path
from . import views

urlpatterns = [
    path('', views.viajes_api, name='viajes_api'),
    path('mis-viajes/', views.mis_viajes_api, name='mis_viajes_api'),
    path('<int:id>/participantes/', views.participantes_viaje, name='participantes_viaje'),
    path('<int:id>/', views.detalle_viaje, name = 'detalle_viaje'),
]
