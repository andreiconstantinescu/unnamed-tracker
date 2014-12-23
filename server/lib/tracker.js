'use strict';

var https = require('https');
var request = require('request-promise');
var fs = require('fs');
var when = require('when');

var auth = [process.env.AUTH_USER, process.env.AUTH_PASS].join(':');

var options = {
  hostname: process.env.TRACK_HOSTNAME,
  auth: auth,
  rejectUnauthorized: false
};

module.exports = {
  getUsers: function () {
    var uri = 'https://'.concat(process.env.TRACK_HOSTNAME, process.env.TRACK_WORKSPACES, process.env.TRACK_TEAM, '/workspace_users');
    var params = {
      'uri': uri.toString(),
      'method': 'GET',
      'auth': {
        'user': process.env.AUTH_USER,
        'pass': process.env.AUTH_PASS,
      },
      'strictSSL': false,
    };

    console.log(uri)
    // options.path = process.env.TRACK_WORKSPACES.concat(process.env.TRACK_TEAM, '/workspace_users');
    return request(params).catch(function (err) {
      throw err.error;
    });
  },
  getData: function () {
    options.path = process.env.TRACK_DASHBOARD.concat(process.env.TRACK_TEAM);
    return when.promise(function (resolve, reject) {
      var req = https.request(options, function(res) {
        res.setEncoding('utf8');

        var data;

        res.on('error', function (e) {
          reject(e);
        });

        res.on('data', function (chunk) {
          data = chunk;
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
