const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PrecioTour = sequelize.define('PrecioTour', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },

  id_tour: {
    type: DataTypes.INTEGER,
    allowNull: false
  },

  cantidad_personas: {
    type: DataTypes.STRING(100),
    allowNull: false
  },

  precio: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: 'precios_tour',
  timestamps: false
});

module.exports = PrecioTour;