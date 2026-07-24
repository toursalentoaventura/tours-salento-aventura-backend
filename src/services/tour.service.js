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
const {
  subirMultiplesImagenesCloudinary,
  eliminarImagenCloudinary
} = require('./imagen.service');
const { traducirTour } = require('./traduccion.service');
const { normalizarHorariosTour, validarRangosNoDisponibles } = require('../utils/disponibilidadReserva');
const { validarCategoriaTour } = require('../constants/categoriasTour');



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
 * Valida y normaliza extras recibidos desde el formulario administrativo.
 * Todos los precios se conservan como valores reales en COP.
 */
const normalizarExtrasTour = (extras = []) => {
  return extras.map((extra) => {
    const nombre = String(extra.nombre || '').trim();
    const precio = Number(extra.precio);

    if (!nombre) {
      const error = new Error('Cada extra debe tener un nombre');
      error.statusCode = 400;
      throw error;
    }

    if (!Number.isFinite(precio) || precio < 0) {
      const error = new Error('El precio de cada extra debe ser un número mayor o igual a cero');
      error.statusCode = 400;
      throw error;
    }

    return {
      id: extra.id ? Number(extra.id) : null,
      nombre,
      descripcion: String(extra.descripcion || '').trim() || null,
      precio,
      activo: extra.activo !== false
    };
  });
};

/**
 * Genera y guarda las traducciones de un tour.
 *
 * Primero elimina las traducciones anteriores del tour
 * y luego crea traducciones nuevas con la información actualizada.
 */
const generarTraduccionesTour = async (tour) => {
  try {
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
  } catch (error) {
    console.error(error);
    console.error(error.stack);
    throw error;
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

  if (Array.isArray(contenidoTraducido.extras)) {
    const idsExtrasIncluidos = new Set(
      (tourPlano.extras || []).map((extra) => Number(extra.id))
    );

    contenidoTraducido = {
      ...contenidoTraducido,
      extras: contenidoTraducido.extras.filter((extra) =>
        idsExtrasIncluidos.has(Number(extra.id))
      )
    };
  }

  return {
    ...tourPlano,
    ...contenidoTraducido,
    // La categoría es un valor estable del dominio y nunca se sustituye por
    // una traducción almacenada anteriormente.
    categoria: tourPlano.categoria,
    idioma_actual: idiomaNormalizado,
    traduccion_disponible: true,
  };
};

/**
 * Construye las asociaciones de un tour mediante consultas separadas.
 *
 * Todos los modelos relacionados son asociaciones hasMany. Cargarlos en una
 * sola consulta multiplica sus filas entre sí y puede bloquear el proceso al
 * reconstruir el resultado. `separate: true` conserva la misma estructura de
 * respuesta sin generar ese producto cartesiano.
 */
const construirRelacionesTour = ({
  incluirTraducciones = true,
  incluirExtrasInactivos = true
} = {}) => [
  { model: PrecioTour, as: 'precios', separate: true },
  { model: ImagenTour, as: 'imagenes', separate: true },
  {
    model: FechaNoDisponibleTour,
    as: 'fechas_no_disponibles',
    separate: true
  },
  { model: DetalleTour, as: 'detalles', separate: true },
  { model: ItinerarioTour, as: 'itinerario', separate: true },
  { model: HorarioTour, as: 'horarios', separate: true },
  {
    model: ExtraTour,
    as: 'extras',
    separate: true,
    ...(incluirExtrasInactivos ? {} : { where: { activo: true } })
  },
  ...(incluirTraducciones
    ? [{ model: TraduccionTour, as: 'traducciones', separate: true }]
    : [])
];

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
    validarRangosNoDisponibles(fechas_no_disponibles);
    const horariosNormalizados = normalizarHorariosTour(horarios);
    const categoriaValidada = validarCategoriaTour(categoria);

    const nuevoTour = await Tour.create(
      {
        nombre,
        categoria: categoriaValidada,
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
    if (horariosNormalizados.length > 0) {
      const horariosData = horariosNormalizados.map((horario) => ({
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
    const extrasData = normalizarExtrasTour(extras).map((extra) => ({
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
      include: construirRelacionesTour()
    });

    await generarTraduccionesTour(tourCreado);

    const tourConTraducciones = await obtenerTourPorId(nuevoTour.id, 'es', true);

    return tourConTraducciones;
  } catch (error) {
    /**
     * Solo se revierte una transacción que todavía sigue abierta. Así se
     * conserva la excepción original cuando una operación posterior al commit,
     * como la generación de traducciones, falla.
     */
    console.error(error);
    console.error(error.stack);

    if (!transaccion.finished) {
      await transaccion.rollback();
    }

    throw error;
  }
};


/**
 * Servicio para listar todos los tours.
 *
 * Retorna los tours utilizando el idioma solicitado.
 * Las consultas públicas incluyen únicamente tours activos; la administración
 * puede solicitar ambos estados mediante una ruta autenticada.
 */
const listarTours = async (idioma = 'es', incluirInactivos = false) => {
  const tours = await Tour.findAll({
    where: incluirInactivos
      ? {}
      : { estado_publicacion: 'activo' },
    include: construirRelacionesTour({
      incluirExtrasInactivos: false
    }),
    order: [['id', 'DESC']],
  });

  return tours.map((tour) => aplicarTraduccionTour(tour, idioma));
};

/**
 * Servicio para obtener un tour por su ID.
 *
 * Devuelve el tour en el idioma solicitado.
 * Por defecto exige que esté activo para impedir acceso público directo a
 * contenido despublicado.
 */
const obtenerTourPorId = async (id, idioma = 'es', incluirInactivos = false) => {
  const tour = await Tour.findOne({
    where: {
      id,
      ...(incluirInactivos ? {} : { estado_publicacion: 'activo' })
    },
    include: construirRelacionesTour({
      incluirExtrasInactivos: incluirInactivos
    }),
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
  let imagenesNuevasCloudinary = [];
  let imagenesRetiradas = [];

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
      imagenes_nuevas_metadata,
      actualizar_imagenes,
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
        datosActualizados[campo] =
          campo === 'categoria'
            ? validarCategoriaTour(datosTour[campo])
            : datosTour[campo];
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
     * Reconcilia la galería únicamente cuando el frontend informa que fue
     * modificada. Los IDs recibidos representan exactamente las imágenes que
     * deben conservarse; las demás se retiran de la base de datos.
     */
    if (actualizar_imagenes && Array.isArray(imagenes_existentes)) {
      const imagenesActuales = await ImagenTour.findAll({
        where: { id_tour: id },
        transaction: transaccion
      });
      const idsConservados = new Set(
        imagenes_existentes
          .map((imagen) => Number(imagen.id))
          .filter(Number.isInteger)
      );

      imagenesRetiradas = imagenesActuales.filter(
        (imagen) => !idsConservados.has(Number(imagen.id))
      );

      if (imagenesRetiradas.length > 0) {
        await ImagenTour.destroy({
          where: { id: imagenesRetiradas.map((imagen) => imagen.id), id_tour: id },
          transaction: transaccion
        });
      }

      for (const imagen of imagenes_existentes) {
        if (!idsConservados.has(Number(imagen.id))) continue;

        await ImagenTour.update(
          { es_portada: Boolean(imagen.es_portada) },
          {
            where: { id: imagen.id, id_tour: id },
            transaction: transaccion
          }
        );
      }
    }

    /**
     * Sube y registra exclusivamente los archivos nuevos. La metadata conserva
     * la portada elegida en el formulario sin reenviar imágenes existentes.
     */
    if (archivosImagenes.length > 0) {
      imagenesNuevasCloudinary = await subirMultiplesImagenesCloudinary(
        archivosImagenes
      );
      const metadataNuevas = Array.isArray(imagenes_nuevas_metadata)
        ? imagenes_nuevas_metadata
        : [];
      const cantidadImagenesConservadas = await ImagenTour.count({
        where: { id_tour: id },
        transaction: transaccion
      });
      const existePortadaNueva = metadataNuevas.some((imagen) =>
        Boolean(imagen.es_portada)
      );

      const imagenesData = imagenesNuevasCloudinary.map((imagen, index) => ({
        id_tour: id,
        url_imagen: imagen.url_imagen,
        public_id_cloudinary: imagen.public_id_cloudinary,
        es_portada:
          Boolean(metadataNuevas[index]?.es_portada) ||
          (cantidadImagenesConservadas === 0 && !existePortadaNueva && index === 0)
      }));

      await ImagenTour.bulkCreate(imagenesData, {
        transaction: transaccion
      });
    }

    /**
     * Si se envían fechas no disponibles, se reemplazan las anteriores.
     */
    if (Array.isArray(fechas_no_disponibles)) {
      validarRangosNoDisponibles(fechas_no_disponibles);
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
      const horariosNormalizados = normalizarHorariosTour(horarios);
      const horariosActuales = await HorarioTour.findAll({ where: { id_tour: id }, transaction: transaccion });
      const idsActuales = new Set(horariosActuales.map((horario) => Number(horario.id)));
      const idsConservados = new Set();

      for (const horario of horariosNormalizados) {
        const idHorario = Number(horario.id);
        if (Number.isInteger(idHorario) && idHorario > 0) {
          if (!idsActuales.has(idHorario)) throw Object.assign(new Error('Uno de los horarios no pertenece al tour.'), { statusCode: 422 });
          idsConservados.add(idHorario);
          await HorarioTour.update(
            { hora_inicio: horario.hora_inicio, activo: horario.activo },
            { where: { id: idHorario, id_tour: id }, transaction: transaccion }
          );
        } else {
          const horarioInactivo = horariosActuales.find((actual) =>
            actual.hora_inicio === horario.hora_inicio && !actual.activo
          );
          if (horarioInactivo) {
            idsConservados.add(Number(horarioInactivo.id));
            await horarioInactivo.update({ activo: true }, { transaction: transaccion });
          } else {
            await HorarioTour.create(
              { id_tour: id, hora_inicio: horario.hora_inicio, activo: horario.activo },
              { transaction: transaccion }
            );
          }
        }
      }

      const idsRetirados = horariosActuales.map((horario) => Number(horario.id)).filter((idHorario) => !idsConservados.has(idHorario));
      if (idsRetirados.length > 0) {
        await HorarioTour.update({ activo: false }, { where: { id: idsRetirados, id_tour: id }, transaction: transaccion });
      }
    }
    /**
     * Reconcilia los extras por ID: actualiza los existentes, crea los nuevos
     * y elimina únicamente los que fueron retirados del formulario.
     */
    if (Array.isArray(extras)) {
      const extrasNormalizados = normalizarExtrasTour(extras);
      const extrasActuales = await ExtraTour.findAll({
        where: { id_tour: id },
        transaction: transaccion
      });
      const idsActuales = new Set(extrasActuales.map((extra) => Number(extra.id)));
      const idsConservados = new Set();

      for (const extra of extrasNormalizados) {
        if (extra.id) {
          if (!idsActuales.has(extra.id)) {
            const error = new Error('Uno de los extras no pertenece al tour');
            error.statusCode = 400;
            throw error;
          }

          idsConservados.add(extra.id);
          await ExtraTour.update(
            {
              nombre: extra.nombre,
              descripcion: extra.descripcion,
              precio: extra.precio,
              activo: extra.activo
            },
            {
              where: { id: extra.id, id_tour: id },
              transaction: transaccion
            }
          );
        } else {
          await ExtraTour.create(
            {
              id_tour: id,
              nombre: extra.nombre,
              descripcion: extra.descripcion,
              precio: extra.precio,
              activo: extra.activo
            },
            { transaction: transaccion }
          );
        }
      }

      const idsRetirados = extrasActuales
        .map((extra) => Number(extra.id))
        .filter((idExtra) => !idsConservados.has(idExtra));

      if (idsRetirados.length > 0) {
        await ExtraTour.destroy({
          where: { id: idsRetirados, id_tour: id },
          transaction: transaccion
        });
      }
    }

    /**
     * Los registros se eliminan primero dentro de la transacción. Cuando todas
     * las operaciones de base de datos han sido exitosas, se retiran los
     * recursos correspondientes de Cloudinary antes de confirmar el cambio.
     */
    for (const imagen of imagenesRetiradas) {
      if (imagen.public_id_cloudinary) {
        await eliminarImagenCloudinary(imagen.public_id_cloudinary);
      }
    }

    await transaccion.commit();

    const tourActualizado = await Tour.findByPk(id, {
      include: construirRelacionesTour({
        incluirTraducciones: false
      })
    });
    await generarTraduccionesTour(tourActualizado);

    const tourConTraducciones = await obtenerTourPorId(id, 'es', true);

    return tourConTraducciones;
  } catch (error) {
    if (!transaccion.finished) {
      await transaccion.rollback();

      await Promise.allSettled(
        imagenesNuevasCloudinary
          .filter((imagen) => imagen.public_id_cloudinary)
          .map((imagen) => eliminarImagenCloudinary(imagen.public_id_cloudinary))
      );
    }

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
     * Se eliminan las traducciones asociadas al tour.
     */
    await TraduccionTour.destroy({
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
