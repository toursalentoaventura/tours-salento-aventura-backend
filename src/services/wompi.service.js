const crypto = require('crypto');
require('dotenv').config();

/**
 * Genera una referencia única para Wompi.
 *
 * La referencia debe ser única por transacción.
 */
const generarReferenciaPago = (idReserva) => {
  return `TSA-RES-${idReserva}-${crypto.randomUUID()}`;
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
 * URL y URLSearchParams codifican también parámetros con dos puntos.
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
  const redirectUrl = process.env.WOMPI_REDIRECT_URL ||
    `${String(process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '')}/pago/confirmacion`;

  if (!publicKey) {
    throw new Error('No está configurado WOMPI_PUBLIC_KEY');
  }

  const url = new URL(checkoutUrl);
  const parametros = url.searchParams;
  parametros.set('public-key', publicKey);
  parametros.set('currency', moneda);
  parametros.set('amount-in-cents', String(montoCentavos));
  parametros.set('reference', referencia);
  parametros.set('signature:integrity', firmaIntegridad);
  parametros.set('redirect-url', redirectUrl);

  if (reserva?.correo_cliente) {
    parametros.set('customer-data:email', reserva.correo_cliente);
  }

  if (reserva?.nombre_cliente) {
    parametros.set('customer-data:full-name', reserva.nombre_cliente);
  }

  if (reserva?.telefono_cliente) {
    parametros.set('customer-data:phone-number', reserva.telefono_cliente);
  }

  if (reserva?.documento_cliente) {
    parametros.set('customer-data:legal-id', reserva.documento_cliente);
    parametros.set('customer-data:legal-id-type', 'CC');
  }

  return url.toString();
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
const validarFirmaEventoWompi = (evento, checksumHeader) => {
  const secretoEventos = process.env.WOMPI_EVENTS_SECRET;

  if (!secretoEventos) {
    throw new Error('No está configurado WOMPI_EVENTS_SECRET');
  }

  const properties = evento?.signature?.properties;
  const checksumRecibido = checksumHeader || evento?.signature?.checksum;
  const timestamp = evento?.timestamp;

  if (!checksumRecibido || !timestamp || !Array.isArray(properties) || properties.length === 0) {
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

  const calculado = Buffer.from(checksumCalculado, 'hex');
  const recibido = Buffer.from(String(checksumRecibido), 'hex');
  return calculado.length === recibido.length && crypto.timingSafeEqual(calculado, recibido);
};

const obtenerTransaccionWompi = async (idTransaccion) => {
  const id = String(idTransaccion || '').trim();
  if (!id || id.length > 200 || !/^[\w-]+$/.test(id)) {
    throw Object.assign(new Error('El identificador de la transacción no es válido.'), { statusCode: 400 });
  }
  const base = process.env.WOMPI_API_BASE_URL || 'https://sandbox.wompi.co/v1';
  const url = new URL(`transactions/${encodeURIComponent(id)}`, `${base.replace(/\/$/, '')}/`);
  const controlador = new AbortController();
  const timeout = setTimeout(() => controlador.abort(), 10000);
  try {
    const respuesta = await fetch(url, { signal: controlador.signal, headers: { Accept: 'application/json' } });
    if (!respuesta.ok) throw Object.assign(new Error('No fue posible consultar la transacción en Wompi.'), { statusCode: respuesta.status === 404 ? 404 : 502 });
    const cuerpo = await respuesta.json();
    if (!cuerpo?.data?.id) throw Object.assign(new Error('Wompi devolvió una respuesta de transacción inválida.'), { statusCode: 502 });
    return cuerpo.data;
  } catch (error) {
    if (error.name === 'AbortError') throw Object.assign(new Error('La consulta a Wompi excedió el tiempo permitido.'), { statusCode: 504 });
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

module.exports = {
  generarReferenciaPago,
  generarFirmaIntegridad,
  construirUrlCheckoutWompi,
  validarFirmaEventoWompi,
  obtenerTransaccionWompi
};

