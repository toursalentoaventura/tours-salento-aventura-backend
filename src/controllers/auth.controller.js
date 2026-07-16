const {
  registrarAdministrador,
  iniciarSesionAdministrador
} = require('../services/auth.service');

/**
 * Controlador para registrar un administrador.
 *
 * Recibe nombre, correo, contraseña y código de autorización.
 * Este endpoint será útil para crear el primer administrador del sistema.
 */
const registrar = async (req, res) => {
  try {
    const { nombre, correo, contrasena, codigoAutorizacion } = req.body;

    if (!nombre || !correo || !contrasena || !codigoAutorizacion?.trim()) {
      return res.status(400).json({
        ok: false,
        message: 'Completa todos los campos obligatorios'
      });
    }

    const administrador = await registrarAdministrador(req.body);

    return res.status(201).json({
      ok: true,
      message: 'Administrador registrado correctamente',
      administrador: {
        id: administrador.id,
        nombre: administrador.nombre,
        correo: administrador.correo,
        estado: administrador.estado
      }
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      ok: false,
      message: error.message || 'Error al registrar administrador'
    });
  }
};

/**
 * Controlador para iniciar sesión.
 *
 * Valida las credenciales del administrador y devuelve un token JWT
 * para consumir rutas protegidas.
 */
const login = async (req, res) => {
  try {
    const { correo, contrasena } = req.body;

    if (!correo || !contrasena) {
      return res.status(400).json({
        ok: false,
        message: 'Correo y contraseña son obligatorios'
      });
    }

    const resultado = await iniciarSesionAdministrador(req.body);

    return res.status(200).json({
      ok: true,
      message: 'Inicio de sesión correcto',
      administrador: resultado.administrador,
      token: resultado.token
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      ok: false,
      message: error.message || 'Error al iniciar sesión'
    });
  }
};

module.exports = {
  registrar,
  login
};
