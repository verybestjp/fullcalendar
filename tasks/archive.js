var gulp = require('gulp');
var rename = require('gulp-rename');
var filter = require('gulp-filter');
var replace = require('gulp-replace');
var zip = require('gulp-zip');
var del = require('del');

// determines the name of the ZIP file
var packageConf = require('../package.json');
var packageId = packageConf.name + '-' + packageConf.version;

// アーカイブファイルを削除
gulp.task('archive:clean', function() {
  return del([
    'tmp/' + packageId + '/',
    'dist/' + packageId + '.zip'
  ]);
});

// 配布用ファイルをアーカイブ
gulp.task('archive:dist', gulp.series(
  gulp.parallel('modules', 'minify'),
  function() {
    return gulp.src('dist/*.{js,css}') // ミニファイされたファイルとされていないファイルにマッチ
      .pipe(gulp.dest('tmp/' + packageId + '/'));
  }
));

// ロケールファイルをアーカイブ
gulp.task('archive:locale', gulp.series('locale', function() {
  return gulp.src([
    'dist/locale-all.js',
    'dist/locale/*.js'
  ], {
    base: 'dist/'
  })
  .pipe(gulp.dest('tmp/' + packageId + '/'));
}));

// その他のファイルをアーカイブ
gulp.task('archive:misc', function() {
  return gulp.src([
    'LICENSE.*',
    'CHANGELOG.*',
    'CONTRIBUTING.*'
  ])
  .pipe(rename({ extname: '.txt' }))
  .pipe(gulp.dest('tmp/' + packageId + '/'));
});

// jQuery UIテーマを転送
gulp.task('archive:jqui:theme', function() {
  return gulp.src([
    'jquery-ui.min.css',
    'images/*'
  ], {
    cwd: 'node_modules/components-jqueryui/themes/cupertino/',
    base: 'node_modules/components-jqueryui/themes/'
  })
  .pipe(gulp.dest('tmp/' + packageId + '/lib/'));
});

// 依存関係ファイルをアーカイブ
gulp.task('archive:deps', gulp.series('archive:jqui:theme', function() {
  return gulp.src([
    'node_modules/moment/min/moment.min.js',
    'node_modules/jquery/dist/jquery.min.js',
    'node_modules/components-jqueryui/jquery-ui.min.js'
  ])
  .pipe(gulp.dest('tmp/' + packageId + '/lib/'));
}));

// デモファイルを転送し、依存関係へのパスを変換
gulp.task('archive:demos', function() {
  return gulp.src('**/*', { cwd: 'demos/', base: 'demos/' })
    .pipe(htmlFileFilter)
    .pipe(demoPathReplace)
    .pipe(htmlFileFilter.restore) // htmlFileFilterにマッチしなかったファイルをパイプスルー
    .pipe(gulp.dest('tmp/' + packageId + '/demos/'));
});

var htmlFileFilter = filter('*.html', { restore: true });
var demoPathReplace = replace(
  /((?:src|href)=['"])([^'"]*)(['"])/g,
  function(m0, m1, m2, m3) {
    return m1 + transformDemoPath(m2) + m3;
  }
);

// アーカイブタスク（直列実行）
gulp.task('archive', gulp.series(
  gulp.parallel(
    'archive:dist',
    'archive:locale',
    'archive:misc',
    'archive:deps',
    'archive:demos'
  ),
  function() {
    // 類似した名前の単一ルートディレクトリでzipを作成
    return gulp.src('tmp/' + packageId + '/**/*', { base: 'tmp/' })
      .pipe(zip(packageId + '.zip'))
      .pipe(gulp.dest('dist/'));
  }
));

function transformDemoPath(path) {
	// reroot 3rd party libs
	path = path.replace('../node_modules/moment/', '../lib/');
	path = path.replace('../node_modules/jquery/dist/', '../lib/');
	path = path.replace('../node_modules/components-jqueryui/themes/cupertino/', '../lib/cupertino/'); // must be first
	path = path.replace('../node_modules/components-jqueryui/', '../lib/');

	// reroot dist files to archive root
	path = path.replace('../dist/', '../');

	if (
		!/\.min\.(js|css)$/.test(path) && // not already minified
		path !== '../locale-all.js' // this file is already minified
	) {
		// use minified
		path = path.replace(/\/([^\/]*)\.(js|css)$/, '/$1.min.$2');
	}

	return path;
}
