const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Modelo Reserva.
 *
 * Representa una reserva realizada por un cliente para un tour.
 * Guarda datos del cliente, fecha seleccionada, cantidad de personas,
 * idioma del tour, valor total y estados de reserva/pago.
 */
const Reserva = sequelize.define('Reserva', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },

  id_tour: {
    type: DataTypes.INTEGER,
    allowNull: false
  },

  id_precio_tour: {
    type: DataTypes.INTEGER,
    allowNull: true
  },

  id_horario_tour: {
    type: DataTypes.INTEGER,
    allowNull: true
  },

  nombre_cliente: {
    type: DataTypes.STRING(120),
    allowNull: false
  },

  correo_cliente: {
    type: DataTypes.STRING(150),
    allowNull: false
  },

  telefono_cliente: {
    type: DataTypes.STRING(50),
    allowNull: false
  },

  documento_cliente: {
    type: DataTypes.STRING(50),
    allowNull: true
  },

  fecha_reserva: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },

  cantidad_personas: {
    type: DataTypes.INTEGER,
    allowNull: false
  },

  idioma: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'Español'
  },

  valor_total: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
    extras_seleccionados: {
    type: DataTypes.JSON,
    allowNull: true
  },

  estado_reserva: {
    type: DataTypes.ENUM('pendiente', 'confirmada', 'cancelada', 'completada'),
    allowNull: false,
    defaultValue: 'pendiente'
  },

  estado_pago: {
    type: DataTypes.ENUM('pendiente', 'pagado', 'rechazado', 'reembolsado'),
    allowNull: false,
    defaultValue: 'pendiente'
  },

  observaciones: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'reservas',
  timestamps: false
});

module.exports = Reserva;