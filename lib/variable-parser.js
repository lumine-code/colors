
let VariableParser;
module.exports =
(VariableParser = class VariableParser {
  constructor(registry) {
    this.registry = registry;
  }
  parse(expression) {
    for (var e of this.registry.getExpressions()) {
      if (e.match(expression)) { return e.parse(expression); }
    }

  }
});
