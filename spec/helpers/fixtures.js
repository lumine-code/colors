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
      json = json.replace(/#\{([\w[\]]+)\}/g, function (m, w) {
        let value;
        let match;
        if ((match = /^\[(\w+)\]$/.exec(w))) {
          let _;
          [_, w] = Array.from(match);
          value = data[w].shift();
        } else {
          value = data[w];
        }

        // The substitution lands inside a JSON string literal, so it has to be
        // escaped. On Windows every one of these is a path, and its separators
        // were being written in raw -- `C:\Users` is not valid JSON, and the
        // parse failed before a single assertion ran.
        if (typeof value !== "string") return String(value);
        return JSON.stringify(value).slice(1, -1);
      });

      return JSON.parse(json);
    };
  },
};
