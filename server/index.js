#!/usr/bin/env node

var express = require('express');
var scanner = require('./lib/scanner').ping(process.env.NETWORK);
var tracker = require('./lib/tracker');

var app = express();

// Whatever you do, make sure you adjust your port according to process.env.PORT
// Ayen requires this for BrowserSync proxying and Critical CSS
var port = parseInt(process.env.PORT, 10) || 4000;

app.use(express.static(__dirname + '/../public'));

app.get('/', function (request, response) {
  response.status(200);
  scanner.then(function (users) {
    response.send(users);
    response.end();
  });
});

app.get('/api/1.0/current', function (request, response) {
  tracker.getData().then(function (data) {
    response.status(200);
    response.send(data);
    response.end();
  }, function (err) {
    response.status(500);
    response.send(err.message);
    response.end();
  });
});

app.get('/api/1.0/users', function (request, response) {
  tracker.getUsers().then(function (data) {
    response.status(200);
    response.send(data);
    response.end();
  }).catch(function (err) {
    response.status(500);
    response.send(err.message);
    response.end();
  });
});

app.get('/api/1.0/projects', function (request, response) {
  tracker.getProjects().then(function (data) {
    response.status(200);
    response.send(data);
    response.end();
  }).catch(function (err) {
    response.status(500);
    response.send(err.message);
    response.end();
  });
});

if (app.get('env') === 'development') {
  app.use(require('errorhandler')());
}

app.listen(port);
console.log('Server running at http://localhost:' + port);

// Ayen needs to wait for your server to start before firing up BrowserSync.
// This line gives it the cue, but the wait times out after 4 seconds if the
// cue doesn't show up and BrowserSync is fired up anyway.
if (process.send) { process.send('serverStarted'); }
