/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const int = '\\d+';
const decimal = `\\.${int}`;
const float = `(?:${int}${decimal}|${int}|${decimal})`;
const percent = `${float}%`;
const variables = '(?:@[a-zA-Z0-9\\-_]+|\\$[a-zA-Z0-9\\-_]+|[a-zA-Z_][a-zA-Z0-9\\-_]*)';
const namePrefixes = '^| |\\t|:|=|,|\\n|\'|"|`|\\(|\\[|\\{|>';

module.exports = {
  int,
  float,
  percent,
  optionalPercent: `${float}%?`,
  intOrPercent: `(?:${percent}|${int})`,
  floatOrPercent: `(?:${percent}|${float})`,
  comma: '\\s*,\\s*',
  notQuote: "[^\"'`\\n\\r]+",
  hexadecimal: '[\\da-fA-F]',
  ps: '\\(\\s*',
  pe: '\\s*\\)',
  variables,
  namePrefixes,
  createVariableRegExpString(variables) {
    let v;
    const variableNamesWithPrefix = [];
    const variableNamesWithoutPrefix = [];
    const withPrefixes = variables.filter(v => !v.noNamePrefix);
    const withoutPrefixes = variables.filter(v => v.noNamePrefix);

    const res = [];

    if (withPrefixes.length > 0) {
      for (v of withPrefixes) {
        variableNamesWithPrefix.push(v.name.replace(/[-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&"));
      }

      res.push(`((?:${namePrefixes})(${variableNamesWithPrefix.join('|')})(\\s+!default)?(?!_|-|\\w|\\d|[ \\t]*[\\.:=]))`);
    }

    if (withoutPrefixes.length > 0) {
      for (v of withoutPrefixes) {
        variableNamesWithoutPrefix.push(v.name.replace(/[-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&"));
      }

      res.push(`(${variableNamesWithoutPrefix.join('|')})`);
    }

    return res.join('|');
  }
};
