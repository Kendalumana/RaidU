from django.contrib import admin, messages
from django.http import HttpResponseRedirect
from django.urls import reverse
from config.admin_api import AdminConAPI

from .models import Reserva
from .views import reservas_api, detalle_reserva


@admin.register(Reserva)
class ReservaAdmin(AdminConAPI):
    vista_lista = staticmethod(reservas_api)
    vista_detalle = staticmethod(detalle_reserva)
    list_display = ['id', 'viaje', 'pasajero', 'cupos', 'monto_simulado', 'estado', 'fecha']
    list_filter = ['estado']
    search_fields = ['pasajero__username', 'viaje__conductor__username']
    list_select_related = ['viaje', 'pasajero']

    def get_readonly_fields(self, request, obj=None):
        campos = ['id', 'pasajero', 'monto_simulado', 'fecha']
        return campos + ['viaje'] if obj else campos

    def response_delete(self, request, obj_display, obj_id):
        self.message_user(request, 'Reserva cancelada; se conserva su historial.', messages.SUCCESS)
        return HttpResponseRedirect(reverse('admin:reservas_reserva_changelist'))
