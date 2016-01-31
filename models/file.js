module.exports = function (db, sequelize) {
  return db.define('file', {
    fileId: {
      type: sequelize.INTEGER,
      allowNull: false,
      unique: true
    },
    name: {
      type: sequelize.STRING,
      allowNull: true
    },
    author: {
      type: sequelize.STRING,
      allowNull: false
    },
    folder: {
      type: sequelize.STRING,
      allowNull: false
    },
    fileName: sequelize.STRING,
    file: sequelize.BLOB
  });
};
