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

        # Cuando hagamos Reservas agregaremos aqui la validacion
        # para comprobar que ambos usuarios participaron en el viaje.

        return data