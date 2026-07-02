const { Op } = require('sequelize');

const {
  Reserva,
  Tour,
  PrecioTour,
  HorarioTour,
  FechaNoDisponibleTour,
  ExtraTour
} = require('../models');

/**
 * Servicio para crear una reserva.
 *
 * Valida que el tour exista, que esté activo, que el precio pertenezca
 * al tour, que el horario sea válido, que la fecha no esté bloqueada
 * y que los extras seleccionados pertenezcan al mismo tour.
 */
const crearReserva = async (datosReserva) => {
  const {
    id_tour,
    id_precio_tour,
    id_horario_tour,
    nombre_cliente,
    correo_cliente,
    telefono_cliente,
    documento_cliente,
    fecha_reserva,
    cantidad_personas,
    idioma,
    observaciones,
    extras = []
  } = datosReserva;

  /**
   * Validamos que el tour exista.
   */
  const tour = await Tour.findByPk(id_tour);

  if (!tour) {
    const error = new Error('El tour seleccionado no existe');
    error.statusCode = 404;
    throw error;
  }

  /**
   * Validamos que el tour esté activo.
   */
  if (tour.estado_publicacion !== 'activo') {
    const error = new Error('El tour seleccionado no está disponible');
    error.statusCode = 400;
    throw error;
  }

  /**
   * Validamos que la cantidad de personas no supere
   * el máximo permitido para el tour.
   */
  if (cantidad_personas > tour.maximo_personas) {
    const error = new Error('La cantidad de personas supera el máximo permitido para este tour');
    error.statusCode = 400;
    throw error;
  }

  /**
   * Validamos que el idioma seleccionado esté disponible para el tour.
   */
  const idiomasTour = Array.isArray(tour.idiomas) ? tour.idiomas : [];

  if (idioma && idiomasTour.length > 0 && !idiomasTour.includes(idioma)) {
    const error = new Error('El idioma seleccionado no está disponible para este tour');
    error.statusCode = 400;
    throw error;
  }

  /**
   * Validamos que la fecha no esté bloqueada.
   */
  const fechaBloqueada = await FechaNoDisponibleTour.findOne({
    where: {
      id_tour,
      fecha_inicio: {
        [Op.lte]: fecha_reserva
      },
      fecha_fin: {
        [Op.gte]: fecha_reserva
      }
    }
  });

  if (fechaBloqueada) {
    const error = new Error('El tour no está disponible en la fecha seleccionada');
    error.statusCode = 400;
    throw error;
  }

  /**
   * Validamos que el precio seleccionado pertenezca al tour.
   * El valor base siempre se toma desde la base de datos.
   */
  const precioTour = await PrecioTour.findOne({
    where: {
      id: id_precio_tour,
      id_tour
    }
  });

  if (!precioTour) {
    const error = new Error('El precio seleccionado no pertenece al tour');
    error.statusCode = 400;
    throw error;
  }

  /**
   * Validamos el horario seleccionado si viene en la reserva.
   */
  if (id_horario_tour) {
    const horarioTour = await HorarioTour.findOne({
      where: {
        id: id_horario_tour,
        id_tour,
        activo: true
      }
    });

    if (!horarioTour) {
      const error = new Error('El horario seleccionado no está disponible para este tour');
      error.statusCode = 400;
      throw error;
    }
  }

  /**
   * Calculamos el valor base de la reserva.
   */
  let valor_total = precioTour.precio;

  /**
   * Validamos y calculamos los extras seleccionados.
   *
   * Los extras se guardan como copia dentro de la reserva,
   * para conservar el historial aunque luego cambie el precio del extra.
   */
  const extrasSeleccionados = [];

  if (Array.isArray(extras) && extras.length > 0) {
    for (const extraSeleccionado of extras) {
      const extraTour = await ExtraTour.findOne({
        where: {
          id: extraSeleccionado.id_extra_tour,
          id_tour,
          activo: true
        }
      });

      if (!extraTour) {
        const error = new Error('Uno de los extras seleccionados no pertenece al tour o no está activo');
        error.statusCode = 400;
        throw error;
      }

      const cantidadExtra = extraSeleccionado.cantidad || 1;
      const subtotal = extraTour.precio * cantidadExtra;

      valor_total += subtotal;

      extrasSeleccionados.push({
        id_extra_tour: extraTour.id,
        nombre: extraTour.nombre,
        cantidad: cantidadExtra,
        precio_unitario: extraTour.precio,
        subtotal
      });
    }
  }

  /**
   * Creamos la reserva con los extras guardados en un solo campo JSON.
   */
  const reserva = await Reserva.create({
    id_tour,
    id_precio_tour,
    id_horario_tour: id_horario_tour || null,
    nombre_cliente,
    correo_cliente,
    telefono_cliente,
    documento_cliente,
    fecha_reserva,
    cantidad_personas,
    idioma: idioma || 'Español',
    valor_total,
    extras_seleccionados: extrasSeleccionados,
    estado_reserva: 'pendiente',
    estado_pago: 'pendiente',
    observaciones
  });

  return obtenerReservaPorId(reserva.id);
};

/**
 * Servicio para listar todas las reservas.
 *
 * Devuelve las reservas junto con información del tour,
 * precio seleccionado y horario seleccionado.
 */
const listarReservas = async () => {
  const reservas = await Reserva.findAll({
    include: [
      {
        model: Tour,
        as: 'tour'
      },
      {
        model: PrecioTour,
        as: 'precio_tour'
      },
      {
        model: HorarioTour,
        as: 'horario_tour'
      }
    ],
    order: [['id', 'DESC']]
  });

  return reservas;
};

/**
 * Servicio para obtener una reserva por ID.
 */
const obtenerReservaPorId = async (id) => {
  const reserva = await Reserva.findByPk(id, {
    include: [
      {
        model: Tour,
        as: 'tour'
      },
      {
        model: PrecioTour,
        as: 'precio_tour'
      },
      {
        model: HorarioTour,
        as: 'horario_tour'
      }
    ]
  });

  return reserva;
};

/**
 * Servicio para actualizar estados de una reserva.
 *
 * Permite cambiar el estado de la reserva y/o el estado del pago.
 */
const actualizarEstadoReserva = async (id, datos) => {
  const reserva = await Reserva.findByPk(id);

  if (!reserva) {
    return null;
  }

  const datosActualizar = {};

  if (datos.estado_reserva !== undefined) {
    datosActualizar.estado_reserva = datos.estado_reserva;
  }

  if (datos.estado_pago !== undefined) {
    datosActualizar.estado_pago = datos.estado_pago;
  }

  await reserva.update(datosActualizar);

  return obtenerReservaPorId(id);
};

module.exports = {
  crearReserva,
  listarReservas,
  obtenerReservaPorId,
  actualizarEstadoReserva
};