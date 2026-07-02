require('dotenv').config();

const { traducirTexto } = require('./src/services/traduccion.service');

const probarTraduccion = async () => {
  try {
    const resultado = await traducirTexto(
      'Disfruta una experiencia natural en el Valle del Cocora',
      'en'
    );

    console.log('Traducción:', resultado);
  } catch (error) {
    console.error('Error probando traducción:', error.message);
  }
};

probarTraduccion();