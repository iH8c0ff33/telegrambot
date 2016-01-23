// Require packages
var express = require('express');
var http = require('http');
var bodyParser = require('body-parser');
var request = require('request');
var fs = require('fs');
var exec = require('child_process').exec;
// Bot configuration
var token = '130906513:AAG6u4Jr8txCneVcha57SXAb9vsDbs1lINg';
var apiUrl = 'https://api.telegram.org/bot'+token+'/';
function sendMessage(message) {
  if (!message.chat_id || !message.text) {
    console.log('ERR: empty chat_id or text');
  }
  request.get(apiUrl+'sendMessage', { form: {
    chat_id: message.chat_id,
    text: message.text,
    disable_web_page_preview: message.disableWeb,
    parse_mode: message.parse_mode
  } });
}
function sendPhoto(message) {
  if (!message.chat_id || !message.photoPath) {
    console.log('ERR: empty chat_id or photoPath');
  }
  request.get(apiUrl+'sendPhoto', { formData: {
    chat_id: message.chat_id,
    photo: fs.createReadStream(message.photo),
    caption: message.caption
  } });
}
var mute = false;
// Express
var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
// Routes
app.get('/', function(_req, res) {
  res.send('Bot is working!');
});
app.post('/', function (req, _res) {
  console.log(req.body);
});
app.post('/'+token, function (req, res) {
  console.log(req.body.message);
  if (req.body.message.text) {
    if (!mute && req.body.message.text == 'zitto coglione') {
      mute = true;
      sendMessage({
        chat_id: req.body.message.chat.id,
        text: 'Zi badrone'
      });
    } else if (mute && req.body.message.text == 'ora puoi parlare') {
      mute = false;
    }
    if (req.body.message.text == 'ls') {
      exec('ls', function (_error, stdout, _stderr) {
        sendMessage({
          chat_id: req.body.message.chat.id,
          disableWeb: true,
          text: stdout
        });
      });
    }
    if (!mute) {
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
    request.get(apiUrl+'sendMessage', { form: {
      chat_id: req.body.message.chat.id,
      text: 'received unknown message: '+JSON.stringify(req.body.message, null, ' ')+';'
    } });
  }
  res.send('OK');
});
// Express server
http.createServer(app).listen(process.env.OPENSHIFT_NODEJS_PORT || 8080, process.env.OPENSHIFT_NODEJS_IP);
