const express = require('express');

const {
  iniciarPago,
  webhookWompi,
  confirmarPagoWompi
} = require('../controllers/pago.controller');

const router = express.Router();

/**
 * Iniciar pago de una reserva.
 *
 * Ruta pública. El cliente inicia el pago después
 * de crear una reserva.
 *
 * Endpoint final:
 * POST /api/pagos/iniciar
 */
router.post('/iniciar', iniciarPago);
/**
 * Webhook de Wompi.
 *
 * Ruta pública. Wompi enviará aquí los eventos de actualización
 * de transacciones.
 *
 * Endpoint final:
 * POST /api/pagos/webhook/wompi
 */
router.post('/wompi/webhook', webhookWompi);
router.post('/webhook/wompi', webhookWompi);
router.get('/wompi/confirmacion/:idTransaccion', confirmarPagoWompi);

module.exports = router;
