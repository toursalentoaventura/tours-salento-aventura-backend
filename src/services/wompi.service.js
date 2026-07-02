const crypto = require('crypto');
require('dotenv').config();

/**
 * Genera una referencia única para Wompi.
 *
 * La referencia debe ser única por transacción.
 */
const generarReferenciaPago = (idReserva) => {
  const timestamp = Date.now();

  return `TSA-RES-${idReserva}-${timestamp}`;
};

/**
 * Genera la firma de integridad requerida por Wompi.
 *
 * Fórmula:
 * referencia + monto_en_centavos + moneda + secreto_integridad
 */
const generarFirmaIntegridad = ({ referencia, montoCentavos, moneda }) => {
  const secretoIntegridad = process.env.WOMPI_INTEGRITY_SECRET;

  if (!secretoIntegridad) {
    throw new Error('No está configurado WOMPI_INTEGRITY_SECRET');
  }

  const cadena = `${referencia}${montoCentavos}${moneda}${secretoIntegridad}`;

  return crypto
    .createHash('sha256')
    .update(cadena)
    .digest('hex');
};

/**
 * Construye la URL de Web Checkout de Wompi.
 *
 * Importante:
 * - No usamos URLSearchParams para evitar problemas con el parámetro
 *   signature:integrity.
 * - Solo enviamos redirect-url si es HTTPS.
 */
const construirUrlCheckoutWompi = ({
  referencia,
  montoCentavos,
  moneda,
  firmaIntegridad,
  reserva
}) => {
  const checkoutUrl = process.env.WOMPI_CHECKOUT_URL || 'https://checkout.wompi.co/p/';
  const publicKey = process.env.WOMPI_PUBLIC_KEY;
  const redirectUrl = process.env.FRONTEND_PAYMENT_REDIRECT_URL;

  if (!publicKey) {
    throw new Error('No está configurado WOMPI_PUBLIC_KEY');
  }

  const parametros = [
    `public-key=${encodeURIComponent(publicKey)}`,
    `currency=${encodeURIComponent(moneda)}`,
    `amount-in-cents=${encodeURIComponent(montoCentavos)}`,
    `reference=${encodeURIComponent(referencia)}`,
    `signature:integrity=${encodeURIComponent(firmaIntegridad)}`
  ];

  /**
   * Wompi debe recibir una URL pública HTTPS.
   * En local, mejor no enviarla hasta usar ngrok.
   */
  if (redirectUrl && redirectUrl.startsWith('https://')) {
    parametros.push(`redirect-url=${encodeURIComponent(redirectUrl)}`);
  }

  if (reserva?.correo_cliente) {
    parametros.push(`customer-data:email=${encodeURIComponent(reserva.correo_cliente)}`);
  }

  if (reserva?.nombre_cliente) {
    parametros.push(`customer-data:full-name=${encodeURIComponent(reserva.nombre_cliente)}`);
  }

  if (reserva?.telefono_cliente) {
    parametros.push(`customer-data:phone-number=${encodeURIComponent(reserva.telefono_cliente)}`);
  }

  if (reserva?.documento_cliente) {
    parametros.push(`customer-data:legal-id=${encodeURIComponent(reserva.documento_cliente)}`);
    parametros.push('customer-data:legal-id-type=CC');
  }

  return `${checkoutUrl}?${parametros.join('&')}`;
};

/**
 * Obtiene un valor anidado dentro de un objeto usando una ruta tipo:
 * transaction.id
 * transaction.status
 * transaction.amount_in_cents
 */
const obtenerValorPorRuta = (objeto, ruta) => {
  return ruta.split('.').reduce((actual, propiedad) => {
    return actual ? actual[propiedad] : undefined;
  }, objeto);
};

/**
 * Valida la firma de un evento enviado por Wompi.
 *
 * Wompi envía dentro del evento:
 * - signature.properties: campos usados para construir la firma
 * - signature.checksum: hash enviado por Wompi
 * - timestamp: usado también para el cálculo
 *
 * El backend debe recalcular el checksum y compararlo.
 */
const validarFirmaEventoWompi = (evento) => {
  const secretoEventos = process.env.WOMPI_EVENTS_SECRET;

  if (!secretoEventos) {
    throw new Error('No está configurado WOMPI_EVENTS_SECRET');
  }

  const properties = evento?.signature?.properties || [];
  const checksumRecibido = evento?.signature?.checksum;
  const timestamp = evento?.timestamp;

  if (!checksumRecibido || !timestamp || properties.length === 0) {
    return false;
  }

  let cadena = '';

  for (const propiedad of properties) {
    const valor = obtenerValorPorRuta(evento.data, propiedad);

    if (valor === undefined || valor === null) {
      return false;
    }

    cadena += valor;
  }

  cadena += timestamp;
  cadena += secretoEventos;

  const checksumCalculado = crypto
    .createHash('sha256')
    .update(cadena)
    .digest('hex');

  return checksumCalculado === checksumRecibido;
};

module.exports = {
  generarReferenciaPago,
  generarFirmaIntegridad,
  construirUrlCheckoutWompi,
  validarFirmaEventoWompi
};

