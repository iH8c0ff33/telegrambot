// Require packages /
var express = require('express');
var http = require('http');
var bodyParser = require('body-parser');
var request = require('request');
var fs = require('fs');
var sequelize = require('sequelize');
var crawler = require(__dirname+'/crawler.js');
crawler.download('4419026');
