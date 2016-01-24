var fs = require('fs');
var token = fs.readFileSync(__dirname+'/../secure/botToken.key');
module.exports = {
  token: token,
  apiUrl: 'https://api.telegram.org/bot'+token+'/'
};
