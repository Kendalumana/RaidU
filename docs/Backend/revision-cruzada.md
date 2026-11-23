# Registro de revisión cruzada

Estado: integración a main realizada. Hay un comentario de revisión asistida de
Kendalumana; falta registrar la revisión personal de ambos integrantes.

## Comentario registrado

- Autor en GitHub: Kendalumana.
- Fecha: 29 de octubre de 2026, 09:32 (Costa Rica).
- Enlace permanente: https://github.com/Kendalumana/RaidU/pull/4#issuecomment-6501021550
- Versión local examinada durante la revisión asistida: `952c21c`.
- Alcance: lectura de validaciones de viajes, participación y permisos de
  calificaciones, y transacción, cupos y recálculo de reservas.
- No se ejecutaron nuevas pruebas durante esa revisión asistida. El comentario
  publicado no identifica el commit ni indica una aprobación formal.
- Esta entrada enlaza la observación publicada; no acredita por sí sola la revisión
  personal de ambos integrantes ni una aprobación anterior a la fusión.

## Ejecución local informada por Kendalumana

El 29 de octubre de 2026, Kendalumana informó que ejecutó Postman localmente y
que todas las solicitudes salieron correctas. Esta es una declaración del
integrante; no una nueva ejecución realizada por el asistente.
La evidencia guardada en [evidencia-postman.txt](evidencia-postman.txt) registra
75 solicitudes y 97 aserciones sin fallos. No se ha sustituido ese archivo ni se
le atribuye una fecha nueva. La ejecución de Postman no sustituye la revisión
cruzada del código.

## Revisión registrada de la compañera

- Revisora: yulianaurena.
- Alcance previsto: usuarios, vehículos y reservas.
- Comentario publicado desde su cuenta en el PR #7:
  https://github.com/Kendalumana/RaidU/pull/7#issuecomment-6503583523
- Commit mencionado: `f6c518d`. El comentario indica que no se ejecutaron pruebas
  nuevas. La lectura detallada a continuación fue asistida por el asistente y
  presentada a Yuliana, quien indicó haberla leído; el comentario publicado no
  especifica esta asistencia. Fecha de publicación: pendiente de confirmación.
- El comentario está en el PR #7; queda pendiente su registro en el PR #4 si se
  desea conservar allí la referencia de cierre.

## Lectura asistida de usuarios, vehículos y reservas

- Fecha: 29 de octubre de 2026.
- Commit examinado: `f6c518d3587f9fa24bc11b1b3c67ff0880b18883`.
- Método: lectura de código realizada por el asistente y presentada a Yuliana
  para su examen. Este registro no afirma que ella haya realizado la lectura
  independiente ni constituye una aprobación formal.
- Evidencia: archivos y funciones indicados a continuación. No se ejecutaron
  pruebas ni Postman durante esta lectura asistida.

### Usuarios

- [RegistroSerializer](../usuarios/serializers.py): `validate_email` normaliza el
  correo, comprueba el dominio `@ucr.ac.cr` y busca duplicados; `validate` valida
  la contraseña y `create` crea el usuario y el perfil.
- [Vistas de usuarios](../usuarios/views.py): `perfil_api` usa el usuario
  autenticado; `usuarios_api` restringe el listado por rol; `usuario_baja_api`
  desactiva la cuenta y elimina su token, conservando el historial.
- Resultado de lectura: se localizaron las reglas descritas. Queda pendiente
  comprobar sus respuestas con solicitudes y datos ficticios.

### Vehículos

- [Serializador](../vehiculos/serializers.py) y [modelo](../vehiculos/models.py):
  propietario de solo lectura, validación de capacidad y normalización de placa;
  el modelo incluye unicidad de placa y capacidad positiva.
- [Vistas de vehículos](../vehiculos/views.py): `vehiculos_api` asigna el
  propietario y busca por placa, marca o modelo; `vehiculo_detalle_api` controla
  permisos y responde 409 ante un borrado protegido.
- Resultado de lectura: se localizaron las reglas de propiedad, permisos y
  borrado. La ejecución de los casos correspondientes queda pendiente.

### Reservas

- [Serializador](../reservas/serializers.py) y [vistas](../reservas/views.py):
  el pasajero proviene del usuario autenticado, se controla el acceso por rol y
  se impide cambiar el viaje o pasajero de una reserva existente.
- [Servicios](../reservas/services.py): `guardar_reserva` utiliza una transacción
  y bloquea el viaje; comprueba viaje propio, duplicados, cupos y cancelación.
  `recalcular_viaje` reparte el costo entre cupos confirmados y asigna los
  centavos restantes a la última reserva.
- Resultado de lectura: se localizaron las reglas descritas. Queda pendiente
  comprobar en ejecución permisos, reparto, concurrencia y cancelación repetida.

Las evidencias existentes de 84 pruebas y de 75 solicitudes/97 aserciones son
resultados anteriores; no se atribuyen como ejecuciones de esta lectura.

## Ramas históricas de trabajo

1. `integration/cierre-backend`: reunió la integración inicial. La integración inicial
   de reservas con baja de usuarios es el commit `552b2dc`, que conserva ambas historias.
2. `fix/validaciones-viajes-calificaciones`: filtros tipados, estado inicial y pruebas de API.
3. `refactor/paginacion-compartida`: mueve la función existente a `config/paginacion.py`.
4. `docs/cierre-entrega`: recorrido completo, datos ficticios, evidencias y documentación.

Las ramas conservan etapas del trabajo. Los PR #4, #6 y #8 ya se fusionaron a
main. La revisión de cierre debe identificar el commit final examinado; no es
necesario repetir la fusión ni presentar una revisión posterior como aprobación
previa. Los comentarios de cierre se pueden registrar en el PR #4 y enlazar aquí.

## Guía para completar la revisión personal

Las casillas siguientes corresponden a la revisión personal pendiente; no indican
que las funciones estén sin implementar ni que falten las evidencias ya guardadas.

- [ ] Ejecutar las pruebas automatizadas en la computadora de la otra integrante.
- [ ] Ejecutar la colección o `scripts/verificar_postman.py` con MySQL local.
- [ ] Confirmar que Soporte solo modifica su perfil, no recursos de negocio.
- [ ] Revisar permisos de administrador y propietario, incluyendo PATCH y DELETE.
- [ ] Explicar bloqueo del viaje, reparto por cupos y cancelación repetida.
- [ ] Verificar que los filtros inválidos devuelven 400 y los borrados protegidos 409.
- [ ] Revisar migraciones, políticas de borrado y conservación del historial.
- [ ] Revisar el diagrama y el catálogo contra el código final.
- [ ] Confirmar los límites documentados y las diferencias respecto al plan inicial.
- [ ] Verificar que el diff no contiene .env, tokens, credenciales ni datos reales.
- [ ] Registrar observaciones y aprobación en el PR.

## Ensayo de defensa

Cada integrante debe explicar el recorrido completo y un módulo escrito por la otra
persona. Demostrar registro/token, vehículo, viaje, reserva, monto, finalización,
calificación y baja lógica; incluir un 401, 403, 400 y 409. Las evidencias técnicas
no sustituyen la aprobación cruzada ni la comprobación del acceso del docente a GitHub.
