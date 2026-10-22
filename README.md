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

Actualmente estamos trabajando en el desarrollo del backend. Ya se preparó la estructura inicial de Django, la configuración de MySQL y la autenticación básica por tokens.

Las funciones de estudiantes, vehículos, viajes, reservas y calificaciones se irán agregando conforme avancemos.

**Nota:** Los pagos serán simulados. La plataforma calculará cuánto corresponde pagar a cada pasajero, pero no realizará cobros reales.

---

**Universidad de Costa Rica – Sede del Pacífico**

**Curso:** IF0009 – Desarrollo de Software IV
