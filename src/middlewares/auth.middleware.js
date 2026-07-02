const jwt = require('jsonwebtoken');
const { Administrador } = require('../models');

/**
 * Middleware para proteger rutas privadas.
 *
 * Verifica que la petición tenga un token JWT válido
 * en el header Authorization.
 *
 * Formato esperado:
 * Authorization: Bearer token_aqui
 */
const protegerRuta = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    /**
     * Validamos que exista el header Authorization.
     */
    if (!authHeader) {
      return res.status(401).json({
        ok: false,
        message: 'No se proporcionó token de autenticación'
      });
    }

    /**
     * El token debe venir con el formato:
     * Bearer token
     */
    const partes = authHeader.split(' ');

    if (partes.length !== 2 || partes[0] !== 'Bearer') {
      return res.status(401).json({
        ok: false,
        message: 'Formato de token no válido'
      });
    }

    const token = partes[1];

    /**
     * Verificamos que el token sea válido y no haya expirado.
     */
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    /**
     * Buscamos el administrador asociado al token.
     */
    const administrador = await Administrador.findByPk(payload.id);

    if (!administrador) {
      return res.status(401).json({
        ok: false,
        message: 'Administrador no encontrado'
      });
    }

    /**
     * Validamos que el administrador esté activo.
     */
    if (administrador.estado !== 'activo') {
      return res.status(403).json({
        ok: false,
        message: 'El administrador se encuentra inactivo'
      });
    }

    /**
     * Guardamos la información del administrador en req
     * para poder usarla en controladores si se necesita.
     */
    req.administrador = {
      id: administrador.id,
      nombre: administrador.nombre,
      correo: administrador.correo
    };

    next();
  } catch (error) {
    return res.status(401).json({
      ok: false,
      message: 'Token inválido o expirado'
    });
  }
};

module.exports = {
  protegerRuta
};