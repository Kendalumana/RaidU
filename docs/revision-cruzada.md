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

## Registro pendiente de la compañera

- Revisora: yulianaurena.
- Alcance previsto: usuarios, vehículos y reservas.
- Fecha, commit, comprobaciones, resultados y enlace de comentario: pendientes.
- Completar únicamente con la revisión que efectivamente realice. Si ya la hizo,
  conservar su fecha real y distinguir lectura de código de ejecución de pruebas.

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
