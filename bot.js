// Require packages
var express = require('express');
var http = require('http');
var bodyParser = require('body-parser');
var request = require('request');
var fs = require('fs');
var sequelize = require('sequelize');
// Load configs
var network = require(__dirname+'/config/address.js');
var telegram = require(__dirname+'/config/telegram.js');
var database = require(__dirname+'/config/database.js');
// Database connection
var db = new sequelize(database.name, database.user, database.password, { dialect: 'postgres' });
var chats = {};
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
    if (!chats[req.body.message.chat.id].mute && req.body.message.text.search(/\w?zitto (coglione|bot|deficente|porcodio|diocane)?/i) > -1) {
      chats[req.body.message.chat.id].mute = true;
      sendMessage({
        chat_id: req.body.message.chat.id,
        text: 'Zi badrone'
      });
    } else if (chats[req.body.message.chat.id].mute && req.body.message.text == 'ora puoi parlare') {
      chats[req.body.message.chat.id].mute = false;
    }
    if (!chats[req.body.message.chat.id].mute) {
      sendMessage({
        chat_id: req.body.message.chat.id,
        text: 'received text: \"'+req.body.message.text+'\";'
      });
    }
    if (req.body.message.text == 'photo') {
      sendPhoto({
        chat_id: req.body.message.chat.id,
        photo: __dirname+'/photo.jpg',
        caption: 'caption'
      });
    }
  } else {
    console.log(req.body);
    request.get(telegram.apiUrl+'sendMessage', { form: {
      chat_id: req.body.message.chat.id,
      text: 'received unknown message: '+JSON.stringify(req.body.message, null, ' ')+';'
    } });
  }
  res.send('OK');
});
// Express server
http.createServer(app).listen(network.port, network.address);
