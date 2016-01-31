module.exports = function(db, sequelize) {
  return db.define('communication', {
    comId: {
      type: sequelize.INTEGER,
      allowNull: false,
      unique: true
    },
    title: {
      type: sequelize.STRING,
      allowNull: false
    },
    category: {
      type: sequelize.STRING,
      allowNull: false
    },
    date: {
      type: sequelize.STRING,
      allowNull: false
    },
    attachmentName: sequelize.STRING,
    attachment: sequelize.BLOB
  });
};
