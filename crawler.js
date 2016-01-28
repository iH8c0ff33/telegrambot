var request = require('request');
var cheerio = require('cheerio');
var fs = require('fs');
var cookieJar = request.jar();

module.exports = {
  crawlComs: function (done) {
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
            comId: parseInt(tds[4].find('a').attr('comunicazione_id')),
            title: divs[0].text().split('\n').join(''),
            category: divs[1].text().split('\n').join(''),
            date: tds[3].text().split('\n').join('')
          });
        });
        console.log(JSON.stringify(announcments, null, ''));
        return done(announcments);
      });
    });
  },
  download: function (comId, done) {
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
    }, function (err) {
      if (err) { throw err; }
      request({
        url: 'https://web.spaggiari.eu/sif/app/default/bacheca_utente.php',
        method: 'POST',
        jar:cookieJar,
        formData: {
          action: 'file_download',
          com_id: comId
        }
      }, function (_err, res, body) {
        var fileNameRegexp = /filename=\"(.*)\"/gi;
        console.log(res.headers);
        var filename = fileNameRegexp.exec(res.headers['content-disposition'])[1];
        var stream = fs.createWriteStream(__dirname+'/'+filename);
        res.pipe(stream);
        (function (fileName) {
          res.on('end', function () {
            fs.createReadStream(__dirname+'/'+fileName);
            done(body, comId, function (comId) {
              done(fs.unlink(comId+'.pdf'), comId, function (fileName) {
                fs.unlink(fileName);
              });
            });
          });
        })(filename);
      });
    });
  }
};
