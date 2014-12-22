var express = require('express');
var scanner = require('./scanner.js').ping('192.168.28.1');

var app = express();

var port = 1337;

app.get('/', function (request, response) {
  response.status(200);
  scanner.then(function (users) {
    response.send(users);
    response.end();
  });
});

app.get('/api/1.0/current', function (request, response) {

});

app.listen(port, function () {
  console.log('Server running at http://localhost:' + port);
});
