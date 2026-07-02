const sequelize = require('../config/database');

const Tour = require('./Tour');
const PrecioTour = require('./PrecioTour');
const ImagenTour = require('./ImagenTour');
const FechaNoDisponibleTour = require('./FechaNoDisponibleTour');
const DetalleTour = require('./DetalleTour');
const ItinerarioTour = require('./ItinerarioTour');
const HorarioTour = require('./HorarioTour');
const Administrador = require('./Administrador');
const Reserva = require('./Reserva');
const ExtraTour = require('./ExtraTour');
const TraduccionTour = require('./TraduccionTour');
const Pago = require('./Pago');
Tour.hasMany(PrecioTour, {
  foreignKey: 'id_tour',
  as: 'precios',
  onDelete: 'CASCADE'
});

PrecioTour.belongsTo(Tour, {
  foreignKey: 'id_tour',
  as: 'tour'
});

Tour.hasMany(ImagenTour, {
  foreignKey: 'id_tour',
  as: 'imagenes',
  onDelete: 'CASCADE'
});

ImagenTour.belongsTo(Tour, {
  foreignKey: 'id_tour',
  as: 'tour'
});

Tour.hasMany(FechaNoDisponibleTour, {
  foreignKey: 'id_tour',
  as: 'fechas_no_disponibles',
  onDelete: 'CASCADE'
});

FechaNoDisponibleTour.belongsTo(Tour, {
  foreignKey: 'id_tour',
  as: 'tour'
});

Tour.hasMany(DetalleTour, {
  foreignKey: 'id_tour',
  as: 'detalles',
  onDelete: 'CASCADE'
});

DetalleTour.belongsTo(Tour, {
  foreignKey: 'id_tour',
  as: 'tour'
});

Tour.hasMany(ItinerarioTour, {
  foreignKey: 'id_tour',
  as: 'itinerario',
  onDelete: 'CASCADE'
});

ItinerarioTour.belongsTo(Tour, {
  foreignKey: 'id_tour',
  as: 'tour'
});

Tour.hasMany(HorarioTour, {
  foreignKey: 'id_tour',
  as: 'horarios',
  onDelete: 'CASCADE'
});

HorarioTour.belongsTo(Tour, {
  foreignKey: 'id_tour',
  as: 'tour'
});

/**
 * Relación: un tour puede tener muchas reservas.
 */
Tour.hasMany(Reserva, {
  foreignKey: 'id_tour',
  as: 'reservas',
  onDelete: 'CASCADE'
});

Reserva.belongsTo(Tour, {
  foreignKey: 'id_tour',
  as: 'tour'
});

/**
 * Relación: una reserva puede estar asociada
 * a un precio específico del tour.
 */
PrecioTour.hasMany(Reserva, {
  foreignKey: 'id_precio_tour',
  as: 'reservas'
});

Reserva.belongsTo(PrecioTour, {
  foreignKey: 'id_precio_tour',
  as: 'precio_tour'
});

/**
 * Relación: una reserva puede estar asociada
 * a un horario específico del tour.
 */
HorarioTour.hasMany(Reserva, {
  foreignKey: 'id_horario_tour',
  as: 'reservas'
});

Reserva.belongsTo(HorarioTour, {
  foreignKey: 'id_horario_tour',
  as: 'horario_tour'
});

/**
 * Relación: un tour puede tener muchos extras.
 */
Tour.hasMany(ExtraTour, {
  foreignKey: 'id_tour',
  as: 'extras',
  onDelete: 'CASCADE'
});

ExtraTour.belongsTo(Tour, {
  foreignKey: 'id_tour',
  as: 'tour'
});

/**
 * Relación: un tour puede tener muchas traducciones.
 */
Tour.hasMany(TraduccionTour, {
  foreignKey: 'id_tour',
  as: 'traducciones',
  onDelete: 'CASCADE'
});

TraduccionTour.belongsTo(Tour, {
  foreignKey: 'id_tour',
  as: 'tour'
});
/**
 * Relación: una reserva puede tener muchos pagos.
 *
 * Esto permite registrar varios intentos de pago
 * para una misma reserva.
 */
Reserva.hasMany(Pago, {
  foreignKey: 'id_reserva',
  as: 'pagos',
  onDelete: 'CASCADE'
});

Pago.belongsTo(Reserva, {
  foreignKey: 'id_reserva',
  as: 'reserva'
});
module.exports = {
  sequelize,
  Tour,
  PrecioTour,
  ImagenTour,
  FechaNoDisponibleTour,
  DetalleTour,
  ItinerarioTour,
  HorarioTour,
  Administrador,
  Reserva,
  ExtraTour,
  TraduccionTour,
  Pago
};