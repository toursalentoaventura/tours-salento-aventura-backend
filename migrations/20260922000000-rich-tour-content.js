 'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('detalles_tour', 'descripcion', {
      type: Sequelize.TEXT, allowNull: false,
    });
  },
  async down() {
    // Intentionally keep TEXT: shrinking would truncate existing rich content.
  },
};
