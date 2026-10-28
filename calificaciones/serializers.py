from rest_framework import serializers

from .models import Calificacion


class CalificacionSerializer(serializers.ModelSerializer):

    class Meta:
        model = Calificacion
        fields = '__all__'
        read_only_fields = [
            'id',
            'calificador',
            'fecha'
        ]

    def validate_puntaje(self, valor):
        if valor < 1 or valor > 5:
            raise serializers.ValidationError(
                'El puntaje debe estar entre 1 y 5.'
            )

        return valor

    def validate(self, data):
        request = self.context.get('request')

        viaje = data.get('viaje')
        calificado = data.get('calificado')

        if self.instance:

            if viaje is None:
                viaje = self.instance.viaje

            if calificado is None:
                calificado = self.instance.calificado

            if 'viaje' in data:
                if data.get('viaje').id != self.instance.viaje_id:
                    raise serializers.ValidationError({
                        'viaje':
                        'No se puede cambiar el viaje de una calificacion.'
                    })

            if 'calificado' in data:
                if data.get('calificado').id != self.instance.calificado_id:
                    raise serializers.ValidationError({
                        'calificado':
                        'No se puede cambiar el usuario calificado.'
                    })

        if viaje:

            if viaje.estado != 'finalizado':
                raise serializers.ValidationError({
                    'viaje':
                    'Solo se pueden calificar viajes finalizados.'
                })

        if request and calificado:

            if calificado.id == request.user.id:
                raise serializers.ValidationError({
                    'calificado':
                    'Un usuario no puede calificarse a si mismo.'
                })

        if request and viaje and calificado:

            if self.instance:
                calificador = self.instance.calificador
            else:
                calificador = request.user

            calificacion = Calificacion.objects.filter(
                viaje=viaje,
                calificador=calificador,
                calificado=calificado
            )

            if self.instance:
                calificacion = calificacion.exclude(
                    id=self.instance.id
                )

            if calificacion.exists():
                raise serializers.ValidationError({
                    'detail':
                    'Ya existe una calificacion para este usuario en este viaje.'
                })

        if request and viaje and calificado:
            participantes = set(viaje.reservas.filter(estado='confirmada').values_list('pasajero_id', flat=True))
            participantes.add(viaje.conductor_id)
            calificador = self.instance.calificador if self.instance else request.user
            if calificador.pk not in participantes or calificado.pk not in participantes:
                raise serializers.ValidationError({
                    'viaje': 'Ambos usuarios deben haber participado en el viaje.'
                })

        return data
