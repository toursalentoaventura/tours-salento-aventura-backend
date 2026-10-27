const test = require('node:test');
const assert = require('node:assert/strict');

const {
  CATEGORIAS_TOUR,
  validarCategoriaTour
} = require('../src/constants/categoriasTour');

const CATEGORIAS_ESPERADAS = [
  'La Carbonera',
  'Valle de Cocora',
  'Café y Cacao',
  'Valle de Cocora Tours Mixtos',
  'Tours compartidos',
  'Cascadas y Termales',
  'Volcanes',
  'Cabalgatas Valle de Cocora',
  'Cabalgatas Salento',
  'Hospedaje',
  'Tour Futuro 1',
  'Tour Futuro 2',
  'Otros Tours'
];

test('expone exactamente las 13 categorías oficiales sin duplicados', () => {
  assert.deepEqual(CATEGORIAS_TOUR, CATEGORIAS_ESPERADAS);
  assert.equal(new Set(CATEGORIAS_TOUR).size, 13);
});

test('acepta una categoría oficial y normaliza espacios externos', () => {
  assert.equal(validarCategoriaTour('  Café y Cacao  '), 'Café y Cacao');
});

test('rechaza categorías antiguas o desconocidas con estado 400', () => {
  for (const categoria of ['Caminatas', 'Aventura', 'Categoría inventada', '', 'Tour Futuro 3', 'Tour Futuro 4']) {
    assert.throws(
      () => validarCategoriaTour(categoria),
      (error) =>
        error.statusCode === 400 &&
        error.message ===
          'La categoría del tour no es válida. Selecciona una categoría oficial'
    );
  }
});
