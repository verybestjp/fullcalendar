var gulp = require('gulp');
var uglify = require('gulp-uglify');
var cssmin = require('gulp-cssmin');
var rename = require('gulp-rename');
var del = require('del');

// ミニファイされたファイルを削除
gulp.task('minify:clean', function() {
  return del('dist/*.min.{js,css}');
});

// コアモジュールのJSをミニファイ
gulp.task('minify:js', gulp.series('modules', function() {
  return gulp.src([
    'dist/*.js',
    '!dist/*.min.js', // 二重ミニファイを避ける
    '!dist/locale-all.js' // 既にミニファイ済み
  ])
  .pipe(uglify({
    preserveComments: 'some' // ! で始まるコメントを保持
  }))
  .pipe(rename({ extname: '.min.js' }))
  .pipe(gulp.dest('dist/'));
}));

// コアモジュールのCSSをミニファイ
gulp.task('minify:css', gulp.series('modules', function() {
  return gulp.src([
    'dist/*.css',
    '!dist/*.min.css' // 二重ミニファイを避ける
  ])
  .pipe(cssmin())
  .pipe(rename({ extname: '.min.css' }))
  .pipe(gulp.dest('dist/'));
}));

// ミニファイタスク（並列実行）
gulp.task('minify', gulp.parallel(
  'minify:js',
  'minify:css'
));
