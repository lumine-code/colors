const fs = require("fs/promises");
const VariableScanner = require("./variable-scanner");

// Scans project files for variable definitions.
//
// This used to run in a forked Task, which meant the expression registry had to
// cross a process boundary: it was serialized by calling `toString()` on every
// handler and rebuilt in the child with `vm.runInNewContext(source, {console,
// require})`. Every built-in handler closes over module scope, so any that
// reached for a helper hit a ReferenceError the moment it ran, and expressions
// contributed by other packages through the services could not be carried over
// at all. Scanning here keeps the registry as the live object it already is.

async function scanPath(filePath, scope, registry) {
  let text;
  try {
    text = await fs.readFile(filePath, "utf8");
  } catch {
    // A file that vanished or cannot be read between listing and scanning is
    // not an error worth surfacing; it simply contributes no variables.
    return [];
  }

  const scanner = new VariableScanner({ registry, scope });
  const results = [];
  let lastIndex = 0;
  let batch;

  // The scanner reports offsets against the text it is given, and it is given
  // the whole file, so nothing has to be re-based. The streaming version had to
  // add a running offset to every range and line, and rebuild a partial chunk
  // across reads.
  while ((batch = scanner.search(text, lastIndex))) {
    for (const variable of batch) {
      variable.path = filePath;
      variable.definitionRange = batch.range;
    }
    results.push(...batch);
    ({ lastIndex } = batch);
  }

  return results;
}

class PathsScanner {
  constructor() {
    this.aborted = false;
  }

  // `entries` is a list of `[filePath, scope]` pairs, matching what the project
  // already builds for the old task.
  async scan(entries, registry, { onScanned } = {}) {
    this.aborted = false;
    const results = [];

    for (const [filePath, scope] of entries) {
      if (this.aborted) break;
      const scanned = await scanPath(filePath, scope, registry);
      if (scanned.length === 0) continue;
      results.push(...scanned);
      onScanned?.(scanned);
    }

    return results;
  }

  // Replaces `terminateRunningTask`. There is no child to kill any more, so the
  // in-flight loop is simply told to stop at the next file.
  terminateRunningTask() {
    this.aborted = true;
  }
}

module.exports = new PathsScanner();
module.exports.PathsScanner = PathsScanner;
module.exports.scanPath = scanPath;
