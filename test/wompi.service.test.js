const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

process.env.WOMPI_PUBLIC_KEY = 'pub_test_example';
process.env.WOMPI_INTEGRITY_SECRET = 'integrity_test';
process.env.WOMPI_EVENTS_SECRET = 'events_test';
process.env.FRONTEND_PAYMENT_REDIRECT_URL = '';

const { generarReferenciaPago, construirUrlCheckoutWompi, validarFirmaEventoWompi } = require('../src/services/wompi.service');
const { MAPA_ESTADOS_WOMPI } = require('../src/services/pago.service');

test('genera referencias únicas por intento', () => {
  const primera = generarReferenciaPago(25);
  const segunda = generarReferenciaPago(25);
  assert.match(primera, /^TSA-RES-25-/);
  assert.notEqual(primera, segunda);
});

test('construye checkout sin codificar nombres con dos puntos ni agregar redirect local', () => {
  const url = construirUrlCheckoutWompi({
    referencia: 'RES-1',
    montoCentavos: 100000,
    moneda: 'COP',
    firmaIntegridad: 'abc',
    reserva: { correo_cliente: 'correo@gmail.com' }
  });
  assert.match(url, /[?&]signature:integrity=abc(?:&|$)/);
  assert.match(url, /[?&]customer-data:email=correo%40gmail\.com(?:&|$)/);
  assert.doesNotMatch(url, /%3A/);
  assert.doesNotMatch(url, /redirect-url=/);
  assert.match(url, /[?&]amount-in-cents=100000(?:&|$)/);
});

test('valida propiedades dinámicas y checksum del header', () => {
  const evento = { data: { transaction: { id: 'tx-1', status: 'APPROVED', amount_in_cents: 100000 } }, timestamp: 123, signature: { properties: ['transaction.id', 'transaction.status', 'transaction.amount_in_cents'] } };
  const checksum = crypto.createHash('sha256').update('tx-1APPROVED100000123events_test').digest('hex');
  assert.equal(validarFirmaEventoWompi(evento, checksum), true);
  assert.equal(validarFirmaEventoWompi(evento, '0'.repeat(64)), false);
});

test('mapea una aprobación a pago y reserva confirmados', () => {
  assert.deepEqual(MAPA_ESTADOS_WOMPI.APPROVED, {
    estadoPago: 'aprobado',
    estadoReservaPago: 'pagado',
    estadoReserva: 'confirmada'
  });
});
