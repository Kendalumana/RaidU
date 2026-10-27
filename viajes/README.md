# Base de viajes y lugares

Incluye modelos, migracion y pruebas. Serializers, vistas, rutas y admin tienen comentarios breves con lo pendiente; todavia no hay endpoints.

```powershell
python manage.py migrate
python manage.py test viajes usuarios vehiculos --noinput
```

Continuar sobre esta migracion, sin generar otra inicial. Usar los campos y estados de models.py. Los serializers deben ejecutar full_clean, porque save no lo hace automaticamente. Reservas administrara los cupos mediante transacciones; la API de viajes debera conservar los cupos ocupados al modificar la capacidad.
