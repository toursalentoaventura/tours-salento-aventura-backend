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
    hora_inicio,
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
   * Convertimos cantidad de personas a número para evitar errores
   * al comparar o calcular el valor total.
   */
  const cantidadPersonasNumero = Number(cantidad_personas);

  if (!cantidadPersonasNumero || cantidadPersonasNumero <= 0) {
    const error = new Error('La cantidad de personas debe ser válida');
    error.statusCode = 400;
    throw error;
  }

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
  if (cantidadPersonasNumero > Number(tour.maximo_personas)) {
    const error = new Error('La cantidad de personas supera el máximo permitido para este tour');
    error.statusCode = 400;
    throw error;
  }

  /**
   * Validamos que el idioma seleccionado esté disponible para el tour.
   *
   * Nota:
   * idiomas puede venir como array o como string JSON.
   */
  let idiomasTour = [];

  if (Array.isArray(tour.idiomas)) {
    idiomasTour = tour.idiomas;
  } else if (typeof tour.idiomas === 'string') {
    try {
      idiomasTour = JSON.parse(tour.idiomas);
    } catch {
      idiomasTour = [];
    }
  }

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
   * Validamos o buscamos el horario seleccionado.
   *
   * Si viene id_horario_tour, se valida por ID.
   * Si no viene ID pero sí viene hora_inicio, se busca por la hora.
   */
  let idHorarioReserva = id_horario_tour || null;

  if (idHorarioReserva) {
    const horarioTour = await HorarioTour.findOne({
      where: {
        id: idHorarioReserva,
        id_tour,
        activo: true
      }
    });

    if (!horarioTour) {
      const error = new Error('El horario seleccionado no está disponible para este tour');
      error.statusCode = 400;
      throw error;
    }
  } else if (hora_inicio) {
    const horarioTour = await HorarioTour.findOne({
      where: {
        id_tour,
        hora_inicio,
        activo: true
      }
    });

    if (horarioTour) {
      idHorarioReserva = horarioTour.id;
    }
  }

  /**
   * Calculamos el valor base de la reserva.
   *
   * IMPORTANTE:
   * precioTour.precio es el precio por persona.
   * Por eso se multiplica por cantidad_personas.
   */
  let valor_total = Number(precioTour.precio) * cantidadPersonasNumero;

  /**
   * Validamos y calculamos los extras seleccionados.
   *
   * El frontend debe enviar:
   * extras: [
   *   {
   *     id_extra_tour: 1,
   *     cantidad: 2
   *   }
   * ]
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

      const cantidadExtra = Number(extraSeleccionado.cantidad || 1);
      const subtotal = Number(extraTour.precio) * cantidadExtra;

      valor_total += subtotal;

      extrasSeleccionados.push({
        id_extra_tour: extraTour.id,
        nombre: extraTour.nombre,
        cantidad: cantidadExtra,
        precio_unitario: Number(extraTour.precio),
        subtotal
      });
    }
  }

  /**
   * Creamos la reserva.
   */
  const reserva = await Reserva.create({
    id_tour,
    id_precio_tour,
    id_horario_tour: idHorarioReserva,
    nombre_cliente,
    correo_cliente,
    telefono_cliente,
    documento_cliente: documento_cliente || null,
    fecha_reserva,
    cantidad_personas: cantidadPersonasNumero,
    idioma: idioma || 'Español',
    valor_total,
    extras_seleccionados: extrasSeleccionados,
    estado_reserva: 'pendiente',
    estado_pago: 'pendiente',
    observaciones: observaciones || 'Sin observaciones'
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