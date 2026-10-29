# API de viajes

Las rutas requieren `Authorization: Token <token>`.

- `GET /api/viajes/`: lista viajes, con 10 registros por página.
- `POST /api/viajes/`: publica un viaje del usuario autenticado con su vehículo.
- `GET /api/viajes/<id>/`: consulta el detalle.
- `PUT`, `PATCH`, `DELETE /api/viajes/<id>/`: conductor propietario o administrador.
  Soporte solo tiene lectura.

## Validaciones y estados

Un viaje nuevo debe comenzar publicado, tener fecha futura, costo positivo,
entre 1 y 32767 cupos, sedes diferentes y capacidad cubierta por su vehículo.
El cliente no determina conductor ni cupos disponibles.

Los filtros combinables son `sede_origen`, `sede_destino`, `fecha` (AAAA-MM-DD),
`estado` y `cupos_minimos`. El ordenamiento permite `fecha_hora`, `-fecha_hora`,
`costo_total` y `-costo_total`. Un valor inválido en estos parámetros devuelve 400
con el nombre del campo. Los parámetros desconocidos se ignoran.

Publicado y lleno deben coincidir con la disponibilidad. No se puede marcar lleno
un viaje que todavía tiene cupos, ni marcar publicado uno sin cupos. Al cambiar
capacidad se conserva la cantidad ocupada y se ajusta automáticamente ese estado.
La capacidad nueva no puede ser menor a los cupos ocupados.

Publicado o lleno puede pasar a en_curso o cancelado. En_curso puede pasar a
finalizado. Finalizado y cancelado no admiten PUT/PATCH. El borrado con cupos
ocupados o relaciones protegidas devuelve 409.

## Contrato para integrar reservas

Esta rama integra reservas. Las escrituras de ambos módulos bloquean primero la
fila del viaje dentro de una transacción. Al modificar capacidad, los cupos
ocupados se consultan desde las reservas confirmadas y los disponibles conservan
la relación `cupos_totales - cupos_ocupados`.
Cancelar el viaje cancela sus reservas y deja sus montos en cero. Cambiar el costo
recalcula sus montos. El historial de reservas protege el borrado del viaje.
La integración conserva la validación de participantes y permisos de calificaciones.

## Pruebas

```powershell
python manage.py test viajes --noinput
python manage.py test --noinput
```

Las pruebas de API cubren filtros inválidos, creación, estados, permisos,
ordenamiento, paginación, cambios de capacidad y borrado con cupos ocupados.
