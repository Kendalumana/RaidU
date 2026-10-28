from django.urls import path
from . import views

urlpatterns = [
    path('', views.viajes_api, name='viajes_api'),
    path('<int:id>/', views.detalle_viaje, name = 'detalle_viaje'),
]
