const express = require('express');

const {
  registrar,
  login
} = require('../controllers/auth.controller');

const router = express.Router();

/**
 * Registrar administrador.
 *
 * Crea un administrador en la base de datos.
 * Endpoint final:
 * POST /api/auth/registrar
 */
router.post('/registrar', registrar);

/**
 * Iniciar sesión como administrador.
 *
 * Devuelve un token JWT si las credenciales son correctas.
 * Endpoint final:
 * POST /api/auth/login
 */
router.post('/login', login);

module.exports = router;