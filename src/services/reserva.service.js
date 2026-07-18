const { Op } = require('sequelize');

const {
  sequelize,
  Reserva,
  Tour,
  PrecioTour,
  HorarioTour,
  FechaNoDisponibleTour,
  ExtraTour
} = require('../models');
const { normalizarFecha, validarDisponibilidadTemporal } = require('../utils/disponibilidadReserva');

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
   * Convertimos cantidad de personas a número para evitar errores
   * al comparar o calcular el valor total.
   */
  const cantidadPersonasNumero = Number(cantidad_personas);

  if (!normalizarFecha(fecha_reserva)) {
    throw Object.assign(new Error('La fecha de reserva debe tener formato YYYY-MM-DD.'), { statusCode: 422 });
  }

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
    const error = new Error('La fecha seleccionada no está disponible para este tour.');
    error.statusCode = 422;
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
  if (!id_horario_tour) {
    throw Object.assign(new Error('No se encontró el horario seleccionado.'), { statusCode: 422 });
  }
  const horarioValidado = await HorarioTour.findByPk(id_horario_tour);
  if (!horarioValidado) throw Object.assign(new Error('No se encontró el horario seleccionado.'), { statusCode: 422 });
  if (Number(horarioValidado.id_tour) !== Number(id_tour)) {
    throw Object.assign(new Error('El horario seleccionado no pertenece al tour.'), { statusCode: 422 });
  }
  if (!horarioValidado.activo) {
    throw Object.assign(new Error('El horario seleccionado ya no está disponible.'), { statusCode: 422 });
  }
  const idHorarioReserva = horarioValidado.id;
  validarDisponibilidadTemporal({
    fechaReserva: fecha_reserva,
    horaInicio: horarioValidado.hora_inicio,
    rangos: fechaBloqueada ? [fechaBloqueada] : []
  });

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
  const idReservaCreada = await sequelize.transaction(async (transaccion) => {
    const extrasSeleccionados = [];

    if (Array.isArray(extras) && extras.length > 0) {
      const idsExtras = [
        ...new Set(
          extras
            .map((extra) => Number(extra.id_extra_tour || extra.id_extra))
            .filter(Number.isInteger)
        )
      ];

      if (idsExtras.length !== extras.length) {
        const error = new Error('Uno de los extras seleccionados no está disponible');
        error.statusCode = 400;
        throw error;
      }

      const extrasValidos = await ExtraTour.findAll({
        where: {
          id: { [Op.in]: idsExtras },
          id_tour,
          activo: true
        },
        transaction: transaccion
      });

      if (extrasValidos.length !== idsExtras.length) {
        const error = new Error('Uno de los extras seleccionados no está disponible');
        error.statusCode = 400;
        throw error;
      }

      for (const extraTour of extrasValidos) {
        const subtotal = Number(extraTour.precio);

        valor_total += subtotal;

        extrasSeleccionados.push({
          id_extra_tour: extraTour.id,
          nombre: extraTour.nombre,
          cantidad: 1,
          precio_unitario: Number(extraTour.precio),
          subtotal
        });
      }
    }

    const reserva = await Reserva.create(
      {
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
      },
      { transaction: transaccion }
    );

    return reserva.id;
  });

  return obtenerReservaPorId(idReservaCreada);
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
