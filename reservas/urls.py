from django.urls import path

from . import views

urlpatterns = [
    path('', views.reservas_api, name='reservas_api'),
    path('<int:id>/', views.detalle_reserva, name='detalle_reserva'),
]
