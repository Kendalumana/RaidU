# Baja lógica de usuarios y borrado protegido de vehículos

## Contrato y permisos

`DELETE /api/usuarios/<id>/` desactiva la cuenta (`is_active=False`) y elimina su
token dentro de una transacción. No borra el usuario ni su historial. No requiere
cuerpo JSON. La API no ofrece reactivación.

| Actor | Cuenta propia | Otra cuenta |
| --- | --- | --- |
| Anónimo | 401 | 401 |
| Usuario regular | 204 | 403 |
| Soporte sin `is_staff` | 403 | 403 |
| Administrador (`is_staff`) | 204 | 204 |

El administrador recibe 404 si la cuenta no existe. Repetir la baja de una cuenta
existente e inactiva como administrador devuelve 204. Las consultas protegidas con
el token anterior devuelven 401 y el login de la cuenta inactiva devuelve 400 sin
emitir un token. Los datos de perfil y las relaciones permanecen almacenados.

`DELETE /api/vehiculos/<id>/` conserva los permisos existentes. Si el vehículo
tiene viajes asociados, el propietario o administrador recibe 409 con `detail`,
sin eliminar el vehículo ni los viajes. Un vehículo sin relaciones protegidas
continúa devolviendo 204 al eliminarse.

## Casos adicionales de Postman

Estos casos complementan las pruebas previas de Usuarios y Vehículos; su ejecución
y sus capturas en Postman quedan pendientes. Usar exclusivamente cuentas y datos
de prueba. Definir `base_url`, `usuario_a_id`, `usuario_b_id`, `token_a`,
`token_admin`, `token_soporte`, `email_a`, `password_prueba` y
`vehiculo_con_viaje_id`. Los tokens deben ser de cuentas activas. A debe tener un
vehículo con un viaje asociado para comprobar la conservación del historial.
La API de Viajes todavía no está publicada en esta base: preparar esa relación
con el ORM en una base de pruebas, o ejecutar la prueba automatizada correspondiente.

En las solicitudes protegidas usar `Authorization: Token {{variable_del_token}}`.
Ejecutar primero los rechazos y la prueba del vehículo, antes de desactivar A.

| Caso | Solicitud | Autenticación | Resultado esperado |
| --- | --- | --- | --- |
| Baja anónima | `DELETE {{base_url}}/api/usuarios/{{usuario_a_id}}/` | Sin token | 401; A sigue activo. |
| Baja de otro usuario | `DELETE {{base_url}}/api/usuarios/{{usuario_b_id}}/` | `token_a` | 403; B sigue activo. |
| Soporte intenta baja | `DELETE {{base_url}}/api/usuarios/{{usuario_a_id}}/` | `token_soporte` | 403; A sigue activo. |
| Usuario inexistente | `DELETE {{base_url}}/api/usuarios/999999/` | `token_admin` | 404; confirmar que ese ID no exista. |
| Vehículo con viaje | `DELETE {{base_url}}/api/vehiculos/{{vehiculo_con_viaje_id}}/` | Token del propietario o administrador | 409; consultar después el vehículo y comprobar que sigue existiendo. |
| Baja propia | `DELETE {{base_url}}/api/usuarios/{{usuario_a_id}}/` | `token_a` | 204 sin cuerpo; conservar el valor anterior del token para el siguiente caso. |
| Token revocado | `GET {{base_url}}/api/perfil/` | Token anterior de A | 401. |
| Login tras la baja | `POST {{base_url}}/api/token/` | Sin token | Enviar `username={{email_a}}` y `password={{password_prueba}}` como JSON: 400 sin token. |
| Repetición por administrador | `DELETE {{base_url}}/api/usuarios/{{usuario_a_id}}/` | `token_admin` | 204; A continúa inactivo. |
| Consulta del historial | `GET {{base_url}}/api/usuarios/` y `GET {{base_url}}/api/vehiculos/{{vehiculo_con_viaje_id}}/` | `token_admin` | 200; localizar A con `activo=false` usando la paginación y comprobar que conserva su vehículo. |

## Verificación automatizada

Ejecutar desde la raíz con el entorno virtual y MySQL de pruebas configurados:

```powershell
python manage.py test usuarios vehiculos viajes --noinput
python manage.py makemigrations --check --dry-run
```

La cobertura nueva incluye registro institucional y duplicados, contraseña segura,
protección de privilegios, login con credenciales correctas e incorrectas, perfil,
tokens reales, cuentas inactivas, permisos de baja y conservación de relaciones.
El caso de vehículos comprueba propietario y administrador ante un borrado
protegido. Las pruebas existentes de borrado normal siguen ejecutándose.
