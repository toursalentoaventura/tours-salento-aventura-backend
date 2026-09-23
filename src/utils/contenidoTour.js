const sanitizeHtml = require('sanitize-html');

// Only formatting and absolute HTTP(S) links are accepted; no styles or embedded content.
const sanitizarContenidoTour = (valor) => {
  if (valor == null) return valor;
  const texto = String(valor);
  if (!/<\/?[a-z][^>]*>/i.test(texto)) {
    return texto ? '<p>' + texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\r?\n/g, '<br>') + '</p>' : '';
  }
  const limpio = sanitizeHtml(texto, {
    allowedTags: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'a'],
    allowedAttributes: { a: ['href'] },
    allowedSchemes: ['http', 'https'],
    allowProtocolRelative: false,
    transformTags: {
      a: (tagName, attributes) => {
        try {
          const url = new URL(attributes.href);
          const seguro = ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password;
          return { tagName, attribs: seguro ? { href: url.href } : {} };
        } catch { return { tagName, attribs: {} }; }
      },
    },
    nonTextTags: ['script', 'style', 'textarea', 'option', 'iframe', 'svg', 'math'],
  });
  return limpio && !/<\/?[a-z][^>]*>/i.test(limpio) ? `<p>${limpio}</p>` : limpio;
};

const sanitizarTextosTour = (datos) => ({
  ...datos,
  ...(datos.descripcion !== undefined ? { descripcion: sanitizarContenidoTour(datos.descripcion) } : {}),
  ...Object.fromEntries(['detalles', 'itinerario', 'extras']
    .filter((campo) => Array.isArray(datos[campo]))
    .map((campo) => [campo, datos[campo].map((item) => ({
      ...item, descripcion: sanitizarContenidoTour(item.descripcion),
    }))])),
});

module.exports = { sanitizarContenidoTour, sanitizarTextosTour };
