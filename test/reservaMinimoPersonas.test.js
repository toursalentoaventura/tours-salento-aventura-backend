const test = require('node:test');
const assert = require('node:assert/strict');
const { Tour } = require('../src/models');
const { crearReserva } = require('../src/services/reserva.service');

test('una reserva se rechaza cuando no alcanza el mínimo configurado', async () => {
  const findByPkOriginal = Tour.findByPk;
  Tour.findByPk = async () => ({
    estado_publicacion: 'activo', minimo_personas: 3, maximo_personas: 10
  });

  try {
    await assert.rejects(
      crearReserva({ id_tour: 42, fecha_reserva: '2099-12-31', cantidad_personas: 2 }),
      (error) => error.statusCode === 400 &&
        error.message === 'Este tour requiere una cantidad mínima de 3 personas'
    );
  } finally {
    Tour.findByPk = findByPkOriginal;
  }
});

test('el modelo Tour usa una persona como mínimo predeterminado', () => {
  const tour = Tour.build({
    nombre: 'Tour de prueba', categoria: 'La Carbonera', tipo_tour: 'privado',
    duracion: '4 horas', maximo_personas: 10, descripcion: 'Prueba'
  });
  assert.equal(tour.minimo_personas, 1);
});
