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

La rama incluye viajes, reservas con control de cupos y pago simulado, y calificaciones entre participantes.

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
python manage.py test --noinput
```

### Reservas

Ejecutar `python manage.py migrate` antes de iniciar el servidor para crear la tabla de reservas.
Las solicitudes requieren `Authorization: Token <token>`.

- `GET /api/reservas/`: reservas propias; administrador y grupo `Soporte` pueden consultar todas.
- `POST /api/reservas/`: crea una reserva confirmada con `{"viaje": 1, "cupos": 2}`.
  El pasajero sale del token; el monto es calculado por el servidor.
- `GET /api/reservas/<id>/`: consulta una reserva con los permisos del listado.
- `PUT /api/reservas/<id>/`: actualiza enviando viaje y cupos; el viaje y el pasajero son inmutables.
- `PATCH /api/reservas/<id>/`: cambia cupos o cancela con `{"estado": "cancelada"}`.
- `DELETE /api/reservas/<id>/`: cancela, devuelve 204 y conserva el historial.
  Repetir la cancelación no devuelve cupos dos veces. No se reactivan reservas canceladas.
- El usuario modifica sus reservas; el administrador puede modificar cualquiera.
  `Soporte` solo puede leer. No se permiten cambios en reservas confirmadas de viajes
  ya iniciados, finalizados, cancelados o cuya hora de salida ya pasó.
- Filtros combinables: `?viaje=1&estado=confirmada&pasajero=2`.
  Los identificadores deben ser enteros positivos y el estado `confirmada` o `cancelada`.
- Paginación de 10 elementos con `?page=2`: `pagina_actual`, `total_paginas`,
  `total_registros`, `resultados`, como en viajes y calificaciones. Una página inválida
  se ajusta a una página válida mediante `Paginator.get_page`.

Reglas: no reservar el viaje propio (400), ni duplicar viaje/pasajero (409, incluso si
la reserva anterior fue cancelada), ni superar cupos disponibles (409).
Reservar solo en viajes futuros publicados o llenos con cupos disponibles.
Los cambios de cupos, montos y estados se guardan en una transacción con bloqueo
de la fila del viaje en MySQL, también al modificar o cancelar el viaje.

Cada cupo representa un pasajero. El costo total se reparte entre los cupos confirmados,
sin incluir al conductor; el monto de la reserva es la suma de sus cupos.
Por ejemplo, con costo 6000 y reservas de 1 y 3 cupos, los montos son 1500 y 4500.
Los montos se recalculan al crear, modificar o cancelar una reserva y al cambiar el costo
del viaje. Los centavos sobrantes se asignan a la última reserva por id para que la suma
coincida exactamente con el costo. Las reservas canceladas tienen monto cero.
No hay cobros reales ni identificación individual de los acompañantes de una reserva.

Viajes conserva los cupos ocupados al cambiar capacidad y rechaza bajar la capacidad
por debajo de las reservas confirmadas (400). Cancelar un viaje cancela sus reservas.
Un viaje con historial de reservas no se elimina (409), incluso si fueron canceladas;
así se conservan sus relaciones. Calificaciones admite al conductor y a los titulares
de reservas confirmadas como participantes de un viaje finalizado.

La colección `postman/Reservas_RaidU.postman_collection.json` contiene el recorrido
de reservas y casos negativos. Configurar `base_url`, `token_pasajero`, `token_otro`,
`token_soporte` y `viaje_id`. El viaje de prueba debe ser futuro, estar publicado y
tener exactamente 4 cupos libres; el pasajero y el otro usuario deben ser distintos del conductor.
Usar un viaje nuevo al repetir la colección, porque las reservas canceladas se conservan.

Pruebas específicas, incluyendo solicitudes simultáneas contra MySQL:

```powershell
python manage.py test reservas --noinput
```
