# Verificación de entrega

Evidencias de ejecución: 28 de octubre de 2026 (Costa Rica).
Estado de cierre actualizado: 29 de octubre de 2026.

## Comprobaciones completadas

- 84 pruebas automatizadas aprobadas en MySQL, incluyendo nueve del administrador y dos solicitudes por el
  último cupo, duplicado simultáneo y doble cancelación simultánea.
- Postman CLI 1.73.0: 75 solicitudes y 97 aserciones, sin fallos, contra un servidor
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

- Comentario de revisión asistida registrado. El cierre de la revisión cruzada
  personal y el comentario de la compañera siguen pendientes; ver `revision-cruzada.md`.
- Los PR #4, #8 y #6 se fusionaron a main. El #7 se cerró sin fusionar porque su
  prueba de edición por administrador contradice la edición exclusiva del autor.
- El administrador de viajes y reservas utiliza las operaciones de la API. Su
  ampliación quedó en 6d5550a y pasó 84 pruebas; ver evidencia-admin.txt.
- Se comprobó instalación limpia sobre aeb271e: entorno nuevo, requirements.txt,
  pip check, 75 pruebas y ambos recorridos de Postman aprobados. El informe adicional
  se conservó localmente; esa comprobación precede a la ampliación administrativa.
- La colección de entrega se amplió de 56 a 75 solicitudes y se comprobó con 97
  aserciones, usando migraciones desde cero y MySQL temporal. El entorno público
  y las instrucciones están en postman/Entrega_RaidU.postman_environment.json y
  postman/LEEME_ENTREGA.md. No contiene tokens ni contraseña del equipo.
- La última ampliación reutilizó el entorno Python local. Si se exige comprobar
  instalación limpia de cada commit final, repetirla sobre la versión entregada.
- Integración a main y publicación del documento técnico actualizado: realizadas.
- Autorización para equipo de dos: confirmada por Kendalumana, quien indica que
  se acordó con el docente desde el inicio.
- Repositorio público y enlace funcional: confirmados.
- Subida de entrega.txt a Mediación Virtual y comprobante: aún no confirmados.

El archivo `entrega.txt` contiene el enlace del repositorio. La integración ya está
publicada; queda confirmar la entrega en Mediación y completar la constancia de
revisión cruzada.

## Limite de capacidad actualizado

El 29 de octubre se limito la capacidad de vehiculos a 1–5 pasajeros, sin conductor.
Se repitieron las 84 pruebas y el recorrido Postman de 75 solicitudes y 97 aserciones,
sin fallos. La nueva migracion se aplico localmente. Ver `evidencia-capacidad-cinco.txt`.
