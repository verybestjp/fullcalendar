/*!
 * <%= title %> v<%= version %>
 * Docs & License: <%= homepage %>
 * (c) <%= copyright %>
 */

(function(factory) {
  // jQueryは外部ファイルから取得
  var moment = require('moment');
  factory(jQuery, moment);
})(function($, moment) {
