#!/usr/bin/env node

var express = require('express');
var scanner = require('./lib/scanner').ping(process.env.NETWORK);
var tracker = require('./lib/tracker');
var clients = require('./lib/clients');
var _ = require('lodash');

var app = express();

// Whatever you do, make sure you adjust your port according to process.env.PORT
// Ayen requires this for BrowserSync proxying and Critical CSS
var port = parseInt(process.env.PORT, 10) || 4000;

app.use(express.static(__dirname + '/../public'));

app.get('/api/1.0/local', function (request, response) {
  response.status(200);
  scanner.then(function (users) {
    response.send(users);
    _.each(users, function (user) {
      console.log(user);
    });
  }).finally(function () {
    response.end();
  });

});

function findClient(id) {
  return _.findKey(clients, {'togglId': id.toString()});
}

function convertDuration(seconds) {
  var hours   = Math.floor(seconds / 3600);
  var minutes = Math.floor((seconds - (hours * 3600)) / 60);
  seconds = seconds - (hours * 3600) - (minutes * 60);

  hours = hours   < 10 ? "0" + hours : hours;
  minutes = minutes < 10 ? "0" + minutes : minutes;
  seconds = seconds < 10 ? "0" + seconds : seconds;

  var time = hours + ':' + minutes + ':' + seconds;
  return time;
}

app.get('/api/1.0/current', function (request, response) {
  tracker.getData().then(function (data) {
    response.status(200);
    var temp = JSON.parse(data);
  _.each(temp, function(chunk) {
    _.each(chunk, function (entry) {
      entry.current = false;
      entry.user_id = findClient(entry.user_id);
      if (entry.duration < 0) {
        var now = Math.floor(new Date().getTime() / 1000);
        var then = Math.abs(entry.duration);
        entry.duration = now - then;
        entry.current = true;
      }
      entry.duration = convertDuration(entry.duration);
    });
  });
    response.send(temp);
  }, function (err) {
    response.status(500);
    response.send(err.message);
  }).finally(function() {
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
