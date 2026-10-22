# RaidU — Backend API

**Plataforma universitaria de transporte compartido (carpool) para estudiantes de la UCR, Sede del Pacífico.**  
**Curso:** IF0009 – Desarrollo de Software IV  
**Tecnologías:** Python 3.14+ | Django 5.2 LTS | Django REST Framework (DRF) | MySQL 8.0 | TokenAuthentication  

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

Cada equipo de desarrollo mantiene su propia instancia local de MySQL. Ejecute el siguiente script SQL en MySQL Workbench o en la consola de MySQL con usuario administrador (`root`):

```sql
-- 1. Crear base de datos con soporte UTF-8 completo
CREATE DATABASE IF NOT EXISTS raidu_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- 2. Crear usuario específico para la aplicación
CREATE USER IF NOT EXISTS 'raidu_user'@'localhost' IDENTIFIED BY 'tu_contraseña_segura';

-- 3. Otorgar permisos sobre la base de datos
GRANT ALL PRIVILEGES ON raidu_db.* TO 'raidu_user'@'localhost';
FLUSH PRIVILEGES;
```

---

## 5. Configuración de Variables de Entorno (`.env`)

Copie la plantilla de ejemplo `.env.example` a un archivo local `.env`:

```bash
# Windows (PowerShell)
Copy-Item .env.example .env

# Linux / macOS
cp .env.example .env
```

Edite el archivo `.env` con los parámetros de su entorno:

```env
# Configuración general de Django
SECRET_KEY=clave_secreta_unica_para_tu_entorno
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Credenciales de base de datos MySQL
DB_NAME=raidu_db
DB_USER=raidu_user
DB_PASSWORD=tu_contraseña_segura
DB_HOST=127.0.0.1
DB_PORT=3306
```

> **Importante:** El archivo `.env` contiene credenciales sensibles y está ignorado por Git. Nunca debe subirse al repositorio.

---

## 6. Verificación, Migraciones y Superusuario

### Paso 1: Comprobar el estado del sistema Django

```bash
python manage.py check
```
*Debe indicar: `System check identified no issues (0 silenced)`.*

### Paso 2: Ejecutar las migraciones iniciales

Aplica las tablas base del sistema (`auth`, `authtoken`, `contenttypes`, `sessions`, `admin`):

```bash
python manage.py migrate
```

### Paso 3: Crear el usuario administrador

```bash
python manage.py createsuperuser
```
Siga las instrucciones interactivas ingresando usuario, correo y contraseña. La validación de correo institucional se implementará en la fase de usuarios.

---

## 7. Ejecución del Servidor de Desarrollo

Inicie el servidor local:

```bash
python manage.py runserver
```

El servidor estará accesible en: `http://127.0.0.1:8000/`

---

## 8. Estructura del Proyecto

```text
RaidU/
├── config/                  # Paquete principal de configuración del proyecto
│   ├── __init__.py
│   ├── asgi.py
│   ├── settings.py         # Configuración (MySQL, DRF, authtoken, .env)
│   ├── urls.py             # Enrutador principal con prefijo /api/
│   └── wsgi.py
├── manage.py               # Punto de entrada para utilidades administrativas
├── requirements.txt        # Dependencias fijadas y reproducibles
├── .env.example            # Plantilla de variables de entorno sin secretos
├── .gitignore              # Exclusiones de Git (.venv, .env, __pycache__, etc.)
└── README.md               # Documentación y guía de instalación del proyecto
```

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
