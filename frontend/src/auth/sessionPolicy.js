// Reglas de interfaz tomadas del contrato de permisos de Django.
// La autorización final SIEMPRE corresponde al backend.
export function hasAllowedRole(user, allowedRoles) {
  return !allowedRoles?.length || allowedRoles.includes(user?.rol);
}

export function canAccessUsers(user) {
  return user?.rol === 'admin' || user?.rol === 'soporte';
}

export function canDeactivateUser(actor, target) {
  return Boolean(actor?.es_admin && target?.activo && actor.id !== target.id);
}

export function canDeactivateOwnAccount(user) {
  return Boolean(user?.id && user?.rol !== 'soporte');
}

export function shouldLogoutOnUnauthorized(error, activeToken) {
  const headers = error?.config?.headers;
  const sentAuthorization = headers?.get?.('Authorization') ?? headers?.Authorization;
  return Boolean(
    activeToken &&
    error?.response?.status === 401 &&
    sentAuthorization === `Token ${activeToken}`
  );
}
