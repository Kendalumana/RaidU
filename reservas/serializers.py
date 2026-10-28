from rest_framework import serializers

from .models import Reserva
from .services import guardar_reserva


class ReservaSerializer(serializers.ModelSerializer):
    cupos = serializers.IntegerField(min_value=1, max_value=32767)

    class Meta:
        model = Reserva
        fields = '__all__'
        read_only_fields = ['id', 'pasajero', 'monto_simulado', 'fecha']
        validators = []

    def validate(self, data):
        if self.instance:
            if 'viaje' in data and data['viaje'].pk != self.instance.viaje_id:
                raise serializers.ValidationError({'viaje': 'No se puede cambiar el viaje de una reserva.'})
            if 'pasajero' in self.initial_data and str(self.initial_data['pasajero']) != str(self.instance.pasajero_id):
                raise serializers.ValidationError({'pasajero': 'No se puede cambiar el pasajero.'})
        elif data.get('estado', 'confirmada') != 'confirmada':
            raise serializers.ValidationError({'estado': 'Una reserva nueva debe estar confirmada.'})
        return data

    def create(self, validated_data):
        return guardar_reserva(validated_data, pasajero=self.context['request'].user)

    def update(self, instance, validated_data):
        return guardar_reserva(validated_data, instancia=instance)
