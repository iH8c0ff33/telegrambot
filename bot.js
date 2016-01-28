// Require packages /
var express = require('express');
var http = require('http');
var bodyParser = require('body-parser');
var request = require('request');
var fs = require('fs');
var sequelize = require('sequelize');
var crawler = require(__dirname+'/crawler.js');
// Load configs
var network = require(__dirname+'/config/address.js');
var telegram = require(__dirname+'/config/telegram.js');
// Database connection
var db = new sequelize(process.env.OPENSHIFT_POSTGRESQL_DB_URL+'/telegrambot');
var chats = {};
// Database models
var Chat = db.import(__dirname+'/models/chat.js');
var Communication = db.import(__dirname+'/models/communication.js');
Chat.sync();
Communication.sync();
// Load chats from database
Chat.findAll().then(function (dbChats) {
  dbChats.forEach(function (element) {
    chats[element.chatId] = element.chat;
  });
  console.log(chats);
});
// Bot configuration
function sendMessage(message) {
  if (!message.chat_id || !message.text) {
    return console.log('ERR: empty chat_id or text');
  }
  request.get(telegram.apiUrl+'sendMessage', { form: {
    chat_id: message.chat_id,
    text: message.text,
    disable_web_page_preview: message.disableWeb,
    parse_mode: message.parse_mode
  } });
}
function sendPhoto(message) {
  if (!message.chat_id || !message.photoPath) {
    return console.log('ERR: empty chat_id or photoPath');
  }
  request.get(telegram.apiUrl+'sendPhoto', { formData: {
    chat_id: message.chat_id,
    photo: fs.createReadStream(message.photo),
    caption: message.caption
  } });
}
function sendDocument(message, done) {
  if (!message.chat_id || !message.document) {
    return console.log('ERR: empty chat_id or documentPath');
  }
  request.get(telegram.apiUrl+'sendDocument', { formData: {
    chat_id: message.chat_id,
    document: {
      value: message.document.stream,
      options: {
        filename: message.document.name,
        contentType: message.document.type
      }
    }
  } }, function (err) {
    if (err) { console.log(err); }
    done();
  });
}
// Express
var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
// Routes
app.get('/', function(_req, res) {
  res.send('Bot is working!');
});
app.post('/', function (req, res) {
  console.log(req.body);
  res.send('OK');
});
app.post('/'+telegram.token, function (req, res) {
  console.log(req.body.message);
  if (!chats[req.body.message.chat.id]) {
    chats[req.body.message.chat.id] = req.body.message.chat;
    chats[req.body.message.chat.id].mute = false;
  }
  if (req.body.message.text) {
    if (!chats[req.body.message.chat.id].mute && req.body.message.text.search(/\w?zitto ?(coglione|(stupido)?bot( del cazzo| inutile)?|deficente|porco ?dio|dio ?cane)?/i) > -1) {
      chats[req.body.message.chat.id].mute = true;
      sendMessage({
        chat_id: req.body.message.chat.id,
        text: 'Zi badrone'
      });
    } else if (chats[req.body.message.chat.id].mute && req.body.message.text.search(/(adesso|ora)? ?puoi (parlare|tornare a rompere|continuare) ?(coglione|(stupido)? ?bot( del cazzo| inutile)?|deficente)?/i) > -1) {
      chats[req.body.message.chat.id].mute = false;
    } else if (req.body.message.text.search(/riavviati ?(ora|adesso|subito|immediatamente)? ?(coglione|(stupido)?bot( del cazzo| inutile)?|deficiente|porco ?dio|dio ?cane)?/i) > -1) {
      sendMessage({
        chat_id: req.body.message.chat.id,
        text: 'Zi badrone, mi sto riavviando'
      });
      shutdown();
    } else if (req.body.message.text.search(/sei (ancora)? ?(vivo|attivo|acceso|in vita)\?/i) > -1) {
      sendMessage({
        chat_id: req.body.message.chat.id,
        text: 'Si, certo ;)'
      });
    } else if (req.body.message.text.search(/(scarica|cerca|trova|trovami) (delle|dei|degli)? ?(nuove|nuovi)? ?(circolari|annunci)/i) > -1) {
      sendMessage({
        chat_id: req.body.message.chat.id,
        text: 'Sto cercando nuove circolari...'
      });
      checkComs();
    } else if (req.body.message.text.search(/^\/ultime5$/) > -1) {
      sendLast(5, req.body.message.chat.id);
    } else if (req.body.message.text.search(/^\/ultime10$/) > -1) {
      sendLast(10, req.body.message.chat.id);
    } else if (req.body.message.text.search(/^\/download/) > -1) {
      (function (chatId) {
        crawler.download(req.body.message.text.match(/\d+/)[0], function (fileStream, fileName, deleteTemp) {
          sendDocument({
            chat_id: chatId,
            document: {
              stream: fileStream,
              name: fileName,
              type: 'application/octet-stream'
            }
          }, function () {
            deleteTemp(fileName);
          });
        });
      })(req.body.message.chat.id);
    }
  } else {
    if (!chats[req.body.message.chat.id].mute) {
      request.get(telegram.apiUrl+'sendMessage', { form: {
        chat_id: req.body.message.chat.id,
        text: 'received unknown message: '+JSON.stringify(req.body.message, null, ' ')+';'
      } });
    }
  }
  res.send('OK');
});
// Express server
http.createServer(app).listen(network.port, network.address);
// Handle signals
function shutdown() {
  setTimeout(function () {
    process.exit(0);
  }, 3000);
  for (var chat in chats) {
    if (chats.hasOwnProperty(chat)) {
      console.log('finding '+chat);
      (function (chat) {
        Chat.find({ where: {
          chatId: chat
        } }).then(function (dbChat) {
          console.log(chat);
          if (dbChat) {
            console.log('updating '+chat);
            return dbChat.update({
              chat: chats[chat]
            });
          } else {
            console.log('creating '+chat);
            return Chat.create({
              chatId: chat,
              chat: chats[chat]
            });
          }
        });
      })(chat);
    }
  }
}
function checkComs() {
  var chatId = '-69312418';
  crawler.crawlComs(function (announcments) {
    announcments.forEach(function (item) {
      Communication.find({ where: { comId: item.comId } }).then(function (com) {
        if (!com) {
          Communication.create({
            comId: item.comId,
            title: item.title,
            category: item.category,
            date: item.date
          }).then(function () {
            sendMessage({
              chat_id: chatId,
              text: 'new: '+JSON.stringify(item, null, ' ')
            });
          });
        }
      });
    });
  });
}
function sendLast(number, chatId) {
  var message = '';
  crawler.crawlComs(function (announcments) {
    for (var current = 0; current < number; current++) {
      message += 'Titolo: '+announcments[current].title+'\nData: '+announcments[current].date+'\nAllegato: /download'+announcments[current].comId+'\n------\n';
    }
    console.log('message'+message);
    sendMessage({
      chat_id: chatId,
      text: message
    });
  });
}
setInterval(checkComs, 900000);
process.on('SIGTERM', shutdown);
