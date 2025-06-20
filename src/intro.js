/*!
 * <%= title %> v<%= version %>
 * Docs & License: <%= homepage %>
 * (c) <%= copyright %>
 */

(function(factory) {
  // jQueryは外部ファイルから取得、momentは内部から取得
  if (typeof define === 'function' && define.amd) {
    // AMD
    define(['jquery'], function(jquery) {
      var moment = require('moment');
      return factory(jquery, moment);
    });
  } else if (typeof exports === 'object') {
    // CommonJS
    var jquery = require('jquery');
    var moment = require('moment');
    module.exports = factory(jquery, moment);
  } else {
    // ブラウザグローバル
    factory(jQuery, window.moment);
  }
})(function($, moment) {
