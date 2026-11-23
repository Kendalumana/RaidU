# Proyecto 02: Frontend SPA en React – RaidU

**Universidad de Costa Rica – Sede del Pacífico**  
**Bachillerato en Informática Empresarial**  
**Desarrollo de Software IV**  
**Fecha de Entrega:** 23/11/2026  
**Tecnologías:** React 19, Vite, Bootstrap 5, Axios, React Router 7, Django REST Framework, MySQL.

---

## 1. Reglas de Negocio Implementadas y Validadas

### A. Módulo de Usuarios y Autenticación
1. **Autenticación con Token:** Solicitud `POST /api/token/` con almacenamiento local en `localStorage` mediante `AuthContext`.
2. **Dominio Institucional:** El registro exige estrictamente cuentas con terminación `@ucr.ac.cr`.
3. **Jerarquía de Permisos:**
   - **Administrador / Staff:** Control de acceso y visualización completa de usuarios y viajes.
   - **Soporte:** Perfil de solo lectura (cualquier intento de modificación o borrado emite `403 Forbidden`).
   - **Estudiante / Conductor:** Visualización propia y gestión de sus propios recursos.
4. **Baja Lógica:** La desactivación (`DELETE /api/usuarios/<id>/`) cambia `is_active=False` y revoca tokens sin eliminar registros históricos protegidos por clave foránea.

### B. Módulo de Vehículos
1. **Propiedad Estricta:** Un usuario solo puede registrar, editar o eliminar vehículos que le pertenecen.
2. **Formato de Placa:** La placa es obligatoria, única y de hasta 15 caracteres. Se registra al crear el vehículo y se conserva al editarlo.
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

## 2. Pantallas y endpoints

### Login (`/login`)

| Acción | Solicitud REST | HTTP |
| --- | --- | --- |
| Inicio de sesión con credenciales UCR | `POST` `/api/token/` | 200, 400 |

### Registro (`/registro`)

| Acción | Solicitud REST | HTTP |
| --- | --- | --- |
| Creación de cuenta de estudiante UCR | `POST` `/api/registro/` | 201, 400 |

### Mi Perfil (`/perfil`)

| Acción | Solicitud REST | HTTP |
| --- | --- | --- |
| Cargar datos del usuario logueado | `GET` `/api/perfil/` | 200, 401 |
| Actualizar nombre y teléfono | `PATCH` `/api/perfil/` | 200, 400 |

### Dashboard (`/`)

| Acción | Solicitud REST | HTTP |
| --- | --- | --- |
| Resumen de viajes, vehículos y actividad | `GET` `/api/viajes/`, `/api/vehiculos/`, `/api/reservas/` | 200 |

### Vehículos (`/vehiculos`)

| Acción | Solicitud REST | HTTP |
| --- | --- | --- |
| Listado paginado de vehículos propios | `GET` `/api/vehiculos/?page=X` | 200 |
| Registro de nuevo vehículo con placa | `POST` `/api/vehiculos/` | 201, 400 |
| Modificación de capacidad o modelo | `PUT` / `PATCH` `/api/vehiculos/<id>/` | 200, 400 |
| Eliminación de vehículo sin viajes activos | `DELETE` `/api/vehiculos/<id>/` | 204, 409 |

### Viajes (`/viajes`)

| Acción | Solicitud REST | HTTP |
| --- | --- | --- |
| Catálogo paginado con filtros de sede/fecha | `GET` `/api/viajes/?sede_origen=&fecha=&page=X` | 200 |
| Publicación de nuevo viaje institucional | `POST` `/api/viajes/` | 201, 400 |
| Iniciar o finalizar viaje | `PATCH` `/api/viajes/<id>/` (ej: `{"estado": "finalizado"}`) | 200, 400 |
| Cancelar viaje con reservas | `PATCH` `/api/viajes/<id>/` (ej: `{"estado": "cancelado"}`) | 200 |

### Reservas (`/reservas`)

| Acción | Solicitud REST | HTTP |
| --- | --- | --- |
| Listado de reservas activas del usuario | `GET` `/api/reservas/?estado=confirmada&page=X` | 200 |
| Creación de reserva de cupos | `POST` `/api/reservas/` | 201, 400, 409 |
| Reducción de cupos de reserva | `PATCH` `/api/reservas/<id>/` | 200, 400 |
| Cancelación atómica de reserva | `DELETE` `/api/reservas/<id>/` | 204 |

### Calificaciones (`/calificaciones`)

| Acción | Solicitud REST | HTTP |
| --- | --- | --- |
| Listar historial de calificaciones | `GET` `/api/calificaciones/?page=X` | 200 |
| Consultar otros participantes de un viaje finalizado | `GET` `/api/viajes/<id>/participantes/` | 200, 400, 401, 403, 404 |
| Emitir reseña a participante de viaje | `POST` `/api/calificaciones/` | 201, 400 |
| Consultar promedio y estrellas recibidas | `GET` `/api/calificaciones/promedio/<id>/` | 200 |
| Editar o eliminar calificación propia | `PATCH` / `DELETE` `/api/calificaciones/<id>/` | 200, 204 |

### Usuarios UCR (`/usuarios`)

| Acción | Solicitud REST | HTTP |
| --- | --- | --- |
| Panel de moderación de usuarios (Staff) | `GET` `/api/usuarios/?page=X` | 200, 403 |
| Desactivación / baja lógica de cuenta | `DELETE` `/api/usuarios/<id>/` | 204, 403 |

## 3. Casos de negocio

### 1. Autenticación Exitosa

Estudiante. Correo `@ucr.ac.cr` y contraseña correcta.

**Resultado esperado** · Genera token DRF, almacena en `localStorage` y redirige al Dashboard. `200 OK`

### 2. Credenciales Inválidas

Estudiante. Correo `@ucr.ac.cr` y contraseña errónea.

**Resultado esperado** · Muestra alerta visual de credenciales incorrectas; no ingresa al sistema. `400 Bad Request`

### 3. Registro con Correo no Institucional

Visitante. Correo `@gmail.com`.

**Resultado esperado** · El formulario y la API rechazan el registro indicando exigencia de correo `@ucr.ac.cr`. `400 Bad Request`

### 4. Intento de Modificación por Soporte

Soporte. Modificar datos de usuario o vehículo.

**Resultado esperado** · La vista deshabilita botones y la API responde con restricción de solo lectura. `403 Forbidden`

### 5. Alta de Vehículo con Placa Válida

Conductor. Placa única de hasta 15 caracteres, capacidad 4.

**Resultado esperado** · Guarda vehículo propio, se lista en la tabla y se vincula al conductor. `201 Created`

### 6. Eliminación de Vehículo con Viajes

Conductor. Eliminar vehículo asignado a viajes activos.

**Resultado esperado** · La API protege la integridad referencial y devuelve conflicto por relaciones protegidas. `409 Conflict`

### 7. Publicación de Viaje con Misma Sede

Conductor. Sede Origen = Sede Destino.

**Resultado esperado** · Formulario impide seleccionar la misma sede o la API devuelve validación de sedes distintas. `400 Bad Request`

### 8. Publicación de Viaje en Fecha Pasada

Conductor. Fecha/hora anterior a la actual.

**Resultado esperado** · El sistema rechaza la fecha indicando que la salida debe ser futura. `400 Bad Request`

### 9. Reserva de Cupos Superiores a Disponibles

Pasajero. Intentar reservar 5 cupos cuando quedan 2.

**Resultado esperado** · La API y el frontend limitan los cupos al máximo disponible y devuelven conflicto si se excede. `409 Conflict`

### 10. Reserva en Viaje Propio del Conductor

Conductor. Conductor intenta reservar en su propio viaje.

**Resultado esperado** · El selector no ofrece sus viajes propios y el backend rechaza la solicitud. `400 Bad Request`

### 11. Calificar Viaje por No Participante

Pasajero. Intentar calificar un viaje donde no estuvo.

**Resultado esperado** · El formulario y la API impiden calificar; devuelve error de que ambos deben haber participado. `400 Bad Request`

### 12. Calificar Viaje Finalizado con Éxito

Pasajero. Calificación de 5 estrellas al conductor.

**Resultado esperado** · Registra la calificación, actualiza el promedio del usuario y lo refleja en la tabla. `201 Created`

## 4. Capturas de la interfaz

| Pantalla | Evidencia |
| --- | --- |
| Vehículos | [Listado](capturas/vehiculos-listado.jpg) · [Placa bloqueada](capturas/placa-bloqueada.jpg) |
| Usuarios con perfil administrador | [Escritorio](capturas/usuarios-admin-gestiona.jpg) · [Móvil](capturas/usuarios-admin-gestiona-movil.jpg) |
| Paginación de usuarios | [Segunda página](capturas/usuarios-pagina-2-desktop.jpg) |
| Usuarios con perfil de soporte | [Solo lectura en escritorio](capturas/usuarios-soporte-soloLectura.jpg) · [Solo lectura en móvil](capturas/soporte-soloLectura-movil.jpg) |
| Acceso denegado | [Escritorio](capturas/usuario-acceso-denegado.jpg) · [Móvil](capturas/usuarios-accesoDenegado-movil.jpg) |
## 5. Matriz de Perfiles y Permisos (Requisito 5 y 17)

El sistema demuestra formalmente **tres perfiles de acceso** con diferencias claras tanto en la interfaz React como en la autorización del backend Django REST Framework:

| Módulo / Funcionalidad | Perfil Estudiante Regular | Perfil Soporte Técnico | Perfil Administrador (`is_staff`) |
|---|---|---|---|
| **Acceso a la SPA y Login** | ✅ Permitido con token real | ✅ Permitido con token real | ✅ Permitido con token real |
| **Gestión de Vehículos** | CRUD exclusivo de **sus propios** vehículos | Solo lectura de todos los vehículos (POST/PATCH/DELETE bloqueado con 403) | CRUD completo de vehículos (propios y del sistema) |
| **Publicación de Viajes** | Permitido si posee vehículos propios registrados | Solo lectura de viajes (bloqueado con 403) | Permitido con vehículos propios |
| **Gestión de Reservas** | Puede reservar en viajes de otros y cancelar sus reservas | Solo consulta global (bloqueado para crear o modificar con 403) | Gestión completa y auditoría |
| **Calificaciones** | Puede evaluar viajes donde participó | Solo lectura de calificaciones | Puede evaluar viajes y moderar/eliminar valoraciones |
| **Módulo de Usuarios (`/usuarios`)** | ❌ **Acceso denegado:** No visible en menú. Ruta protegida con pantalla de "Acceso Restringido" y 403 en API | ✅ **Solo lectura:** Puede buscar y consultar la lista y vehículos asociados | ✅ **Acceso completo:** Puede consultar, filtrar y **desactivar cuentas** |
| **Dashboard** | Indicadores personales (Mis vehículos, mis reservas, mi promedio) | Indicadores de consulta y acceso a usuarios | KPIs globales de la plataforma (total usuarios, vehículos, viajes, reservas) |
| **Baja de cuenta propia** | ✅ Permitida desde `/ajustes` | ❌ Bloqueada por regla de negocio | ✅ Permitida |

---

## 6. Pruebas manuales

Resultados registrados por el equipo en la matriz de pruebas.

### 1. Login exitoso

Ingresar credenciales válidas en `/login`.

**Resultado esperado** · Obtención de token Django vía `POST /api/token/`, almacenamiento en `localStorage`, carga de perfil con rol y redirección al Dashboard.

**Estado registrado** · ✅ **Superado**

### 2. Logout y limpieza de sesión

Clic en "Cerrar sesión" en el menú de perfil o topbar.

**Resultado esperado** · Eliminación del token y datos de usuario en `localStorage`, redirección inmediata a `/login` e invalidación del estado en memoria.

**Estado registrado** · ✅ **Superado**

### 3. Navegación SPA y Rutas Protegidas

Intentar ingresar a `/viajes` o `/vehiculos` sin haber iniciado sesión.

**Resultado esperado** · El componente `ProtectedRoute.jsx` intercepta la navegación y redirige de inmediato a `/login` sin recargar la página.

**Estado registrado** · ✅ **Superado**

### 4. CRUD: Creación de Vehículo

En `/vehiculos`, registrar vehículo con placa, marca, modelo y 3 asientos.

**Resultado esperado** · Envío de `POST /api/vehiculos/`, validación de capacidad (1 a 5), asignación del usuario autenticado como propietario (`201 Created`) y actualización de la lista.

**Estado registrado** · ✅ **Superado**

### 5. CRUD: Edición y Eliminación de Vehículo

Editar el modelo de un vehículo y luego eliminar un vehículo sin viajes.

**Resultado esperado** · `PATCH /api/vehiculos/<id>/` actualiza los datos. `DELETE /api/vehiculos/<id>/` pide confirmación y retorna `204 No Content`.

**Estado registrado** · ✅ **Superado**

### 6. CRUD: Publicación de Viaje y Cupos Dinámicos

En `/viajes`, seleccionar un vehículo con capacidad de 3 pasajeros.

**Resultado esperado** · El formulario ajusta automáticamente `max="3"` en cupos. Impide valores $<1$ o $>3$. Al guardar envía `POST /api/viajes/` con `201 Created`.

**Estado registrado** · ✅ **Superado**

### 7. CRUD: Reserva con Recálculo

En `/reservas`, reservar 2 cupos en un viaje publicado.

**Resultado esperado** · `POST /api/reservas/` crea la reserva (`201 Created`), calcula el aporte proporcional y decrementa los cupos disponibles en el viaje.

**Estado registrado** · ✅ **Superado**

### 8. CRUD: Calificación de Viaje

En `/calificaciones`, evaluar con 5 estrellas un viaje finalizado.

**Resultado esperado** · `POST /api/calificaciones/` verifica que el viaje esté finalizado y que ambos usuarios hayan participado. Se actualiza el promedio de reputación.

**Estado registrado** · ✅ **Superado**

### 9. Búsqueda y Filtros Combinables

En `/viajes`, filtrar por Sede Origen: *Puntarenas* y Estado: *Publicado*. En `/vehiculos`, buscar por texto.

**Resultado esperado** · Los filtros consumen los query params de Django REST Framework (`sede_origen`, `estado`, `search`), actualizando la lista sin recarga.

**Estado registrado** · ✅ **Superado**

### 10. Paginación de Datos del Servidor

Navegar entre páginas en `/vehiculos` y `/viajes`.

**Resultado esperado** · Se consumen los metadatos de paginación (`count`, `page`, `total_pages` o `pagina_actual`), trayendo la siguiente página de forma reactiva.

**Estado registrado** · ✅ **Superado**

### 11. Validación de Formularios y Errores 400

Intentar crear un viaje con fecha en el pasado o con sede origen igual a destino.

**Resultado esperado** · La validación del frontend y los errores `400 Bad Request` del serializer de Django se despliegan con mensajes claros e inputs resaltados en rojo.

**Estado registrado** · ✅ **Superado**

### 12. Accesos Denegados (401 y 403)

1) Ingresar con Estudiante a `/usuarios` o enviar petición sin token. 2) Soporte intentando modificar datos.

**Resultado esperado** · 1) El estudiante recibe aviso de "Acceso Restringido" y la API responde `403 Forbidden`. 2) Soporte recibe `403` informando que su rol es de solo lectura.

**Estado registrado** · ✅ **Superado**
