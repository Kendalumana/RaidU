# Revisión cruzada pendiente

Estado: preparada para revisión humana; sin aprobación ni fusión a main.

## Ramas locales

1. `integration/cierre-backend`: reúne el resultado final. La integración inicial
   de reservas con baja de usuarios es el commit `552b2dc`, que conserva ambas historias.
2. `fix/validaciones-viajes-calificaciones`: filtros tipados, estado inicial y pruebas de API.
3. `refactor/paginacion-compartida`: mueve la función existente a `config/paginacion.py`.
4. `docs/cierre-entrega`: recorrido completo, datos ficticios, evidencias y documentación.

Las ramas conservan etapas del trabajo. Para revisar el cierre completo, comparar
`integration/cierre-backend` con main. Para correcciones, comparar la rama fix con
`552b2dc`; para paginación, comparar refactor con fix; para documentación y recorrido,
comparar docs con refactor. Publicar y crear PR antes de pedir aprobación al otro
integrante. No fusionar sin ella.

## Puntos de revisión

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
