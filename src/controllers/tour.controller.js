const {
  crearTourCompleto,
  listarTours: listarToursService,
  obtenerTourPorId: obtenerTourPorIdService,
  actualizarTourCompleto,
  eliminarTourPorId: eliminarTourPorIdService
} = require('../services/tour.service');
/**
 * Convierte un campo JSON recibido como texto a un arreglo real.
 *
 * Esto es necesario cuando el frontend envía datos mediante multipart/form-data.
 */
const convertirCampoJson = (valor, valorPorDefecto = []) => {
  if (!valor) return valorPorDefecto;

  if (Array.isArray(valor)) return valor;

  try {
    return JSON.parse(valor);
  } catch (error) {
    const errorFormato = new Error('Uno de los campos enviados no tiene formato JSON válido');
    errorFormato.statusCode = 400;
    throw errorFormato;
  }
};

/**
 * Controlador para crear un tour.
 *
 * Recibe la petición del frontend, valida los datos principales
 * y delega la lógica de creación al servicio de tours.
 */
const crearTour = async (req, res) => {
  try {
    const {
      nombre,
      categoria,
      tipo_tour,
      duracion,
      maximo_personas,
      descripcion
    } = req.body;

    /**
     * Validación básica de campos obligatorios.
     */
    if (!nombre || !categoria || !tipo_tour || !duracion || !maximo_personas || !descripcion) {
      return res.status(400).json({
        ok: false,
        message: 'Faltan campos obligatorios del tour'
      });
    }
    const datosTour = {
        ...req.body,
        maximo_personas: Number(req.body.maximo_personas),

        idiomas: convertirCampoJson(req.body.idiomas, ['Español']),
        precios: convertirCampoJson(req.body.precios),
        fechas_no_disponibles: convertirCampoJson(req.body.fechas_no_disponibles),
        detalles: convertirCampoJson(req.body.detalles),
        itinerario: convertirCampoJson(req.body.itinerario),
        horarios: convertirCampoJson(req.body.horarios),
        extras: convertirCampoJson(req.body.extras)
        };

    /**
     * Se envían los datos al servicio encargado de guardar el tour.
     */
    const tourCreado = await crearTourCompleto(datosTour, req.files || []);

    return res.status(201).json({
      ok: true,
      message: 'Tour creado correctamente',
      tour: tourCreado
    });
  } catch (error) {
    console.error('Error al crear tour:', error);
    console.error(error);
    console.error(error.stack);

    return res.status(error.statusCode || 500).json({
      ok: false,
      message: error.statusCode ? error.message : 'Error al crear el tour',
      error: error.message
    });
  }
};


/**
 * Controlador para listar tours.
 *
 * Recibe opcionalmente el idioma mediante query params.
 *
 * Ejemplo:
 * GET /api/tours?idioma=en
 */
const listarTours = async (req, res) => {
  try {
    const idioma = req.query.idioma || 'es';

    const tours = await listarToursService(idioma);

    return res.status(200).json({
      ok: true,
      message: 'Tours consultados correctamente',
      idioma,
      tours,
    });
  } catch (error) {
    console.error('Error al listar tours:', error);

    return res.status(500).json({
      ok: false,
      message: 'Error al consultar los tours',
      error: error.message,
    });
  }
};

/**
 * Controlador para obtener un tour por ID.
 *
 * Permite consultar el tour en un idioma específico.
 *
 * Ejemplo:
 * GET /api/tours/1?idioma=en
 */
const obtenerTourPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const idioma = req.query.idioma || 'es';
    const incluirInactivos = req.query.incluir_inactivos === 'true';

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        ok: false,
        message: 'El ID del tour no es válido',
      });
    }

    const tour = await obtenerTourPorIdService(id, idioma, incluirInactivos);

    if (!tour) {
      return res.status(404).json({
        ok: false,
        message: 'Tour no encontrado',
      });
    }

    return res.status(200).json({
      ok: true,
      message: 'Tour consultado correctamente',
      idioma,
      tour,
    });
  } catch (error) {
    console.error('Error al obtener tour:', error);

    return res.status(500).json({
      ok: false,
      message: 'Error al consultar el tour',
      error: error.message,
    });
  }
};

/**
 * Controlador para actualizar un tour por ID.
 *
 * Permite actualizar datos enviados como JSON normal
 * o multipart/form-data.
 *
 * Las imágenes existentes no se vuelven a subir.
 * Solo se envían al servicio los archivos nuevos recibidos por Multer.
 */
const actualizarTour = async (req, res) => {
  try {
    const { id } = req.params;

    /**
     * Validación básica del ID recibido por parámetro.
     */
    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        ok: false,
        message: 'El ID del tour no es válido'
      });
    }

    /**
     * Normalizamos los datos recibidos.
     *
     * Cuando la petición viene como multipart/form-data,
     * los arreglos llegan como texto y se convierten a JSON.
     */
    const datosTour = {
      ...req.body
    };

    if (req.body.maximo_personas !== undefined) {
      datosTour.maximo_personas = Number(req.body.maximo_personas);
    }

    if (req.body.idiomas !== undefined) {
      datosTour.idiomas = convertirCampoJson(req.body.idiomas, ['Español']);
    }

    if (req.body.precios !== undefined) {
      datosTour.precios = convertirCampoJson(req.body.precios);
    }

    if (req.body.fechas_no_disponibles !== undefined) {
      datosTour.fechas_no_disponibles = convertirCampoJson(req.body.fechas_no_disponibles);
    }

    if (req.body.detalles !== undefined) {
      datosTour.detalles = convertirCampoJson(req.body.detalles);
    }

    if (req.body.itinerario !== undefined) {
      datosTour.itinerario = convertirCampoJson(req.body.itinerario);
    }

    if (req.body.horarios !== undefined) {
      datosTour.horarios = convertirCampoJson(req.body.horarios);
    }

    if (req.body.extras !== undefined) {
      datosTour.extras = convertirCampoJson(req.body.extras);
    }

    /**
     * Este campo es opcional.
     * Sirve solo si después quieres cambiar cuál imagen es portada,
     * pero NO vuelve a subir imágenes existentes.
     */
    if (req.body.imagenes_existentes !== undefined) {
      datosTour.imagenes_existentes = convertirCampoJson(req.body.imagenes_existentes);
    }

    if (req.body.imagenes_nuevas_metadata !== undefined) {
      datosTour.imagenes_nuevas_metadata = convertirCampoJson(
        req.body.imagenes_nuevas_metadata
      );
    }

    datosTour.actualizar_imagenes =
      req.body.actualizar_imagenes === true || req.body.actualizar_imagenes === 'true';

    /**
     * req.files contiene únicamente las imágenes nuevas.
     */
    const tourActualizado = await actualizarTourCompleto(
      id,
      datosTour,
      req.files || []
    );

    if (!tourActualizado) {
      return res.status(404).json({
        ok: false,
        message: 'Tour no encontrado'
      });
    }

    return res.status(200).json({
      ok: true,
      message: 'Tour actualizado correctamente',
      tour: tourActualizado
    });
  } catch (error) {
    console.error('Error al actualizar tour:', error);

    return res.status(error.statusCode || 500).json({
      ok: false,
      message: error.statusCode ? error.message : 'Error al actualizar el tour',
      error: error.message
    });
  }
};
/**
 * Controlador para eliminar un tour por ID.
 *
 * Valida el ID recibido por parámetro y delega la eliminación
 * al servicio de tours.
 */
const eliminarTour = async (req, res) => {
  try {
    const { id } = req.params;

    /**
     * Validación básica del ID.
     */
    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        ok: false,
        message: 'El ID del tour no es válido'
      });
    }

    const eliminado = await eliminarTourPorIdService(id);

    if (!eliminado) {
      return res.status(404).json({
        ok: false,
        message: 'Tour no encontrado'
      });
    }

    return res.status(200).json({
      ok: true,
      message: 'Tour eliminado correctamente'
    });
  } catch (error) {
    console.error('Error al eliminar tour:', error);

    return res.status(500).json({
      ok: false,
      message: 'Error al eliminar el tour',
      error: error.message
    });
  }
};

module.exports = {
  crearTour,
  listarTours,
  obtenerTourPorId,
  actualizarTour,
  eliminarTour
};
