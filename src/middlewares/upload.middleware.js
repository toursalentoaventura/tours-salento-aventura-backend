const multer = require('multer');

/**
 * Configuración de almacenamiento en memoria.
 *
 * No guardamos archivos localmente en el servidor.
 * Multer recibe la imagen temporalmente en memoria
 * y luego la enviamos directamente a Cloudinary.
 */
const storage = multer.memoryStorage();

/**
 * Filtro de archivos permitidos.
 *
 * Solo aceptamos imágenes en formatos comunes.
 */
const fileFilter = (req, file, cb) => {
  const formatosPermitidos = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp'
  ];

  if (formatosPermitidos.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Formato de imagen no permitido'), false);
  }
};

/**
 * Middleware principal de subida.
 *
 * Límite por archivo: 5 MB.
 */
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

module.exports = upload;