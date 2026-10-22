# RaidU — Backend API

**Plataforma universitaria de transporte compartido (carpool) para estudiantes de la UCR, Sede del Pacífico.**  
**Curso:** IF0009 – Desarrollo de Software IV  
**Tecnologías:** Python 3.14+ | Django 5.2 LTS | Django REST Framework (DRF) | MySQL 8.0 | TokenAuthentication  

---

## 1. Descripción del Proyecto

RaidU es un servicio de transporte compartido para la comunidad estudiantil de la Sede del Pacífico (UCR). El alcance previsto de la plataforma incluye (todavía no implementado):
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

*(Los módulos de negocio `usuarios`, `vehiculos`, `viajes`, `reservas` y `calificaciones` serán incorporados en las siguientes fases bajo el prefijo `/api/`).*

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
No se han implementado módulos de negocio en esta fase.
