var express = require('express');
var scanner = require('./lib/scanner').ping(process.env.NETWORK);
var tracker = require('./lib/tracker');

var app = express();

var port = process.env.PORT || 1337;

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

app.listen(port, function () {
  console.log('Server running at http://localhost:' + port);
});
