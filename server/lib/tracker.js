'use strict';

var https = require('https');
var fs = require('fs');
var when = require('when');

var auth = [process.env.AUTH_USER, process.env.AUTH_PASS].join(':');
var path = process.env.TRACK_PATH.concat(process.env.TRACK_TEAM);

var options = {
  hostname: process.env.TRACK_HOSTNAME,
  path: path,
  auth: auth,
  rejectUnauthorized: false
};

module.exports = {
  getData: function () {
    return when.promise(function (resolve, reject) {
      var req = https.request(options, function(res) {
        res.setEncoding('utf8');

        var data;

        res.on('error', function (e) {
          reject(e);
        });

        res.on('data', function (chunk) {
          data = chunk;
          // data.push(chunk.toString());
        });

        res.on('end', function () {
          resolve(data);
        });
      });

      req.on('error', function(e) {
        reject(e);
      });
      req.end();
    });
  }
};
