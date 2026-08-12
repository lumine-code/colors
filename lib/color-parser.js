/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */

let ColorParser;
module.exports = ColorParser = class ColorParser {
  constructor(registry, context) {
    this.registry = registry;
    this.context = context;
  }

  parse(expression, scope = "*", collectVariables = true) {
    if (expression == null || expression === "") {
      return undefined;
    }

    for (var e of this.registry.getExpressionsForScope(scope)) {
      if (e.match(expression)) {
        var res = e.parse(expression, this.context);
        if (collectVariables) {
          res.variables = this.context.readUsedVariables();
        }
        return res;
      }
    }

    return undefined;
  }
};
