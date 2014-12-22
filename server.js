var express = require('express');
var scanner = require('./scanner.js').ping('192.168.28.1');

var app = express();

var port = 1337;

app.get('/', function (req, res) {
  res.status(200);
  scanner.then(function (users) {
    res.send(users);
    res.end();
  });
});

app.listen(port, function () {
  console.log('Server running at http://localhost:' + port);
});
