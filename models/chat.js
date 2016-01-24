module.exports = function (db, sequelize) {
  return db.define('chat', {
    id: {
      type: sequelize.INTEGER,
      allowNull: false,
      unique: true
    },
    chat: sequelize.JSON
  });
};
