from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import DataError, IntegrityError, transaction
from django.db.models.deletion import ProtectedError
from django.test import TestCase
from django.utils import timezone

from vehiculos.models import Vehiculo
from .models import Viaje

class ModelosViajesTests(TestCase):
    def setUp(self):
        self.conductor = get_user_model().objects.create_user(username='conductor')
        self.otro = get_user_model().objects.create_user(username='otro')
        self.vehiculo = Vehiculo.objects.create(
            propietario=self.conductor, placa='VIA101', marca='Toyota',
            modelo='Yaris', capacidad=4,
        )

    def viaje(self, **cambios):
        datos = dict(conductor=self.conductor, vehiculo=self.vehiculo,
                     sede_origen=Viaje.Sede.PUNTARENAS, sede_destino=Viaje.Sede.ESPARZA,
                     fecha_hora=timezone.now() + timedelta(days=1),
                     cupos_totales=4, cupos_disponibles=4,
                     costo_total=Decimal('6000.00'))
        datos.update(cambios)
        return Viaje(**datos)

    def test_crea_viaje_publicado(self):
        viaje = self.viaje()
        viaje.full_clean()
        viaje.save()
        self.assertEqual(Viaje.objects.get(pk=viaje.pk).estado, 'publicado')

    def test_restricciones_en_base_de_datos(self):
        for cambios in [dict(sede_destino=Viaje.Sede.PUNTARENAS), dict(cupos_totales=0),
                        dict(cupos_disponibles=5),
                        dict(costo_total=0), dict(estado='invalido')]:
            with self.subTest(cambios=cambios):
                with self.assertRaises(IntegrityError), transaction.atomic():
                    self.viaje(**cambios).save()

    def test_protege_relaciones_del_viaje(self):
        self.viaje().save()
        for objeto in [self.conductor, self.vehiculo]:
            with self.subTest(modelo=type(objeto).__name__):
                with self.assertRaises(ProtectedError):
                    objeto.delete()

    def test_mysql_rechaza_cupos_negativos(self):
        with self.assertRaises(DataError), transaction.atomic():
            self.viaje(cupos_disponibles=-1).save()

    def test_fecha_historica_sin_cambios_no_impide_validar(self):
        viaje = self.viaje()
        viaje.save()
        Viaje.objects.filter(pk=viaje.pk).update(fecha_hora=timezone.now()-timedelta(days=1))
        viaje.refresh_from_db()
        viaje.estado = Viaje.Estado.FINALIZADO
        viaje.full_clean()

    def test_cuatro_sedes_y_detalles_opcionales(self):
        self.assertEqual(set(Viaje.Sede.values), {'rodrigo_facio', 'san_ramon', 'esparza', 'puntarenas'})
        viaje = self.viaje()
        viaje.full_clean()
        viaje.save()
        self.assertEqual(viaje.lugar_origen, '')
        self.assertEqual(viaje.lugar_destino, '')
        viaje.lugar_origen = 'Entrada principal'
        viaje.lugar_destino = 'Parada del recinto'
        viaje.save()
        viaje.refresh_from_db()
        self.assertEqual(viaje.lugar_destino, 'Parada del recinto')
