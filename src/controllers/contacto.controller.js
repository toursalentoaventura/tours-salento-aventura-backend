const { enviarMensajeContacto } = require('../services/contacto.service');

/**
 * Recibe los datos del formulario de contacto
 * y solicita el envío del correo.
 */
const enviarContacto = async (req, res) => {
  try {
    const resultado = await enviarMensajeContacto(req.body);

    res.status(200).json(resultado);
  } catch (error) {
    res.status(400).json({
      ok: false,
      message: error.message
    });
  }
};

module.exports = {
  enviarContacto
};