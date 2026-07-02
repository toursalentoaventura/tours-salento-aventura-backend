const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Modelo TraduccionTour.
 *
 * Guarda la traducción generada para un tour.
 * La traducción se crea una sola vez al crear o actualizar el tour.
 */
const TraduccionTour = sequelize.define('TraduccionTour', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },

  id_tour: {
    type: DataTypes.INTEGER,
    allowNull: false
  },

  idioma: {
    type: DataTypes.STRING(10),
    allowNull: false
  },

  contenido: {
    type: DataTypes.JSON,
    allowNull: false
  }
}, {
  tableName: 'traducciones_tour',
  timestamps: false
});

module.exports = TraduccionTour;