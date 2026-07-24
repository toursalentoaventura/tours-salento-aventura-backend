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
 * FRONTEND_URL puede agregar uno o varios orígenes separados por comas.
 * Las peticiones sin Origin se permiten para clientes no ejecutados en un
 * navegador, como Postman, Thunder Client o procesos internos.
 */
const origenesPermitidos = new Set([
  'http://localhost:5173',
  'https://tourssalentoaventura.com',
  'https://www.tourssalentoaventura.com',
  ...String(process.env.FRONTEND_URL || '')
    .split(',')
    .map((origen) => origen.trim())
    .filter(Boolean)
]);

const opcionesCors = {
  origin: (origen, callback) => {
    if (!origen || origenesPermitidos.has(origen)) {
      return callback(null, true);
    }

    const error = new Error('Origen no permitido por CORS');
    error.statusCode = 403;
    return callback(error);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204
};

app.use(cors(opcionesCors));

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
