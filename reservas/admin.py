from django.contrib import admin

from .models import Reserva


@admin.register(Reserva)
class ReservaAdmin(admin.ModelAdmin):
    list_display = ['id', 'viaje', 'pasajero', 'cupos', 'monto_simulado', 'estado', 'fecha']
    list_filter = ['estado']
    search_fields = ['pasajero__username', 'viaje__conductor__username']
    list_select_related = ['viaje', 'pasajero']
    readonly_fields = [field.name for field in Reserva._meta.fields]
    actions = None

    # Las escrituras pasan por la API para mantener cupos, montos y cancelaciones.
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
