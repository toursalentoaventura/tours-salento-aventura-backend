const {
  crearReserva: crearReservaService,
  listarReservas: listarReservasService,
  obtenerReservaPorId: obtenerReservaPorIdService,
  actualizarEstadoReserva: actualizarEstadoReservaService
} = require('../services/reserva.service');

/**
 * Controlador para crear una reserva.
 *
 * Recibe los datos enviados desde el frontend,
 * valida campos obligatorios y delega la creación al servicio.
 */
const crearReserva = async (req, res) => {
  try {
    const {
      id_tour,
      id_precio_tour,
      nombre_cliente,
      correo_cliente,
      telefono_cliente,
      fecha_reserva,
      cantidad_personas
    } = req.body;

    /**
     * Validación básica de campos obligatorios.
     */
    if (
      !id_tour ||
      !id_precio_tour ||
      !nombre_cliente ||
      !correo_cliente ||
      !telefono_cliente ||
      !fecha_reserva ||
      !cantidad_personas
    ) {
      return res.status(400).json({
        ok: false,
        message: 'Faltan campos obligatorios para crear la reserva'
      });
    }

    const reserva = await crearReservaService(req.body);

    return res.status(201).json({
      ok: true,
      message: 'Reserva creada correctamente',
      reserva
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      ok: false,
      message: error.message || 'Error al crear la reserva'
    });
  }
};

/**
 * Controlador para listar reservas.
 *
 * Ruta pensada para el panel administrativo.
 */
const listarReservas = async (req, res) => {
  try {
    const reservas = await listarReservasService();

    return res.status(200).json({
      ok: true,
      message: 'Reservas consultadas correctamente',
      reservas
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: 'Error al consultar las reservas',
      error: error.message
    });
  }
};

/**
 * Controlador para obtener una reserva por ID.
 */
const obtenerReservaPorId = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        ok: false,
        message: 'El ID de la reserva no es válido'
      });
    }

    const reserva = await obtenerReservaPorIdService(id);

    if (!reserva) {
      return res.status(404).json({
        ok: false,
        message: 'Reserva no encontrada'
      });
    }

    return res.status(200).json({
      ok: true,
      message: 'Reserva consultada correctamente',
      reserva
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: 'Error al consultar la reserva',
      error: error.message
    });
  }
};

/**
 * Controlador para actualizar el estado de una reserva.
 *
 * Permite cambiar estado_reserva y/o estado_pago.
 */
const actualizarEstadoReserva = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado_reserva, estado_pago } = req.body;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        ok: false,
        message: 'El ID de la reserva no es válido'
      });
    }

    /**
     * Validamos que al menos uno de los dos estados venga en el body.
     */
    if (!estado_reserva && !estado_pago) {
      return res.status(400).json({
        ok: false,
        message: 'Debe enviar estado_reserva o estado_pago'
      });
    }

    const reserva = await actualizarEstadoReservaService(id, {
      estado_reserva,
      estado_pago
    });

    if (!reserva) {
      return res.status(404).json({
        ok: false,
        message: 'Reserva no encontrada'
      });
    }

    return res.status(200).json({
      ok: true,
      message: 'Estado de reserva actualizado correctamente',
      reserva
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: 'Error al actualizar el estado de la reserva',
      error: error.message
    });
  }
};

module.exports = {
  crearReserva,
  listarReservas,
  obtenerReservaPorId,
  actualizarEstadoReserva
};