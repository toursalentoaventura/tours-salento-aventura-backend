const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ImagenTour = sequelize.define('ImagenTour', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },

  id_tour: {
    type: DataTypes.INTEGER,
    allowNull: false
  },

  url_imagen: {
    type: DataTypes.STRING(500),
    allowNull: false
  },

  public_id_cloudinary: {
    type: DataTypes.STRING(255),
    allowNull: true
  },

  es_portada: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
}, {
  tableName: 'imagenes_tour',
  timestamps: false
});

module.exports = ImagenTour;