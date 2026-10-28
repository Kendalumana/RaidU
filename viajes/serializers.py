from django.utils import timezone
from rest_framework import serializers
from .models import Viaje

class ViajeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Viaje
        fields = '__all__'
        read_only_fields = ['id', 'conductor', 'cupos_disponibles']


    def validate_fecha_hora(self, valor):
        if valor <= timezone.now():
            raise serializers.ValidationError('La fecha y hora del viaje debe ser posterior de la actual')

        return valor

    def validate(self, data):
        vehiculo = data.get('vehiculo')
        cupos_totales = data.get('cupos_totales')

        if vehiculo and cupos_totales:
            if cupos_totales > vehiculo.capacidad:
                raise serializers.ValidationError({
                    'cupos_totales' : 'Los cupos no pueden superar la capacidad del vehículo.'
                    })

        return data