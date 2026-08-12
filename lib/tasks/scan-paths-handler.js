/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS201: Simplify complex destructure assignments
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const async = require('async');
const fs = require('fs');
const VariableScanner = require('../variable-scanner');
const VariableExpression = require('../variable-expression');
const ExpressionsRegistry = require('../expressions-registry');

class PathScanner {
  constructor(filePath, scope, registry) {
    this.filePath = filePath;
    this.scanner = new VariableScanner({registry, scope});
  }

  load(done) {
    let currentChunk = '';
    const currentLine = 0;
    const currentOffset = 0;
    let lastIndex = 0;
    let line = 0;
    let results = [];

    const readStream = fs.createReadStream(this.filePath);

    readStream.on('data', chunk => {
      let lastLine, result;
      currentChunk += chunk.toString();

      const index = lastIndex;

      while ((result = this.scanner.search(currentChunk, lastIndex))) {
        result.range[0] += index;
        result.range[1] += index;

        for (var v of result) {
          v.path = this.filePath;
          v.range[0] += index;
          v.range[1] += index;
          v.definitionRange = result.range;
          v.line += line;
          lastLine = v.line;
        }

        results = results.concat(result);
        ({lastIndex} = result);
      }

      if (result != null) {
        currentChunk = currentChunk.slice(lastIndex);
        line = lastLine;
        return lastIndex = 0;
      }
    });

    return readStream.on('end', function() {
      emit('scan-paths:path-scanned', results);
      return done();
    });
  }
}

module.exports = function(...args) {
  let [paths, registry] = Array.from(args[0]);
  registry = ExpressionsRegistry.deserialize(registry, VariableExpression);
  return async.each(
    paths,
    function(...args1) {
      const [p, s] = Array.from(args1[0]), next = args1[1];
      return new PathScanner(p, s, registry).load(next);
    },
    this.async()
  );
};
