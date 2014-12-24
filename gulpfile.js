'use strict';

var gulp = require('gulp');
var _ = require('lodash');
var fs = require('fs');

var files = fs.readdirSync('./gulp');
_.each(files, function (file) {
  require('./gulp/' + file);
});

gulp.task('default', ['build']);
