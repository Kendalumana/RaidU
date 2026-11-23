import test from 'node:test';
import assert from 'node:assert/strict';
import { getError } from './client.js';

test('controla respuestas 5xx con contenido HTML y devuelve mensaje legible para reintentar', () => {
  const error500Html = {
    response: {
      status: 500,
      data: '<!DOCTYPE html><html lang="en"><head><title>Server Error</title></head><body>Traceback...</body></html>'
    }
  };
  const msg = getError(error500Html);
  assert.equal(msg, 'Ocurrió un error en el servidor. Por favor, reintente en unos momentos.');
});

test('controla respuestas 502/503/504 y respuestas que devuelven HTML', () => {
  const error502 = {
    response: {
      status: 502,
      data: '<html><body>Bad Gateway</body></html>'
    }
  };
  assert.equal(getError(error502), 'Ocurrió un error en el servidor. Por favor, reintente en unos momentos.');

  const error500Json = {
    response: {
      status: 500,
      data: { error: 'Internal server error' }
    }
  };
  assert.equal(getError(error500Json), 'Ocurrió un error en el servidor. Por favor, reintente en unos momentos.');
});

test('conserva el detalle exacto cuando la respuesta es un error JSON de campo', () => {
  const errorCampos = {
    response: {
      status: 400,
      data: {
        cupos: ['El valor debe ser mayor a 0.'],
        fecha_hora: ['Formato de fecha inválido.', 'Debe ser una fecha futura.']
      }
    }
  };
  const msg = getError(errorCampos);
  assert.match(msg, /cupos: El valor debe ser mayor a 0\./);
  assert.match(msg, /fecha_hora: Formato de fecha inválido\., Debe ser una fecha futura\./);
});

test('conserva el detalle de error en respuestas con detail o non_field_errors', () => {
  const errorDetail = {
    response: {
      status: 404,
      data: { detail: 'Viaje no encontrado.' }
    }
  };
  assert.equal(getError(errorDetail), 'Viaje no encontrado.');

  const errorNonField = {
    response: {
      status: 400,
      data: { non_field_errors: ['Ya tienes una reserva activa para este viaje.'] }
    }
  };
  assert.equal(getError(errorNonField), 'Ya tienes una reserva activa para este viaje.');
});

test('maneja error de conexión sin respuesta', () => {
  const errorNetwork = {};
  assert.equal(getError(errorNetwork), 'No se puede conectar con el servidor. Compruebe que Django esté corriendo.');
});
