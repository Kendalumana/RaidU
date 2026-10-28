# Verificación de entrega

Fecha: 28 de octubre de 2026 (Costa Rica).

## Comprobaciones completadas

- 68 pruebas automatizadas aprobadas en MySQL, incluyendo dos solicitudes por el
  último cupo, duplicado simultáneo y doble cancelación simultánea.
- Postman CLI 1.73.0: 56 solicitudes y 69 aserciones, sin fallos, contra un servidor
  HTTP real local y una base temporal con migraciones desde cero.
- `manage.py check`: sin incidencias.
- `makemigrations --check --dry-run`: sin cambios pendientes.
- Revisión del diff y exclusión de .env, tokens, claves privadas y datos reales.
- Se integró la baja lógica de usuarios conservando la historia de su rama.

Las evidencias están en `evidencia-pruebas.txt` y `evidencia-postman.txt`.
Las métricas del recorrido local no son una prueba de carga.

## Instalación limpia

Pendiente de completar la comprobación en un clon local separado y un entorno
virtual nuevo, instalando exclusivamente `requirements.txt`.

## Cierre del equipo

- Revisión cruzada humana: pendiente; ver `revision-cruzada.md`.
- Fusión a main: pendiente de aprobación del equipo.
- Confirmar acceso del docente y entregar el enlace en Mediación Virtual: responsabilidad del equipo.
