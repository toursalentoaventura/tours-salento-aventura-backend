require('dotenv').config();

const { enviarCorreo } = require('./src/services/correo.service');

const probarCorreo = async () => {
  try {
    console.log('Enviando correo de prueba...');
    console.log('FROM:', process.env.MAILERSEND_FROM_EMAIL);
    console.log('TO:', process.env.MAILERSEND_ADMIN_EMAIL);

    const respuesta = await enviarCorreo({
      para: process.env.MAILERSEND_ADMIN_EMAIL,
      nombrePara: 'Administrador',
      asunto: 'Prueba MailerSend API - Tour Salento Aventura',
      html: `
        <h2>Correo de prueba</h2>
        <p>MailerSend API está funcionando correctamente.</p>
        <p><strong>Proyecto:</strong> Tour Salento Aventura</p>
      `,
      texto: 'Correo de prueba. MailerSend API está funcionando correctamente.'
    });

    console.log('Correo enviado correctamente.');
    console.log(respuesta);
  } catch (error) {
    console.error('Error enviando correo:');

    if (error?.body) {
      console.error(error.body);
    } else if (error?.response?.body) {
      console.error(error.response.body);
    } else {
      console.error(error.message || error);
    }
  }
};

probarCorreo();