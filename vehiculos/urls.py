from django.urls import path

from . import views


urlpatterns = [
    path('', views.vehiculos_api, name='vehiculos_api'),
    path('<int:pk>/', views.vehiculo_detalle_api, name='vehiculo_detalle_api'),
]
