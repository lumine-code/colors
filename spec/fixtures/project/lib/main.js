/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
module.exports = {
  activate() {
    return console.log('green', '#00ff00');
  },

  deactivate() {
    return console.log('red', '#ff0000', 'text-color');
  }
};
