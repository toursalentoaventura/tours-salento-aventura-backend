const express = require('express');

const {
  enviarContacto
} = require('../controllers/contacto.controller');

const router = express.Router();

/**
 * Ruta pública para enviar mensajes desde el formulario de contacto.
 */
router.post('/', enviarContacto);

module.exports = router;