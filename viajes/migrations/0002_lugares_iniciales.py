from django.db import migrations


# Fuentes UCR: https://www.ucr.ac.cr/contacto/
# https://www.ucr.ac.cr/acerca-u/sedes-recintos.html
# https://srp.ucr.ac.cr/cordinacion-general-de-administracion/unidad-de-recursos-informaticos/
def cargar_lugares(apps, schema_editor):
    Lugar = apps.get_model('viajes', 'Lugar')
    lugares = Lugar.objects.using(schema_editor.connection.alias)
    for nombre in [
        'Sede Rodrigo Facio Brenes',
        'Sede de Occidente (San Ramón)',
        'Sede del Pacífico (Puntarenas)',
        'Recinto de Esparza (Sede del Pacífico)',
    ]:
        # El tipo sede agrupa instalaciones universitarias, incluidos recintos.
        lugares.get_or_create(nombre=nombre, defaults={'tipo': 'sede', 'activo': True})


class Migration(migrations.Migration):
    dependencies = [('viajes', '0001_initial')]

    # Conservar los lugares al revertir evita borrar catalogo utilizado por viajes.
    operations = [migrations.RunPython(cargar_lugares, migrations.RunPython.noop)]
