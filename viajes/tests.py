from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import DataError, IntegrityError, transaction
from django.db.models.deletion import ProtectedError
from django.test import TestCase
from django.utils import timezone

from vehiculos.models import Vehiculo
from .models import Lugar, Viaje


class ModelosViajesTests(TestCase):
    def setUp(self):
        self.conductor = get_user_model().objects.create_user(username='conductor')
        self.otro = get_user_model().objects.create_user(username='otro')
        self.vehiculo = Vehiculo.objects.create(
            propietario=self.conductor, placa='VIA101', marca='Toyota',
            modelo='Yaris', capacidad=4,
        )
        self.origen = Lugar.objects.create(nombre='Sede del Pacifico', tipo='sede')
        self.destino = Lugar.objects.create(nombre='Esparza', tipo='localidad')

    def viaje(self, **cambios):
        datos = dict(conductor=self.conductor, vehiculo=self.vehiculo,
                     origen=self.origen, destino=self.destino,
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

    def test_rechaza_fecha_pasada(self):
        with self.assertRaises(ValidationError):
            self.viaje(fecha_hora=timezone.now()-timedelta(days=1)).full_clean()

    def test_rechaza_vehiculo_ajeno(self):
        with self.assertRaises(ValidationError):
            self.viaje(conductor=self.otro).full_clean()

    def test_rechaza_exceso_de_capacidad(self):
        with self.assertRaises(ValidationError):
            self.viaje(cupos_totales=5, cupos_disponibles=5).full_clean()

    def test_rechaza_vehiculo_inactivo(self):
        self.vehiculo.activo = False
        self.vehiculo.save()
        with self.assertRaises(ValidationError):
            self.viaje().full_clean()

    def test_restricciones_en_base_de_datos(self):
        for cambios in [dict(destino=self.origen), dict(cupos_totales=0),
                        dict(cupos_disponibles=5),
                        dict(costo_total=0), dict(estado='invalido')]:
            with self.subTest(cambios=cambios):
                with self.assertRaises(IntegrityError), transaction.atomic():
                    self.viaje(**cambios).save()

    def test_lugar_unico(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            Lugar.objects.create(nombre=self.origen.nombre, tipo='sede')

    def test_protege_relaciones_del_viaje(self):
        self.viaje().save()
        for objeto in [self.conductor, self.vehiculo, self.origen, self.destino]:
            with self.subTest(modelo=type(objeto).__name__):
                with self.assertRaises(ProtectedError):
                    objeto.delete()

    def test_mysql_rechaza_cupos_negativos(self):
        with self.assertRaises(DataError), transaction.atomic():
            self.viaje(cupos_disponibles=-1).save()

    def test_rechaza_lugar_inactivo_al_publicar(self):
        self.origen.activo = False
        self.origen.save()
        with self.assertRaises(ValidationError):
            self.viaje().full_clean()

    def test_fecha_historica_sin_cambios_no_impide_validar(self):
        viaje = self.viaje()
        viaje.save()
        Viaje.objects.filter(pk=viaje.pk).update(fecha_hora=timezone.now()-timedelta(days=1))
        viaje.refresh_from_db()
        viaje.estado = Viaje.Estado.FINALIZADO
        viaje.full_clean()


class CatalogoInicialTests(TestCase):
    def test_carga_los_cuatro_puntos_universitarios(self):
        nombres = [
            'Sede Rodrigo Facio Brenes',
            'Sede de Occidente (San Ramón)',
            'Sede del Pacífico (Puntarenas)',
            'Recinto de Esparza (Sede del Pacífico)',
        ]
        self.assertEqual(Lugar.objects.filter(nombre__in=nombres, activo=True, tipo='sede').count(), 4)
