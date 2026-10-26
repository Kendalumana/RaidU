#  RaidU – Transporte Compartido UCR

## ¿Qué es RaidU?

RaidU es un proyecto universitario que busca facilitar el transporte compartido entre estudiantes de la Universidad de Costa Rica, Sede del Pacífico.

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

El backend incluye la estructura de Django, la configuración de MySQL, autenticación por tokens, registro y perfil de usuarios, y CRUD de vehículos con permisos, búsqueda y paginación.

Las funciones de viajes, reservas y calificaciones siguen pendientes.

**Nota:** Los pagos serán simulados. La plataforma calculará cuánto corresponde pagar a cada pasajero, pero no realizará cobros reales.

---

**Universidad de Costa Rica – Sede del Pacífico**

**Curso:** IF0009 – Desarrollo de Software IV

## API de usuarios y vehículos

Las solicitudes protegidas requieren `Authorization: Token <token>`.
El token se obtiene con `POST /api/token/`.

### Usuarios

- `POST /api/usuarios/registro/`: registro público con correo UCR y contraseña válida.
- `GET /api/perfil/` y `PATCH /api/perfil/`: consulta y actualización del perfil propio.
- `GET /api/usuarios/`: listado para administrador o grupo `Soporte`.
  Devuelve 10 usuarios por página; `?page=2` consulta otra página.
  La respuesta incluye `count`, `page`, `total_pages` y `results`.

### Vehículos

- `GET /api/vehiculos/`: lista los vehículos propios para usuarios regulares;
  administrador y `Soporte` pueden consultar todos.
- `POST /api/vehiculos/`: crea un vehículo del usuario autenticado.
- `GET /api/vehiculos/<id>/`: consulta un vehículo según los permisos anteriores.
- `PUT`, `PATCH` y `DELETE /api/vehiculos/<id>/`: modifica o elimina un vehículo
  propio; un administrador puede gestionar cualquiera. `Soporte` solo tiene lectura.
- `?search=texto` busca por placa, marca o modelo. `?page=2` consulta otra página,
  con 10 vehículos por página y los campos `count`, `page`, `total_pages` y `results`.
- Una página inválida devuelve 404. Una solicitud protegida sin autenticación
  devuelve 401 y una operación no permitida devuelve 403.

### Pruebas de los módulos

Desde la raíz, con el entorno virtual activo y MySQL configurado para pruebas:

```powershell
python manage.py test usuarios vehiculos --noinput
```
