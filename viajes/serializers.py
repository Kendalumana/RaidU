from django.utils import timezone
from rest_framework import serializers

from .models import Viaje


class ViajeSerializer(serializers.ModelSerializer):
    cupos_totales = serializers.IntegerField(min_value=1, max_value=32767)

    class Meta:
        model = Viaje
        fields = '__all__'
        read_only_fields = [
            'id',
            'conductor',
            'cupos_disponibles'
        ]

    def validate_fecha_hora(self, valor):
        if valor <= timezone.now():
            raise serializers.ValidationError(
                'La fecha y hora del viaje debe ser futura.'
            )

        return valor

    def validate_costo_total(self, valor):
        if valor <= 0:
            raise serializers.ValidationError(
                'El costo total debe ser mayor que cero.'
            )

        return valor

    def validate(self, data):
        if not self.instance and data.get('estado', 'publicado') != 'publicado':
            raise serializers.ValidationError({'estado': 'Un viaje nuevo debe comenzar publicado.'})
        vehiculo = data.get('vehiculo')
        cupos_totales = data.get('cupos_totales')
        sede_origen = data.get('sede_origen')
        sede_destino = data.get('sede_destino')

        if self.instance:

            if vehiculo is None:
                vehiculo = self.instance.vehiculo

            if cupos_totales is None:
                cupos_totales = self.instance.cupos_totales

            if sede_origen is None:
                sede_origen = self.instance.sede_origen

            if sede_destino is None:
                sede_destino = self.instance.sede_destino

        if vehiculo and cupos_totales is not None:

            
            if cupos_totales > vehiculo.capacidad:
                raise serializers.ValidationError({
                    'cupos_totales':
                    'Los cupos no pueden superar la capacidad del vehiculo.'
                })

        if sede_origen and sede_destino:

            if sede_origen == sede_destino:
                raise serializers.ValidationError({
                    'sede_destino':
                    'La sede de destino debe ser diferente a la sede de origen.'
                })

        return data


class FiltrosViajeSerializer(serializers.Serializer):
    sede_origen = serializers.ChoiceField(choices=Viaje.Sede.choices, required=False)
    sede_destino = serializers.ChoiceField(choices=Viaje.Sede.choices, required=False)
    fecha = serializers.DateField(required=False)
    estado = serializers.ChoiceField(choices=Viaje.Estado.choices, required=False)
    cupos_minimos = serializers.IntegerField(min_value=0, max_value=32767, required=False)
    ordering = serializers.ChoiceField(choices=['fecha_hora', '-fecha_hora', 'costo_total', '-costo_total'], required=False)
