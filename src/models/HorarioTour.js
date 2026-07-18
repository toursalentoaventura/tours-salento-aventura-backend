const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const HorarioTour = sequelize.define('HorarioTour', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },

  id_tour: {
    type: DataTypes.INTEGER,
    allowNull: false
  },

  hora_inicio: {
    type: DataTypes.TIME,
    allowNull: false
  },

  activo: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'horarios_tour',
  timestamps: false
});

module.exports = HorarioTour;
