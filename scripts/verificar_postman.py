"""Ejecuta el flujo HTTP en MySQL temporal sin alterar la base de desarrollo."""
import argparse
import os
from pathlib import Path
import re
import secrets
import shutil
import subprocess
import sys
import tempfile
import threading
import json
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
    parser.add_argument('--evidencia', type=Path, default=ROOT / 'docs/evidencia-postman.txt')
    args = parser.parse_args()
    postman = shutil.which('postman')
    if not postman:
        parser.error('Instale Postman CLI para ejecutar la coleccion.')
    load_dotenv(ROOT / '.env', override=False)
    esquema = 'test_raidu_db'
    mantenimiento = MySQLdb.connect(
        host=os.environ.get('DB_HOST', '127.0.0.1'), port=int(os.environ.get('DB_PORT', '3306')),
        user=os.environ['DB_USER'], passwd=os.environ['DB_PASSWORD'], charset='utf8mb4',
    )
    servidor = None
    creado = False
    try:
        # CREATE falla si la base ya existe: nunca se reutiliza ni borra una base ajena.
        with mantenimiento.cursor() as cursor:
            cursor.execute(f'CREATE DATABASE `{esquema}` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci')
        creado = True
        os.environ['DB_NAME'] = esquema
        os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings'
        os.environ['ALLOWED_HOSTS'] = 'localhost,127.0.0.1'
        os.environ['DEMO_PASSWORD'] = secrets.token_urlsafe(24)
        import django
        django.setup()
        from django.core.management import call_command
        from django.core.wsgi import get_wsgi_application
        from django.db import connections
        call_command('migrate', interactive=False, verbosity=0)
        call_command('cargar_demo', verbosity=0)
        servidor = make_server('127.0.0.1', 0, get_wsgi_application(), handler_class=Silencioso)
        hilo = threading.Thread(target=servidor.serve_forever, daemon=True)
        hilo.start()
        with tempfile.TemporaryDirectory(prefix='raidu-postman-') as temporal:
            # Directorio privado generado por tempfile; sus archivos nunca se versionan.
            carpeta = Path(temporal).resolve()
            assert carpeta.parent == Path(tempfile.gettempdir()).resolve()
            entorno = carpeta / 'entorno.json'
            entorno.write_text(json.dumps({'name': 'RaidU temporal', 'values': [
                {'key': 'base_url', 'value': f'http://127.0.0.1:{servidor.server_port}', 'enabled': True},
                {'key': 'demo_password', 'value': os.environ['DEMO_PASSWORD'], 'enabled': True},
            ]}), encoding='utf-8')
            resultado = subprocess.run([
                postman, 'collection', 'run', str(ROOT / 'postman/Cierre_RaidU.postman_collection.json'),
                '-e', str(entorno), '--no-report-events',
            ], capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=180)
        salida = re.sub(r'\x1b\[[0-9;]*m', '', resultado.stdout + resultado.stderr)
        salida = salida.replace(os.environ['DEMO_PASSWORD'], '<clave omitida>').replace(str(ROOT), '<proyecto>')
        salida = re.sub(r'\b[a-f0-9]{40}\b', '<token omitido>', salida)
        args.evidencia.parent.mkdir(parents=True, exist_ok=True)
        args.evidencia.write_text(salida, encoding='utf-8')
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
