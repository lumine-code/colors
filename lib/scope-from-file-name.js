/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const path = require('path');
module.exports = function(p) {
  if (p == null) { return; }
  if (p.match(/\/\.pigments$/)) { return 'pigments'; } else { return path.extname(p).slice(1); }
};
