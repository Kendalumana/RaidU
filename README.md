#  RaidU – Transporte Compartido UCR

## ¿Qué es RaidU?

---

## 1. Descripción del Proyecto

RaidU es un servicio de transporte compartido para la comunidad estudiantil de la Sede del Pacífico (UCR). El alcance previsto de la plataforma incluye (usuarios disponible en esta rama; los otros módulos están pendientes):
- Registrar perfiles de estudiantes y autenticación basada en tokens.
- Registrar vehículos propios de conductores.
- Publicar viajes con cupos, ruta definida (catálogo de sedes y localidades) y costo general compartido.
- Reservar cupos con cálculo de pago simulado distribuido entre los pasajeros.
- Calificar la experiencia de viaje entre los participantes.

La arquitectura del proyecto sigue el patrón de diseño y organización de referencia académica de la asignatura (GameArena API), estructurado de manera modular y exponiendo sus servicios a través de una API REST.

---

## 2. Requisitos Previos

Antes de comenzar, asegúrese de tener instalado:
- **Python 3.14** para reproducir el entorno verificado de esta fase con las versiones fijadas.
- **MySQL Server 8.0+** en ejecución local (puerto 3306).
- **Git** para control de versiones.

---

## 3. Instalación y Puesta en Marcha

### Paso 1: Clonar el repositorio y situarse en la rama de trabajo

```bash
git clone https://github.com/Kendalumana/RaidU.git
cd RaidU
git checkout feature/setup-raidu
```

### Paso 2: Crear y activar el entorno virtual

En Windows (PowerShell):
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

En Linux / macOS:
```bash
python3 -m venv .venv
source .venv/bin/activate
```

### Paso 3: Instalar las dependencias reproducibles

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

---

## 4. Configuración de Base de Datos MySQL

La idea es que los estudiantes que tienen vehículo puedan ofrecer viajes a otros compañeros que necesitan transporte, compartiendo los gastos y aprovechando los espacios disponibles.

Este proyecto se desarrolla para el curso **IF0009 – Desarrollo de Software IV**.

## ¿Qué permitirá hacer?

- Registrar estudiantes en la plataforma.
- Registrar los vehículos de los conductores.
- Publicar viajes con horarios, rutas y cupos disponibles.
- Reservar espacios en los viajes.
- Calcular cuánto debe aportar cada pasajero.
- Calificar la experiencia después de cada viaje.

## Tecnologías utilizadas

- **Python:** lenguaje de programación.
- **Django:** desarrollo del backend.
- **Django REST Framework:** creación de la API REST.
- **MySQL:** almacenamiento de datos.
- **Git y GitHub:** control de versiones y trabajo en equipo.

## ¿Cómo ejecutar el proyecto?

**1. Clonar el repositorio:**

`git clone https://github.com/Kendalumana/RaidU.git`

**2. Entrar a la carpeta:**

`cd RaidU`

**3. Crear y activar el entorno virtual:**

`python -m venv .venv`

En Windows:

`.\.venv\Scripts\Activate.ps1`

**4. Instalar las dependencias:**

`pip install -r requirements.txt`

**5. Configurar la base de datos:**

Crear una base de datos MySQL llamada `raidu_db` y configurar las credenciales en un archivo `.env`, tomando como referencia `.env.example`.

**6. Preparar y ejecutar Django:**

`python manage.py migrate`

`python manage.py runserver`

El servidor estará disponible en:

`http://127.0.0.1:8000/`

## Estado actual del proyecto

Actualmente estamos trabajando en el desarrollo del backend. Ya se preparó la estructura inicial de Django, la configuración de MySQL y la autenticación básica por tokens.

Las funciones de estudiantes, vehículos, viajes, reservas y calificaciones se irán agregando conforme avancemos.

**Nota:** Los pagos serán simulados. La plataforma calculará cuánto corresponde pagar a cada pasajero, pero no realizará cobros reales.

---

## 9. Endpoints Base Configuradas

| Método | Endpoint | Descripción | Permiso |
|---|---|---|---|
| `POST` | `/api/token/` | Obtención de token de autenticación DRF | Público / Anónimo |
| `GET/POST` | `/admin/` | Panel administrativo de Django | Administrador (`is_staff`) |

El módulo `usuarios` se describe en la sección 12. `vehiculos`, `viajes`, `reservas` y `calificaciones` están pendientes.

---

## 10. Limitaciones Conocidas

- **Pago simulado:** El sistema registrará y calculará el monto correspondiente por pasajero según el costo total del viaje y los cupos reservados, pero no procesará transacciones monetarias reales ni consumirá pasarelas bancarias externas.


## 11. Estado de la Fase 0 y solución de problemas

La copia activa es la raíz del repositorio, donde están `manage.py` y `config/`.
La antigua carpeta interior `raidU/` era un scaffold con SQLite y otro entorno virtual.
Se conservó fuera del repositorio, en `../RaidU-scaffold-respaldo-fase0/`, para evitar
confundir ambos proyectos sin perder los archivos anteriores. No es necesaria para ejecutar RaidU.

Ejecute todos los comandos desde la raíz y con su entorno `.venv` activo.
Las dependencias están fijadas en `requirements.txt`; `python -m pip check` comprueba
que las instaladas son compatibles.

Para verificar la conexión real a MySQL, después de configurar `.env`:

```bash
python manage.py shell -c "from django.db import connection; connection.ensure_connection(); print(connection.vendor)"
python manage.py migrate --noinput
python manage.py showmigrations
python manage.py runserver --noreload
```

Visite `http://127.0.0.1:8000/admin/login/` para comprobar una respuesta del servidor.
La raíz `/` y `/api/` todavía no tienen una vista: un 404 allí es esperado.

Si recibe `1045 Access denied for user 'raidu_user'@'localhost'`, MySQL responde,
pero las credenciales o permisos no son válidos. En Workbench, con una cuenta
administradora, ejecute el SQL de la sección 4; si el usuario ya existe,
`CREATE USER IF NOT EXISTS` no cambia su contraseña. Actualícela explícitamente:

```sql
ALTER USER 'raidu_user'@'localhost' IDENTIFIED BY 'tu_contraseña_segura';
GRANT ALL PRIVILEGES ON raidu_db.* TO 'raidu_user'@'localhost';
```

Use esa misma contraseña en el `.env` local y repita las comprobaciones.
No versionar la contraseña. Cada integrante debe configurar su propia instancia.

La base de pruebas se llama `test_raidu_db`; cuando se incorporen pruebas que
necesiten base de datos, el usuario de pruebas deberá poder crearla y eliminarla.
La Fase 0 solo contiene configuración. El módulo de usuarios se agrega en la siguiente fase, descrita abajo.


## 12. Módulo de usuarios

La aplicación `usuarios/` organiza el modelo, serializadores, vistas por función
con `@api_view`, rutas y migraciones. Se reutiliza `User` de Django
para contraseñas, tokens, grupos y permisos. `PerfilUsuario` agrega el teléfono
mediante una relación OneToOne con `PROTECT`.

El estado `activo` de la API corresponde a `User.is_active`; no se duplica en
la tabla de perfiles para evitar estados contradictorios. Una cuenta se desactiva
desde Django Admin en lugar de eliminar su historial.

### Rutas y permisos

| Método | Ruta | Acceso |
|---|---|---|
| POST | `/api/usuarios/registro/` | Público: registra cuenta, perfil y token |
| POST | `/api/token/` | Público: obtiene token con credenciales válidas |
| GET | `/api/perfil/` | Usuario autenticado: consulta su propio perfil |
| PATCH | `/api/perfil/` | Usuario autenticado: modifica nombre, apellidos y teléfono propios |
| GET | `/api/usuarios/` | Administrador (`is_staff`) o grupo `Soporte` |

### Probar en Postman

Con el entorno activo, aplicar primero la migración y ejecutar el servidor:

```bash
python manage.py migrate
python manage.py runserver
```

Registro: enviar JSON a `POST http://127.0.0.1:8000/api/usuarios/registro/`.
Estos valores son ficticios, únicamente para pruebas locales:

```json
{
  "email": "estudiante@ucr.ac.cr",
  "password": "ClaveEjemplo!83927",
  "first_name": "Ana",
  "last_name": "Perez",
  "telefono": "88887777"
}
```

La respuesta 201 incluye `usuario` y `token`. No devuelve la contraseña ni su hash.
El correo se normaliza a minúsculas y se utiliza también como `username`.
Se exige el dominio exacto `ucr.ac.cr`, correo no repetido y una contraseña que
cumpla los validadores de Django. Nombre, apellidos y teléfono son opcionales.
La opción `ATOMIC_REQUESTS=True` en la configuración de MySQL hace que Django
revierta los cambios de la petición si ocurre una excepción durante el registro.
Así no se necesitan decoradores de transacción en las vistas o serializadores.
La comprobación del dominio usa `correo.endswith("@ucr.ac.cr")` dentro de
`validate_email()`, junto con `EmailField`, que valida el formato del correo.

Para iniciar sesión posteriormente, enviar a `POST /api/token/`:

```json
{
  "username": "estudiante@ucr.ac.cr",
  "password": "ClaveEjemplo!83927"
}
```

En las solicitudes protegidas, agregar el encabezado:

```text
Authorization: Token <token recibido>
```

Para actualizar el perfil, enviar a `PATCH /api/perfil/`:

```json
{
  "first_name": "Andrea",
  "telefono": "89998888"
}
```

El correo, identificador, estado y privilegios no son editables desde este endpoint.
Los campos ajenos al serializador se ignoran; nunca se asignan al modelo.
Los usuarios creados con `createsuperuser` pueden consultar su perfil sin teléfono;
al consultar o editar el perfil se crea el registro de teléfono si no existe.

Para probar soporte, un administrador crea el grupo `Soporte` desde Django Admin
y asigna una cuenta al grupo. El registro público no asigna grupos ni privilegios.
El grupo solo habilita lectura del listado de usuarios, no edición de otras cuentas.
Sin autenticación se responde 401 y con un usuario regular en el listado, 403.
La gestión general de roles y permisos de los demás módulos sigue pendiente.

La validación del dominio no demuestra que la persona sea propietaria del correo:
no se envían mensajes de verificación en este módulo. Tampoco se incluyen todavía
cambio de contraseña, cambio de correo ni recuperación de cuenta.

### Comprobación del módulo

Las validaciones de entradas están en `serializers.py`. Las vistas usan los
serializadores y controlan la autenticación y los permisos.

Para comprobar en Postman:

| Caso | Resultado esperado |
|---|---|
| Registro con correo UCR y contraseña válida | 201 |
| Correo ajeno a UCR, repetido o contraseña débil | 400 |
| Obtener token con credenciales correctas | 200 |
| Consultar perfil con token válido | 200 |
| Consultar perfil sin token | 401 |
| Listar usuarios con una cuenta regular | 403 |
| Listar usuarios con administrador o soporte | 200 |
| Actualizar nombre o teléfono del perfil propio | 200 |

La suite automatizada exigida para la entrega final queda pendiente de
incorporarse al repositorio; las validaciones del serializador no la sustituyen.

`apps.py` lo genera `python manage.py startapp usuarios`: identifica la aplicación
como `usuarios` y establece el tipo de clave primaria por defecto. Se conserva sin
lógica de negocio. `models.py` define los datos; `serializers.py` valida entradas;
`views.py` atiende las peticiones; `urls.py` define las rutas.
