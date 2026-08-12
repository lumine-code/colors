/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const VariableScanner = require('../variable-scanner');
const ColorContext = require('../color-context');
const VariableExpression = require('../variable-expression');
const ExpressionsRegistry = require('../expressions-registry');

const VariablesChunkSize = 100;

class BufferVariablesScanner {
  constructor(config) {
    let registry, scope;
    ({buffer: this.buffer, registry, scope} = config);
    registry = ExpressionsRegistry.deserialize(registry, VariableExpression);
    this.scanner = new VariableScanner({registry, scope});
    this.results = [];
  }

  scan() {
    let results;
    let lastIndex = 0;
    while ((results = this.scanner.search(this.buffer, lastIndex))) {
      this.results = this.results.concat(results);

      if (this.results.length >= VariablesChunkSize) { this.flushVariables(); }
      ({lastIndex} = results);
    }

    return this.flushVariables();
  }

  flushVariables() {
    emit('scan-buffer:variables-found', this.results);
    return this.results = [];
  }
}

module.exports = config => new BufferVariablesScanner(config).scan();
