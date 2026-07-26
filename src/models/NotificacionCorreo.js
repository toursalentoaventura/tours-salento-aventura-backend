const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Registro persistente de correos transaccionales.
 *
 * La restricción única evita que dos webhooks repetidos de Wompi generen
 * más de una confirmación para la misma reserva.
 */
const NotificacionCorreo = sequelize.define('NotificacionCorreo', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  id_reserva: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  tipo: {
    type: DataTypes.STRING(80),
    allowNull: false
  },
  estado: {
    type: DataTypes.ENUM('pendiente', 'enviando', 'enviado', 'error'),
    allowNull: false,
    defaultValue: 'pendiente'
  },
  intentos: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  ultimo_error: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  enviado_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'notificaciones_correo',
  createdAt: 'creado_at',
  updatedAt: 'actualizado_at',
  indexes: [
    {
      unique: true,
      fields: ['id_reserva', 'tipo']
    }
  ]
});

module.exports = NotificacionCorreo;
