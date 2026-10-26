from django.contrib import admin

from .models import Vehiculo


@admin.register(Vehiculo)
class VehiculoAdmin(admin.ModelAdmin):
    list_display = ['placa', 'propietario', 'marca', 'modelo', 'capacidad', 'activo']
    search_fields = ['placa', 'marca', 'modelo']
    list_filter = ['activo']
