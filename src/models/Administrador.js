const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Modelo Administrador.
 *
 * Representa los usuarios administradores que podrán ingresar
 * al panel administrativo del sistema.
 */
const Administrador = sequelize.define('Administrador', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },

  nombre: {
    type: DataTypes.STRING(120),
    allowNull: false
  },

  correo: {
    type: DataTypes.STRING(150),
    allowNull: false,
    unique: true
  },

  contrasena: {
    type: DataTypes.STRING(255),
    allowNull: false
  },

  estado: {
    type: DataTypes.ENUM('activo', 'inactivo'),
    allowNull: false,
    defaultValue: 'activo'
  }
}, {
  tableName: 'administradores',
  timestamps: false
});

module.exports = Administrador;