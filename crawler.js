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
  downloadCom: function (comId, done) {
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
        },
        encoding: null
      }, function (_err, res, body) {
        var fileNameRegexp = /filename=(.*)/gi;
        var filename = fileNameRegexp.exec(res.headers['content-disposition'])[1];
        (function (fileName, data) {
          fs.writeFile(__dirname+'/'+fileName, data, function () {
            done(fs.createReadStream(__dirname+'/'+fileName), fileName, function (fileName) {
              fs.unlink(fileName);
            });
          });
        })(filename, body);
      });
    });
  },
  crawlFiles: function (done) {
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
    }, function () {
      request({
        url: 'https://web.spaggiari.eu/cvv/app/default/didattica_genitori.php',
        method: 'GET',
        jar: cookieJar
      }, function (_err, _res, body) {
        var $ = cheerio.load(body);
        var files = [];
        $('.row_parent').each(function () {
          (function (folder) {
            $('.master_'+folder.folderId).each(function () {
              files.push({
                name: $(this).find('.contenuto_desc').find('div').find('.row_contenuto_desc').text(),
                author: folder.prof,
                folder: folder.name,
                fileId: $(this).attr('contenuto_id')
              });
            });
          })({
            name: $(this).text().split('\n').join(''),
            prof: $(this).prev().find('.bluetext').text().split('\n').join('') || (function (element) {
              var author = '';
              do {
                element = $(element).prev();
                author = $(element).find('.bluetext').text().split('\n').join('');
              } while (author == '');
              return author;
            })(this),
            folderId: $(this).attr('folder_id')
          });
        });
        return done(files);
      });
    });
  }
};
