const {
  sequelize,
  Tour,
  PrecioTour,
  ImagenTour,
  FechaNoDisponibleTour,
  DetalleTour,
  ItinerarioTour,
  HorarioTour,
  ExtraTour,
  TraduccionTour
} = require('../models');
const { subirMultiplesImagenesCloudinary } = require('./imagen.service');
const { traducirTour } = require('./traduccion.service');



/**
 * Obtiene los idiomas destino configurados en el archivo .env.
 *
 * Ejemplo:
 * GOOGLE_TRANSLATE_TARGETS=en
 * GOOGLE_TRANSLATE_TARGETS=en,fr,pt
 */
const obtenerIdiomasDestino = () => {
  return (process.env.GOOGLE_TRANSLATE_TARGETS || 'en')
    .split(',')
    .map((idioma) => idioma.trim())
    .filter((idioma) => idioma.length > 0);
};

/**
 * Genera y guarda las traducciones de un tour.
 *
 * Primero elimina las traducciones anteriores del tour
 * y luego crea traducciones nuevas con la información actualizada.
 */
const generarTraduccionesTour = async (tour) => {
  const idiomasDestino = obtenerIdiomasDestino();

  await TraduccionTour.destroy({
    where: {
      id_tour: tour.id
    }
  });

  for (const idioma of idiomasDestino) {
    const contenidoTraducido = await traducirTour(tour, idioma);

    await TraduccionTour.create({
      id_tour: tour.id,
      idioma,
      contenido: contenidoTraducido
    });
  }
};

/**
 * Servicio para crear un tour completo.
 *
 * Aquí se maneja la lógica de base de datos:
 * creación del tour principal y sus relaciones.
 * 
 * 
 * 
 */
/**
 * Normaliza el código de idioma recibido.
 *
 * Ejemplos:
 * en-US -> en
 * es-CO -> es
 */
const normalizarIdioma = (idioma = 'es') => {
  return String(idioma)
    .trim()
    .toLowerCase()
    .split('-')[0];
};

/**
 * Aplica la traducción guardada sobre los datos originales del tour.
 *
 * Si el idioma es español o no existe una traducción,
 * devuelve el contenido original.
 */
const aplicarTraduccionTour = (tour, idioma = 'es') => {
  if (!tour) return null;

  const idiomaNormalizado = normalizarIdioma(idioma);

  /**
   * Convierte la instancia de Sequelize en un objeto normal.
   */
  const tourPlano =
    typeof tour.toJSON === 'function'
      ? tour.toJSON()
      : tour;

  /**
   * Español corresponde al contenido original del tour.
   */
  if (idiomaNormalizado === 'es') {
    return {
      ...tourPlano,
      idioma_actual: 'es',
    };
  }

  const traducciones = Array.isArray(tourPlano.traducciones)
    ? tourPlano.traducciones
    : [];

  const traduccionEncontrada = traducciones.find(
    (traduccion) =>
      normalizarIdioma(traduccion.idioma) === idiomaNormalizado
  );

  /**
   * Si el tour todavía no tiene traducción para ese idioma,
   * se utiliza el contenido original en español.
   */
  if (!traduccionEncontrada?.contenido) {
    return {
      ...tourPlano,
      idioma_actual: 'es',
      traduccion_disponible: false,
    };
  }

  let contenidoTraducido = traduccionEncontrada.contenido;

  /**
   * Dependiendo del tipo de columna Sequelize,
   * contenido puede llegar como objeto o como texto JSON.
   */
  if (typeof contenidoTraducido === 'string') {
    try {
      contenidoTraducido = JSON.parse(contenidoTraducido);
    } catch (error) {
      console.error(
        `La traducción del tour ${tourPlano.id} no contiene JSON válido:`,
        error
      );

      return {
        ...tourPlano,
        idioma_actual: 'es',
        traduccion_disponible: false,
      };
    }
  }

  return {
    ...tourPlano,
    ...contenidoTraducido,
    idioma_actual: idiomaNormalizado,
    traduccion_disponible: true,
  };
};
const crearTourCompleto = async (datosTour, archivosImagenes = []) => {
  const transaccion = await sequelize.transaction();

  try {
    const {
      nombre,
      categoria,
      dificultad,
      tipo_tour,
      idiomas,
      estado_publicacion,
      duracion,
      maximo_personas,
      ubicacion_destino,
      punto_encuentro,
      descripcion,

      precios = [],
      imagenes = [],
      fechas_no_disponibles = [],
      detalles = [],
      itinerario = [],
      horarios = [],
      extras = []
    } = datosTour;

    /**
     * Se crea primero el registro principal del tour.
     */
    const nuevoTour = await Tour.create(
      {
        nombre,
        categoria,
        dificultad,
        tipo_tour,
        idiomas: idiomas || ['Español'],
        estado_publicacion: estado_publicacion || 'activo',
        duracion,
        maximo_personas,
        ubicacion_destino,
        punto_encuentro,
        descripcion
      },
      { transaction: transaccion }
    );

    /**
     * Se registran los precios asociados al tour.
     */
    if (precios.length > 0) {
      const preciosData = precios.map((precio) => ({
        id_tour: nuevoTour.id,
        cantidad_personas: precio.cantidad_personas,
        precio: precio.precio
      }));

      await PrecioTour.bulkCreate(preciosData, { transaction: transaccion });
    }

    /**
     * Se suben las imágenes recibidas por Multer a Cloudinary.
     */
    let imagenesCloudinary = [];

    if (archivosImagenes.length > 0) {
    imagenesCloudinary = await subirMultiplesImagenesCloudinary(archivosImagenes);
    }

    /**
     * Se combinan imágenes enviadas como URL con imágenes subidas.
     */
    const imagenesFinales = [
    ...imagenes,
    ...imagenesCloudinary
    ];

    /**
     * Registro de imágenes del tour.
     */
    if (imagenesFinales.length > 0) {
    const imagenesData = imagenesFinales.map((imagen, index) => ({
        id_tour: nuevoTour.id,
        url_imagen: imagen.url_imagen || imagen.url,
        public_id_cloudinary: imagen.public_id_cloudinary || imagen.public_id || null,
        es_portada: imagen.es_portada !== undefined ? imagen.es_portada : index === 0
    }));

    await ImagenTour.bulkCreate(imagenesData, { transaction: transaccion });
    }

    /**
     * Se registran las fechas donde el tour no estará disponible.
     */
    if (fechas_no_disponibles.length > 0) {
      const fechasData = fechas_no_disponibles.map((fecha) => ({
        id_tour: nuevoTour.id,
        fecha_inicio: fecha.fecha_inicio,
        fecha_fin: fecha.fecha_fin
      }));

      await FechaNoDisponibleTour.bulkCreate(fechasData, { transaction: transaccion });
    }

    /**
     * Se registran los detalles del tour:
     * incluye, no incluye, requisitos y restricciones.
     */
    if (detalles.length > 0) {
      const detallesData = detalles.map((detalle) => ({
        id_tour: nuevoTour.id,
        tipo_detalle: detalle.tipo_detalle,
        descripcion: detalle.descripcion
      }));

      await DetalleTour.bulkCreate(detallesData, { transaction: transaccion });
    }

    /**
     * Se registra el itinerario del tour.
     */
    if (itinerario.length > 0) {
      const itinerarioData = itinerario.map((paso) => ({
        id_tour: nuevoTour.id,
        hora: paso.hora || null,
        titulo: paso.titulo || 'Paso del itinerario',
        descripcion: paso.descripcion || null
      }));

      await ItinerarioTour.bulkCreate(itinerarioData, { transaction: transaccion });
    }

    /**
     * Se registran los horarios disponibles del tour.
     */
    if (horarios.length > 0) {
      const horariosData = horarios.map((horario) => ({
        id_tour: nuevoTour.id,
        hora_inicio: horario.hora_inicio || horario.hora,
        activo: horario.activo !== undefined ? horario.activo : true
      }));

      await HorarioTour.bulkCreate(horariosData, { transaction: transaccion });
    }
    /**
     * Se registran los extras disponibles para el tour.
     */
    if (extras.length > 0) {
    const extrasData = extras.map((extra) => ({
        id_tour: nuevoTour.id,
        nombre: extra.nombre,
        descripcion: extra.descripcion || null,
        precio: extra.precio,
        activo: extra.activo !== undefined ? extra.activo : true
    }));

    await ExtraTour.bulkCreate(extrasData, { transaction: transaccion });
    }

    /**
     * Si todo salió bien, se confirma la transacción.
     */
    await transaccion.commit();

    /**
     * Se consulta nuevamente el tour con toda su información relacionada.
     */
    const tourCreado = await Tour.findByPk(nuevoTour.id, {
      include: [
        { model: PrecioTour, as: 'precios' },
        { model: ImagenTour, as: 'imagenes' },
        { model: FechaNoDisponibleTour, as: 'fechas_no_disponibles' },
        { model: DetalleTour, as: 'detalles' },
        { model: ItinerarioTour, as: 'itinerario' },
        { model: HorarioTour, as: 'horarios' },
        { model: ExtraTour, as: 'extras' },
        { model: TraduccionTour, as: 'traducciones' }
      ]
    });

    await generarTraduccionesTour(tourCreado);

    const tourConTraducciones = await obtenerTourPorId(nuevoTour.id);

    return tourConTraducciones;
  } catch (error) {
    /**
     * Si ocurre un error, se revierten todos los cambios.
     */
    await transaccion.rollback();
    throw error;
  }
};


/**
 * Servicio para listar todos los tours.
 *
 * Retorna los tours utilizando el idioma solicitado.
 */
const listarTours = async (idioma = 'es') => {
  const tours = await Tour.findAll({
    include: [
      { model: PrecioTour, as: 'precios' },
      { model: ImagenTour, as: 'imagenes' },
      { model: FechaNoDisponibleTour, as: 'fechas_no_disponibles' },
      { model: DetalleTour, as: 'detalles' },
      { model: ItinerarioTour, as: 'itinerario' },
      { model: HorarioTour, as: 'horarios' },
      { model: ExtraTour, as: 'extras' },
      { model: TraduccionTour, as: 'traducciones' },
    ],
    order: [['id', 'DESC']],
  });

  return tours.map((tour) => aplicarTraduccionTour(tour, idioma));
};

/**
 * Servicio para obtener un tour por su ID.
 *
 * Devuelve el tour en el idioma solicitado.
 */
const obtenerTourPorId = async (id, idioma = 'es') => {
  const tour = await Tour.findByPk(id, {
    include: [
      { model: PrecioTour, as: 'precios' },
      { model: ImagenTour, as: 'imagenes' },
      { model: FechaNoDisponibleTour, as: 'fechas_no_disponibles' },
      { model: DetalleTour, as: 'detalles' },
      { model: ItinerarioTour, as: 'itinerario' },
      { model: HorarioTour, as: 'horarios' },
      { model: ExtraTour, as: 'extras' },
      { model: TraduccionTour, as: 'traducciones' },
    ],
  });

  return aplicarTraduccionTour(tour, idioma);
};


/**
 * Servicio para actualizar un tour completo.
 *
 * Permite actualizar parcialmente la información principal del tour.
 * Si se envían arreglos relacionados como precios, imágenes, detalles,
 * itinerario, horarios o fechas no disponibles, se reemplazan por los nuevos.
 */
const actualizarTourCompleto = async (id, datosTour, archivosImagenes = []) => {
  const transaccion = await sequelize.transaction();

  try {
    const tour = await Tour.findByPk(id, { transaction: transaccion });

    /**
     * Si el tour no existe, se cancela la transacción
     * y se retorna null para que el controlador responda 404.
     */
    if (!tour) {
      await transaccion.rollback();
      return null;
    }

    const {
      precios,
      imagenes,
      imagenes_existentes,
      fechas_no_disponibles,
      detalles,
      itinerario,
      horarios,
      extras,
      
    } = datosTour;

    /**
     * Campos principales permitidos para actualizar en la tabla tours.
     */
    const camposPermitidos = [
      'nombre',
      'categoria',
      'dificultad',
      'tipo_tour',
      'idiomas',
      'estado_publicacion',
      'duracion',
      'maximo_personas',
      'ubicacion_destino',
      'punto_encuentro',
      'descripcion'
    ];

    const datosActualizados = {};

    camposPermitidos.forEach((campo) => {
      if (datosTour[campo] !== undefined) {
        datosActualizados[campo] = datosTour[campo];
      }
    });

    /**
     * Actualiza solo los campos principales que fueron enviados.
     */
    if (Object.keys(datosActualizados).length > 0) {
      await tour.update(datosActualizados, { transaction: transaccion });
    }

    /**
     * Si se envían precios, se eliminan los anteriores
     * y se crean los nuevos.
     */
    if (Array.isArray(precios)) {
      await PrecioTour.destroy({
        where: { id_tour: id },
        transaction: transaccion
      });

      const preciosData = precios.map((precio) => ({
        id_tour: id,
        cantidad_personas: precio.cantidad_personas,
        precio: precio.precio
      }));

      await PrecioTour.bulkCreate(preciosData, { transaction: transaccion });
    }

    /**
     * Actualización de imágenes del tour.
     *
     * Importante:
     * - No se eliminan imágenes existentes.
     * - No se vuelven a subir imágenes antiguas.
     * - Solo se suben a Cloudinary los archivos nuevos recibidos por Multer.
     * - Las imágenes anteriores quedan intactas en la base de datos.
     */

    /**
     * Permite actualizar datos de imágenes existentes,
     * por ejemplo cambiar cuál imagen es portada.
     *
     * Este proceso NO sube imágenes a Cloudinary.
     */
    if (Array.isArray(imagenes_existentes)) {
    for (const imagen of imagenes_existentes) {
        if (imagen.id) {
        await ImagenTour.update(
            {
            es_portada: imagen.es_portada !== undefined ? imagen.es_portada : false
            },
            {
            where: {
                id: imagen.id,
                id_tour: id
            },
            transaction: transaccion
            }
        );
        }
    }
    }

    /**
     * Si llegan archivos nuevos, solo esos archivos se suben a Cloudinary.
     */
    if (archivosImagenes.length > 0) {
    const imagenesCloudinary = await subirMultiplesImagenesCloudinary(archivosImagenes);

    /**
     * Verificamos cuántas imágenes ya tiene el tour.
     * Si no tiene ninguna, la primera nueva queda como portada.
     */
    const cantidadImagenesActuales = await ImagenTour.count({
        where: { id_tour: id },
        transaction: transaccion
    });

    const imagenesData = imagenesCloudinary.map((imagen, index) => ({
        id_tour: id,
        url_imagen: imagen.url_imagen,
        public_id_cloudinary: imagen.public_id_cloudinary,
        es_portada: cantidadImagenesActuales === 0 && index === 0
    }));

    await ImagenTour.bulkCreate(imagenesData, {
        transaction: transaccion
    });
    }

    /**
     * Si se envían fechas no disponibles, se reemplazan las anteriores.
     */
    if (Array.isArray(fechas_no_disponibles)) {
      await FechaNoDisponibleTour.destroy({
        where: { id_tour: id },
        transaction: transaccion
      });

      const fechasData = fechas_no_disponibles.map((fecha) => ({
        id_tour: id,
        fecha_inicio: fecha.fecha_inicio,
        fecha_fin: fecha.fecha_fin
      }));

      await FechaNoDisponibleTour.bulkCreate(fechasData, { transaction: transaccion });
    }

    /**
     * Si se envían detalles, se reemplazan los detalles anteriores.
     */
    if (Array.isArray(detalles)) {
      await DetalleTour.destroy({
        where: { id_tour: id },
        transaction: transaccion
      });

      const detallesData = detalles.map((detalle) => ({
        id_tour: id,
        tipo_detalle: detalle.tipo_detalle,
        descripcion: detalle.descripcion
      }));

      await DetalleTour.bulkCreate(detallesData, { transaction: transaccion });
    }

    /**
     * Si se envía itinerario, se reemplaza el itinerario anterior.
     */
    if (Array.isArray(itinerario)) {
      await ItinerarioTour.destroy({
        where: { id_tour: id },
        transaction: transaccion
      });

      const itinerarioData = itinerario.map((paso) => ({
        id_tour: id,
        hora: paso.hora || null,
        titulo: paso.titulo || 'Paso del itinerario',
        descripcion: paso.descripcion || null
      }));

      await ItinerarioTour.bulkCreate(itinerarioData, { transaction: transaccion });
    }

    /**
     * Si se envían horarios, se reemplazan los horarios anteriores.
     */
    if (Array.isArray(horarios)) {
      await HorarioTour.destroy({
        where: { id_tour: id },
        transaction: transaccion
      });

      const horariosData = horarios.map((horario) => ({
        id_tour: id,
        hora_inicio: horario.hora_inicio || horario.hora,
        activo: horario.activo !== undefined ? horario.activo : true
      }));

      await HorarioTour.bulkCreate(horariosData, { transaction: transaccion });
    }
    /**
     * Si se envían extras, se reemplazan los extras anteriores.
     */
    if (Array.isArray(extras)) {
    await ExtraTour.destroy({
        where: { id_tour: id },
        transaction: transaccion
    });

    const extrasData = extras.map((extra) => ({
        id_tour: id,
        nombre: extra.nombre,
        descripcion: extra.descripcion || null,
        precio: extra.precio,
        activo: extra.activo !== undefined ? extra.activo : true
    }));

    await ExtraTour.bulkCreate(extrasData, { transaction: transaccion });
    }

    await transaccion.commit();

    const tourActualizado = await Tour.findByPk(id, {
  include: [
    { model: PrecioTour, as: 'precios' },
    { model: ImagenTour, as: 'imagenes' },
    { model: FechaNoDisponibleTour, as: 'fechas_no_disponibles' },
    { model: DetalleTour, as: 'detalles' },
    { model: ItinerarioTour, as: 'itinerario' },
    { model: HorarioTour, as: 'horarios' },
    { model: ExtraTour, as: 'extras' }
  ]
});
    await generarTraduccionesTour(tourActualizado);

    const tourConTraducciones = await obtenerTourPorId(id);

    return tourConTraducciones;
  } catch (error) {
    await transaccion.rollback();
    throw error;
  }
};

/**
 * Servicio para eliminar un tour por ID.
 *
 * Elimina primero la información relacionada del tour:
 * precios, imágenes, fechas no disponibles, detalles, itinerario y horarios.
 *
 * Luego elimina el registro principal del tour.
 */
const eliminarTourPorId = async (id) => {
  const transaccion = await sequelize.transaction();

  try {
    const tour = await Tour.findByPk(id, { transaction: transaccion });

    /**
     * Si el tour no existe, se cancela la transacción
     * y se retorna null para responder 404 desde el controlador.
     */
    if (!tour) {
      await transaccion.rollback();
      return null;
    }

    /**
     * Se eliminan los registros relacionados al tour.
     * Esto evita dejar información huérfana en la base de datos.
     */
    await PrecioTour.destroy({
      where: { id_tour: id },
      transaction: transaccion
    });

    await ImagenTour.destroy({
      where: { id_tour: id },
      transaction: transaccion
    });

    await FechaNoDisponibleTour.destroy({
      where: { id_tour: id },
      transaction: transaccion
    });

    await DetalleTour.destroy({
      where: { id_tour: id },
      transaction: transaccion
    });

    await ItinerarioTour.destroy({
      where: { id_tour: id },
      transaction: transaccion
    });

    await HorarioTour.destroy({
      where: { id_tour: id },
      transaction: transaccion
    });
    /**
     * Se eliminan los extras asociados al tour.
     */
    await ExtraTour.destroy({
    where: { id_tour: id },
    transaction: transaccion
    });

    /**
     * Finalmente se elimina el tour principal.
     */
    await tour.destroy({ transaction: transaccion });

    await transaccion.commit();

    return true;
  } catch (error) {
    await transaccion.rollback();
    throw error;
  }
};
module.exports = {
  crearTourCompleto,
  listarTours,
  obtenerTourPorId,
  actualizarTourCompleto,
  eliminarTourPorId
};
