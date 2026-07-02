const {
  iniciarPagoReserva,
   procesarWebhookWompi
} = require('../services/pago.service');

/**
 * Controlador para iniciar un pago.
 *
 * Recibe el ID de una reserva y devuelve una URL de Wompi
 * para que el cliente pueda realizar el pago.
 */
const iniciarPago = async (req, res) => {
  try {
    const { id_reserva } = req.body;

    /**
     * Validación básica del ID de reserva.
     */
    if (!id_reserva || isNaN(Number(id_reserva))) {
      return res.status(400).json({
        ok: false,
        message: 'El id_reserva es obligatorio y debe ser numérico'
      });
    }

    const resultado = await iniciarPagoReserva(id_reserva);

    return res.status(201).json({
      ok: true,
      message: 'Pago iniciado correctamente',
      pago: resultado.pago,
      url_pago: resultado.url_pago
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      ok: false,
      message: error.message || 'Error al iniciar el pago'
    });
  }
};
/**
 * Controlador para recibir eventos de Wompi.
 *
 * Wompi enviará aquí los cambios de estado de la transacción.
 * Si el pago es aprobado, se confirma automáticamente la reserva.
 */
const webhookWompi = async (req, res) => {
  try {
    await procesarWebhookWompi(req.body);

    /**
     * Wompi espera una respuesta HTTP 200 para considerar
     * que el evento fue recibido correctamente.
     */
    return res.status(200).json({
      ok: true,
      message: 'Evento recibido correctamente'
    });
  } catch (error) {
    console.error('Error procesando webhook Wompi:', error.message);

    return res.status(error.statusCode || 500).json({
      ok: false,
      message: error.message || 'Error procesando webhook'
    });
  }
};

module.exports = {
  iniciarPago,
  webhookWompi
};