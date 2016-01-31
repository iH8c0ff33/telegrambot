module.exports = function (db, sequelize) {
  return db.define('settings', {
    name: {
      type: sequelize.STRING,
      allowNull: false,
      unique: true
    },
    data: {
      type: sequelize.JSON
    }
  });
};
