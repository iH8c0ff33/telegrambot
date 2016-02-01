// Require packages /
var express = require('express');
var http = require('http');
var bodyParser = require('body-parser');
var request = require('request');
//var fs = require('fs');
var sequelize = require('sequelize');
var crawler = require(__dirname+'/crawler.js');
// Load configs
var network = require(__dirname+'/config/address.js');
var telegram = require(__dirname+'/config/telegram.js');
// Database connection
var db = new sequelize(process.env.OPENSHIFT_POSTGRESQL_DB_URL+'/telegrambot', { logging: null });
var chats = {};
var subscribedChats = [];
// Database models
var Chat = db.import(__dirname+'/models/chat.js');
var Communication = db.import(__dirname+'/models/communication.js');
var Settings = db.import(__dirname+'/models/settings.js');
var File = db.import(__dirname+'/models/file.js');
Chat.sync();
Communication.sync();
Settings.sync();
File.sync();
// Load chats from database
Chat.findAll().then(function (dbChats) {
  dbChats.forEach(function (element) {
    chats[element.chatId] = element.chat;
  });
});
Settings.find({ where: { name: 'subscribedChats' } }).then(function (item) {
  if (item) {
    subscribedChats = item.data;
  }
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
// function sendPhoto(message) {
//   if (!message.chat_id || !message.photoPath) {
//     return console.log('ERR: empty chat_id or photoPath');
//   }
//   request.get(telegram.apiUrl+'sendPhoto', { formData: {
//     chat_id: message.chat_id,
//     photo: fs.createReadStream(message.photo),
//     caption: message.caption
//   } });
// }
function sendDocument(message) {
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
  } });
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
    } else if (req.body.message.text.search(/sei (ancora)? ?(vivo|attivo|acceso|sveglio|in vita) ?(coglione|(stupido)?bot( del cazzo| inutile)?|deficiente|porco ?dio|dio ?cane)?\?/i) > -1) {
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
    } else if (req.body.message.text.search(/^\/start(@sunCorp_bot)?$/) > -1) {
      if (subscribedChats.indexOf(req.body.message.chat.id) > -1) {
        sendMessage({
          chat_id: req.body.message.chat.id,
          text: 'Sei gia iscritto'
        });
      } else {
        subscribedChats.push(req.body.message.chat.id);
        sendMessage({
          chat_id: req.body.message.chat.id,
          text: 'Ora sei iscritto'
        });
      }
    } else if (req.body.message.text.search(/^\/help(@sunCorp_bot)?$/) > -1) {
      sendMessage({
        chat_id: req.body.message.chat.id,
        text: 'Ciao, sono BotBacheca e invio aggiornamenti sulle nuove circolari presenti sul registro elettronico.\nI miei comandi sono:\n/help - mostra tutti i comandi\n/ultime5 - invia le ultime 5 circolari\n/ultime10 - invia le ultime 10 circolari'
      });
    } else if (req.body.message.text.search(/^\/ultime5(@sunCorp_bot)?$/) > -1) {
      sendLast(5, req.body.message.chat.id);
    } else if (req.body.message.text.search(/^\/ultime10(@sunCorp_bot)?$/) > -1) {
      sendLast(10, req.body.message.chat.id);
    } else if (req.body.message.text.search(/^\/allegati(@sunCorp_bot)?$/) > -1) {
      sendFiles(req.body.message.chat.id);
    } else if (req.body.message.text.search(/^\/download(?!f)/) > -1) {
      (function (chatId) {
        Communication.find({ where: { comId: req.body.message.text.match(/\d+/)[0] } }).then(function (com) {
          if (!com) {
            sendMessage({
              chat_id: chatId,
              text: 'La circolare richiesta non è disponibile'
            });
          } else {
            sendDocument({
              chat_id: chatId,
              document: {
                stream: com.attachment,
                name: com.attachmentName,
                type: 'application/octet-stream'
              }
            });
          }
        });
      })(req.body.message.chat.id);
    } else if (req.body.message.text.search(/^\/downloadf/) > -1) {
      (function (chatId) {
        File.find({ where: { fileId: req.body.message.text.match(/\d+/)[0] } }).then(function (file) {
          if (!file) {
            sendMessage({
              chat_id: chatId,
              text: 'Il file richiesto non è disponibile'
            });
          } else {
            sendDocument({
              chat_id: chatId,
              document: {
                stream: file.file,
                name: file.fileName,
                type: 'application/octet-stream'
              }
            });
          }
        });
      })(req.body.message.chat.id);
    } else if (req.body.message.text.search(/^\/search(@sunCorp_bot)?$/) > -1) {
      if (req.body.message.from.username == 'iH8c0ff33') {
        sendMessage({
          chat_id: req.body.message.chat.id,
          text: 'Sto cercando...'
        });
        checkComs();
        checkFiles();
      } else {
        sendMessage({
          chat_id: req.body.message.chat.id,
          text: 'Chi ti credi di essere? Questo è un comando troppo potente per te'
        });
      }
    } else if (req.body.message.text.search(/^\/showsubs(@sunCorp_bot)?$/) > -1) {
      if (req.body.message.from.username == 'iH8c0ff33') {
        sendMessage({
          chat_id: req.body.message.chat.id,
          text: 'subscribedChats = '+JSON.stringify(subscribedChats, null, ' ')
        });
      } else {
        sendMessage({
          chat_id: req.body.message.chat.id,
          text: 'Chi ti credi di essere? Questo è un comando troppo potente per te'
        });
      }
    } else if (req.body.message.text.search(/^\/stop(@sunCorp_bot)?$/) > -1) {
      if (subscribedChats.indexOf(req.body.message.chat.id) > -1) {
        subscribedChats.splice(subscribedChats.indexOf(req.body.message.chat.id), 1);
        sendMessage({
          chat_id: req.body.message.chat.id,
          text: 'Sei stato disiscritto'
        });
      } else {
        sendMessage({
          chat_id: req.body.message.chat.id,
          text: 'Non sei iscritto'
        });
      }
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
  Settings.find({ where: { name: 'subscribedChats' } }).then(function (item) {
    if (item) {
      item.update({ data: subscribedChats });
    } else {
      Settings.create({
        name: 'subscribedChats',
        data: subscribedChats
      });
    }
  });
  for (var chat in chats) {
    if (chats.hasOwnProperty(chat)) {
      (function (chat) {
        Chat.find({ where: {
          chatId: chat
        } }).then(function (dbChat) {
          if (dbChat) {
            return dbChat.update({
              chat: chats[chat]
            });
          } else {
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
  sendMessage({
    chat_id: '36798536',
    text: 'debug: searching...'
  });
  crawler.crawlComs(function (announcments) {
    announcments.forEach(function (announcment) {
      (function (item) {
        Communication.find({ where: { comId: item.comId } }).then(function (com) {
          if (!com) {
            crawler.downloadCom(item.comId, function (file, fileName) {
              Communication.create({
                comId: item.comId,
                title: item.title,
                category: item.category,
                date: item.date,
                attachmentName: fileName,
                attachment: file
              }).then(function (createdCom) {
                subscribedChats.forEach(function (chatId) {
                  sendMessage({
                    chat_id: chatId,
                    text: '-Nuova Circolare-\nTitolo: '+createdCom.title+'\nData: '+createdCom.date+'------'
                  });
                  sendDocument({
                    chat_id: chatId,
                    document: {
                      stream: createdCom.attachment,
                      name: createdCom.attachmentName,
                      type: 'application/octet-stream'
                    }
                  });
                });
              });
            });
          }
        });
      })(announcment);
    });
  });
}
function checkFiles() {
  crawler.crawlFiles(function (files) {
    files.forEach(function (file) {
      (function (item) {
        File.find({ where: { fileId: item.fileId } }).then(function (foundFile) {
          if (!foundFile) {
            crawler.downloadFile(item.fileId, function (file, fileName) {
              File.create({
                fileId: item.fileId,
                name: item.name,
                author: item.author,
                folder: item.folder,
                fileName: fileName,
                file: file
              }).then(function (createdFile) {
                subscribedChats.forEach(function (chatId) {
                  sendMessage({
                    chat_id: chatId,
                    text: '-Nuovo File-\nTitolo: '+createdFile.name+'\nAutore: '+createdFile.author+'\nCartella: '+createdFile.folder+'------'
                  });
                  sendDocument({
                    chat_id: chatId,
                    document: {
                      stream: createdFile.file,
                      name: createdFile.fileName,
                      type: 'application/octet-stream'
                    }
                  });
                });
              });
            });
          }
        });
      })(file);
    });
  });
}
function sendLast(number, chatId) {
  var message = '-Ultime '+number+' circolari-\n';
  crawler.crawlComs(function (announcments) {
    for (var current = 0; current < number; current++) {
      message += 'Titolo: '+announcments[current].title+'\nData: '+announcments[current].date+'\nAllegato: /download'+announcments[current].comId+'\n------\n';
    }
    sendMessage({
      chat_id: chatId,
      text: message
    });
  });
}
function sendFiles(chatId) {
  console.log('sending files to '+chatId);
  var message = '-Allegati-\n';
  File.findAll().then(function (files) {
    console.log('found files');
    files.forEach(function (file) {
      message += 'Nome: '+file.name+'\nAutore: '+file.author+'\nCartella: '+file.folder+'\n Scarica: /downloadf'+file.fileId+'\n------\n';
    });
    console.log(message);
    sendMessage({
      chat_id: chatId,
      text: message
    });
  });
}
setInterval(checkComs, 900000);
setInterval(checkFiles, 900000);
process.on('SIGTERM', shutdown);
