const {
  Reserva,
  Pago
} = require('../models');

const {
  generarReferenciaPago,
  generarFirmaIntegridad,
  construirUrlCheckoutWompi,
  validarFirmaEventoWompi
} = require('./wompi.service');

/**
 * Servicio para iniciar un pago de una reserva.
 *
 * Crea un intento de pago pendiente y genera la URL
 * de checkout de Wompi para que el cliente pueda pagar.
 */
const iniciarPagoReserva = async (id_reserva) => {
  /**
   * Buscamos la reserva asociada al pago.
   */
  const reserva = await Reserva.findByPk(id_reserva);

  if (!reserva) {
    const error = new Error('La reserva no existe');
    error.statusCode = 404;
    throw error;
  }

  /**
   * Si la reserva ya está pagada, no se debe crear otro pago.
   */
  if (reserva.estado_pago === 'pagado') {
    const error = new Error('La reserva ya se encuentra pagada');
    error.statusCode = 400;
    throw error;
  }

  /**
   * Wompi requiere el monto en centavos.
   * Ejemplo: 180000 COP → 18000000
   */
  const monto = reserva.valor_total;
  const montoCentavos = monto * 100;
  const moneda = process.env.WOMPI_CURRENCY || 'COP';

  /**
   * Generamos una referencia única para este intento de pago.
   */
  const referencia = generarReferenciaPago(reserva.id);

  /**
   * Generamos la firma de integridad requerida por Wompi.
   */
  const firmaIntegridad = generarFirmaIntegridad({
    referencia,
    montoCentavos,
    moneda
  });

  /**
   * Construimos la URL de checkout para redirigir al cliente.
   */
  const urlPago = construirUrlCheckoutWompi({
    referencia,
    montoCentavos,
    moneda,
    firmaIntegridad,
    reserva
  });

  /**
   * Guardamos el intento de pago como pendiente.
   */
  const pago = await Pago.create({
    id_reserva: reserva.id,
    proveedor_pago: 'wompi',
    referencia_pago: referencia,
    monto,
    monto_centavos: montoCentavos,
    moneda,
    estado_pago: 'pendiente',
    url_pago: urlPago
  });

  return {
    reserva,
    pago,
    url_pago: urlPago
  };
};

/**
 * Servicio para procesar webhook de Wompi.
 *
 * Valida la firma del evento, busca el pago por referencia
 * y actualiza los estados según el estado de la transacción.
 */
const procesarWebhookWompi = async (evento) => {
  const firmaValida = validarFirmaEventoWompi(evento);

  if (!firmaValida) {
    const error = new Error('Firma de evento Wompi no válida');
    error.statusCode = 401;
    throw error;
  }

  /**
   * Por ahora procesamos únicamente eventos de actualización de transacción.
   */
  if (evento.event !== 'transaction.updated') {
    return {
      procesado: false,
      message: 'Evento ignorado'
    };
  }

  const transaccion = evento.data?.transaction;

  if (!transaccion) {
    const error = new Error('El evento no contiene información de transacción');
    error.statusCode = 400;
    throw error;
  }

  const referencia = transaccion.reference;
  const estadoWompi = transaccion.status;

  const pago = await Pago.findOne({
    where: {
      referencia_pago: referencia
    }
  });

  if (!pago) {
    const error = new Error('Pago no encontrado para la referencia recibida');
    error.statusCode = 404;
    throw error;
  }

  const reserva = await Reserva.findByPk(pago.id_reserva);

  if (!reserva) {
    const error = new Error('Reserva asociada al pago no encontrada');
    error.statusCode = 404;
    throw error;
  }

  /**
   * Estados principales que puede enviar Wompi:
   * APPROVED, DECLINED, VOIDED, ERROR, PENDING.
   */
  let nuevoEstadoPago = 'pendiente';
  let nuevoEstadoReserva = reserva.estado_reserva;

  if (estadoWompi === 'APPROVED') {
    nuevoEstadoPago = 'aprobado';
    nuevoEstadoReserva = 'confirmada';
  }

  if (estadoWompi === 'DECLINED' || estadoWompi === 'ERROR') {
    nuevoEstadoPago = 'rechazado';
    nuevoEstadoReserva = 'pendiente';
  }

  if (estadoWompi === 'VOIDED') {
    nuevoEstadoPago = 'cancelado';
    nuevoEstadoReserva = 'cancelada';
  }

  if (estadoWompi === 'PENDING') {
    nuevoEstadoPago = 'pendiente';
    nuevoEstadoReserva = 'pendiente';
  }

  await pago.update({
    estado_pago: nuevoEstadoPago,
    referencia_externa: transaccion.id || null,
    respuesta_pasarela: evento
  });

  await reserva.update({
    estado_pago: nuevoEstadoPago === 'aprobado' ? 'pagado' : nuevoEstadoPago,
    estado_reserva: nuevoEstadoReserva
  });

  return {
    procesado: true,
    pago,
    reserva,
    estado_wompi: estadoWompi
  };
};

module.exports = {
  iniciarPagoReserva,
  procesarWebhookWompi
};