// Importamos Express, el framework que nos permite crear el servidor.
const express = require('express');

// Importamos CORS para permitir que el frontend pueda comunicarse con el backend.
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const { rateLimit } = require('express-rate-limit');

// Cargamos las variables de entorno definidas en el archivo .env.
require('dotenv').config();

// Importamos el archivo principal donde se agrupan todas las rutas de la API.
const indexRoutes = require('./routes/index.routes');

// Creamos una instancia de Express.
const app = express();

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.disable('x-powered-by');
app.use(helmet());
app.use(compression());

/**
 * Configuración de CORS.
 *
 * Permite que el frontend definido en FRONTEND_URL pueda hacer
 * peticiones al backend.
 */
const origenesPermitidos = String(process.env.FRONTEND_URL || '')
  .split(',')
  .map((origen) => origen.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origen, callback) => {
    if (!origen || origenesPermitidos.includes(origen)) return callback(null, true);
    return callback(new Error('Origen no permitido por CORS'));
  },
  credentials: true
}));

/**
 * Permite que el servidor reciba datos en formato JSON.
 *
 * Ejemplo:
 * {
 *   "nombre": "Tour Valle del Cocora"
 * }
 */
app.use(express.json({ limit: '1mb' }));

/**
 * Permite recibir datos enviados desde formularios.
 *
 * extended: true permite recibir objetos más complejos.
 */
app.use(express.urlencoded({ extended: true, limit: '1mb', parameterLimit: 100 }));

const limiteGeneral = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { ok: false, message: 'Demasiadas solicitudes. Intenta nuevamente más tarde.' }
});

const limiteOperacionesPublicas = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { ok: false, message: 'Has realizado demasiados intentos. Espera unos minutos.' }
});

app.use('/api', limiteGeneral);
app.use('/api/auth', limiteOperacionesPublicas);
app.post('/api/contacto', limiteOperacionesPublicas);
app.post('/api/reservas', limiteOperacionesPublicas);
app.post('/api/pagos/iniciar', limiteOperacionesPublicas);

/**
 * Ruta principal de la API.
 *
 * Todas las rutas definidas en index.routes.js quedarán bajo el prefijo /api.
 *
 * Ejemplos:
 * /api/tours
 * /api/reservas
 * /api/auth/login
 * /api/pagos/iniciar
 */
app.use('/api', indexRoutes);

/**
 * Ruta base del backend.
 *
 * Sirve para comprobar rápidamente que la API está funcionando.
 */
app.get('/', (req, res) => {
  res.json({
    message: 'API Tour Salento Aventura funcionando correctamente'
  });
});

app.use((req, res) => {
  res.status(404).json({ ok: false, message: 'Ruta no encontrada' });
});

app.use((error, req, res, next) => {
  void next;
  const estado = error.statusCode || (error.type === 'entity.too.large' ? 413 : 500);
  if (estado >= 500) console.error('Error no controlado:', error.message);
  res.status(estado).json({
    ok: false,
    message: estado >= 500 ? 'Ocurrió un error interno en el servidor' : error.message
  });
});

// Exportamos la aplicación para poder usarla en server.js.
module.exports = app;
