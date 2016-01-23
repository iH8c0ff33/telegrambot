var request = require('request');
var fs = require('fs');
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
}, function (err, res, body) {
  if (err) { throw err; }
  res.headers['set-cookie'].forEach(function (cur) {
    //cookieJar.setCookie(cur.split(';')[0], '.spaggiari.eu');
  });
  console.log(cookieJar);
  console.log(body);
  request({
    url: 'https://web.spaggiari.eu/sif/app/default/bacheca_utente.php',
    method: 'POST',
    jar: cookieJar,
    formData: {
      action: 'loadother',
      offset: 0
    }
  }, function (err, res, body) {
    console.log(body);
  }).pipe(fs.createWriteStream('out.html'));
});
