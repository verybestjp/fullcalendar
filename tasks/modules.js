var gulp = require('gulp');
var plumber = require('gulp-plumber');
var concat = require('gulp-concat');
var template = require('gulp-template');
var sourcemaps = require('gulp-sourcemaps');
var del = require('del');
var _ = require('lodash');

// project configs
var packageConf = require('../package.json');
var srcConf = require('../src.json');

// distFile:srcFiles のマップをループ
_.forEach(srcConf, function(srcFiles, distFile) {
  var isJs = /\.js$/.test(distFile);
  var separator = isJs ? '\n;;\n' : '\n\n'; // 結合されたファイル間に挿入

  // 本番用ビルドタスク
  gulp.task('modules:' + distFile, function() {
    return gulp.src(srcFiles, { cwd: 'src/', base: 'src/' })
      .pipe(plumber()) // 将来のストリームに影響
      .pipe(concat(distFile, { newLine: separator }))
      .pipe(template(packageConf)) // <%= %> 変数を置換
      .pipe(gulp.dest('dist/'));
  });

  // 開発用ビルドタスク（ソースマップ付き）
  gulp.task('modules:dev:' + distFile, function() {
    return gulp.src(srcFiles, { cwd: 'src/', base: 'src/' })
      .pipe(plumber()) // 将来のストリームに影響
      .pipe(sourcemaps.init())
      .pipe(concat(distFile, { newLine: separator }))
      .pipe(template(packageConf)) // <%= %> 変数を置換
      .pipe(sourcemaps.write('.', {
        includeContent: false, // srcファイルを参照するため
        sourceRoot: '../src/' // dist内の出力ファイルからの相対パス
      }))
      .pipe(gulp.dest('dist/'));
  });

  // 監視タスク（開発用ファイルを生成してから監視開始）
  gulp.task('modules:watch:' + distFile, gulp.series(
    'modules:dev:' + distFile,
    function() {
      return gulp.watch(srcFiles, { cwd: 'src/' }, gulp.series('modules:dev:' + distFile));
    }
  ));
});

// モジュールタスク（並列実行）
gulp.task('modules', gulp.parallel(
  _.map(srcConf, function(srcFiles, distFile) {
    return 'modules:' + distFile; // generates an array of task names
  })
));

// 開発用モジュールタスク（並列実行）
gulp.task('modules:dev', gulp.parallel(
  _.map(srcConf, function(srcFiles, distFile) {
    return 'modules:dev:' + distFile; // generates an array of task names
  })
));

// 監視用モジュールタスク（並列実行）
gulp.task('modules:watch', gulp.parallel(
  _.map(srcConf, function(srcFiles, distFile) {
    return 'modules:watch:' + distFile; // generates an array of task names
  })
));

// 生成されたjs/cssファイルを削除
gulp.task('modules:clean', function() {
  return del('dist/*.{js,css,map}');
});

