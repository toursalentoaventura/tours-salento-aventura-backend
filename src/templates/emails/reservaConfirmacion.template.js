/**
 * Plantilla HTML para el correo de confirmación de una reserva.
 *
 * Este archivo no envía correos ni consulta datos externos. Únicamente recibe
 * información ya preparada y devuelve una cadena HTML compatible con clientes
 * de correo habituales.
 */

// Reemplazar por la URL HTTPS pública del logo cuando esté disponible.
const URL_LOGO_PREDETERMINADA = '';

const CONTACTO_PREDETERMINADO = Object.freeze({
  whatsapp: '+57 000 000 0000',
  correo: 'reservas@toursalentoaventura.com',
  sitioWeb: 'https://www.toursalentoaventura.com'
});

/**
 * Convierte valores simples en texto y descarta objetos que podrían terminar
 * representados como "[object Object]".
 */
const obtenerTextoSeguro = (valor) => {
  if (valor === null || valor === undefined) return '';

  if (valor instanceof Date) {
    return Number.isNaN(valor.getTime())
      ? ''
      : valor.toLocaleDateString('es-CO');
  }

  if (['string', 'number', 'boolean'].includes(typeof valor)) {
    const texto = String(valor).trim();
    return ['undefined', 'null', 'NaN', '[object Object]'].includes(texto)
      ? ''
      : texto;
  }

  return '';
};

/**
 * Escapa caracteres HTML en todos los textos dinámicos.
 */
const escaparHtml = (valor) =>
  obtenerTextoSeguro(valor).replace(
    /[&<>"']/g,
    (caracter) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      })[caracter]
  );

/**
 * Acepta únicamente URLs HTTP o HTTPS para imágenes y enlaces externos.
 */
const obtenerUrlSegura = (valor) => {
  const texto = obtenerTextoSeguro(valor);

  if (!texto) return '';

  try {
    const url = new URL(texto);
    return ['http:', 'https:'].includes(url.protocol)
      ? escaparHtml(url.toString())
      : '';
  } catch {
    return '';
  }
};

/**
 * Formatea un importe sin convertirlo. Si el valor ya llega formateado, se
 * conserva como texto seguro.
 */
const formatearValorMonetario = (valor, moneda = 'COP') => {
  const texto = obtenerTextoSeguro(valor);

  if (!texto) return '';

  const codigoMoneda = /^[A-Za-z]{3}$/.test(obtenerTextoSeguro(moneda))
    ? obtenerTextoSeguro(moneda).toUpperCase()
    : 'COP';
  const valorNumerico =
    typeof valor === 'number' || /^-?\d+(?:[.,]\d+)?$/.test(texto)
      ? Number(texto.replace(',', '.'))
      : NaN;

  if (!Number.isFinite(valorNumerico)) {
    return escaparHtml(texto);
  }

  try {
    const valorFormateado = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: codigoMoneda,
      maximumFractionDigits: codigoMoneda === 'COP' ? 0 : 2
    }).format(valorNumerico);

    return `${escaparHtml(valorFormateado)} ${escaparHtml(codigoMoneda)}`;
  } catch {
    return `${escaparHtml(valorNumerico)} ${escaparHtml(codigoMoneda)}`;
  }
};

/**
 * Construye una fila de datos y la omite cuando el valor no está disponible.
 */
const renderizarFilaDato = (etiqueta, valor) => {
  const valorSeguro = escaparHtml(valor);

  if (!valorSeguro) return '';

  return `
    <tr>
      <td style="padding: 9px 0; color: #64748b; font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 20px; vertical-align: top; width: 42%;">
        ${escaparHtml(etiqueta)}
      </td>
      <td style="padding: 9px 0; color: #16352f; font-family: Arial, Helvetica, sans-serif; font-size: 14px; font-weight: 700; line-height: 20px; text-align: right; vertical-align: top;">
        ${valorSeguro}
      </td>
    </tr>`;
};

/**
 * Construye una fila del resumen monetario.
 */
const renderizarFilaPrecio = (etiqueta, valor, moneda, destacar = false) => {
  const valorFormateado = formatearValorMonetario(valor, moneda);

  if (!valorFormateado) return '';

  const estilosCelda = destacar
    ? 'padding: 16px 0 4px; border-top: 2px solid #cfe4d6; color: #126b3a; font-size: 20px; font-weight: 800;'
    : 'padding: 8px 0; color: #334155; font-size: 14px;';

  return `
    <tr>
      <td style="${estilosCelda} font-family: Arial, Helvetica, sans-serif; line-height: 22px;">
        ${escaparHtml(etiqueta)}
      </td>
      <td style="${estilosCelda} font-family: Arial, Helvetica, sans-serif; line-height: 22px; text-align: right;">
        ${valorFormateado}
      </td>
    </tr>`;
};

/**
 * Renderiza los extras seleccionados. Los elementos sin información visible
 * se descartan y la sección completa se oculta cuando el arreglo está vacío.
 */
const renderizarExtras = (extras, moneda) => {
  if (!Array.isArray(extras) || extras.length === 0) return '';

  const filas = extras
    .map((extra) => {
      if (!extra || typeof extra !== 'object' || Array.isArray(extra)) return '';

      const nombre = escaparHtml(extra.nombre);
      const cantidadTexto = obtenerTextoSeguro(extra.cantidad);
      const cantidad =
        cantidadTexto && Number(cantidadTexto) > 0
          ? ` × ${escaparHtml(cantidadTexto)}`
          : '';
      const precio = formatearValorMonetario(extra.precio, moneda);

      if (!nombre && !precio) return '';

      return `
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #e7eee9; color: #16352f; font-family: Arial, Helvetica, sans-serif; font-size: 14px; font-weight: 700; line-height: 20px;">
            ${nombre || 'Extra'}${cantidad}
          </td>
          <td style="padding: 12px 0; border-bottom: 1px solid #e7eee9; color: #126b3a; font-family: Arial, Helvetica, sans-serif; font-size: 14px; font-weight: 700; line-height: 20px; text-align: right;">
            ${precio}
          </td>
        </tr>`;
    })
    .filter(Boolean)
    .join('');

  if (!filas) return '';

  return `
    <tr>
      <td style="padding: 0 28px 24px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width: 100%; background-color: #f7faf8; border: 1px solid #dce9e0; border-radius: 14px;">
          <tr>
            <td style="padding: 22px;">
              <h2 style="margin: 0 0 8px; color: #16352f; font-family: Arial, Helvetica, sans-serif; font-size: 18px; line-height: 24px;">
                Extras seleccionados
              </h2>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width: 100%;">
                ${filas}
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
};

/**
 * Genera el HTML completo del correo de confirmación.
 *
 * @param {object} datosReserva
 * @param {string} [datosReserva.nombreCliente]
 * @param {string} [datosReserva.nombreTour]
 * @param {string|Date} [datosReserva.fechaReserva]
 * @param {string} [datosReserva.horario]
 * @param {number|string} [datosReserva.cantidadPersonas]
 * @param {string} [datosReserva.puntoEncuentro]
 * @param {string} [datosReserva.idioma]
 * @param {Array<{nombre?: string, cantidad?: number, precio?: number|string}>} [datosReserva.extras]
 * @param {number|string} [datosReserva.subtotalTour]
 * @param {number|string} [datosReserva.subtotalExtras]
 * @param {number|string} [datosReserva.total]
 * @param {string} [datosReserva.moneda='COP']
 * @param {string} [datosReserva.estadoReserva]
 * @param {string} [datosReserva.estadoPago]
 * @param {string} [datosReserva.referencia]
 * @param {string} [datosReserva.observaciones]
 * @param {string} [datosReserva.correoCliente]
 * @param {string} [datosReserva.telefonoCliente]
 * @param {string} [datosReserva.logoUrl]
 * @param {{whatsapp?: string, correo?: string, sitioWeb?: string}} [datosReserva.contacto]
 * @returns {string}
 */
const generarPlantillaConfirmacionReserva = (datosReserva = {}) => {
  const {
    nombreCliente,
    nombreTour,
    fechaReserva,
    horario,
    cantidadPersonas,
    puntoEncuentro,
    idioma,
    extras = [],
    subtotalTour,
    subtotalExtras,
    total,
    moneda = 'COP',
    estadoReserva,
    estadoPago,
    referencia,
    observaciones,
    correoCliente,
    telefonoCliente,
    logoUrl = URL_LOGO_PREDETERMINADA,
    contacto = {}
  } = datosReserva && typeof datosReserva === 'object' && !Array.isArray(datosReserva)
    ? datosReserva
    : {};

  const datosContacto =
    contacto && typeof contacto === 'object' && !Array.isArray(contacto)
      ? contacto
      : {};
  const contactoSeguro = {
    whatsapp:
      obtenerTextoSeguro(datosContacto.whatsapp) ||
      CONTACTO_PREDETERMINADO.whatsapp,
    correo:
      obtenerTextoSeguro(datosContacto.correo) ||
      CONTACTO_PREDETERMINADO.correo,
    sitioWeb:
      obtenerTextoSeguro(datosContacto.sitioWeb) ||
      CONTACTO_PREDETERMINADO.sitioWeb
  };
  const urlLogo = obtenerUrlSegura(logoUrl);
  const urlSitioWeb = obtenerUrlSegura(contactoSeguro.sitioWeb);
  const nombreSaludo = escaparHtml(nombreCliente);
  const filasReserva = [
    renderizarFilaDato('Referencia', referencia),
    renderizarFilaDato('Tour', nombreTour),
    renderizarFilaDato('Fecha', fechaReserva),
    renderizarFilaDato('Horario', horario),
    renderizarFilaDato('Personas', cantidadPersonas),
    renderizarFilaDato('Idioma', idioma),
    renderizarFilaDato('Estado de la reserva', estadoReserva),
    renderizarFilaDato('Estado del pago', estadoPago)
  ].join('');
  const filasCliente = [
    renderizarFilaDato('Nombre', nombreCliente),
    renderizarFilaDato('Correo', correoCliente),
    renderizarFilaDato('Teléfono', telefonoCliente)
  ].join('');
  const filasPrecios = [
    renderizarFilaPrecio('Subtotal del tour', subtotalTour, moneda),
    renderizarFilaPrecio('Subtotal de extras', subtotalExtras, moneda),
    renderizarFilaPrecio('Total de la reserva', total, moneda, true)
  ].join('');
  const seccionPrecios = filasPrecios
    ? `
      <tr>
        <td style="padding: 0 28px 24px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width: 100%; background-color: #edf7f0; border: 1px solid #cfe4d6; border-radius: 14px;">
            <tr>
              <td style="padding: 22px;">
                <h2 style="margin: 0 0 10px; color: #16352f; font-family: Arial, Helvetica, sans-serif; font-size: 18px; line-height: 24px;">
                  Resumen de precios
                </h2>
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width: 100%;">
                  ${filasPrecios}
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>`
    : '';
  const seccionPuntoEncuentro = obtenerTextoSeguro(puntoEncuentro)
    ? `
      <tr>
        <td style="padding: 0 28px 24px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width: 100%; background-color: #fffaf0; border: 1px solid #f0dfb7; border-radius: 14px;">
            <tr>
              <td style="padding: 22px;">
                <h2 style="margin: 0 0 8px; color: #614b1f; font-family: Arial, Helvetica, sans-serif; font-size: 18px; line-height: 24px;">
                  Punto de encuentro
                </h2>
                <p style="margin: 0 0 8px; color: #493d27; font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 22px;">
                  ${escaparHtml(puntoEncuentro)}
                </p>
                <p style="margin: 0; color: #7a6844; font-family: Arial, Helvetica, sans-serif; font-size: 13px; line-height: 20px;">
                  Te recomendamos llegar con 15 minutos de anticipación.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>`
    : '';
  const seccionObservaciones = obtenerTextoSeguro(observaciones)
    ? `
      <tr>
        <td style="padding: 0 28px 24px;">
          <h2 style="margin: 0 0 8px; color: #16352f; font-family: Arial, Helvetica, sans-serif; font-size: 18px; line-height: 24px;">
            Observaciones
          </h2>
          <p style="margin: 0; padding: 16px; color: #475569; background-color: #f8faf9; border-left: 4px solid #56a36c; border-radius: 8px; font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 22px;">
            ${escaparHtml(observaciones)}
          </p>
        </td>
      </tr>`
    : '';
  const logo = urlLogo
    ? `
      <img
        src="${urlLogo}"
        width="88"
        alt="Tours Salento Aventura"
        style="display: block; width: 88px; max-width: 88px; height: auto; margin: 0 auto 14px; border: 0;"
      />`
    : '';
  const enlaceSitio = urlSitioWeb
    ? `<a href="${urlSitioWeb}" style="color: #dff4e5; text-decoration: underline;">${escaparHtml(contactoSeguro.sitioWeb)}</a>`
    : escaparHtml(contactoSeguro.sitioWeb);

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="x-apple-disable-message-reformatting">
    <title>Confirmación de reserva | Tours Salento Aventura</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #f2f3ee;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width: 100%; background-color: #f2f3ee;">
      <tr>
        <td align="center" style="padding: 28px 12px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width: 100%; max-width: 640px; overflow: hidden; background-color: #ffffff; border: 1px solid #e3e9e4; border-radius: 20px; box-shadow: 0 12px 34px rgba(22, 53, 47, 0.10);">
            <tr>
              <td align="center" style="padding: 34px 24px; background-color: #126b3a;">
                ${logo}
                <p style="margin: 0 0 8px; color: #dff4e5; font-family: Arial, Helvetica, sans-serif; font-size: 13px; font-weight: 700; letter-spacing: 2px; line-height: 20px; text-transform: uppercase;">
                  Tours Salento Aventura
                </p>
                <h1 style="margin: 0; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-size: 28px; line-height: 36px;">
                  ¡Tu reserva ha sido confirmada!
                </h1>
              </td>
            </tr>

            <tr>
              <td style="padding: 30px 28px 24px;">
                <p style="margin: 0 0 10px; color: #16352f; font-family: Arial, Helvetica, sans-serif; font-size: 18px; font-weight: 700; line-height: 26px;">
                  ${nombreSaludo ? `Hola, ${nombreSaludo}.` : '¡Hola!'}
                </p>
                <p style="margin: 0; color: #52625d; font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 24px;">
                  Gracias por elegir Tours Salento Aventura. Estamos preparando todo para que vivas una experiencia inolvidable.
                </p>
              </td>
            </tr>

            ${filasReserva
              ? `
            <tr>
              <td style="padding: 0 28px 24px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width: 100%; background-color: #f7faf8; border: 1px solid #dce9e0; border-radius: 14px;">
                  <tr>
                    <td style="padding: 22px;">
                      <h2 style="margin: 0 0 10px; color: #16352f; font-family: Arial, Helvetica, sans-serif; font-size: 18px; line-height: 24px;">
                        Datos de la reserva
                      </h2>
                      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width: 100%;">
                        ${filasReserva}
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>`
              : ''}

            ${filasCliente
              ? `
            <tr>
              <td style="padding: 0 28px 24px;">
                <h2 style="margin: 0 0 8px; color: #16352f; font-family: Arial, Helvetica, sans-serif; font-size: 18px; line-height: 24px;">
                  Información del cliente
                </h2>
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width: 100%; border-top: 1px solid #e7eee9;">
                  ${filasCliente}
                </table>
              </td>
            </tr>`
              : ''}

            ${renderizarExtras(extras, moneda)}
            ${seccionPrecios}
            ${seccionPuntoEncuentro}
            ${seccionObservaciones}

            <tr>
              <td style="padding: 0 28px 26px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width: 100%; background-color: #f7faf8; border-radius: 14px;">
                  <tr>
                    <td style="padding: 22px;">
                      <h2 style="margin: 0 0 10px; color: #16352f; font-family: Arial, Helvetica, sans-serif; font-size: 18px; line-height: 24px;">
                        Recomendaciones para tu experiencia
                      </h2>
                      <p style="margin: 0 0 6px; color: #52625d; font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 21px;">✓ Usa ropa cómoda y adecuada para el clima.</p>
                      <p style="margin: 0 0 6px; color: #52625d; font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 21px;">✓ Lleva hidratación y protección solar.</p>
                      <p style="margin: 0 0 6px; color: #52625d; font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 21px;">✓ Utiliza calzado cómodo y con buen agarre.</p>
                      <p style="margin: 0 0 6px; color: #52625d; font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 21px;">✓ Sigue siempre las indicaciones del guía.</p>
                      <p style="margin: 0; color: #52625d; font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 21px;">✓ Revisa las condiciones climáticas antes de salir.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td align="center" style="padding: 26px 24px; background-color: #184a3d;">
                <h2 style="margin: 0 0 10px; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-size: 18px; line-height: 24px;">
                  ¿Necesitas ayuda?
                </h2>
                <p style="margin: 0 0 6px; color: #dff4e5; font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 21px;">
                  WhatsApp: ${escaparHtml(contactoSeguro.whatsapp)}
                </p>
                <p style="margin: 0 0 6px; color: #dff4e5; font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 21px;">
                  Correo: <a href="mailto:${encodeURIComponent(contactoSeguro.correo)}" style="color: #dff4e5; text-decoration: underline;">${escaparHtml(contactoSeguro.correo)}</a>
                </p>
                <p style="margin: 0; color: #dff4e5; font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 21px;">
                  Sitio web: ${enlaceSitio}
                </p>
              </td>
            </tr>

            <tr>
              <td align="center" style="padding: 22px 24px; background-color: #10372e;">
                <p style="margin: 0 0 6px; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-size: 13px; font-weight: 700; line-height: 19px;">
                  Gracias por viajar con Tours Salento Aventura.
                </p>
                <p style="margin: 0 0 6px; color: #b9d7c4; font-family: Arial, Helvetica, sans-serif; font-size: 12px; line-height: 18px;">
                  Este es un correo automático. Por favor, no respondas directamente a este mensaje.
                </p>
                <p style="margin: 0; color: #8fb39d; font-family: Arial, Helvetica, sans-serif; font-size: 11px; line-height: 17px;">
                  © ${new Date().getFullYear()} Tours Salento Aventura. Todos los derechos reservados.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
};

module.exports = {
  generarPlantillaConfirmacionReserva
};

/*
const html = generarPlantillaConfirmacionReserva({
  nombreCliente: 'Juan Pérez',
  nombreTour: 'Valle de Cocora',
  fechaReserva: '20 de agosto de 2026',
  horario: '8:00 a. m.',
  cantidadPersonas: 2,
  puntoEncuentro: 'Oficina principal en Salento',
  idioma: 'Español',
  extras: [
    { nombre: 'Almuerzo típico', cantidad: 2, precio: 35000 }
  ],
  subtotalTour: 280000,
  subtotalExtras: 70000,
  total: 350000,
  moneda: 'COP',
  estadoReserva: 'Confirmada',
  estadoPago: 'Pagado',
  referencia: 'TSA-2026-0001',
  correoCliente: 'juan@example.com',
  telefonoCliente: '+57 300 000 0000',
  logoUrl: 'https://dominio-publico.com/logo.png',
  contacto: {
    whatsapp: '+57 300 000 0000',
    correo: 'reservas@dominio.com',
    sitioWeb: 'https://dominio.com'
  }
});
*/
