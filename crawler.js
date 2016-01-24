var request = require('request');
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
    var $ = cheerio.load('<table>'+body+'</table>');
    var announcments = [];
    $('tr').each(function () {
      var tds = [];
      $(this).find('td').each(function (index) {
        tds[index] = $(this);
      });
      var divs = [];
      tds[2].find('div').each(function (index) {
        divs[index] = $(this);
      });
      announcments.push({
        comId: tds[4].find('a').attr('comunicazione_id'),
        title: divs[0].text().split('\n').join(''),
        category: divs[1].text().split('\n').join(''),
        date: tds[3].text().split('\n').join('')
      });
    });
    console.log(JSON.stringify(announcments, null, ''));
  });
});
