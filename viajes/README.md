# Base de viajes y lugares

Esta rama contiene modelos, migracion y pruebas. Los endpoints de viajes y lugares quedan pendientes.

## Instalacion

Integrar el commit de esta rama antes de desarrollar viajes o reservas. No volver a crear los modelos ni otra migracion inicial. La app viajes ya esta en INSTALLED_APPS.

```powershell
python manage.py migrate
python manage.py test viajes usuarios vehiculos --noinput
```

## Contrato para la API

- Lugar: nombre unico, tipo sede o localidad, activo.
- Viaje: conductor, vehiculo, origen, destino, fecha_hora, cupos_totales, cupos_disponibles, costo_total y estado.
- Estados exactos: publicado, lleno, en_curso, finalizado, cancelado. Usar Viaje.Estado en el codigo.
- costo_total es Decimal positivo con dos decimales. La capacidad de Vehiculo representa pasajeros, sin incluir al conductor.
- Relaciones de usuario, vehiculo y lugares usan PROTECT para conservar historial.
- El conductor se obtiene del token al publicar. El vehiculo debe ser suyo y estar activo. Los lugares deben estar activos al publicar.
- Al crear: cupos_disponibles = cupos_totales, estado = publicado. Esos campos derivados no deben aceptarse libremente del cliente.
- El modelo valida fecha futura al crear o cambiar fecha, propietario y capacidad del vehiculo. La base protege costo positivo, origen distinto del destino, cupos y estados validos.

## Validaciones al guardar

Django NO ejecuta full_clean al llamar save. Antes de crear o actualizar desde un serializer, construir la instancia con los valores propuestos y llamar full_clean; convertir django.core.exceptions.ValidationError a rest_framework.serializers.ValidationError (400). La misma validacion debe aplicarse a PATCH y PUT.

## Trabajo pendiente para la API de viajes

Implementar serializers, vistas, rutas y permisos de lugares y viajes; filtros de origen, destino, fecha, estado y cupos; orden por fecha y costo; paginacion de 10; pruebas HTTP y evidencias.

Las modificaciones de capacidad, fecha, vehiculo, costo y estado requieren reglas adicionales en la capa de negocio: impedir modificaciones de viajes finalizados o cancelados; no reducir capacidad por debajo de cupos ya reservados; no sobreescribir cupos_disponibles con valores del cliente. Estas reglas aun no estan implementadas en este incremento de modelos.

## Coordinacion con reservas

Reservas usara ForeignKey('viajes.Viaje') con related_name='reservas'. Cupos ocupados = cupos_totales - cupos_disponibles. Crear, cambiar o cancelar reservas debe bloquear el viaje con select_for_update dentro de transaction.atomic y ajustar cupos una sola vez.

Reservas cambia publicado a lleno si los cupos llegan a cero y lleno a publicado al liberar cupos; no reabre viajes cancelados, finalizados o en curso. Las actualizaciones de viajes tambien deben usar el mismo bloqueo y conservar los cupos ocupados al cambiar cupos_totales. Ningun cambio manual de estado debe sustituir estas reglas.

La distribucion del costo entre varias plazas de un mismo pasajero y el recalculo de montos al cambiar costo_total se acuerdan antes de implementar el pago simulado. Este modelo no decide ese reparto.
