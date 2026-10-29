# Postman: entrega de RaidU

## Archivos para el evaluador

- `Cierre_RaidU.postman_collection.json`: recorrido principal de 75 solicitudes numeradas.
- `Entrega_RaidU.postman_environment.json`: ejemplo sin contraseñas ni tokens; solo base_url y demo_password vacío.
- [Evidencia de Postman](../docs/evidencia-postman.txt): resultado de la ejecución comprobada.

El repositorio conserva un recorrido opcional de 30 solicitudes específico de
reservas. No hace falta importarlo para esta entrega; requiere su propia preparación.

No entregar archivos `*.private.postman_environment.json`, `.env`, entornos virtuales ni credenciales locales.

## Preparación del evaluador

1. Instalar el proyecto y configurar MySQL siguiendo el README principal. Utilizar una base de demostración con datos ficticios.
2. Activar el entorno virtual y ejecutar `python manage.py migrate`.
3. Elegir una contraseña de prueba propia y definirla en la variable local `DEMO_PASSWORD`. En PowerShell: `$env:DEMO_PASSWORD = 'SU_CLAVE_DE_PRUEBA'`, sustituyendo ese texto por una clave válida y suficientemente larga.
4. Ejecutar `python manage.py cargar_demo`. Crea o actualiza las cuentas ficticias demo_conductor@ucr.ac.cr, demo_pasajero@ucr.ac.cr, demo_otro@ucr.ac.cr, demo_soporte@ucr.ac.cr y demo_admin@ucr.ac.cr. No utilizar ese comando para cuentas reales.
5. Iniciar `python manage.py runserver`.
6. Importar la colección y el entorno de ejemplo. Escribir en demo_password la misma contraseña elegida y confirmar base_url.
7. Seleccionar ese entorno y ejecutar desde 01 hasta 75, una iteración. También se puede pulsar Send en cada solicitud, respetando el orden.

Las solicitudes 04 a 08 llaman a `/api/token/` con las cuentas del evaluador. Los scripts guardan sus tokens como variables de la colección. Los identificadores se obtienen de las respuestas de creación. No hay tokens del equipo ni identificadores de su base incluidos en la entrega.

No añadir tokens ni identificadores antiguos al entorno: las variables del entorno tienen prioridad sobre las variables que genera la colección.

## Qué se prueba

- Usuarios: registro, token, perfil GET/PATCH, listado autorizado y baja lógica.
- Vehículos: GET/POST del listado y GET/PUT/PATCH/DELETE del detalle.
- Viajes: GET/POST del listado y GET/PUT/PATCH/DELETE del detalle, incluyendo borrado válido sin historial y rechazo con historial.
- Reservas: GET/POST del listado y GET/PUT/PATCH/DELETE del detalle; cupos, unicidad, montos y cancelación.
- Calificaciones: GET/POST del listado, GET/PUT/PATCH/DELETE del detalle y promedio. Participantes, duplicados, puntajes y edición exclusiva del autor.
- Seguridad y consultas: perfiles, accesos denegados, filtros combinados, búsqueda, ordenamiento y paginación de viajes/reservas.

Las primeras 56 solicitudes mantienen el recorrido integrado anterior. Las 57 a 75 amplían métodos y casos CRUD. Un 400/401/403/404/409 puede ser el resultado esperado: evaluar las aserciones PASS/FAIL, no solo el color del código HTTP.

La colección cubre 31 combinaciones de ruta y método de negocio (GET, POST, PUT,
PATCH y DELETE), no todas las combinaciones posibles de datos. No contabiliza
HEAD y OPTIONS automáticos. Concurrencia y formularios de Django Admin se verifican
en la suite automatizada del proyecto. La evidencia de Postman no certifica esos
escenarios por sí sola.

Resultado comprobado de esta colección: 75 solicitudes y 97 aserciones aprobadas,
cero fallos, sobre MySQL temporal con migraciones desde cero. La suite automatizada
de la ampliación administrativa tiene 84 pruebas aprobadas. Los resultados no deben
sumarse como si fueran una sola clase de pruebas.

Cada ejecución crea registros ficticios nuevos. No usar sobre una base con información real. El recorrido elimina algunos registros y conserva viajes/reservas por sus políticas de historial.
