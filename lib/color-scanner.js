/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
let countLines = null;

module.exports = class ColorScanner {
  constructor({ context } = {}) {
    this.context = context;
    this.parser = this.context.parser;
    this.registry = this.context.registry;
  }

  getRegExp() {
    return new RegExp(this.registry.getRegExp(), "g");
  }

  getRegExpForScope(scope) {
    return new RegExp(this.registry.getRegExpForScope(scope), "g");
  }

  search(text, scope, start = 0) {
    let match;
    if (countLines == null) {
      ({ countLines } = require("./utils"));
    }

    const regexp = this.getRegExpForScope(scope);
    regexp.lastIndex = start;

    if ((match = regexp.exec(text))) {
      let index;
      let [matchText] = Array.from(match);
      let { lastIndex } = regexp;

      const color = this.parser.parse(matchText, scope);

      // return unless color?

      if ((index = matchText.indexOf(color.colorExpression)) > 0) {
        lastIndex += -matchText.length + index + color.colorExpression.length;
        matchText = color.colorExpression;
      }

      return {
        color,
        match: matchText,
        lastIndex,
        range: [lastIndex - matchText.length, lastIndex],
        line: countLines(text.slice(0, +(lastIndex - matchText.length) + 1 || undefined)) - 1,
      };
    }
  }
};
