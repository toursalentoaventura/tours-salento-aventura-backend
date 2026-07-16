const cloudinary = require('../config/cloudinary');

/**
 * Sube una imagen a Cloudinary desde un buffer de Multer.
 *
 * Convierte el archivo recibido en memoria a Base64
 * y lo envía a Cloudinary.
 */
const subirImagenCloudinary = async (file) => {
  try {
    const base64 = file.buffer.toString('base64');
    const dataUri = `data:${file.mimetype};base64,${base64}`;

    const resultado = await cloudinary.uploader.upload(dataUri, {
      folder: process.env.CLOUDINARY_FOLDER || 'tour_salento_aventura/tours',
      resource_type: 'image'
    });

    return {
      url_imagen: resultado.secure_url,
      public_id_cloudinary: resultado.public_id,
      formato: resultado.format,
      ancho: resultado.width,
      alto: resultado.height,
      bytes: resultado.bytes
    };
  } catch (error) {
    console.error(error);
    console.error(error.stack);
    throw error;
  }
};

/**
 * Sube varias imágenes a Cloudinary.
 */
const subirMultiplesImagenesCloudinary = async (files) => {
  const imagenesSubidas = [];

  try {
    for (const file of files) {
      const imagen = await subirImagenCloudinary(file);
      imagenesSubidas.push(imagen);
    }

    return imagenesSubidas;
  } catch (error) {
    await Promise.allSettled(
      imagenesSubidas
        .filter((imagen) => imagen.public_id_cloudinary)
        .map((imagen) => eliminarImagenCloudinary(imagen.public_id_cloudinary))
    );

    throw error;
  }
};

/**
 * Elimina una imagen de Cloudinary usando su public_id.
 */
const eliminarImagenCloudinary = async (publicId) => {
  const resultado = await cloudinary.uploader.destroy(publicId);

  return resultado;
};

module.exports = {
  subirMultiplesImagenesCloudinary,
  eliminarImagenCloudinary
};
