const express = require('express');

const tourRoutes = require('./tour.routes');
const authRoutes = require('./auth.routes');
const reservaRoutes = require('./reserva.routes');
const pagoRoutes = require('./pago.routes');
const contactoRoutes = require('./contacto.routes');
const { sequelize } = require('../models');
const router = express.Router();

/**
 * Ruta de prueba del servidor.
 *
 * Sirve para verificar que la API esté funcionando correctamente.
 * Endpoint final:
 * GET /api/health
 */
router.get('/health', async (req, res) => {
  try {
    await sequelize.query('SELECT 1');
    res.json({ ok: true, status: 'healthy' });
  } catch {
    res.status(503).json({ ok: false, status: 'unhealthy' });
  }
});

/**
 * Rutas del módulo de tours.
 *
 * Todas las rutas definidas en tour.routes.js
 * quedarán agrupadas bajo el prefijo /api/tours.
 *
 * Ejemplo:
 * POST /api/tours
 * GET  /api/tours
 * GET  /api/tours/:id
 */
router.use('/tours', tourRoutes);

/**
 * Rutas del módulo de autenticación.
 *
 * Endpoint base:
 * /api/auth
 */
router.use('/auth', authRoutes);

/**
 * Rutas del módulo de reservas.
 *
 * Endpoint base:
 * /api/reservas
 */
router.use('/reservas', reservaRoutes);
/**
 * Rutas del módulo de pagos.
 *
 * Endpoint base:
 * /api/pagos
 */
router.use('/pagos', pagoRoutes);
/**
 * Rutas del módulo de contacto.
 *
 * Endpoint base:
 * /api/contacto
 */
router.use('/contacto', contactoRoutes);

module.exports = router;
