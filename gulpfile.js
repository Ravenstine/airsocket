const gulp       = require('gulp');
const coffee     = require('gulp-coffee');
const browserify = require('browserify'); 
const source     = require('vinyl-source-stream');

gulp.task('coffee-src', function(){
  return gulp.src('./src/*')
    .pipe(coffee({bare: true}))
    .pipe(gulp.dest('./dist/'));
})

gulp.task('coffee-demo-src', function(){
  return gulp.src('./demo/src/*')
    .pipe(coffee({bare: true}))
    .pipe(gulp.dest('demo/dist/'));
})

gulp.task('browserify', ()=>{
  return browserify()
    .require('./dist/airsocket', {expose: 'airsocket'})
    .bundle()
    .pipe(source('airsocket.js'))
    .pipe(gulp.dest('./dist/browser'))
})

gulp.task('build', ['coffee-src', 'browserify', 'coffee-demo-src']);
gulp.task('default', ['test']);