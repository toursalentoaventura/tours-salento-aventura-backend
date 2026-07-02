const { Translate } = require('@google-cloud/translate').v2;
require('dotenv').config();

/**
 * Cliente oficial de Google Cloud Translation.
 */
const translate = new Translate();

/**
 * Traduce un texto individual.
 */
const traducirTexto = async (texto, idiomaDestino = 'en') => {
  if (!texto || typeof texto !== 'string') {
    return texto;
  }

  const [traduccion] = await translate.translate(texto, {
    from: process.env.GOOGLE_TRANSLATE_SOURCE || 'es',
    to: idiomaDestino
  });

  return traduccion;
};

/**
 * Traduce los detalles del tour:
 * incluye, no incluye, requisitos y restricciones.
 */
const traducirDetalles = async (detalles = [], idiomaDestino = 'en') => {
  const detallesTraducidos = [];

  for (const detalle of detalles) {
    detallesTraducidos.push({
      id: detalle.id,
      tipo_detalle: detalle.tipo_detalle,
      descripcion: await traducirTexto(detalle.descripcion, idiomaDestino)
    });
  }

  return detallesTraducidos;
};

/**
 * Traduce el itinerario del tour.
 */
const traducirItinerario = async (itinerario = [], idiomaDestino = 'en') => {
  const itinerarioTraducido = [];

  for (const paso of itinerario) {
    itinerarioTraducido.push({
      id: paso.id,
      hora: paso.hora,
      titulo: await traducirTexto(paso.titulo, idiomaDestino),
      descripcion: await traducirTexto(paso.descripcion, idiomaDestino)
    });
  }

  return itinerarioTraducido;
};

/**
 * Traduce los extras del tour.
 */
const traducirExtras = async (extras = [], idiomaDestino = 'en') => {
  const extrasTraducidos = [];

  for (const extra of extras) {
    extrasTraducidos.push({
      id: extra.id,
      nombre: await traducirTexto(extra.nombre, idiomaDestino),
      descripcion: await traducirTexto(extra.descripcion, idiomaDestino),
      precio: extra.precio,
      activo: extra.activo
    });
  }

  return extrasTraducidos;
};

/**
 * Traduce la información textual principal de un tour.
 *
 * No traduce precios, imágenes, horarios ni IDs.
 * Esos datos se conservan igual.
 */
const traducirTour = async (tour, idiomaDestino = 'en') => {
  const tourPlano = tour.toJSON ? tour.toJSON() : tour;

    return {
    idioma: idiomaDestino,

    nombre: await traducirTexto(tourPlano.nombre, idiomaDestino),
    categoria: await traducirTexto(tourPlano.categoria, idiomaDestino),
    dificultad: await traducirTexto(tourPlano.dificultad, idiomaDestino),
    duracion: await traducirTexto(tourPlano.duracion, idiomaDestino),
    ubicacion_destino: await traducirTexto(tourPlano.ubicacion_destino, idiomaDestino),
    punto_encuentro: await traducirTexto(tourPlano.punto_encuentro, idiomaDestino),
    descripcion: await traducirTexto(tourPlano.descripcion, idiomaDestino),

    detalles: await traducirDetalles(tourPlano.detalles || [], idiomaDestino),
    itinerario: await traducirItinerario(tourPlano.itinerario || [], idiomaDestino),
    extras: await traducirExtras(tourPlano.extras || [], idiomaDestino)
  };
};

module.exports = {
  traducirTexto,
  traducirTour
};