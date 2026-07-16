const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { Administrador } = require('../models');

/**
 * Servicio para registrar un administrador.
 *
 * Este método se usará inicialmente para crear el primer usuario admin.
 * La contraseña se guarda encriptada, nunca en texto plano.
 */
const registrarAdministrador = async (datos) => {
  const { nombre, correo, contrasena, codigoAutorizacion } = datos;
  const codigoEsperado = process.env.CODIGO_REGISTRO_ADMIN;

  if (!codigoEsperado?.trim()) {
    const error = new Error(
      'El código de registro administrativo no está configurado en el servidor'
    );
    error.statusCode = 500;
    throw error;
  }

  if (codigoAutorizacion.trim() !== codigoEsperado) {
    const error = new Error('Código de autorización inválido');
    error.statusCode = 403;
    throw error;
  }

  const administradorExistente = await Administrador.findOne({
    where: { correo }
  });

  if (administradorExistente) {
    const error = new Error('El correo ya se encuentra registrado');
    error.statusCode = 409;
    throw error;
  }

  const contrasenaEncriptada = await bcrypt.hash(contrasena, 10);

  const administrador = await Administrador.create({
    nombre,
    correo,
    contrasena: contrasenaEncriptada,
    estado: 'activo'
  });

  return administrador;
};

/**
 * Servicio para iniciar sesión como administrador.
 *
 * Valida el correo, la contraseña y genera un token JWT
 * si las credenciales son correctas.
 */
const iniciarSesionAdministrador = async (datos) => {
  const { correo, contrasena } = datos;

  const administrador = await Administrador.findOne({
    where: { correo }
  });

  if (!administrador) {
    const error = new Error('Credenciales incorrectas');
    error.statusCode = 401;
    throw error;
  }

  if (administrador.estado !== 'activo') {
    const error = new Error('El administrador se encuentra inactivo');
    error.statusCode = 403;
    throw error;
  }

  const contrasenaValida = await bcrypt.compare(contrasena, administrador.contrasena);

  if (!contrasenaValida) {
    const error = new Error('Credenciales incorrectas');
    error.statusCode = 401;
    throw error;
  }

  const token = jwt.sign(
    {
      id: administrador.id,
      correo: administrador.correo
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '1d'
    }
  );

  return {
    administrador: {
      id: administrador.id,
      nombre: administrador.nombre,
      correo: administrador.correo,
      estado: administrador.estado
    },
    token
  };
};

module.exports = {
  registrarAdministrador,
  iniciarSesionAdministrador
};
