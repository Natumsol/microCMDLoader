define(function(require, exports, module) {
  var hello = require("hello.js");
  module.exports = function() {
    hello();
  }
});
