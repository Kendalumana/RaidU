from rest_framework import serializers

from .models import Vehiculo


class VehiculoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehiculo
        fields = ['id', 'propietario', 'placa', 'marca', 'modelo', 'capacidad', 'activo']
        read_only_fields = ['id', 'propietario']

    def to_internal_value(self, data):
        data = data.copy()
        if isinstance(data.get('placa'), str):
            data['placa'] = data['placa'].strip().upper()
        return super().to_internal_value(data)

    def validate_capacidad(self, valor):
        if valor < 1 or valor > 5:
            raise serializers.ValidationError('La capacidad debe estar entre 1 y 5 pasajeros.')
        return valor

    def validate_placa(self, valor):
        placa = valor.upper()
        if self.instance and placa != self.instance.placa:
            raise serializers.ValidationError('No se puede modificar la placa de un vehiculo.')
        if len(placa) > 15:
            raise serializers.ValidationError('La placa debe tener como maximo 15 caracteres.')
        return placa
