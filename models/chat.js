module.exports = function (db, sequelize) {
  return db.define('chat', {
    chatId: {
      type: sequelize.INTEGER,
      allowNull: false,
      unique: true
    },
    chat: sequelize.JSON
  });
};
