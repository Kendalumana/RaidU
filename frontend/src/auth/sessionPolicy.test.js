import test from 'node:test';
import assert from 'node:assert/strict';
import {
  hasAllowedRole,
  canAccessUsers,
  canDeactivateUser,
  canDeactivateOwnAccount,
  shouldLogoutOnUnauthorized,
} from './sessionPolicy.js';

test('admin y soporte pueden consultar usuarios, estudiante no', () => {
  assert.equal(canAccessUsers({ rol: 'admin' }), true);
  assert.equal(canAccessUsers({ rol: 'soporte' }), true);
  assert.equal(canAccessUsers({ rol: 'estudiante' }), false);
});

test('solo administrador puede desactivar a otro usuario activo', () => {
  const admin = { id: 1, es_admin: true, rol: 'admin' };
  const soporte = { id: 2, es_admin: false, rol: 'soporte' };
  const estudiante = { id: 3, es_admin: false, rol: 'estudiante' };
  assert.equal(canDeactivateUser(admin, { id: 4, activo: true }), true);
  assert.equal(canDeactivateUser(soporte, { id: 4, activo: true }), false);
  assert.equal(canDeactivateUser(estudiante, { id: 4, activo: true }), false);
  assert.equal(canDeactivateUser(admin, { id: 1, activo: true }), false);
  assert.equal(canDeactivateUser(admin, { id: 4, activo: false }), false);
});

test('baja propia permitida excepto soporte', () => {
  assert.equal(canDeactivateOwnAccount({ id: 1, rol: 'estudiante' }), true);
  assert.equal(canDeactivateOwnAccount({ id: 1, rol: 'admin' }), true);
  assert.equal(canDeactivateOwnAccount({ id: 1, rol: 'soporte' }), false);
  assert.equal(canDeactivateOwnAccount(null), false);
});

test('una ruta restringida comprueba el rol retornado por Django', () => {
  assert.equal(hasAllowedRole({ rol: 'soporte' }, ['admin', 'soporte']), true);
  assert.equal(hasAllowedRole({ rol: 'estudiante' }, ['admin', 'soporte']), false);
  assert.equal(hasAllowedRole(null, ['admin']), false);
  assert.equal(hasAllowedRole({ rol: 'estudiante' }), true);
});

test('un 401 invalida únicamente la sesión con el token actual', () => {
  assert.equal(shouldLogoutOnUnauthorized({ response: { status: 401 }, config: { headers: { Authorization: 'Token actual' } } }, 'actual'), true);
  assert.equal(shouldLogoutOnUnauthorized({ response: { status: 401 }, config: { headers: { Authorization: 'Token viejo' } } }, 'actual'), false);
  assert.equal(shouldLogoutOnUnauthorized({ response: { status: 403 }, config: { headers: { Authorization: 'Token actual' } } }, 'actual'), false);
  assert.equal(shouldLogoutOnUnauthorized({ response: { status: 401 } }, null), false);
});
