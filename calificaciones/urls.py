from django.urls import path

from . import views


urlpatterns = [
    path('',views.calificaciones_api,name='calificaciones_api'),
    path('promedio/<int:usuario_id>/', views.promedio_usuario,name='promedio_usuario'),
    path('<int:id>/',views.detalle_calificacion,name='detalle_calificacion'),
]