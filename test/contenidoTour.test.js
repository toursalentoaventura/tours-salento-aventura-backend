const { test } = require('node:test');
const assert = require('node:assert/strict');
const { sanitizarContenidoTour, sanitizarTextosTour } = require('../src/utils/contenidoTour');
const ejemplo = '<h2>Título</h2><p>Un párrafo normal.</p><p><strong>Texto en negrilla.</strong></p><p><em>Texto en cursiva.</em></p><p><u>Texto subrayado.</u><br />Otra línea.</p><ul><li><p>Viñeta</p></li></ul><ol><li><p>Numerada</p></li></ol>';
test('preserva todos los formatos permitidos y es idempotente', () => {
  assert.equal(sanitizarContenidoTour(ejemplo), ejemplo);
  assert.equal(sanitizarContenidoTour(sanitizarContenidoTour(ejemplo)), ejemplo);
});
test('elimina XSS, atributos y formatos no autorizados', () => {
  const clean = sanitizarContenidoTour('<p style="color:red" onclick="alert(1)">Hola</p><script>alert(1)</script><iframe srcdoc="x">x</iframe><img src=x onerror=alert(1)><a href="javascript:alert(1)">enlace</a><svg onload="alert(1)"></svg><video src="x"></video><table><tr><td>dato</td></tr></table>');
  assert.equal(clean, '<p>Hola</p><a>enlace</a>dato');
});
test('conserva el texto antiguo y sus saltos sin interpretar caracteres especiales', () => {
  assert.equal(sanitizarContenidoTour('A & B\n2 < 3'), '<p>A &amp; B<br>2 &lt; 3</p>');
  assert.equal(sanitizarContenidoTour(null), null);
});
test('filtra todos los campos largos sin modificar precios ni otros datos', () => {
  const input = { nombre: 'Tour', precio: 50, descripcion: ejemplo, detalles: [{ descripcion: '<b onclick="x">Sí</b>', tipo_detalle: 'incluye' }], itinerario: [{ descripcion: '<script>x</script><p>Paso</p>' }], extras: [{ descripcion: '<img src=x>Extra', precio: 20 }] };
  const clean = sanitizarTextosTour(input);
  assert.equal(clean.descripcion, ejemplo);
  assert.equal(clean.detalles[0].descripcion, '<b>Sí</b>');
  assert.equal(clean.itinerario[0].descripcion, '<p>Paso</p>');
  assert.equal(clean.extras[0].descripcion, '<p>Extra</p>');
  assert.equal(clean.extras[0].precio, 20);
  assert.equal(clean.precio, 50);
  assert.equal(input.detalles[0].descripcion, '<b onclick="x">Sí</b>');
  assert.deepEqual(sanitizarTextosTour({ nombre: 'Solo nombre' }), { nombre: 'Solo nombre' });
});

test('es idempotente también después de quitar etiquetas prohibidas', () => {
  const clean = sanitizarContenidoTour('<a href="https://example.com/">A &amp; B</a>');
  assert.equal(clean, '<a href="https://example.com/">A &amp; B</a>');
  assert.equal(sanitizarContenidoTour(clean), clean);
});

test('conserva H1 y enlaces HTTP(S), eliminando atributos peligrosos', () => {
  const html = '<h1>Título principal</h1><p><a href="https://example.com/ruta" onclick="alert(1)" target="_blank">Sitio</a></p>';
  assert.equal(sanitizarContenidoTour(html), '<h1>Título principal</h1><p><a href="https://example.com/ruta">Sitio</a></p>');
  for (const href of ['javascript:alert(1)', 'data:text/html,x', '//example.com', 'javascript&#58;alert(1)', 'java&#10;script:alert(1)', '/ruta', 'https://usuario:clave@example.com']) {
    assert.equal(sanitizarContenidoTour(`<p><a href="${href}">Texto</a></p>`), '<p><a>Texto</a></p>');
  }
});
