var gulp = require('gulp');
var del = require('del');

require('./tasks/modules');
require('./tasks/minify');
require('./tasks/locale');
require('./tasks/archive');
require('./tasks/bump');

// 配布用タスク（直列実行）
gulp.task('dist', gulp.series(
  gulp.parallel('modules', 'locale'),
  'minify'
));

// デフォルトタスク
gulp.task('default', gulp.series('dist'));

// 開発用タスク（並列実行）
gulp.task('dev', gulp.parallel(
  'modules:dev',
  'locale'
));

// 監視タスク（並列実行）
gulp.task('watch', gulp.parallel(
  'modules:watch',
  'locale:watch'
));

// リリースタスク（直列実行）
gulp.task('release', gulp.series(
  'dist',
  'archive'
));

// クリーンタスク（直列実行）
gulp.task('clean', gulp.series(
  gulp.parallel(
    'modules:clean',
    'locale:clean',
    'minify:clean',
    'archive:clean'
  ),
  function() {
    return del([
      'dist/',
      'tmp/'
    ]);
  }
));
