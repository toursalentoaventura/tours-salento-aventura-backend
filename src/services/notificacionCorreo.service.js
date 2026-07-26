const {
  sequelize,
  Reserva,
  Tour,
  HorarioTour,
  Pago,
  NotificacionCorreo
} = require('../models');
const { enviarCorreoPagoAprobadoCliente } = require('./correo.service');

const TIPO_CONFIRMACION_RESERVA = 'confirmacion_reserva_pagada';

const registrarConfirmacionReserva = async (idReserva, transaction) => {
  const [notificacion] = await NotificacionCorreo.findOrCreate({
    where: {
      id_reserva: idReserva,
      tipo: TIPO_CONFIRMACION_RESERVA
    },
    defaults: {
      estado: 'pendiente',
      intentos: 0
    },
    transaction
  });

  return notificacion.id;
};

const enviarConfirmacionReservaPendiente = async (idNotificacion) => {
  const reclamada = await sequelize.transaction(async (transaction) => {
    const notificacion = await NotificacionCorreo.findByPk(idNotificacion, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!notificacion || ['enviando', 'enviado'].includes(notificacion.estado)) {
      return false;
    }

    await notificacion.update({
      estado: 'enviando',
      intentos: Number(notificacion.intentos || 0) + 1,
      ultimo_error: null
    }, { transaction });

    return true;
  });

  if (!reclamada) return { enviado: false, omitido: true };

  try {
    const notificacion = await NotificacionCorreo.findByPk(idNotificacion);
    const reserva = await Reserva.findByPk(notificacion.id_reserva, {
      include: [
        { model: Tour, as: 'tour' },
        { model: HorarioTour, as: 'horario_tour' }
      ]
    });

    if (!reserva) {
      throw new Error('No existe la reserva asociada al correo de confirmación');
    }

    const pago = await Pago.findOne({
      where: {
        id_reserva: reserva.id,
        estado_pago: 'aprobado'
      },
      order: [['id', 'DESC']]
    });

    reserva.setDataValue('referencia_pago', pago?.referencia_pago || '');
    await enviarCorreoPagoAprobadoCliente(reserva);

    await NotificacionCorreo.update({
      estado: 'enviado',
      enviado_at: new Date(),
      ultimo_error: null
    }, {
      where: { id: idNotificacion }
    });

    return { enviado: true, omitido: false };
  } catch (error) {
    await NotificacionCorreo.update({
      estado: 'error',
      ultimo_error: String(error.message || error).slice(0, 2000)
    }, {
      where: { id: idNotificacion }
    });

    throw error;
  }
};

module.exports = {
  TIPO_CONFIRMACION_RESERVA,
  registrarConfirmacionReserva,
  enviarConfirmacionReservaPendiente
};
