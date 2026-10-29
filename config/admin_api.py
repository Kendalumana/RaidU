from io import BytesIO

from django.contrib import admin, messages
from django.core.exceptions import ValidationError
from django.http import HttpRequest, HttpResponseRedirect
from django.db import transaction
from django.urls import reverse
from rest_framework.renderers import JSONRenderer


class ErrorOperacionAdmin(Exception):
    def __init__(self, detalle):
        self.detalle = detalle


def texto_error(detalle):
    if isinstance(detalle, dict):
        return ' '.join(f'{campo}: {texto_error(valor)}' for campo, valor in detalle.items())
    if isinstance(detalle, (list, tuple)):
        return ' '.join(texto_error(valor) for valor in detalle)
    return str(detalle)


class AdminConAPI(admin.ModelAdmin):
    """Adapta los formularios del admin a las operaciones existentes de la API."""
    actions = None

    def ejecutar_api(self, request, vista, metodo, datos=None, obj=None):
        interna = HttpRequest()
        interna.method = metodo
        interna.META = request.META.copy()
        interna.META.pop('HTTP_AUTHORIZATION', None)
        interna.META['CONTENT_TYPE'] = 'application/json'
        interna._body = JSONRenderer().render(datos or {})
        interna._stream = BytesIO(interna._body)
        interna._read_started = False
        interna.META['CONTENT_LENGTH'] = str(len(interna._body))
        interna.COOKIES = request.COOKIES.copy()
        interna.user = request.user
        interna.session = request.session
        # La petición original ya pasó la protección CSRF del administrador.
        interna.csrf_processing_done = getattr(request, 'csrf_processing_done', False)
        respuesta = vista(interna, **({'id': obj.pk} if obj else {}))
        if respuesta.status_code >= 400:
            raise ErrorOperacionAdmin(respuesta.data)
        return respuesta

    def get_form(self, request, obj=None, **kwargs):
        base = super().get_form(request, obj, **kwargs)

        class Formulario(base):
            def clean(self):
                datos = super().clean()
                error = getattr(request, '_error_operacion_admin', None)
                if error:
                    raise ValidationError(texto_error(error))
                return datos

        return Formulario

    def changeform_view(self, request, object_id=None, form_url='', extra_context=None):
        try:
            with transaction.atomic():
                return super().changeform_view(request, object_id, form_url, extra_context)
        except ErrorOperacionAdmin as error:
            # Revertir también cualquier guardado antes de mostrar el error en el formulario.
            request._error_operacion_admin = error.detalle
            return super().changeform_view(request, object_id, form_url, extra_context)

    def save_model(self, request, obj, form, change):
        datos = {}
        for nombre, valor in form.cleaned_data.items():
            datos[nombre] = valor.pk if hasattr(valor, '_meta') else valor
        respuesta = self.ejecutar_api(
            request, self.vista_detalle if change else self.vista_lista,
            'PATCH' if change else 'POST', datos, obj if change else None,
        )
        guardado = self.model.objects.get(pk=respuesta.data['id'])
        obj.__dict__.update(guardado.__dict__)

    def delete_model(self, request, obj):
        self.ejecutar_api(request, self.vista_detalle, 'DELETE', obj=obj)

    def delete_view(self, request, object_id, extra_context=None):
        try:
            with transaction.atomic():
                return super().delete_view(request, object_id, extra_context)
        except ErrorOperacionAdmin as error:
            self.message_user(request, texto_error(error.detalle), level=messages.ERROR)
            return HttpResponseRedirect(reverse(
                f'admin:{self.opts.app_label}_{self.opts.model_name}_change', args=[object_id]
            ))
