# Verificación de entrega

Fecha: 28 de octubre de 2026 (Costa Rica).

## Comprobaciones completadas

- 75 pruebas automatizadas aprobadas en MySQL, incluyendo dos solicitudes por el
  último cupo, duplicado simultáneo y doble cancelación simultánea.
- Postman CLI 1.73.0: 56 solicitudes y 69 aserciones, sin fallos, contra un servidor
  HTTP real local y una base temporal con migraciones desde cero.
- Recorrido específico de reservas: 30 solicitudes y 50 aserciones aprobadas en
  otra base temporal. Los dos recorridos se ejecutan por separado y no deben
  presentarse como una sola colección.
- `manage.py check`: sin incidencias.
- `makemigrations --check --dry-run`: sin cambios pendientes.
- Revisión del diff y exclusión de .env, tokens, claves privadas y datos reales.
- Se integró la baja lógica de usuarios conservando la historia de su rama.

Las evidencias están en `evidencia-pruebas.txt` y `evidencia-postman.txt`.
Las métricas del recorrido local no son una prueba de carga.

## Instalación limpia de la versión anterior

Completada en un clon local separado del commit `da8d8be`, con un entorno virtual
nuevo y Python 3.14.7. No se reutilizó el entorno virtual del desarrollo.

| Paso | Resultado |
| --- | --- |
| Clonar la rama de cierre en otra carpeta | Aprobado |
| Crear entorno virtual vacío | Aprobado |
| Instalar exclusivamente `requirements.txt` | Aprobado |
| `pip check` | Sin dependencias incompatibles |
| `manage.py check` | Sin incidencias |
| `makemigrations --check --dry-run` | Sin cambios |
| Suite completa sobre MySQL temporal | 68 pruebas aprobadas |
| Migrar desde cero y repetir Postman por HTTP | 56 solicitudes y 69 aserciones aprobadas |

La conexión a MySQL se proporcionó mediante variables locales; no se copiaron ni
versionaron credenciales en el clon. Las dos comprobaciones usaron la base temporal
de manera secuencial y la eliminaron al terminar. El ajuste posterior de la salida
de evidencia elimina líneas vacías finales y no cambia el comportamiento de la API.

## Cierre del equipo

- Revisión cruzada humana: pendiente; ver `revision-cruzada.md`.
- La integración anterior llegó a main mediante el PR #4. La corrección de edición
  exclusiva del autor y validación de estados de viajes requiere revisión y fusión.
- El PR #7 espera que un administrador edite una calificación ajena recibida. Ese
  caso debe actualizarse a 403 para respetar la edición exclusiva del autor; no se
  debe fusionar su prueba actual junto con esta regla.
- Los conflictos del PR #6 se resolvieron incorporando main y la corrección del #8,
  conservando las pruebas de participación y permisos. El #6 se compara con
  fix/cierre-viajes mientras se revisa el #8. Después de fusionar el #8, cambiar
  el destino del #6 a main, revisar el diff y registrar la aprobación cruzada.
- Repetir la instalación limpia sobre el commit final que se entregará. Las 75
  pruebas y Postman actuales usaron un checkout separado y bases temporales nuevas,
  pero reutilizaron el entorno Python local. No equivalen a instalar dependencias
  desde cero en esa versión.
- Confirmar acceso del docente y entregar el enlace en Mediación Virtual: responsabilidad del equipo.

El archivo `entrega.txt` contiene el enlace del repositorio. Subirlo después de la
aprobación cruzada y de comprobar que main incluye la versión revisada.
