var fs = require('fs');
var token = fs.readFileSync(__dirname+'/../secure/botToken.key').toString('utf8').split('\n').join('');
module.exports = {
  token: token,
  apiUrl: 'https://api.telegram.org/bot'+token+'/'
};
