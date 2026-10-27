from django.db import migrations, models


def comprobar_base_sin_viajes(apps, schema_editor):
    Viaje = apps.get_model('viajes', 'Viaje')
    if Viaje.objects.using(schema_editor.connection.alias).exists():
        raise RuntimeError('Hay viajes existentes. Convertir sus lugares a sedes antes de aplicar esta migracion.')


SEDES = [
    ('rodrigo_facio', 'Sede Rodrigo Facio Brenes'),
    ('san_ramon', 'Sede de Occidente (San Ramón)'),
    ('esparza', 'Recinto de Esparza'),
    ('puntarenas', 'Sede del Pacífico (Puntarenas)'),
]


class Migration(migrations.Migration):
    dependencies = [('viajes', '0003_alter_viaje_costo_total_alter_viaje_cupos_totales')]
    operations = [
        migrations.RunPython(comprobar_base_sin_viajes),
        migrations.RemoveConstraint(model_name='viaje', name='viaje_lugares_distintos'),
        migrations.RemoveField(model_name='viaje', name='origen'),
        migrations.RemoveField(model_name='viaje', name='destino'),
        migrations.DeleteModel(name='Lugar'),
        migrations.AddField(model_name='viaje', name='sede_origen', field=models.CharField(max_length=20, choices=SEDES)),
        migrations.AddField(model_name='viaje', name='sede_destino', field=models.CharField(max_length=20, choices=SEDES)),
        migrations.AddField(model_name='viaje', name='lugar_origen', field=models.CharField(max_length=150, blank=True, default='')),
        migrations.AddField(model_name='viaje', name='lugar_destino', field=models.CharField(max_length=150, blank=True, default='')),
        migrations.AddConstraint(model_name='viaje', constraint=models.CheckConstraint(
            condition=~models.Q(sede_origen=models.F('sede_destino')), name='viaje_lugares_distintos')),
    ]
