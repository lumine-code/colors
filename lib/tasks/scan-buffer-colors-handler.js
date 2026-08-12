/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const ColorScanner = require('../color-scanner');
const ColorContext = require('../color-context');
const ColorExpression = require('../color-expression');
const ExpressionsRegistry = require('../expressions-registry');
const ColorsChunkSize = 100;

class BufferColorsScanner {
  constructor(config) {
    let colorVariables, registry, variables;
    ({buffer: this.buffer, variables, colorVariables, bufferPath: this.bufferPath, scope: this.scope, registry} = config);
    registry = ExpressionsRegistry.deserialize(registry, ColorExpression);
    this.context = new ColorContext({variables, colorVariables, referencePath: this.bufferPath, registry});
    this.scanner = new ColorScanner({context: this.context});
    this.results = [];
  }

  scan() {
    let result;
    if (this.bufferPath == null) { return; }
    let lastIndex = 0;
    while ((result = this.scanner.search(this.buffer, this.scope, lastIndex))) {
      this.results.push(result);

      if (this.results.length >= ColorsChunkSize) { this.flushColors(); }
      ({lastIndex} = result);
    }

    return this.flushColors();
  }

  flushColors() {
    emit('scan-buffer:colors-found', this.results);
    return this.results = [];
  }
}

module.exports = config => new BufferColorsScanner(config).scan();
