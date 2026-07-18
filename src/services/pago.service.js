const { sequelize, Reserva, Pago, Tour, HorarioTour, FechaNoDisponibleTour } = require('../models');
const { validarDisponibilidadTemporal } = require('../utils/disponibilidadReserva');
const { enviarCorreoPagoAprobadoCliente } = require('./correo.service');
const {
  generarReferenciaPago,
  generarFirmaIntegridad,
  construirUrlCheckoutWompi,
  validarFirmaEventoWompi,
  obtenerTransaccionWompi
} = require('./wompi.service');

const MAPA_ESTADOS_WOMPI = {
  APPROVED: { estadoPago: 'aprobado', estadoReservaPago: 'pagado', estadoReserva: 'confirmada' },
  DECLINED: { estadoPago: 'rechazado', estadoReservaPago: 'rechazado', estadoReserva: 'pendiente' },
  VOIDED: { estadoPago: 'cancelado', estadoReservaPago: 'rechazado', estadoReserva: 'cancelada' },
  ERROR: { estadoPago: 'rechazado', estadoReservaPago: 'rechazado', estadoReserva: 'pendiente' },
  PENDING: { estadoPago: 'pendiente', estadoReservaPago: 'pendiente', estadoReserva: 'pendiente' }
};

const validarAmbiente = (ambiente) => {
  if (!ambiente) return;
  const configurado = String(process.env.WOMPI_ENVIRONMENT || 'sandbox').toLowerCase();
  const recibido = String(ambiente).toLowerCase();
  const equivalentesSandbox = new Set(['sandbox', 'test']);
  const coincide = configurado === recibido ||
    (equivalentesSandbox.has(configurado) && equivalentesSandbox.has(recibido));
  if (!coincide) throw Object.assign(new Error('El ambiente de la transacción no coincide con la configuración.'), { statusCode: 422 });
};

const iniciarPagoReserva = async (idReserva) => sequelize.transaction(async (transaction) => {
  const reserva = await Reserva.findByPk(idReserva, { transaction, lock: transaction.LOCK.UPDATE });
  if (!reserva) throw Object.assign(new Error('La reserva no existe'), { statusCode: 404 });
  if (reserva.estado_pago === 'pagado') throw Object.assign(new Error('La reserva ya se encuentra pagada'), { statusCode: 409 });

  const [horario, rangos] = await Promise.all([
    HorarioTour.findByPk(reserva.id_horario_tour, { transaction }),
    FechaNoDisponibleTour.findAll({ where: { id_tour: reserva.id_tour }, transaction })
  ]);
  if (!horario || Number(horario.id_tour) !== Number(reserva.id_tour) || !horario.activo) {
    throw Object.assign(new Error('El horario seleccionado ya no está disponible.'), { statusCode: 422 });
  }
  validarDisponibilidadTemporal({ fechaReserva: reserva.fecha_reserva, horaInicio: horario.hora_inicio, rangos });

  const monto = Number(reserva.valor_total);
  const montoCentavos = Math.round(monto * 100);
  const moneda = String(process.env.WOMPI_CURRENCY || 'COP').toUpperCase();
  if (!Number.isFinite(monto) || monto <= 0 || !Number.isInteger(montoCentavos) || moneda !== 'COP') {
    throw Object.assign(new Error('El monto o la moneda de la reserva no son válidos para Wompi.'), { statusCode: 422 });
  }

  const intentoPendiente = await Pago.findOne({
    where: { id_reserva: reserva.id, estado_pago: 'pendiente' },
    order: [['id', 'DESC']], transaction, lock: transaction.LOCK.UPDATE
  });
  if (intentoPendiente?.url_pago) {
    return { id_reserva: reserva.id, referencia_pago: intentoPendiente.referencia_pago, estado_pago: intentoPendiente.estado_pago, url_pago: intentoPendiente.url_pago };
  }

  const referencia = generarReferenciaPago(reserva.id);
  const firmaIntegridad = generarFirmaIntegridad({ referencia, montoCentavos, moneda });
  const urlPago = construirUrlCheckoutWompi({ referencia, montoCentavos, moneda, firmaIntegridad, reserva });
  const pago = await Pago.create({
    id_reserva: reserva.id, proveedor_pago: 'wompi', referencia_pago: referencia,
    monto, monto_centavos: montoCentavos, moneda, estado_pago: 'pendiente', url_pago: urlPago
  }, { transaction });

  return { id_reserva: reserva.id, referencia_pago: pago.referencia_pago, estado_pago: pago.estado_pago, url_pago: urlPago };
});

const conciliarTransaccionWompi = async (transaccionWompi, respuestaPasarela = transaccionWompi) => {
  const { id, reference, status, amount_in_cents: montoCentavos, currency } = transaccionWompi || {};
  const mapeo = MAPA_ESTADOS_WOMPI[String(status || '').toUpperCase()];
  if (!id || !reference || !mapeo || !Number.isInteger(Number(montoCentavos)) || !currency) {
    throw Object.assign(new Error('La transacción de Wompi no tiene una estructura válida.'), { statusCode: 422 });
  }
  validarAmbiente(transaccionWompi.environment);

  let primeraAprobacion = false;
  const resultado = await sequelize.transaction(async (transaction) => {
    const pago = await Pago.findOne({ where: { referencia_pago: reference }, transaction, lock: transaction.LOCK.UPDATE });
    if (!pago) throw Object.assign(new Error('No existe un pago local para la referencia recibida.'), { statusCode: 404 });
    if (String(pago.referencia_pago) !== String(reference) || Number(pago.monto_centavos) !== Number(montoCentavos) || String(pago.moneda).toUpperCase() !== String(currency).toUpperCase()) {
      throw Object.assign(new Error('La transacción no coincide con el monto, moneda o referencia del pago.'), { statusCode: 422 });
    }
    const reserva = await Reserva.findByPk(pago.id_reserva, { transaction, lock: transaction.LOCK.UPDATE });
    if (!reserva) throw Object.assign(new Error('La reserva asociada al pago no existe.'), { statusCode: 404 });

    primeraAprobacion = mapeo.estadoPago === 'aprobado' && reserva.estado_pago !== 'pagado';
    const estadoPagoFinal = pago.estado_pago === 'aprobado' && mapeo.estadoPago !== 'aprobado'
      ? 'aprobado'
      : ['rechazado', 'cancelado'].includes(pago.estado_pago) && mapeo.estadoPago === 'pendiente'
        ? pago.estado_pago
        : mapeo.estadoPago;
    await pago.update({ estado_pago: estadoPagoFinal, referencia_externa: id, respuesta_pasarela: respuestaPasarela }, { transaction });
    if (reserva.estado_pago !== 'pagado' || mapeo.estadoPago === 'aprobado') {
      await reserva.update({ estado_pago: mapeo.estadoReservaPago, estado_reserva: mapeo.estadoReserva }, { transaction });
    }
    return { pago, reserva, estado_wompi: String(status).toUpperCase(), procesado: true };
  });

  if (primeraAprobacion) {
    enviarCorreoPagoAprobadoCliente(resultado.reserva).catch((error) => {
      console.error('No se pudo enviar el correo de pago aprobado:', error.message);
    });
  }
  return resultado;
};

const procesarWebhookWompi = async ({ evento, checksumHeader }) => {
  if (!validarFirmaEventoWompi(evento, checksumHeader)) {
    throw Object.assign(new Error('Firma de evento Wompi no válida'), { statusCode: 401 });
  }
  validarAmbiente(evento.environment);
  if (evento.event !== 'transaction.updated') return { procesado: false };
  if (!evento.data?.transaction) throw Object.assign(new Error('El evento no contiene una transacción.'), { statusCode: 400 });
  return conciliarTransaccionWompi(evento.data.transaction, evento);
};

const confirmarTransaccionWompi = async (idTransaccion) => {
  const transaccion = await obtenerTransaccionWompi(idTransaccion);
  const resultado = await conciliarTransaccionWompi(transaccion, transaccion);
  const reservaDetallada = await Reserva.findByPk(resultado.reserva.id, {
    include: [{ model: Tour, as: 'tour' }, { model: HorarioTour, as: 'horario_tour' }]
  });
  return {
    transaccion: { id: transaccion.id, estado_wompi: resultado.estado_wompi, estado: resultado.pago.estado_pago },
    pago: { estado_pago: resultado.pago.estado_pago, referencia_pago: resultado.pago.referencia_pago },
    reserva: {
      id: resultado.reserva.id, estado_pago: resultado.reserva.estado_pago,
      estado_reserva: resultado.reserva.estado_reserva, fecha_reserva: resultado.reserva.fecha_reserva,
      cantidad_personas: resultado.reserva.cantidad_personas, valor_total: resultado.reserva.valor_total,
      tour: reservaDetallada?.tour?.nombre || null,
      hora_inicio: reservaDetallada?.horario_tour?.hora_inicio || null
    }
  };
};

module.exports = { MAPA_ESTADOS_WOMPI, iniciarPagoReserva, conciliarTransaccionWompi, procesarWebhookWompi, confirmarTransaccionWompi };
