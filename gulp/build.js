'use strict';

var config = require('./lib/_config');
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

// var penthouse = require('penthouse');
var templatizer = require('templatizer');
var mainBowerFiles = require('main-bower-files');
var browserSync = require('browser-sync');
var useref = require('node-useref');
var StreamQueue = require('streamqueue');
var penthouse = require('penthouse');

var browserify = require('browserify');
var watchify = require('watchify');
var debowerify = require('debowerify');
var deamdify = require('deamdify');
var aliasify = require('aliasify');
var filterTransform = require('filter-transform');
var resolveUseref = require('./lib/resolve-useref');

var express = require('express');
var makeSymlink = require('./common/make-symlink');

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
gulp.task('js:deps', ['templates', 'js:bower'], function () {});

// This function takes some options (from other gulptasks) and applies them on the stream before generating the main.js file needed for the rest of the tasks
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

// Generate js bundle incrementally with browserify
gulp.task('js', ['js:deps'], function () {
  return droolJS({
    debug: true,
    incremental: true,
  }).pipe(gulp.dest(paths.public + '/js/'))
  .pipe(browserSync.reload({stream: true}));
});

// Generate js bundle incrementally with browserify for watch.
gulp.task('js:no-deps', function () {
  return droolJS({
    debug: true,
    incremental: true,
  }).pipe(gulp.dest(paths.public + '/js/'))
  .pipe(browserSync.reload({stream: true}));
});

function droolHTML() {
  return gulp.src(path.join(paths.client, 'index.jade'))
    .pipe($.jade({
      pretty: true
    }))
    .pipe(wiredep());
}

// Generate index.html for development
gulp.task('index', function () {
  return droolHTML()
  .pipe(gulp.dest(paths.public))
  .pipe(browserSync.reload({
    stream: true
  }));
});

// Generate index.html for production
gulp.task('index:dist', ['js:deps'], function () {
  return droolHTML()
  .pipe($.tap(function (file) {
    var res = useref(file.contents.toString());
    file.contents = new Buffer(res[0]);
    // Needed to build the JS and the CSS
    config.shared.refSpec = res[1];
  }))
  .pipe($.minifyHtml())
  .pipe(gulp.dest(paths.public));
});


function droolCSS() {
  return gulp.src(paths.join(paths.client, 'css/main.styl'))
    .pipe($.expectFile({ errorOnFailure: true, silent: true }, '**/*.styl'))
    .pipe($.stylus(config.stylus))
    .pipe($.autoprefixer(config.autoprefixer));
}

// Generate development-css
gulp.task('css', function () {
  return droolCSS()
    .pipe(gulp.dest(path.join(paths.public, 'css')))
    .pipe(browserSync.reload({stream: true}));
});

// Generate production-css
gulp.task('css:dist', ['index:dist'], function () {
  //Needed to generate critical CSS
  config.shared.mainCssPath = path.normalize('css/main.css');
  return resolveUseref(droolCSS(), config.shared.refSpec.css, 'css/main.css')
    .pipe($.minifyCss())
    .pipe(gulp.dest(paths.public));
});

// Generate critical CSS
gulp.task('css:critical', ['build:dist:base'], function (done) {
  var app = express();
  var port = 8765;

  app.use(express.static(paths.public));

  app.get('*', function (request, response) {
    response.sendFile(path.resolve(paths.public, 'index.html'));
  });

  var server = app.listen(port, function () {
    penthouse({
      url: 'http://localhost:' + port,
      css: path.join(paths.public, config.shared.mainCssPath),
      width: 1440,
      height: 900
    }, function (error, critical) {
      config.shared.criticalCSS = critical;
      $.util.log('Critical CSS size: ' + critical.length + ' bytes.');
      server.close();
      done();
    });
  });
});

gulp.task('css:critical:replace', ['css:critical'], function () {
  return gulp.src(path.join(paths.public + 'index.html'))
  .pipe($.replace(
    '<link rel=stylesheet href=' + config.shared.mainCssPath + '>',
    '<style>' + config.shared.criticalCSS + '</style>'
  ))
  .pipe(gulp.dest(paths.public));
});


// When doing a minimal build, just symlink the bower components folder
gulp.task('bower-components:assets:link', ['mkdirp'], function () {
  return makeSymlink(paths.client + '/bower_components', paths.public + '/bower_components');
});

// When doing a full build, extract just the necessary files (currently just fonts)
gulp.task('bower-components:assets:copy', function () {
  return gulp.src(mainBowerFiles({
    filter: '**/*.{eot,svg,ttf,woff}'
  }))
  .pipe($.tap(function(file) {
    var relPath = path.relative(path.resolve(paths.client), file.path);
    var match = /bower_components\/[^\/]*/.exec(relPath);
    if (match) {
      file.base = path.resolve(paths.client, match[0]);
    }
  }))
  .pipe(gulp.dest(paths.public));
});


gulp.task('mkdirp', function () {
  return nodefn.call(fs.mkdirp, paths.public);
});

function forEachAsset(cb) {
  var assetsPath = paths.client + '/assets';
  return nodefn.call(fs.readdir, assetsPath).then(function (files) {
    return when.all(_.map(files, function (file) {
      // Ignore dotfiles
      if (/^\./.test(file)) {
        return null;
      }
      return cb(file);
    }));
  });
}

// When doing a minimal build, just symlink all the assets
gulp.task('assets:link', ['mkdirp'], function () {
  return forEachAsset(function (file) {
    return makeSymlink(paths.client + '/assets/' + file, paths.public + '/' + file);
  });
});

// When doing a full build, remove the symlinks and copy them in full
gulp.task('assets:clean', function () {
  return forEachAsset(function (file) {
    return nodefn.call(fs.rmrf, paths.public + '/' + file);
  });
});

gulp.task('assets:copy', ['assets:clean'], function () {
  return gulp.src(paths.client + '/assets/**')
  .pipe(gulp.dest(paths.public));
});


// Minimal development build.
gulp.task('build', ['index', 'js', 'css', 'bower-components:assets:link', 'assets:link']);

// Production build before critical CSS.
gulp.task('build:dist:base', ['index:dist', 'js:dist', 'css:dist', 'bower-components:assets:copy', 'assets:copy']);

// Final production build
gulp.task('build:dist', ['css:critical:replace']);
