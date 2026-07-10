const { enviarCorreo } = require('./correo.service');

/**
 * Envía el mensaje del formulario de contacto
 * al correo administrador configurado en el .env.
 */
const enviarMensajeContacto = async ({
  nombre,
  correo,
  telefono,
  mensaje
}) => {
  if (!nombre || !correo || !mensaje) {
    throw new Error('Nombre, correo y mensaje son obligatorios');
  }

  const adminEmail = process.env.MAILERSEND_ADMIN_EMAIL;

  if (!adminEmail) {
    throw new Error('No está configurado MAILERSEND_ADMIN_EMAIL');
  }

  const html = `
    <h2>Nuevo mensaje de contacto</h2>

    <p><strong>Nombre:</strong> ${nombre}</p>
    <p><strong>Correo:</strong> ${correo}</p>
    <p><strong>Teléfono:</strong> ${telefono || 'No registrado'}</p>

    <hr />

    <h3>Mensaje:</h3>
    <p>${mensaje}</p>
  `;

  await enviarCorreo({
    para: adminEmail,
    nombrePara: 'Administrador',
    asunto: 'Nuevo mensaje de contacto - Tour Salento Aventura',
    html,
    texto: `Nuevo mensaje de contacto de ${nombre}. Correo: ${correo}. Mensaje: ${mensaje}`
  });

  return {
    ok: true,
    message: 'Mensaje enviado correctamente'
  };
};

module.exports = {
  enviarMensajeContacto
};