const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DetalleTour = sequelize.define('DetalleTour', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },

  id_tour: {
    type: DataTypes.INTEGER,
    allowNull: false
  },

  tipo_detalle: {
    type: DataTypes.ENUM('incluye', 'no_incluye', 'requisito', 'restriccion'),
    allowNull: false
  },

  descripcion: {
    type: DataTypes.STRING(255),
    allowNull: false
  }
}, {
  tableName: 'detalles_tour',
  timestamps: false
});

module.exports = DetalleTour;