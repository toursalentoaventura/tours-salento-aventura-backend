const {
  MailerSend,
  EmailParams,
  Sender,
  Recipient
} = require('mailersend');
const { generarPlantillaConfirmacionReserva } = require('../templates/emails/reservaConfirmacion.template');

require('dotenv').config();

/**
 * Cliente principal de MailerSend.
 *
 * Usa el API key configurado en el archivo .env.
 */
const mailerSend = new MailerSend({
  apiKey: process.env.MAILERSEND_API_KEY
});

/**
 * Remitente oficial del sistema.
 *
 * Este correo debe pertenecer a un dominio verificado
 * dentro de MailerSend.
 */
const remitente = new Sender(
  process.env.MAILERSEND_FROM_EMAIL,
  process.env.MAILERSEND_FROM_NAME || 'Tour Salento Aventura'
);

/**
 * Servicio genérico para enviar correos.
 *
 * Recibe destinatario, asunto, contenido HTML y texto plano.
 */
const enviarCorreo = async ({
  para,
  nombrePara,
  asunto,
  html,
  texto
}) => {
  if (!process.env.MAILERSEND_API_KEY) {
    throw new Error('No está configurado MAILERSEND_API_KEY');
  }

  if (!process.env.MAILERSEND_FROM_EMAIL) {
    throw new Error('No está configurado MAILERSEND_FROM_EMAIL');
  }

  const destinatarios = [
    new Recipient(para, nombrePara || para)
  ];

  const emailParams = new EmailParams()
    .setFrom(remitente)
    .setTo(destinatarios)
    .setSubject(asunto)
    .setHtml(html)
    .setText(texto || asunto);

  const respuesta = await mailerSend.email.send(emailParams);

  return respuesta;
};

/**
 * Correo para el cliente cuando crea una reserva.
 */
const enviarCorreoReservaCliente = async (reserva) => {
  const html = `
    <h2>Reserva recibida</h2>
    <p>Hola ${reserva.nombre_cliente},</p>
    <p>Hemos recibido tu reserva en <strong>Tour Salento Aventura</strong>.</p>
    <p><strong>Fecha:</strong> ${reserva.fecha_reserva}</p>
    <p><strong>Cantidad de personas:</strong> ${reserva.cantidad_personas}</p>
    <p><strong>Valor total:</strong> $${Number(reserva.valor_total).toLocaleString('es-CO')} COP</p>
    <p>Tu reserva está pendiente de confirmación de pago.</p>
  `;

  return enviarCorreo({
    para: reserva.correo_cliente,
    nombrePara: reserva.nombre_cliente,
    asunto: 'Reserva recibida - Tour Salento Aventura',
    html,
    texto: `Hola ${reserva.nombre_cliente}, hemos recibido tu reserva.`
  });
};

/**
 * Correo para el administrador cuando entra una nueva reserva.
 */
const enviarCorreoNuevaReservaAdmin = async (reserva) => {
  const adminEmail = process.env.MAILERSEND_ADMIN_EMAIL;

  if (!adminEmail) {
    return null;
  }

  const html = `
    <h2>Nueva reserva recibida</h2>
    <p><strong>Cliente:</strong> ${reserva.nombre_cliente}</p>
    <p><strong>Correo:</strong> ${reserva.correo_cliente}</p>
    <p><strong>Teléfono:</strong> ${reserva.telefono_cliente}</p>
    <p><strong>Fecha:</strong> ${reserva.fecha_reserva}</p>
    <p><strong>Cantidad de personas:</strong> ${reserva.cantidad_personas}</p>
    <p><strong>Valor total:</strong> $${Number(reserva.valor_total).toLocaleString('es-CO')} COP</p>
  `;

  return enviarCorreo({
    para: adminEmail,
    nombrePara: 'Administrador',
    asunto: 'Nueva reserva - Tour Salento Aventura',
    html,
    texto: `Nueva reserva de ${reserva.nombre_cliente}`
  });
};

/**
 * Correo para el cliente cuando el pago es aprobado.
 */
const enviarCorreoPagoAprobadoCliente = async (reserva) => {
  const reservaPlana = typeof reserva?.get === 'function'
    ? reserva.get({ plain: true })
    : reserva;
  const extras = Array.isArray(reservaPlana.extras_seleccionados)
    ? reservaPlana.extras_seleccionados
    : [];
  const subtotalExtras = extras.reduce(
    (total, extra) => total + Number(extra.subtotal || 0),
    0
  );
  const total = Number(reservaPlana.valor_total || 0);
  const html = generarPlantillaConfirmacionReserva({
    nombreCliente: reservaPlana.nombre_cliente,
    nombreTour: reservaPlana.tour?.nombre,
    fechaReserva: reservaPlana.fecha_reserva,
    horario: reservaPlana.horario_tour?.hora_inicio,
    cantidadPersonas: reservaPlana.cantidad_personas,
    puntoEncuentro: reservaPlana.tour?.punto_encuentro,
    idioma: reservaPlana.idioma,
    extras: extras.map((extra) => ({
      nombre: extra.nombre,
      cantidad: extra.cantidad,
      precio: extra.subtotal
    })),
    subtotalTour: Math.max(0, total - subtotalExtras),
    subtotalExtras,
    total,
    moneda: 'COP',
    estadoReserva: 'Confirmada',
    estadoPago: 'Pagado',
    referencia: reservaPlana.referencia_pago,
    observaciones: reservaPlana.observaciones,
    correoCliente: reservaPlana.correo_cliente,
    telefonoCliente: reservaPlana.telefono_cliente,
    logoUrl: process.env.MAILERSEND_LOGO_URL,
    contacto: {
      whatsapp: process.env.CONTACT_WHATSAPP || '+57 313 797 8499',
      correo: process.env.MAILERSEND_FROM_EMAIL,
      sitioWeb: process.env.PUBLIC_SITE_URL || 'https://tourssalentoaventura.com'
    }
  });

  return enviarCorreo({
    para: reservaPlana.correo_cliente,
    nombrePara: reservaPlana.nombre_cliente,
    asunto: `Reserva confirmada${reservaPlana.tour?.nombre ? ` - ${reservaPlana.tour.nombre}` : ''}`,
    html,
    texto: `Hola ${reservaPlana.nombre_cliente}, tu pago fue aprobado y tu reserva está confirmada.`
  });
};

/**
 * Correo para el cliente cuando el pago es rechazado.
 */
const enviarCorreoPagoRechazadoCliente = async (reserva) => {
  const html = `
    <h2>Pago no aprobado</h2>
    <p>Hola ${reserva.nombre_cliente},</p>
    <p>Tu pago no fue aprobado. Puedes intentar realizar el pago nuevamente.</p>
    <p><strong>Fecha del tour:</strong> ${reserva.fecha_reserva}</p>
    <p><strong>Valor:</strong> $${Number(reserva.valor_total).toLocaleString('es-CO')} COP</p>
  `;

  return enviarCorreo({
    para: reserva.correo_cliente,
    nombrePara: reserva.nombre_cliente,
    asunto: 'Pago no aprobado - Tour Salento Aventura',
    html,
    texto: `Hola ${reserva.nombre_cliente}, tu pago no fue aprobado.`
  });
};

module.exports = {
  enviarCorreo,
  enviarCorreoReservaCliente,
  enviarCorreoNuevaReservaAdmin,
  enviarCorreoPagoAprobadoCliente,
  enviarCorreoPagoRechazadoCliente
};
