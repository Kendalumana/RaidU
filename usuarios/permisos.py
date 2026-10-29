def es_soporte(usuario):
    """Identifica el rol de solo lectura; los administradores conservan sus permisos."""
    return not usuario.is_staff and usuario.groups.filter(name='Soporte').exists()
