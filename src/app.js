// Importamos Express, el framework que nos permite crear el servidor.
const express = require('express');

// Importamos CORS para permitir que el frontend pueda comunicarse con el backend.
const cors = require('cors');

// Cargamos las variables de entorno definidas en el archivo .env.
require('dotenv').config();

// Importamos el archivo principal donde se agrupan todas las rutas de la API.
const indexRoutes = require('./routes/index.routes');

// Creamos una instancia de Express.
const app = express();

/**
 * Configuración de CORS.
 *
 * Permite que el frontend definido en FRONTEND_URL pueda hacer
 * peticiones al backend.
 */
app.use(cors({
  origin: process.env.FRONTEND_URL,
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
app.use(express.json());

/**
 * Permite recibir datos enviados desde formularios.
 *
 * extended: true permite recibir objetos más complejos.
 */
app.use(express.urlencoded({ extended: true }));

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

// Exportamos la aplicación para poder usarla en server.js.
module.exports = app;