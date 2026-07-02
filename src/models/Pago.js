const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Modelo Pago.
 *
 * Representa un intento de pago asociado a una reserva.
 * Se guarda la referencia generada, el monto, la URL de pago
 * y el estado reportado por la pasarela.
 */
const Pago = sequelize.define('Pago', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },

  id_reserva: {
    type: DataTypes.INTEGER,
    allowNull: false
  },

  proveedor_pago: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'wompi'
  },

  referencia_pago: {
    type: DataTypes.STRING(150),
    allowNull: false,
    unique: true
  },

  referencia_externa: {
    type: DataTypes.STRING(200),
    allowNull: true
  },

  monto: {
    type: DataTypes.INTEGER,
    allowNull: false
  },

  monto_centavos: {
    type: DataTypes.INTEGER,
    allowNull: false
  },

  moneda: {
    type: DataTypes.STRING(10),
    allowNull: false,
    defaultValue: 'COP'
  },

  estado_pago: {
    type: DataTypes.ENUM('pendiente', 'aprobado', 'rechazado', 'cancelado', 'reembolsado'),
    allowNull: false,
    defaultValue: 'pendiente'
  },

  url_pago: {
    type: DataTypes.STRING(1000),
    allowNull: true
  },

  respuesta_pasarela: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  tableName: 'pagos',
  timestamps: false
});

module.exports = Pago;