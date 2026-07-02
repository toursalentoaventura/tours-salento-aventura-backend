const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ItinerarioTour = sequelize.define('ItinerarioTour', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },

  id_tour: {
    type: DataTypes.INTEGER,
    allowNull: false
  },

  hora: {
    type: DataTypes.STRING(20),
    allowNull: true
  },

  titulo: {
    type: DataTypes.STRING(150),
    allowNull: false
  },

  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'itinerarios_tour',
  timestamps: false
});

module.exports = ItinerarioTour;