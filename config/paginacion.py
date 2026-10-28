from django.core.paginator import Paginator
from rest_framework.response import Response


def respuesta_paginada(queryset, serializer_class, page_number):
    paginator = Paginator(queryset, 10)
    page = paginator.get_page(page_number)
    serializer = serializer_class(page.object_list, many=True)
    return Response({
        'pagina_actual': page.number,
        'total_paginas': paginator.num_pages,
        'total_registros': paginator.count,
        'resultados': serializer.data,
    })
