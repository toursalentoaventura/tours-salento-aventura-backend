const test = require('node:test');
const assert = require('node:assert/strict');

const {
  obtenerMensajeErrorMailerSend
} = require('../src/services/correo.service');

test('extrae el mensaje de los errores HTTP devueltos por MailerSend', () => {
  assert.equal(
    obtenerMensajeErrorMailerSend({
      statusCode: 422,
      body: { message: 'The given data was invalid.' }
    }),
    'The given data was invalid.'
  );
});

test('incluye los errores de validación cuando no viene un mensaje general', () => {
  assert.equal(
    obtenerMensajeErrorMailerSend({
      statusCode: 422,
      body: {
        errors: {
          from: ['The from.email must be a valid email address.']
        }
      }
    }),
    'The from.email must be a valid email address.'
  );
});
