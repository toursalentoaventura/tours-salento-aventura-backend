/**
 * Catálogo oficial de categorías de tours.
 *
 * Estos valores son estables: se almacenan en la base de datos y se utilizan
 * para validar las solicitudes administrativas. Las traducciones pertenecen
 * exclusivamente al frontend.
 */
const CATEGORIAS_TOUR = Object.freeze([
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
]);

/**
 * Devuelve la categoría oficial después de retirar espacios externos.
 *
 * @throws {Error} con estado HTTP 400 cuando la categoría no pertenece al
 * catálogo oficial.
 */
const validarCategoriaTour = (categoria) => {
  const categoriaNormalizada = String(categoria || '').trim();

  if (!CATEGORIAS_TOUR.includes(categoriaNormalizada)) {
    const error = new Error(
      'La categoría del tour no es válida. Selecciona una categoría oficial'
    );
    error.statusCode = 400;
    throw error;
  }

  return categoriaNormalizada;
};

module.exports = {
  CATEGORIAS_TOUR,
  validarCategoriaTour
};
