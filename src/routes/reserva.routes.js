const express = require('express');

const {
  crearReserva,
  listarReservas,
  obtenerReservaPorId,
  actualizarEstadoReserva
} = require('../controllers/reserva.controller');

const { protegerRuta } = require('../middlewares/auth.middleware');

const router = express.Router();

/**
 * Crear una reserva.
 *
 * Ruta pública. Permite que un cliente cree una reserva
 * desde el frontend.
 *
 * Endpoint final:
 * POST /api/reservas
 */
router.post('/', crearReserva);

/**
 * Listar todas las reservas.
 *
 * Ruta protegida. Solo el administrador puede consultar
 * todas las reservas registradas.
 *
 * Endpoint final:
 * GET /api/reservas
 */
router.get('/', protegerRuta, listarReservas);

/**
 * Obtener una reserva por ID.
 *
 * Ruta protegida. Permite consultar el detalle completo
 * de una reserva específica.
 *
 * Endpoint final:
 * GET /api/reservas/:id
 */
router.get('/:id', protegerRuta, obtenerReservaPorId);

/**
 * Actualizar estados de una reserva.
 *
 * Ruta protegida. Permite actualizar estado_reserva
 * y/o estado_pago desde el panel administrativo.
 *
 * Endpoint final:
 * PUT /api/reservas/:id/estado
 */
router.put('/:id/estado', protegerRuta, actualizarEstadoReserva);

module.exports = router;