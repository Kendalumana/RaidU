from rest_framework import serializers

from .models import Vehiculo


class VehiculoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehiculo
        fields = ['id', 'propietario', 'placa', 'marca', 'modelo', 'capacidad', 'activo']
        read_only_fields = ['id', 'propietario']

    def validate_capacidad(self, valor):
        if valor < 1 or valor > 32767:
            raise serializers.ValidationError('La capacidad debe estar entre 1 y 32767 pasajeros.')
        return valor

    def validate_placa(self, valor):
        placa = valor.upper()
        if len(placa) > 15:
            raise serializers.ValidationError('La placa debe tener como maximo 15 caracteres.')
        return placa
