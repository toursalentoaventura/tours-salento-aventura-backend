const test = require('node:test');
const assert = require('node:assert/strict');
const { convertirHoraAMinutos, fechaDentroDeRango, normalizarHorariosTour, validarDisponibilidadTemporal, validarRangosNoDisponibles } = require('../src/utils/disponibilidadReserva');
const ahora1500Bogota = new Date('2026-07-16T20:00:00Z');

test('solo acepta horarios estrictamente posteriores', () => {
  assert.equal(convertirHoraAMinutos('8:00'), 480);
  assert.equal(convertirHoraAMinutos('15:30:00'), 930);
  assert.throws(() => validarDisponibilidadTemporal({ fechaReserva: '2026-07-16', horaInicio: '15:00', ahora: ahora1500Bogota }), /ya pasó/);
  assert.doesNotThrow(() => validarDisponibilidadTemporal({ fechaReserva: '2026-07-16', horaInicio: '15:01', ahora: ahora1500Bogota }));
});

test('acepta fechas futuras y rechaza fechas pasadas', () => {
  assert.doesNotThrow(() => validarDisponibilidadTemporal({ fechaReserva: '2026-07-17', horaInicio: '08:00', ahora: ahora1500Bogota }));
  assert.throws(() => validarDisponibilidadTemporal({ fechaReserva: '2026-07-15', horaInicio: '18:00', ahora: ahora1500Bogota }), /fechas anteriores/);
});

test('los rangos son inclusivos', () => {
  const rango = { fecha_inicio: '2026-07-27', fecha_fin: '2026-07-31' };
  assert.equal(fechaDentroDeRango('2026-07-27', rango), true);
  assert.equal(fechaDentroDeRango('2026-07-31', rango), true);
  assert.equal(fechaDentroDeRango('2026-07-26', rango), false);
  assert.throws(() => validarDisponibilidadTemporal({ fechaReserva: '2026-07-29', horaInicio: '18:00', rangos: [rango], ahora: ahora1500Bogota }), /no está disponible/);
});

test('rechaza rangos invertidos o en el pasado', () => {
  assert.throws(() => validarRangosNoDisponibles([{ fecha_inicio: '2026-07-31', fecha_fin: '2026-07-27' }], ahora1500Bogota), /igual o posterior/);
  assert.throws(() => validarRangosNoDisponibles([{ fecha_inicio: '2026-07-14', fecha_fin: '2026-07-15' }], ahora1500Bogota), /pasado/);
});

test('normaliza horarios del tour y rechaza duplicados', () => {
  assert.equal(normalizarHorariosTour([{ hora_inicio: '7:00' }])[0].hora_inicio, '07:00:00');
  assert.throws(() => normalizarHorariosTour([{ hora_inicio: '7:00' }, { hora_inicio: '07:00:00' }]), /duplicados/);
  assert.throws(() => normalizarHorariosTour([{ hora_inicio: '25:00' }]), /formato válido/);
});
