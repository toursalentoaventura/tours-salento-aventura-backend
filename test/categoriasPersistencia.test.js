const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const sequelize = require('../src/config/database');
const { Tour, ImagenTour, TraduccionTour } = require('../src/models');
const traduccion = require('../src/services/traduccion.service');
// Aislar servicios externos: estas pruebas no escriben en MySQL ni traducen contenido real.
mock.method(traduccion, 'traducirTour', async () => ({}));
const { crearTourCompleto, actualizarTourCompleto } = require('../src/services/tour.service');
const { CATEGORIAS_TOUR } = require('../src/constants/categoriasTour');

for (const categoria of CATEGORIAS_TOUR) {
  test(`crea y edita sin cambiar el identificador ${categoria}`, async (t) => {
    let guardado;
    const transacciones = [];
    t.mock.method(sequelize, 'transaction', async () => {
      const tx = { finished: false, async commit() { this.finished = 'commit'; }, async rollback() { this.finished = 'rollback'; } };
      transacciones.push(tx);
      return tx;
    });
    // Cualquier consulta SQL no simulada debe fallar antes de acceder a la red.
    t.mock.method(sequelize, 'query', async () => { throw new Error('SQL real no permitido'); });
    t.mock.method(Tour, 'create', async (datos) => {
      guardado = { ...datos, id: 42, toJSON() { const { toJSON, update, ...datos } = this; return datos; }, async update(datos) { Object.assign(this, datos); } };
      return guardado;
    });
    t.mock.method(Tour, 'findByPk', async () => guardado);
    t.mock.method(Tour, 'findOne', async () => guardado);
    t.mock.method(ImagenTour, 'count', async () => 0);
    t.mock.method(TraduccionTour, 'destroy', async () => 0);
    t.mock.method(TraduccionTour, 'create', async (datos) => datos);
    const creado = await crearTourCompleto({ nombre: 'Prueba', categoria, tipo_tour: 'privado', duracion: '4 horas', minimo_personas: 1, maximo_personas: 10, descripcion: 'Descripción' });
    assert.equal(creado.categoria, categoria);
    const editado = await actualizarTourCompleto(42, { nombre: 'Nombre editado', categoria });
    assert.equal(editado.categoria, categoria);
    const sinCambiarCategoria = await actualizarTourCompleto(42, { nombre: 'Otro nombre' });
    assert.equal(sinCambiarCategoria.categoria, categoria);
    assert.ok(transacciones.every((tx) => tx.finished === 'commit'));
  });
}
