const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Tour = sequelize.define('Tour', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },

  nombre: {
    type: DataTypes.STRING(150),
    allowNull: false
  },

  categoria: {
    type: DataTypes.STRING(100),
    allowNull: false
  },

  dificultad: {
    type: DataTypes.STRING(50),
    allowNull: true
  },

  tipo_tour: {
    type: DataTypes.ENUM('privado', 'compartido'),
    allowNull: false
  },
    idiomas: {
    type: DataTypes.JSON,
    allowNull: true
    },

  estado_publicacion: {
    type: DataTypes.ENUM('activo', 'inactivo'),
    allowNull: false,
    defaultValue: 'activo'
  },

  duracion: {
    type: DataTypes.STRING(50),
    allowNull: false
  },

  maximo_personas: {
    type: DataTypes.INTEGER,
    allowNull: false
  },

  ubicacion_destino: {
    type: DataTypes.STRING(150),
    allowNull: true
  },

  punto_encuentro: {
    type: DataTypes.STRING(200),
    allowNull: true
  },

  descripcion: {
    type: DataTypes.TEXT,
    allowNull: false
  }
}, {
  tableName: 'tours',
  timestamps: false
});

module.exports = Tour;