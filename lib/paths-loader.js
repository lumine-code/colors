/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
let Task = null;

module.exports = {
  startTask(config, callback) {
    if (Task == null) { ({
      Task
    } = require('atom')); }

    const dirtied = [];
    const removed = [];
    const taskPath = require.resolve('./tasks/load-paths-handler');

    const task = Task.once(
      taskPath,
      config,
      () => callback({dirtied, removed}));

    task.on('load-paths:paths-found', paths => dirtied.push(...Array.from(paths || [])));
    task.on('load-paths:paths-lost', paths => removed.push(...Array.from(paths || [])));

    return task;
  }
};
