'use strict';

var request = require('request-promise');
var fs = require('fs');
var when = require('when');

var options = {
  method: 'GET',
  auth: {
    user: process.env.AUTH_USER,
    pass: process.env.AUTH_PASS,
  },
  strictSSL: false
};

module.exports = {
  getUsers: function () {
    options.uri = process.env.TRACK_URI.concat('workspaces/', process.env.TRACK_TEAM, '/workspace_users');

    return request(options).catch(function (err) {
      throw err.error;
    });
  },
  getData: function () {
    options.uri = process.env.TRACK_URI.concat('dashboard/', process.env.TRACK_TEAM);

    return request(options).catch(function (err) {
      throw err.error;
    });
  }
};
