from django.contrib import admin

from .models import Viaje


@admin.register(Viaje)
class ViajeAdmin(admin.ModelAdmin):
    list_display = ['id', 'conductor', 'sede_origen', 'sede_destino', 'fecha_hora',
                    'cupos_totales', 'cupos_disponibles', 'costo_total', 'estado']
    list_filter = ['estado', 'sede_origen', 'sede_destino']
    search_fields = ['conductor__username', 'vehiculo__placa']
    list_select_related = ['conductor', 'vehiculo']
    readonly_fields = [field.name for field in Viaje._meta.fields]
    actions = None

    # Las escrituras pasan por la API para mantener cupos, montos y cancelaciones.
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
