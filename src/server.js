// Importamos la aplicación principal de Express configurada en app.js.
const app = require('./app');

// Importamos la conexión Sequelize desde los modelos.
const { sequelize } = require('./models');

// Cargamos las variables de entorno del archivo .env.
require('dotenv').config();

/**
 * Puerto donde se ejecutará el servidor.
 *
 * Si existe PORT en el archivo .env, usa ese valor.
 * Si no existe, usa el puerto 4000 por defecto.
 */
const PORT = process.env.PORT || 4000;

/**
 * Función principal para iniciar el servidor.
 *
 * Primero valida la conexión con MySQL,
 * luego sincroniza los modelos con la base de datos
 * y finalmente levanta el servidor Express.
 */
const startServer = async () => {
  try {
    /**
     * Verifica que Sequelize pueda conectarse correctamente
     * a la base de datos MySQL.
     */
    await sequelize.authenticate();

    console.log('Conexión a MySQL establecida correctamente');

    /**
     * Sincroniza los modelos con la base de datos.
     *
     * alter: false significa que Sequelize NO modificará
     * automáticamente las tablas existentes.
     *
     * Esto es más seguro para evitar cambios inesperados
     * en la estructura de la base de datos.
     */
    await sequelize.sync({ alter: false });

    console.log('Tablas sincronizadas correctamente');

    /**
     * Inicia el servidor en el puerto configurado.
     */
    app.listen(PORT, () => {
      console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
    });
  } catch (error) {
    /**
     * Si ocurre un error al conectar con la base de datos
     * o al iniciar el servidor, se muestra en consola.
     */
    console.error('Error al iniciar el servidor:', error.message);

    /**
     * Finaliza el proceso para evitar que el servidor
     * quede ejecutándose con errores.
     */
    process.exit(1);
  }
};

// Ejecutamos la función que inicia el servidor.
startServer();