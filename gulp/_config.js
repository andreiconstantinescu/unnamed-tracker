'use strict';

var path = require('path');

var config = module.exports = {};
config.plugins = require('gulp-load-plugins')();

config.paths = {
  'public': './public',
  'client': './client',
  'server': './server'
};

config.browserify = {

};

config.bower = {
  'jquery': ['$', 'jQuery']
};

config.aliasify = {
  configDir: path.resolve(config.paths.client + '/js/'),
  aliases: {
    'bower_components': './lib/bower-components',
    'templates': './lib/templates'
  }
};

config.stylus = {
  'include css': true,
  'resolve url': true
};

config.autoprefixer = [
'ie >= 8',
'ie_mob >= 9',
'ff >= 30',
'chrome >= 30',
'safari >= 6',
'opera >= 23',
'ios >= 6',
'android >= 2.3',
'bb >= 9'
];
