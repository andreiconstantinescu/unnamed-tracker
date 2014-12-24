'use strict';

var config = require('./_config');
var paths = config.paths;
var $ = config.plugins;

var _ = require('lodash');
var when = require('when');
var nodefn = require('when/node');

var path = require('path');
var fs = require('fs-extra');

var gulp = require('gulp');
var source = require('vinyl-source-stream');
var wiredep = require('wiredep');

var penthouse = require('penthouse');
var templatizer = require('templatizer');
var mainBowerFiles = require('main-bower-files');
var browserSync = require('browser-sync');
var useref = require('node-useref');
var StreamQueue = require('streamqueue');

var browserify = require('browserify');
var watchify = require('watchify');
var istanbul = require('browserify-istanbul');
var debowerify = require('debowerify');
var deamdify = require('deamdify');
var aliasify = require('aliasify');
var filterTransform = require('filter-transform');

// Generate JS functions from JADE templates
gulp.task('templates', function () {
  var templates = templatizer(paths.client + '/templates', null, {});
  return nodefn.call(fs.mkdirp, paths.client + '/js/lib').then(function () {
    return nodefn.call(fs.writeFile, paths.client + '/js/lib/templates', templates);
  });
});

// Bundle Bower components into a single file
gulp.task('js:bower', function () {
  var packages = {};

  _.each(mainBowerFiles({
    filter: '**/*.js'
  }), function (file) {
    file = path.relative(paths.client + '/bower_components', file);
    packages[file.split('/')[0]] = true;
  });

  var contents = _.map(_.keys(packages), function(pkg) {
    var req = 'require(\'' + pkg + '\');\n';
    var global = config.bower[pkg];
    if (typeof(global) === 'string') {
      global = [global];
    } else if ((typeof(global) !== 'object') || !(global instanceof Array)) {
      global = [];
    }

    if (global.length) {
      return 'window.' + global.join(' = window.') + ' = ' + req;
    }
    return req;
  }).join('');

  return nodefn.call(fs.mkdirp, paths.client + '/js/lib').then(function () {
    return nodefn.call(fs.writeFile, paths.client + '/js/lib/bower-components.js', contents);
  });
});

// Build JS dependencies
gulp.task('js:dependencies', ['templates', 'js:bower'], function () {});

function droolJS (options) {
  options = options || {};

  var browserifyOpts = _.extend({
    entries: [paths.client + '/js/main.js'],
    debug: !!options.debug
  }, config.browserify);

  var bundle, stream;

  if (options.incremental && config.shared.incrementalBundle) {
    bundle = config.shared.incrementalBundle;
  } else {
    bundle = browserify(browserifyOpts);

    bundle.transform(aliasify.configure(config.aliasify));
    bundle.transform(debowerify);
    bundle.transform(filterTransform(function (file) {
      return /bower_components/.test(file);
    } ,deamdify));

    if (options.incremental) {
      bundle = watchify(bundle);
      config.shared.incrementalBundle = bundle;
    }
  }

  stream = bundle.bundle();

  if (options.uglify) {
    stream = stream.pipe($.uglify());
  }

  return stream
  .pipe(source(paths.client + '/js/main.js'))
  .pipe($.rename('main.js'));
}
