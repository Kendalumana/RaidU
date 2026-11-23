from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('viajes', '0004_sedes_fijas')]

    operations = [
        migrations.AddField(
            model_name='viaje',
            name='nombre',
            field=models.CharField(blank=True, default='', max_length=100),
        ),
    ]
