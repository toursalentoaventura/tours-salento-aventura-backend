const { v2: cloudinary } = require('cloudinary');
require('dotenv').config();

/**
 * Configuración de Cloudinary.
 *
 * Centraliza las credenciales para subir, consultar
 * o eliminar imágenes desde el backend.
 */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

module.exports = cloudinary;