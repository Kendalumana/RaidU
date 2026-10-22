from django.urls import path

from . import views


urlpatterns = [
    path('usuarios/registro/', views.registro_api, name='registro_api'),
    path('usuarios/', views.usuarios_api, name='usuarios_api'),
    path('perfil/', views.perfil_api, name='perfil_api'),
]
