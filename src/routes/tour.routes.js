const express = require('express');
const { protegerRuta } = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload.middleware');
const {   
  crearTour,
  listarTours,
  obtenerTourPorId,
  actualizarTour,
  eliminarTour
} = require('../controllers/tour.controller');

const router = express.Router();

/**
 * Crear un nuevo tour.
 *
 * Recibe los datos principales del tour y su información relacionada:
 * precios, imágenes, fechas no disponibles, detalles, itinerario y horarios.
 *
 * Endpoint final:
 * POST /api/tours
 */
router.post(
  '/',
  protegerRuta,
  upload.array('imagenes', 10),
  crearTour
);

/**
 * Listar todos los tours.
 *
 * Devuelve todos los tours registrados con precios, imágenes,
 * fechas no disponibles, detalles, itinerario y horarios.
 *
 * Endpoint final:
 * GET /api/tours
 */
router.get('/', listarTours);

/**
 * Obtener un tour por ID.
 *
 * Devuelve la información completa de un tour específico.
 *
 * Endpoint final:
 * GET /api/tours/:id
 */
router.get('/:id', obtenerTourPorId);
/**
 * Actualizar un tour por ID.
 *
 * Ruta protegida. Permite modificar datos del tour
 * y también recibir nuevas imágenes mediante multipart/form-data.
 *
 * Campo de imágenes:
 * imagenes
 *
 * Endpoint final:
 * PUT /api/tours/:id
 */
router.put(
  '/:id',
  protegerRuta,
  upload.array('imagenes', 10),
  actualizarTour
);
/**
 * Eliminar un tour por ID.
 *
 * Elimina el tour y su información relacionada en base de datos.
 *
 * Endpoint final:
 * DELETE /api/tours/:id
 */
router.delete('/:id', protegerRuta, eliminarTour);

module.exports = router;