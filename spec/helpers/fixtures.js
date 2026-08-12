/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const fs = require("fs");
const path = require("path");

module.exports = {
  jsonFixture(...paths) {
    return function (fixture, data) {
      const jsonPath = path.resolve(...Array.from(paths), fixture);
      let json = fs.readFileSync(jsonPath).toString();
      json = json.replace(/#\{([\w\[\]]+)\}/g, function (m, w) {
        let match;
        if ((match = /^\[(\w+)\]$/.exec(w))) {
          let _;
          [_, w] = Array.from(match);
          return data[w].shift();
        } else {
          return data[w];
        }
      });

      return JSON.parse(json);
    };
  },
};
