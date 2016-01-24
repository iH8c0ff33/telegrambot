var fs = require('fs');
var cfg = {
  name: 'telegrambot',
  user: 'admindvasqwt',
  password: fs.readFileSync(__dirname+'/../secure/pgPassword.key').toString('utf8').split('\n').join('')
};
module.exports = cfg;
