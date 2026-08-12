/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
let Task = null;

module.exports = {
  startTask(paths, registry, callback) {
    if (Task == null) { ({
      Task
    } = require('atom')); }

    let results = [];
    const taskPath = require.resolve('./tasks/scan-paths-handler');

    this.task = Task.once(
      taskPath,
      [paths, registry.serialize()],
      () => {
        this.task = null;
        return callback(results);
    });

    this.task.on('scan-paths:path-scanned', result => results = results.concat(result));

    return this.task;
  },

  terminateRunningTask() {
    return (this.task != null ? this.task.terminate() : undefined);
  }
};
