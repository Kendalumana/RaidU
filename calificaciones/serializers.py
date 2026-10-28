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

            calificador = self.instance.calificador

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

        else:
            if request:
                calificador = request.user
            else:
                calificador = None

        if viaje:
            if viaje.estado != 'finalizado':
                raise serializers.ValidationError({
                    'viaje':
                    'Solo se pueden calificar viajes finalizados.'
                })

        if calificador and calificado:
            if calificador.id == calificado.id:
                raise serializers.ValidationError({
                    'calificado':
                    'Un usuario no puede calificarse a si mismo.'
                })

        if calificador and viaje and calificado:

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

        return data