"""Prueba reservas por HTTP sobre MySQL temporal sin tocar datos de desarrollo."""
import argparse
from datetime import timedelta
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
import threading
from wsgiref.simple_server import WSGIRequestHandler, make_server

import MySQLdb
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))


class Silencioso(WSGIRequestHandler):
    def log_message(self, format, *args):
        pass


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--evidencia', type=Path, default=ROOT/'reservas/evidencias/postman.txt')
    args = parser.parse_args()
    postman = shutil.which('postman')
    if not postman:
        parser.error('Instale Postman CLI para ejecutar la coleccion.')
    load_dotenv(ROOT/'.env', override=False)
    esquema = 'test_raidu_db'
    mantenimiento = MySQLdb.connect(
        host=os.environ.get('DB_HOST', '127.0.0.1'), port=int(os.environ.get('DB_PORT', '3306')),
        user=os.environ['DB_USER'], passwd=os.environ['DB_PASSWORD'], charset='utf8mb4',
    )
    creado = False
    servidor = None
    try:
        # Si ya existe, CREATE falla y no se reutiliza ni se elimina esa base.
        with mantenimiento.cursor() as cursor:
            cursor.execute(f'CREATE DATABASE `{esquema}` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci')
        creado = True
        os.environ['DB_NAME'] = esquema
        os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings'
        os.environ['ALLOWED_HOSTS'] = 'localhost,127.0.0.1'
        import django
        django.setup()
        from django.contrib.auth import get_user_model
        from django.contrib.auth.models import Group
        from django.core.management import call_command
        from django.core.wsgi import get_wsgi_application
        from django.db import connections
        from django.utils import timezone
        from rest_framework.authtoken.models import Token
        from vehiculos.models import Vehiculo
        from viajes.models import Viaje
        call_command('migrate', interactive=False, verbosity=0)
        usuarios = {rol: get_user_model().objects.create_user(username='demo_'+rol)
                    for rol in ['conductor', 'pasajero', 'otro', 'soporte']}
        usuarios['soporte'].groups.add(Group.objects.create(name='Soporte'))
        vehiculo = Vehiculo.objects.create(propietario=usuarios['conductor'], placa='RESDEMO',
                                           marca='Demo', modelo='Prueba', capacidad=4)
        viaje = Viaje.objects.create(conductor=usuarios['conductor'], vehiculo=vehiculo,
                                     sede_origen='puntarenas', sede_destino='esparza',
                                     fecha_hora=timezone.now()+timedelta(days=1),
                                     cupos_totales=4, cupos_disponibles=4, costo_total='6000.00')
        valores = {'viaje_id': viaje.pk}
        for rol, usuario in usuarios.items():
            valores['token_'+rol] = Token.objects.create(user=usuario).key
        servidor = make_server('127.0.0.1', 0, get_wsgi_application(), handler_class=Silencioso)
        hilo = threading.Thread(target=servidor.serve_forever, daemon=True)
        hilo.start()
        valores['base_url'] = f'http://127.0.0.1:{servidor.server_port}'
        with tempfile.TemporaryDirectory(prefix='raidu-reservas-') as temporal:
            carpeta = Path(temporal).resolve()
            assert carpeta.parent == Path(tempfile.gettempdir()).resolve()
            entorno = carpeta/'entorno.json'
            entorno.write_text(json.dumps({'name': 'Reservas temporal', 'values': [
                {'key': k, 'value': v, 'enabled': True} for k, v in valores.items()
            ]}), encoding='utf-8')
            resultado = subprocess.run([
                postman, 'collection', 'run', str(ROOT/'postman/Reservas_RaidU.postman_collection.json'),
                '-e', str(entorno), '--no-report-events',
            ], capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=180)
        salida = re.sub(r'\x1b\[[0-9;]*m', '', resultado.stdout+resultado.stderr)
        salida = re.sub(r'\b[a-f0-9]{40}\b', '<token omitido>', salida).replace(str(ROOT), '<proyecto>')
        args.evidencia.parent.mkdir(parents=True, exist_ok=True)
        args.evidencia.write_text(salida.rstrip()+'\n', encoding='utf-8')
        print(salida)
        return resultado.returncode
    finally:
        if servidor:
            servidor.shutdown()
            hilo.join(timeout=5)
            servidor.server_close()
            connections.close_all()
        if creado:
            with mantenimiento.cursor() as cursor:
                cursor.execute(f'DROP DATABASE `{esquema}`')
        mantenimiento.close()


if __name__ == '__main__':
    sys.exit(main())
