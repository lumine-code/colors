/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
let VariableScanner;
let [VariableParser, countLines] = Array.from([]);

module.exports =
(VariableScanner = class VariableScanner {
  constructor(params={}) {
    if (VariableParser == null) { VariableParser = require('./variable-parser'); }

    ({parser: this.parser, registry: this.registry, scope: this.scope} = params);
    if (this.parser == null) { this.parser = new VariableParser(this.registry); }
  }

  getRegExp() {
    return new RegExp(this.registry.getRegExpForScope(this.scope), 'gm');
  }

  search(text, start=0) {
    let match;
    if (this.registry.getExpressionsForScope(this.scope).length === 0) { return; }

    if (countLines == null) { ({
      countLines
    } = require('./utils')); }

    const regexp = this.getRegExp();
    regexp.lastIndex = start;

    while ((match = regexp.exec(text))) {
      var [matchText] = Array.from(match);
      var {index} = match;
      var {lastIndex} = regexp;

      var result = this.parser.parse(matchText);

      if (result != null) {
        result.lastIndex += index;

        if (result.length > 0) {
          result.range[0] += index;
          result.range[1] += index;

          var line = -1;
          var lineCountIndex = 0;

          for (var v of result) {
            v.range[0] += index;
            v.range[1] += index;
            line = (v.line = line + countLines(text.slice(lineCountIndex, +v.range[0] + 1 || undefined)));
            lineCountIndex = v.range[0];
          }

          return result;
        } else {
          regexp.lastIndex = result.lastIndex;
        }
      }
    }

    return undefined;
  }
});
