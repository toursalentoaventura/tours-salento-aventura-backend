const { iniciarPagoReserva, procesarWebhookWompi, confirmarTransaccionWompi } = require('../services/pago.service');

const iniciarPago = async (req, res) => {
  try {
    const { id_reserva } = req.body;
    if (!id_reserva || !Number.isInteger(Number(id_reserva))) {
      return res.status(400).json({ ok: false, message: 'El id_reserva es obligatorio y debe ser numérico' });
    }
    const resultado = await iniciarPagoReserva(id_reserva);
    return res.status(201).json({ ok: true, message: 'Pago iniciado correctamente', ...resultado });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ ok: false, message: error.message || 'Error al iniciar el pago' });
  }
};

const webhookWompi = async (req, res) => {
  try {
    const resultado = await procesarWebhookWompi({ evento: req.body, checksumHeader: req.get('X-Event-Checksum') });
    return res.status(200).json({ ok: true, procesado: resultado.procesado });
  } catch (error) {
    console.error('Error procesando webhook Wompi:', error.message);
    return res.status(error.statusCode || 500).json({ ok: false, message: error.message || 'Error procesando webhook' });
  }
};

const confirmarPagoWompi = async (req, res) => {
  try {
    const resultado = await confirmarTransaccionWompi(req.params.idTransaccion);
    return res.status(200).json({ ok: true, ...resultado });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ ok: false, message: error.message || 'No fue posible verificar el pago' });
  }
};

module.exports = { iniciarPago, webhookWompi, confirmarPagoWompi };
