from django.contrib import admin
from config.admin_api import AdminConAPI

from .models import Viaje
from .views import viajes_api, detalle_viaje


@admin.register(Viaje)
class ViajeAdmin(AdminConAPI):
    vista_lista = staticmethod(viajes_api)
    vista_detalle = staticmethod(detalle_viaje)
    list_display = ['id', 'conductor', 'sede_origen', 'sede_destino', 'fecha_hora',
                    'cupos_totales', 'cupos_disponibles', 'costo_total', 'estado']
    list_filter = ['estado', 'sede_origen', 'sede_destino']
    search_fields = ['conductor__username', 'vehiculo__placa']
    list_select_related = ['conductor', 'vehiculo']
    readonly_fields = ['id', 'conductor', 'cupos_disponibles']
