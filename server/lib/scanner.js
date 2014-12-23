'use strict';

var ping = require('ping');
var dns = require('dns');
var when = require('when');
var nodefn = require('when/node');
var online = [];

function reverseLookup(ip) {
  return nodefn.call(dns.reverse, ip);
}

function testIp(ip) {
  return when.promise(function (resolve, reject) {
    ping.sys.probe(ip, function (online) {
      resolve(online);
    });
  });
}

function foreachIpIn(network, cb2) {
  var n = [network];
  var current;
  var ip = n[0].split(".").map(function (ip) {
    return parseInt(ip, 10);
  });

  for (var i = 2; i <= 254; i++) {
    current = ip;
    current[3] = i;
    // console.log(current.join("."));
    cb2(current.join("."));
  }
}

module.exports = {
  ping: function(network) {
    var p = [];
    foreachIpIn(network, function (ip) {
      p.push(testIp(ip).then(function (exists) {
        if (exists) {
          var name = 'unnamed';
          return reverseLookup(ip).then(function (domain) {
            name = domain;
          }).finally(function () {
            online.push({
              "ip": ip,
              "name": name.toString(),
            });
          });
        }
      }));
    });

    return when.all(p).then(function () {
      return online;
    });
  }
};
