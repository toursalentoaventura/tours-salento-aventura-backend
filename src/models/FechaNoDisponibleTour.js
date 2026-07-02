const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const FechaNoDisponibleTour = sequelize.define('FechaNoDisponibleTour', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },

  id_tour: {
    type: DataTypes.INTEGER,
    allowNull: false
  },

  fecha_inicio: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },

  fecha_fin: {
    type: DataTypes.DATEONLY,
    allowNull: false
  }
}, {
  tableName: 'fechas_no_disponibles_tour',
  timestamps: false
});

module.exports = FechaNoDisponibleTour;