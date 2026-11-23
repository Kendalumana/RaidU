# RaidU – Matriz de Pantallas, Endpoints y Perfiles (Proyecto 02)

**Curso:** IF0009 – Desarrollo de Software IV  
**Universidad de Costa Rica – Sede Regional del Pacífico**  
**Fecha de Entrega:** 23/11/2026  

---

## 1. Matriz de Pantallas y Endpoints REST (Requisito 16)

La siguiente matriz vincula cada pantalla y componente de la Single Page Application (SPA) construida en React con las operaciones y endpoints de la API REST de Django REST Framework.

| Pantalla / Vista | Componente React | Acción de la Interfaz | Método | Endpoint REST | Parámetros / Payload | Respuesta HTTP |
|---|---|---|:---:|---|---|:---:|
| **Login** | `LoginPage.jsx` | Iniciar sesión y autenticarse | `POST` | `/api/token/` | `{ username, password }` | `200 OK` (token) / `400 Bad Request` |
| **Login** | `LoginPage.jsx` | Cargar perfil completo tras login | `GET` | `/api/perfil/` | Headers: `Authorization: Token` | `200 OK` |
| **Registro** | `RegistroPage.jsx` | Registrar nueva cuenta estudiante | `POST` | `/api/usuarios/registro/` | `{ email, password, first_name, last_name, telefono }` | `201 Created` / `400 Bad Request` |
| **Dashboard** | `Dashboard.jsx` | Contar vehículos para indicador | `GET` | `/api/vehiculos/?page=1` | Headers de token | `200 OK` (`count`) |
| **Dashboard** | `Dashboard.jsx` | Contar viajes disponibles | `GET` | `/api/viajes/?page=1` | Headers de token | `200 OK` (`total_registros`) |
| **Dashboard** | `Dashboard.jsx` | Contar reservas del usuario | `GET` | `/api/reservas/?page=1` | Headers de token | `200 OK` (`total_registros`) |
| **Dashboard** | `Dashboard.jsx` | Consultar promedio de estrellas | `GET` | `/api/calificaciones/promedio/<id>/` | ID del usuario autenticado | `200 OK` (`promedio`, `total`) |
| **Dashboard** | `Dashboard.jsx` | Contar total de usuarios (Solo Staff) | `GET` | `/api/usuarios/?page=1` | Requiere `is_staff=True` o `Soporte` | `200 OK` (`count`) / `403 Forbidden` |
| **Vehículos** | `VehiculosPage.jsx` | Listar vehículos con paginación y búsqueda | `GET` | `/api/vehiculos/?page=N&search=...` | `page`, `search` (placa/marca/modelo) | `200 OK` (`results`, `total_pages`) |
| **Vehículos** | `VehiculosPage.jsx` | Registrar nuevo vehículo | `POST` | `/api/vehiculos/` | `{ placa, marca, modelo, capacidad }` | `201 Created` / `400 Bad Request` |
| **Vehículos** | `VehiculosPage.jsx` | Editar información de vehículo | `PATCH` | `/api/vehiculos/<id>/` | `{ placa, marca, modelo, capacidad }` | `200 OK` / `400 Bad Request` |
| **Vehículos** | `VehiculosPage.jsx` | Eliminar vehículo | `DELETE` | `/api/vehiculos/<id>/` | ID del vehículo | `204 No Content` / `409 Conflict` (si tiene viajes) |
| **Viajes** | `ViajesPage.jsx` | Consultar vehículos propios para habilitar publicación | `GET` | `/api/vehiculos/?page=1` | Headers de token | `200 OK` |
| **Viajes** | `ViajesPage.jsx` | Listar viajes con filtros combinables | `GET` | `/api/viajes/?page=N&...` | `sede_origen`, `sede_destino`, `estado`, `fecha`, `ordering` | `200 OK` (`resultados`, `pagina_actual`) |
| **Viajes** | `ViajesPage.jsx` | Publicar nuevo viaje compartido | `POST` | `/api/viajes/` | `{ vehiculo, sede_origen, sede_destino, lugar_origen, lugar_destino, fecha_hora, cupos_totales, costo_total }` | `201 Created` / `400 Bad Request` |
| **Viajes** | `ViajesPage.jsx` | Editar viaje existente | `PATCH` | `/api/viajes/<id>/` | Campos modificados | `200 OK` / `400 Bad Request` |
| **Viajes** | `ViajesPage.jsx` | Transición de estado (iniciar / finalizar / cancelar) | `PATCH` | `/api/viajes/<id>/` | `{ estado: 'en_curso' \| 'finalizado' \| 'cancelado' }` | `200 OK` / `400 Bad Request` |
| **Viajes** | `ViajesPage.jsx` | Eliminar viaje publicado sin reservas | `DELETE` | `/api/viajes/<id>/` | ID del viaje | `204 No Content` / `409 Conflict` (si tiene historial) |
| **Reservas** | `ReservasPage.jsx` | Listar reservas propias o del sistema | `GET` | `/api/reservas/?page=N&estado=...` | `page`, `estado`, `viaje` | `200 OK` (`resultados`, `total_registros`) |
| **Reservas** | `ReservasPage.jsx` | Crear nueva reserva en un viaje | `POST` | `/api/reservas/` | `{ viaje, cupos }` | `201 Created` / `400 Bad Request` |
| **Reservas** | `ReservasPage.jsx` | Modificar cupos de la reserva | `PATCH` | `/api/reservas/<id>/` | `{ cupos }` | `200 OK` / `400 Bad Request` |
| **Reservas** | `ReservasPage.jsx` | Cancelar reserva | `DELETE` | `/api/reservas/<id>/` | ID de la reserva | `204 No Content` |
| **Calificaciones**| `CalificacionesPage.jsx` | Consultar reputación del usuario | `GET` | `/api/calificaciones/promedio/<id>/` | ID del usuario calificado | `200 OK` (`promedio`, `total_calificaciones`) |
| **Calificaciones**| `CalificacionesPage.jsx` | Listar calificaciones recibidas o dadas | `GET` | `/api/calificaciones/?calificado=...` | `calificado`, `calificador`, `puntaje`, `page` | `200 OK` (`resultados`, `total_paginas`) |
| **Calificaciones**| `CalificacionesPage.jsx` | Enviar calificación de viaje finalizado | `POST` | `/api/calificaciones/` | `{ viaje, calificado, puntaje, comentario }` | `201 Created` / `400 Bad Request` |
| **Calificaciones**| `CalificacionesPage.jsx` | Editar calificación propia | `PATCH` | `/api/calificaciones/<id>/` | `{ puntaje, comentario }` | `200 OK` / `403 Forbidden` |
| **Calificaciones**| `CalificacionesPage.jsx` | Eliminar calificación | `DELETE` | `/api/calificaciones/<id>/` | ID de la calificación | `204 No Content` |
| **Usuarios / Moderación** | `UsuariosPage.jsx` | Listar todos los estudiantes y cuentas | `GET` | `/api/usuarios/?page=N` | `page` (Solo `is_staff=True` o `Soporte`) | `200 OK` / `403 Forbidden` |
| **Usuarios / Moderación** | `UsuariosPage.jsx` | Consultar flota global para asociar vehículos | `GET` | `/api/vehiculos/?page=1` | Headers de token | `200 OK` |
| **Usuarios / Moderación** | `UsuariosPage.jsx` | Desactivar cuenta no autorizada | `DELETE` | `/api/usuarios/<id>/` | ID del usuario (Solo `is_staff=True`) | `204 No Content` / `403 Forbidden` |
| **Mi Perfil** | `PerfilPage.jsx` | Editar nombre, apellidos y teléfono propio | `PATCH` | `/api/perfil/` | `{ first_name, last_name, telefono }` | `200 OK` / `400 Bad Request` |
| **Ajustes** | `AjustesPage.jsx` | Desactivar propia cuenta (Baja voluntaria) | `DELETE` | `/api/usuarios/<id>/` | ID del usuario autenticado | `204 No Content` / `403 Forbidden` (Soporte bloqueado) |

---

## 2. Matriz de Perfiles y Permisos (Requisito 5 y 17)

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

## 3. Evidencias de los 12 Escenarios Manuales Verificables (Requisito 17)

| N° | Escenario de Prueba | Procedimiento Realizado | Comportamiento Esperado | Resultado Técnico |
|:---:|---|---|---|:---:|
| **1** | **Login exitoso** | Ingresar credenciales válidas en `/login`. | Obtención de token Django vía `POST /api/token/`, almacenamiento en `localStorage`, carga de perfil con rol y redirección al Dashboard. | ✅ **Superado** |
| **2** | **Logout y limpieza de sesión** | Clic en "Cerrar sesión" en el menú de perfil o topbar. | Eliminación del token y datos de usuario en `localStorage`, redirección inmediata a `/login` e invalidación del estado en memoria. | ✅ **Superado** |
| **3** | **Navegación SPA y Rutas Protegidas** | Intentar ingresar a `/viajes` o `/vehiculos` sin haber iniciado sesión. | El componente `ProtectedRoute.jsx` intercepta la navegación y redirige de inmediato a `/login` sin recargar la página. | ✅ **Superado** |
| **4** | **CRUD: Creación de Vehículo** | En `/vehiculos`, registrar vehículo con placa, marca, modelo y 3 asientos. | Envío de `POST /api/vehiculos/`, validación de capacidad (1 a 5), asignación del usuario autenticado como propietario (`201 Created`) y actualización de la lista. | ✅ **Superado** |
| **5** | **CRUD: Edición y Eliminación de Vehículo** | Editar el modelo de un vehículo y luego eliminar un vehículo sin viajes. | `PATCH /api/vehiculos/<id>/` actualiza los datos. `DELETE /api/vehiculos/<id>/` pide confirmación y retorna `204 No Content`. | ✅ **Superado** |
| **6** | **CRUD: Publicación de Viaje y Cupos Dinámicos** | En `/viajes`, seleccionar un vehículo con capacidad de 3 pasajeros. | El formulario ajusta automáticamente `max="3"` en cupos. Impide valores $<1$ o $>3$. Al guardar envía `POST /api/viajes/` con `201 Created`. | ✅ **Superado** |
| **7** | **CRUD: Reserva con Recálculo** | En `/reservas`, reservar 2 cupos en un viaje publicado. | `POST /api/reservas/` crea la reserva (`201 Created`), calcula el aporte proporcional y decrementa los cupos disponibles en el viaje. | ✅ **Superado** |
| **8** | **CRUD: Calificación de Viaje** | En `/calificaciones`, evaluar con 5 estrellas un viaje finalizado. | `POST /api/calificaciones/` verifica que el viaje esté finalizado y que ambos usuarios hayan participado. Se actualiza el promedio de reputación. | ✅ **Superado** |
| **9** | **Búsqueda y Filtros Combinables** | En `/viajes`, filtrar por Sede Origen: *Puntarenas* y Estado: *Publicado*. En `/vehiculos`, buscar por texto. | Los filtros consumen los query params de Django REST Framework (`sede_origen`, `estado`, `search`), actualizando la lista sin recarga. | ✅ **Superado** |
| **10** | **Paginación de Datos del Servidor** | Navegar entre páginas en `/vehiculos` y `/viajes`. | Se consumen los metadatos de paginación (`count`, `page`, `total_pages` o `pagina_actual`), trayendo la siguiente página de forma reactiva. | ✅ **Superado** |
| **11** | **Validación de Formularios y Errores 400** | Intentar crear un viaje con fecha en el pasado o con sede origen igual a destino. | La validación del frontend y los errores `400 Bad Request` del serializer de Django se despliegan con mensajes claros e inputs resaltados en rojo. | ✅ **Superado** |
| **12** | **Accesos Denegados (401 y 403)** | 1) Ingresar con Estudiante a `/usuarios` o enviar petición sin token.<br>2) Soporte intentando modificar datos. | 1) El estudiante recibe aviso de "Acceso Restringido" y la API responde `403 Forbidden`.<br>2) Soporte recibe `403` informando que su rol es de solo lectura. | ✅ **Superado** |
