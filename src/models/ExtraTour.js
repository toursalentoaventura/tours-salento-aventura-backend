const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Modelo ExtraTour.
 *
 * Representa servicios adicionales que pueden agregarse
 * a un tour, como almuerzo, transporte, entradas, etc.
 */
const ExtraTour = sequelize.define('ExtraTour', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },

  id_tour: {
    type: DataTypes.INTEGER,
    allowNull: false
  },

  nombre: {
    type: DataTypes.STRING(150),
    allowNull: false
  },

  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true
  },

  precio: {
    type: DataTypes.INTEGER,
    allowNull: false
  },

  activo: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'extras_tour',
  timestamps: false
});

module.exports = ExtraTour;