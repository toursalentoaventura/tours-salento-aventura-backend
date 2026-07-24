const test = require('node:test');
const assert = require('node:assert/strict');

const { Tour } = require('../src/models');
const {
  listarTours,
  obtenerTourPorId
} = require('../src/services/tour.service');
const { crearReserva } = require('../src/services/reserva.service');

test('el listado público consulta únicamente tours activos', async () => {
  const findAllOriginal = Tour.findAll;
  let opcionesConsulta;

  Tour.findAll = async (opciones) => {
    opcionesConsulta = opciones;
    return [];
  };

  try {
    await listarTours('es');

    assert.deepEqual(opcionesConsulta.where, {
      estado_publicacion: 'activo'
    });
  } finally {
    Tour.findAll = findAllOriginal;
  }
});

test('el listado administrativo puede consultar ambos estados', async () => {
  const findAllOriginal = Tour.findAll;
  let opcionesConsulta;

  Tour.findAll = async (opciones) => {
    opcionesConsulta = opciones;
    return [];
  };

  try {
    await listarTours('es', true);
    assert.deepEqual(opcionesConsulta.where, {});
  } finally {
    Tour.findAll = findAllOriginal;
  }
});

test('el detalle público exige que el tour esté activo', async () => {
  const findOneOriginal = Tour.findOne;
  let opcionesConsulta;

  Tour.findOne = async (opciones) => {
    opcionesConsulta = opciones;
    return null;
  };

  try {
    const resultado = await obtenerTourPorId(42, 'es');

    assert.equal(resultado, null);
    assert.deepEqual(opcionesConsulta.where, {
      id: 42,
      estado_publicacion: 'activo'
    });
  } finally {
    Tour.findOne = findOneOriginal;
  }
});

test('el detalle administrativo puede consultar un tour inactivo', async () => {
  const findOneOriginal = Tour.findOne;
  let opcionesConsulta;

  Tour.findOne = async (opciones) => {
    opcionesConsulta = opciones;
    return null;
  };

  try {
    await obtenerTourPorId(42, 'es', true);
    assert.deepEqual(opcionesConsulta.where, { id: 42 });
  } finally {
    Tour.findOne = findOneOriginal;
  }
});

test('una reserva nueva se rechaza cuando el tour está inactivo', async () => {
  const findByPkOriginal = Tour.findByPk;

  Tour.findByPk = async () => ({
    estado_publicacion: 'inactivo'
  });

  try {
    await assert.rejects(
      crearReserva({
        id_tour: 42,
        fecha_reserva: '2099-12-31',
        cantidad_personas: 1
      }),
      (error) =>
        error.statusCode === 400 &&
        error.message ===
          'El tour seleccionado no está disponible para reservas'
    );
  } finally {
    Tour.findByPk = findByPkOriginal;
  }
});
