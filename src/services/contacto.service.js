const { enviarCorreo } = require('./correo.service');

const escaparHtml = (valor = '') => String(valor)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

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

  const nombreLimpio = String(nombre).trim();
  const correoLimpio = String(correo).trim().toLowerCase();
  const telefonoLimpio = String(telefono || '').trim();
  const mensajeLimpio = String(mensaje).trim();

  if (nombreLimpio.length > 120 || correoLimpio.length > 150 ||
      telefonoLimpio.length > 40 || mensajeLimpio.length > 3000) {
    throw new Error('Uno de los campos supera la longitud permitida');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoLimpio)) {
    throw new Error('El correo no tiene un formato válido');
  }

  const adminEmail = process.env.MAILERSEND_ADMIN_EMAIL;

  if (!adminEmail) {
    throw new Error('No está configurado MAILERSEND_ADMIN_EMAIL');
  }

  const html = `
    <h2>Nuevo mensaje de contacto</h2>

    <p><strong>Nombre:</strong> ${escaparHtml(nombreLimpio)}</p>
    <p><strong>Correo:</strong> ${escaparHtml(correoLimpio)}</p>
    <p><strong>Teléfono:</strong> ${escaparHtml(telefonoLimpio || 'No registrado')}</p>

    <hr />

    <h3>Mensaje:</h3>
    <p>${escaparHtml(mensajeLimpio).replaceAll('\n', '<br>')}</p>
  `;

  await enviarCorreo({
    para: adminEmail,
    nombrePara: 'Administrador',
    asunto: 'Nuevo mensaje de contacto - Tour Salento Aventura',
    html,
    texto: `Nuevo mensaje de contacto de ${nombreLimpio}. Correo: ${correoLimpio}. Mensaje: ${mensajeLimpio}`
  });

  return {
    ok: true,
    message: 'Mensaje enviado correctamente'
  };
};

module.exports = {
  enviarMensajeContacto
};
