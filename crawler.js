var request = require('request');
var fs = require('fs');
var cheerio = require('cheerio');
var cookieJar = request.jar();
request({
  url: 'https://web.spaggiari.eu/home/app/default/login.php',
  method: 'POST',
  jar: cookieJar,
  formData: {
    action: 'login.php',
    custcode: 'TOLS0005',
    login: 'S1122773T',
    password: 'md39185l'
  }
}, function (err, _res, _body) {
  if (err) { throw err; }
  request({
    url: 'https://web.spaggiari.eu/sif/app/default/bacheca_utente.php',
    method: 'POST',
    jar: cookieJar,
    formData: {
      action: 'loadother',
      offset: 0
    }
  }, function (_err, _res, body) {
    var $ = cheerio.load(body);
    var elements = [];
    $('td').each(function (i, _elt) {
      elements[i] = $(this).text();
    });
    console.log(elements.join('').split('\n').filter(String));
  }).pipe(fs.createWriteStream('out.html'));
});
