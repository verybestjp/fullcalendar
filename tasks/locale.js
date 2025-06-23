var gulp = require('gulp');
var gfile = require('gulp-file'); // for virtual files from string buffers
var gutil = require('gulp-util');
var modify = require('gulp-modify');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var fs = require('fs');
var del = require('del');
var Vinyl = require('vinyl');
var through = require('through2');

// グローバル変数の初期化
var localeData = [];
var skippedLocaleCodes = [];

// ロケールファイルを削除
gulp.task('locale:clean', function() {
  return del([
    'dist/locale-all.js',
    'dist/locale/'
  ]);
});

// グローバル状態変数に個別のロケールコードを投入
gulp.task('locale:each:data', function() {
  localeData = [];
  skippedLocaleCodes = [];

  return gulp.src('node_modules/moment/locale/*.js')
    .pipe(modify({
      fileModifier: function(file, momentContent) {
        var localeCode = file.path.match(/([^\/\\]*)\.js$/)[1];
        var js = getLocaleJs(localeCode, momentContent);

        if (js) {
          insertLocaleData(localeCode, js);
        }
        else {
          skippedLocaleCodes.push(localeCode);
        }

        return ''; // `modify` には文字列の結果が必要
      }
    }));
});

// 結合されたロケールファイルを生成（ミニファイ済み）
gulp.task('locale:all', gulp.series('locale:each:data', function() {
  // localeDataから仮想ファイルストリームを作成
  var stream = through.obj();

  // 各ロケールファイルを個別に処理
  localeData.forEach(function(locale) {
    var file = new Vinyl({
      path: locale.name,
      contents: Buffer.from(locale.source)
    });
    stream.write(file);
  });
  
  stream.end();

  return stream
    .pipe(modify({
      fileModifier: function(file, content) {
        return wrapWithClosure(content);
      }
    }))
    .pipe(concat('locale-all.js'))
    .pipe(modify({
      fileModifier: function(file, content) {
        // ロケールを英語にリセットするコード
        content += '\nmoment.locale("en");';
        content += '\n$.fullCalendar.locale("en");';
        content += '\nif ($.datepicker) $.datepicker.setDefaults($.datepicker.regional[""]);';

        return wrapWithUMD(content);
      }
    }))
    .pipe(uglify())
    .pipe(gulp.dest('dist/'));
}));

// 個別のロケールファイルを生成（ミニファイ済み）
gulp.task('locale:each', gulp.series('locale:each:data', function() {
  // localeDataから仮想ファイルストリームを作成
  var stream = through.obj();

  // 各ロケールファイルを個別に処理
  localeData.forEach(function(locale) {
    var file = new Vinyl({
      path: locale.name,
      contents: Buffer.from(locale.source)
    });
    stream.write(file);
  });
  
  stream.end();

  return stream
    .pipe(modify({
      fileModifier: function(file, content) {
        return wrapWithUMD(content); // 各ロケールファイルには独自のUMDラップが必要
      }
    }))
    .pipe(uglify())
    .pipe(gulp.dest('dist/locale/'));
}));

// ロケールタスク（並列実行後にログ出力）
gulp.task('locale', gulp.series(
  gulp.parallel('locale:each', 'locale:all'),
  function(done) {
    gutil.log(skippedLocaleCodes.length + ' skipped locales: ' + skippedLocaleCodes.join(', '));
    gutil.log(localeData.length + ' generated locales.');
    done();
  }
));

// ロケールファイルの変更を監視し、すべてを再ビルド
gulp.task('locale:watch', gulp.series('locale', function() {
  return gulp.watch('locale/*.js', gulp.series('locale'));
}));

// 以下の関数は変更なし
function insertLocaleData(localeCode, js) {
  var i;

  for (i = 0; i < localeData.length; i++) {
    if (localeCode < localeData[i].name) { // string comparison
      break;
    }
  }

  localeData.splice(i, 0, { // insert at index
    name: localeCode + '.js',
    source: js
  });
}

// 残りの関数は元のまま...
function getLocaleJs(localeCode, momentContent) {
  var shortLocaleCode;
  var momentLocaleJS;
  var datepickerLocaleJS;
  var fullCalendarLocaleJS;

  if (localeCode.indexOf('-') != -1) {
    shortLocaleCode = localeCode.replace(/-.*/, '');
  }

  momentLocaleJS = extractMomentLocaleJS(momentContent);

  datepickerLocaleJS = getDatepickerLocaleJS(localeCode);
  if (!datepickerLocaleJS && shortLocaleCode) {
    datepickerLocaleJS = getDatepickerLocaleJS(shortLocaleCode, localeCode);
  }

  fullCalendarLocaleJS = getFullCalendarLocaleJS(localeCode);
  if (!fullCalendarLocaleJS && shortLocaleCode) {
    fullCalendarLocaleJS = getFullCalendarLocaleJS(shortLocaleCode, localeCode);
  }

  if (momentLocaleJS && (shortLocaleCode == 'en' || (datepickerLocaleJS && fullCalendarLocaleJS))) {
    if (!fullCalendarLocaleJS) {
      fullCalendarLocaleJS = '$.fullCalendar.locale("' + localeCode + '");';
    }

    datepickerLocaleJS = datepickerLocaleJS || '';

    return momentLocaleJS + '\n' +
      datepickerLocaleJS + '\n' +
      fullCalendarLocaleJS;
  }
}

function wrapWithUMD(body) {
  return [
    '(function(factory) {',
    '    if (typeof define === "function" && define.amd) {',
    '        define([ "jquery", "moment" ], factory);',
    '    }',
    '    else if (typeof exports === "object") {',
    '        module.exports = factory(require("jquery"), require("moment"));',
    '    }',
    '    else {',
    '        factory(jQuery, moment);',
    '    }',
    '})(function($, moment) {',
    '',
    body,
    '',
    '});'
  ].join('\n');
}

function wrapWithClosure(body) {
  return [
    '(function() {',
    '',
    body,
    '',
    '})();'
  ].join('\n');
}

function extractMomentLocaleJS(js) {
  js = js.replace(
    /\(\s*function[\S\s]*?function\s*\(\s*moment\s*\)\s*\{([\S\s]*)\}\)\)\)?;?/,
    function(m0, body) {
      return body;
    }
  );

  js = '(function() {\n' + js + '})();\n';
  return js;
}

function getDatepickerLocaleJS(localeCode, targetLocaleCode) {
  var datepickerLocaleCode = localeCode.replace(/\-(\w+)/, function(m0, m1) {
    return '-' + m1.toUpperCase();
  });

  var path = 'node_modules/components-jqueryui/ui/i18n/datepicker-' + datepickerLocaleCode + '.js';
  var js;

  try {
    js = fs.readFileSync(path, { encoding: 'utf8' });
  }
  catch (ex) {
    return false;
  }

  js = js.replace(
    /\(\s*function[\S\s]*?function\s*\(\s*datepicker\s*\)\s*\{([\S\s]*)\}\s*\)\s*\)\s*;?/m,
    function(m0, body) {
      var match = body.match(/datepicker\.regional[\S\s]*?(\{[\S\s]*?\});?/);
      var props = match[1];

      props = props.replace(/^\t/mg, '');

      return "$.fullCalendar.datepickerLocale(" +
        "'" + (targetLocaleCode || localeCode) + "', " +
        "'" + datepickerLocaleCode + "', " +
        props +
        ");";
    }
  );

  return js;
}

function getFullCalendarLocaleJS(localeCode, targetLocaleCode) {
  var path = 'locale/' + localeCode + '.js';
  var js;

  try {
    js = fs.readFileSync(path, { encoding: 'utf8' });
  }
  catch (ex) {
    return false;
  }

  if (targetLocaleCode && targetLocaleCode != localeCode) {
    js = js.replace(
      /\$\.fullCalendar\.locale\(['"]([^'"]*)['"]/,
      '$.fullCalendar.locale("' + targetLocaleCode + '"'
    );
  }

  return js;
}
