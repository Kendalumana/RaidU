# Proyecto 02: Frontend SPA en React – RaidU

**Universidad de Costa Rica – Sede del Pacífico**  
**Bachillerato en Informática Empresarial**  
**Desarrollo de Software IV**  
**Fecha de Entrega:** 23/11/2026  
**Tecnologías:** React 19, Vite, Bootstrap 5, Axios, React Router 7, Django REST Framework, MySQL.

---

## 1. Reglas de Negocio Implementadas y Validadas

### A. Módulo de Usuarios y Autenticación
1. **Autenticación con Token:** Solicitud `POST /api/token/` con almacenamiento seguro en `localStorage` mediante `AuthContext`.
2. **Dominio Institucional:** El registro exige estrictamente cuentas con terminación `@ucr.ac.cr`.
3. **Jerarquía de Permisos:**
   - **Administrador / Staff:** Control de acceso y visualización completa de usuarios y viajes.
   - **Soporte:** Perfil de solo lectura (cualquier intento de modificación o borrado emite `403 Forbidden`).
   - **Estudiante / Conductor:** Visualización propia y gestión de sus propios recursos.
4. **Baja Lógica:** La desactivación (`DELETE /api/usuarios/<id>/`) cambia `is_active=False` y revoca tokens sin eliminar registros históricos protegidos por clave foránea.

### B. Módulo de Vehículos
1. **Propiedad Estricta:** Un usuario solo puede registrar, editar o eliminar vehículos que le pertenecen.
2. **Formato de Placa:** Validación de placas costarricenses (3 letras y 3 números, o 6 dígitos).
3. **Integridad Referencial:** Si un vehículo está vinculado a viajes activos, la API rechaza su eliminación con `409 Conflict`.

### C. Módulo de Viajes
1. **Perfil Conductor Requerido:** Para publicar un viaje, el usuario debe poseer al menos un vehículo registrado y activo.
2. **Sedes Universitarias Distintas:** Origen y destino deben pertenecer al catálogo oficial (`rodrigo_facio`, `san_ramon`, `esparza`, `puntarenas`) y no pueden ser idénticos.
3. **Salida Futura Obligatoria:** La fecha y hora de partida deben ser estrictamente posteriores a la fecha/hora actual.
4. **Ciclo de Vida del Viaje:** Transiciones permitidas: `publicado` $\rightarrow$ `en_curso` $\rightarrow$ `finalizado` (o `cancelado`).
5. **Cancelación Atómica:** Al cancelar un viaje, sus reservas asociadas se cancelan automáticamente y se liberan cupos.
6. **Consulta de viajes:** «Mis viajes» incluye los viajes conducidos y las reservas confirmadas del usuario. «Viajes disponibles» muestra viajes publicados con salida futura y cupos libres.

### D. Módulo de Reservas
1. **Exclusión de Viajes Propios y Pasados:** No se permite reservar un viaje conducido por uno mismo ni viajes cuya hora ya transcurrió.
2. **Unicidad `(viaje, pasajero)`:** Un pasajero solo puede tener una reserva por viaje. Si ya tiene una reserva (confirmada o cancelada), dicho viaje no se ofrece para nuevas reservas.
3. **Edición de cupos:** Una reserva confirmada de un viaje editable admite hasta sus cupos actuales más los asientos libres. La API valida la disponibilidad dentro de la transacción.
4. **Cancelación / Eliminación Atómica:** En el backend se realiza borrado lógico conservando auditoría, mientras que en la interfaz la reserva desaparece de inmediato de las reservas activas.
5. **Reparto de Costos:** Reparto proporcional exacto entre los cupos reservados mediante cálculo decimal con redondeo hacia abajo, absorbiendo centavos en la última reserva.

### E. Módulo de Calificaciones y Reseñas
1. **Participación Estricta:** **Solo pueden calificar viajes en los que hayan participado activamente**. El usuario debe haber sido el **conductor** del viaje o un **pasajero con reserva confirmada**. Un usuario ajeno al viaje no puede emitir calificación ni le aparece la opción de calificar.
2. **Viajes Finalizados Únicamente:** La evaluación solo es válida en viajes con estado `finalizado`. Los viajes cancelados o en curso no admiten calificaciones (`400 Bad Request`).
3. **Unicidad de la Calificación:** Restricción `UniqueConstraint(fields=['viaje', 'calificador', 'calificado'])`. No se permite calificar dos veces al mismo participante en el mismo viaje.
4. **Prohibición de Autocalificación:** Un usuario no puede calificarse a sí mismo (`calificador != calificado`).
5. **Puntaje Válido:** Rango de 1 a 5 estrellas con cálculo en tiempo real de promedio y cantidad de reseñas (`GET /api/calificaciones/promedio/<usuario_id>/`).

---

## 2. Matriz de Pantallas vs Endpoints (Requisito Obligatorio)

| Pantalla / Vista | Acción del Usuario | Método HTTP | Endpoint de la API REST | Códigos de Respuesta Manejados |
| :--- | :--- | :---: | :--- | :---: |
| **Login** (`/login`) | Inicio de sesión con credenciales UCR | `POST` | `/api/token/` | `200 OK`, `400 Bad Request` |
| **Registro** (`/registro`) | Creación de cuenta de estudiante UCR | `POST` | `/api/registro/` | `201 Created`, `400 Bad Request` |
| **Mi Perfil** (`/perfil`) | Cargar datos del usuario logueado | `GET` | `/api/perfil/` | `200 OK`, `401 Unauthorized` |
| **Mi Perfil** (`/perfil`) | Actualizar nombre y teléfono | `PATCH` | `/api/perfil/` | `200 OK`, `400 Bad Request` |
| **Dashboard** (`/`) | Resumen de viajes, vehículos y actividad | `GET` | `/api/viajes/`, `/api/vehiculos/`, `/api/reservas/` | `200 OK` |
| **Vehículos** (`/vehiculos`) | Listado paginado de vehículos propios | `GET` | `/api/vehiculos/?page=X` | `200 OK` |
| **Vehículos** (`/vehiculos`) | Registro de nuevo vehículo con placa | `POST` | `/api/vehiculos/` | `201 Created`, `400 Bad Request` |
| **Vehículos** (`/vehiculos`) | Modificación de capacidad o modelo | `PUT` / `PATCH` | `/api/vehiculos/<id>/` | `200 OK`, `400 Bad Request` |
| **Vehículos** (`/vehiculos`) | Eliminación de vehículo sin viajes activos | `DELETE` | `/api/vehiculos/<id>/` | `204 No Content`, `409 Conflict` |
| **Viajes** (`/viajes`) | Catálogo paginado con filtros de sede/fecha | `GET` | `/api/viajes/?sede_origen=&fecha=&page=X` | `200 OK` |
| **Viajes** (`/viajes`) | Publicación de nuevo viaje institucional | `POST` | `/api/viajes/` | `201 Created`, `400 Bad Request` |
| **Viajes** (`/viajes`) | Iniciar o finalizar viaje | `PATCH` | `/api/viajes/<id>/` (ej: `{"estado": "finalizado"}`) | `200 OK`, `400 Bad Request` |
| **Viajes** (`/viajes`) | Cancelar viaje con reservas | `PATCH` | `/api/viajes/<id>/` (ej: `{"estado": "cancelado"}`) | `200 OK` |
| **Reservas** (`/reservas`) | Listado de reservas activas del usuario | `GET` | `/api/reservas/?estado=confirmada&page=X` | `200 OK` |
| **Reservas** (`/reservas`) | Creación de reserva de cupos | `POST` | `/api/reservas/` | `201 Created`, `400`, `409 Conflict` |
| **Reservas** (`/reservas`) | Reducción de cupos de reserva | `PATCH` | `/api/reservas/<id>/` | `200 OK`, `400 Bad Request` |
| **Reservas** (`/reservas`) | Cancelación atómica de reserva | `DELETE` | `/api/reservas/<id>/` | `204 No Content` |
| **Calificaciones** (`/calificaciones`) | Listar historial de calificaciones | `GET` | `/api/calificaciones/?page=X` | `200 OK` |
| **Calificaciones** (`/calificaciones`) | Consultar otros participantes de un viaje finalizado | `GET` | `/api/viajes/<id>/participantes/` | `200 OK`, `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found` |
| **Calificaciones** (`/calificaciones`) | Emitir reseña a participante de viaje | `POST` | `/api/calificaciones/` | `201 Created`, `400 Bad Request` |
| **Calificaciones** (`/calificaciones`) | Consultar promedio y estrellas recibidas | `GET` | `/api/calificaciones/promedio/<id>/` | `200 OK` |
| **Calificaciones** (`/calificaciones`) | Editar o eliminar calificación propia | `PATCH` / `DELETE` | `/api/calificaciones/<id>/` | `200 OK`, `204 No Content` |
| **Usuarios UCR** (`/usuarios`) | Panel de moderación de usuarios (Staff) | `GET` | `/api/usuarios/?page=X` | `200 OK`, `403 Forbidden` |
| **Usuarios UCR** (`/usuarios`) | Desactivación / baja lógica de cuenta | `DELETE` | `/api/usuarios/<id>/` | `204 No Content`, `403 Forbidden` |

---

## 3. Matriz de 12 Escenarios de Prueba Funcionales

| # | Escenario de Prueba | Rol / Actor | Datos de Entrada | Resultado Esperado | Código HTTP |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **1** | **Autenticación Exitosa** | Estudiante | Correo `@ucr.ac.cr` y contraseña correcta | Genera token DRF, almacena en `localStorage` y redirige al Dashboard. | `200 OK` |
| **2** | **Credenciales Inválidas** | Estudiante | Correo `@ucr.ac.cr` y contraseña errónea | Muestra alerta visual de credenciales incorrectas; no ingresa al sistema. | `400 Bad Request` |
| **3** | **Registro con Correo no Institucional** | Visitante | Correo `@gmail.com` | El formulario y la API rechazan el registro indicando exigencia de correo `@ucr.ac.cr`. | `400 Bad Request` |
| **4** | **Intento de Modificación por Soporte** | Soporte | Modificar datos de usuario o vehículo | La vista deshabilita botones y la API responde con restricción de solo lectura. | `403 Forbidden` |
| **5** | **Alta de Vehículo con Placa Válida** | Conductor | Placa única de hasta 15 caracteres, capacidad 4 | Guarda vehículo propio, se lista en la tabla y se vincula al conductor. | `201 Created` |
| **6** | **Eliminación de Vehículo con Viajes** | Conductor | Eliminar vehículo asignado a viajes activos | La API protege la integridad referencial y devuelve conflicto por relaciones protegidas. | `409 Conflict` |
| **7** | **Publicación de Viaje con Misma Sede** | Conductor | Sede Origen = Sede Destino | Formulario impide seleccionar la misma sede o la API devuelve validación de sedes distintas. | `400 Bad Request` |
| **8** | **Publicación de Viaje en Fecha Pasada** | Conductor | Fecha/hora anterior a la actual | El sistema rechaza la fecha indicando que la salida debe ser futura. | `400 Bad Request` |
| **9** | **Reserva de Cupos Superiores a Disponibles** | Pasajero | Intentar reservar 5 cupos cuando quedan 2 | La API y el frontend limitan los cupos al máximo disponible y devuelven conflicto si se excede. | `409 Conflict` |
| **10** | **Reserva en Viaje Propio del Conductor** | Conductor | Conductor intenta reservar en su propio viaje | El selector no ofrece sus viajes propios y el backend rechaza la solicitud. | `400 Bad Request` |
| **11** | **Calificar Viaje por No Participante** | Pasajero | Intentar calificar un viaje donde no estuvo | El formulario y la API impiden calificar; devuelve error de que ambos deben haber participado. | `400 Bad Request` |
| **12** | **Calificar Viaje Finalizado con Éxito** | Pasajero | Calificación de 5 estrellas al conductor | Registra la calificación, actualiza el promedio del usuario y lo refleja en la tabla. | `201 Created` |
