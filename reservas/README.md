# Reservas e integración con viajes

## Alcance de la rama

`feature/reservas-integracion` partió de viajes `2eb19a0`. La actualización incorpora
main y la corrección de `fix/cierre-viajes` (PR #8), conservando calificaciones,
baja de usuarios, documentación y pruebas integradas. El PR #6 se compara con
`fix/cierre-viajes` para revisar solo el complemento de reservas. Primero se revisa
y fusiona el #8; después se cambia el destino del #6 a main y se revisa su diff.

## Dónde se resuelve cada responsabilidad

| Archivo | Responsabilidad |
| --- | --- |
| `models.py` y `migrations/0001_initial.py` | Reserva, relaciones protegidas y restricciones de base de datos |
| `serializers.py` | Cupos positivos, campos de solo lectura e identidad inmutable |
| `services.py` | Transacción, bloqueo del viaje, cupos, cancelación y reparto de costo |
| `views.py` y `urls.py` | Autenticación, permisos, rutas, filtros y respuestas |
| `tests.py` | API, reglas, permisos, paginación, montos y concurrencia en MySQL |
| `../viajes/views.py` | Capacidad ocupada, recálculo al cambiar costo y cancelación del viaje |
| `../config/paginacion.py` | Respuesta paginada compartida por viajes y reservas |
| `../usuarios/permisos.py` | Comprobación de Soporte con prioridad de administrador |

## Rutas y reglas

Todas requieren `Authorization: Token <token>`.

- `GET /api/reservas/`: listado propio; Soporte y administrador consultan todas.
- `POST /api/reservas/`: `{"viaje": 1, "cupos": 2}`. Pasajero tomado del token.
- `GET /api/reservas/<id>/`: detalle según permisos del listado.
- `PUT /api/reservas/<id>/`: viaje y cupos; no puede cambiar el viaje ni el titular.
- `PATCH /api/reservas/<id>/`: cambiar cupos o enviar `{"estado": "cancelada"}`.
- `DELETE /api/reservas/<id>/`: cancelar con respuesta 204 y conservar historial.

El usuario modifica sus reservas; el administrador puede modificar cualquiera.
Soporte solo lee. El monto y la fecha los determina el servidor. Crear una reserva
no permite elegir otro pasajero ni un monto manual.

Solo se reservan viajes futuros publicados o llenos con cupos disponibles. No se
modifican reservas confirmadas de viajes ya iniciados, finalizados, cancelados o
cuya hora de salida ya pasó. Cancelar repetidamente es idempotente y no libera
cupos dos veces. Las canceladas no se reactivan ni cambian sus cupos.

No reservar viaje propio (400), duplicar viaje/pasajero (409), superar cupos
disponibles (409), ni usar cero o negativos (400). La unicidad se conserva después
de cancelar. Se mantienen los viajes con historial de reservas mediante PROTECT.

Filtros combinables: `?viaje=1&estado=confirmada&pasajero=2`. Identificadores enteros
positivos y estado confirmada/cancelada. Un filtro inválido devuelve 400.
`?page=2` consulta otra página de 10; `get_page` ajusta páginas inválidas.
La respuesta contiene `pagina_actual`, `total_paginas`, `total_registros`, `resultados`.

## Reparto y concurrencia

Cada cupo cuenta como un pasajero. El costo se divide entre cupos confirmados sin
incluir al conductor y cada reserva paga la suma de sus cupos. Decimal conserva
la precisión; la última reserva por id recibe los centavos restantes para que
los montos sumen exactamente el costo. Una reserva cancelada tiene monto cero.
No se realiza un cobro real.

Toda escritura bloquea primero la fila del viaje. Las pruebas de MySQL comprueban
que dos solicitudes por el último cupo producen 201/409, que el mismo pasajero no
crea dos reservas simultáneas y que dos cancelaciones simultáneas no duplican cupos.

## Paso a paso para comprobarlo

1. Actualizar esta rama y activar el entorno virtual del proyecto.
2. Ejecutar `python manage.py migrate` para crear la tabla de reservas local.
3. Ejecutar `python manage.py test viajes reservas --noinput` y revisar el resultado.
4. Ejecutar `python scripts/verificar_reservas_postman.py` con Postman CLI instalado.
5. Revisar `evidencias/postman.txt` y contrastar los estados y montos siguientes.

El script usa MySQL y los datos de conexión locales de .env. Crea `test_raidu_db`,
migra desde cero, prepara cuatro usuarios ficticios y un viaje nuevo, y levanta un
servidor HTTP local. Ejecuta la colección y elimina la base al terminar. Si esa base
ya existe, se detiene sin reutilizarla ni eliminarla. No ejecutar junto con las pruebas
de Django. No modifica la base de desarrollo ni publica tokens o eventos del recorrido.

Para Postman manual, importar `postman/Reservas_RaidU.postman_collection.json` y
configurar en un entorno privado `base_url`, `viaje_id`, `token_conductor`,
`token_pasajero`, `token_otro` y `token_soporte`. Las cuatro cuentas son distintas;
Soporte pertenece al grupo Soporte y conductor es dueño del viaje. Preparar un viaje
nuevo, futuro y publicado, de exactamente 4 cupos y costo 6000. Ejecutar los 30 casos
en orden y usar otro viaje al repetir, porque las canceladas conservan su unicidad.
No versionar el entorno que contiene los tokens.

| Momento del recorrido | Cupos disponibles | Monto del titular | Otro pasajero |
| --- | --- | --- | --- |
| Reservar dos cupos | 2 | 6000 | Sin reserva |
| Cambiar a tres cupos | 1 | 6000 | Sin reserva |
| PUT a un cupo | 3 | 6000 | Sin reserva |
| Otro reserva tres cupos | 0 y viaje lleno | 1500 | 4500 |
| Cancelar la reserva del otro | 3 y viaje publicado | 6000 | 0 y cancelada |
| Cancelar titular y repetir cancelación | 4 y viaje publicado | 0 y cancelada | 0 y cancelada |

## Evidencias y resultados

- Versión anterior aislada: 44 pruebas aprobadas en MySQL (15 de reservas).
- Integración actual: 75 pruebas aprobadas en MySQL; resultado en
  `../docs/evidencia-pruebas.txt`.
- Postman: 30 solicitudes y 50 aserciones aprobadas, con comprobaciones de cuerpos JSON.
- Configuración sin incidencias y migraciones sin cambios pendientes.
- `evidencias/pruebas.txt` conserva el resultado histórico de la versión aislada.
- `evidencias/postman.txt` conserva el recorrido HTTP local, sin tokens.

## Integración y revisión

Calificaciones ya valida participantes (conductor o titular de reserva confirmada)
y rechaza cuentas ajenas y reservas canceladas. Solo el autor edita; autor o
administrador pueden eliminar. Las pruebas integradas conservan esas reglas.
Las evidencias actuales de integración se guardan en `../docs/evidencia-pruebas.txt`
y `../docs/evidencia-postman.txt`; no sumar los resultados históricos a la suite.
La revisión cruzada y la fusión requieren aprobación de la otra integrante.
