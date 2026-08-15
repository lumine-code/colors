/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */

var utils = {
  fill(str, length, filler = "0") {
    while (str.length < length) {
      str = filler + str;
    }
    return str;
  },

  strip(str) {
    return str.replace(/\s+/g, "");
  },

  // Variable names and paths reach `new RegExp` as literals, and both can carry
  // characters that are meaningful in a pattern. Escaping only a couple of them
  // is what made a name like `--a[data-theme=dark]` throw on an out-of-order
  // range instead of simply not matching.
  escapeRegExp(str) {
    return String(str).replace(/[-\\^$*+?.()|[\]{}]/g, "\\$&");
  },

  clamp(n) {
    return Math.min(1, Math.max(0, n));
  },

  clampInt(n, max = 100) {
    return Math.min(max, Math.max(0, n));
  },

  insensitive(s) {
    return s
      .split(/(?:)/)
      .map((c) => `(?:${c}|${c.toUpperCase()})`)
      .join("");
  },

  readFloat(value, vars = {}, color) {
    let res = parseFloat(value);
    if (isNaN(res) && vars[value] != null) {
      color.usedVariables.push(value);
      res = parseFloat(vars[value].value);
    }
    return res;
  },

  readInt(value, vars = {}, color, base = 10) {
    let res = parseInt(value, base);
    if (isNaN(res) && vars[value] != null) {
      color.usedVariables.push(value);
      res = parseInt(vars[value].value, base);
    }
    return res;
  },

  countLines(string) {
    return string.split(/\r\n|\r|\n/g).length;
  },

  readIntOrPercent(value, vars = {}, color) {
    let res;
    if (!/\d+/.test(value) && vars[value] != null) {
      color.usedVariables.push(value);
      ({ value } = vars[value]);
    }

    if (value == null) {
      return NaN;
    }

    if (value.indexOf("%") !== -1) {
      res = Math.round(parseFloat(value) * 2.55);
    } else {
      res = parseInt(value);
    }

    return res;
  },

  readFloatOrPercent(amount, vars = {}, color) {
    let res;
    if (!/\d+/.test(amount) && vars[amount] != null) {
      color.usedVariables.push(amount);
      amount = vars[amount].value;
    }

    if (amount == null) {
      return NaN;
    }

    if (amount.indexOf("%") !== -1) {
      res = parseFloat(amount) / 100;
    } else {
      res = parseFloat(amount);
    }

    return res;
  },

  findClosingIndex(s, startIndex = 0, openingChar = "[", closingChar = "]") {
    let index = startIndex;
    let nests = 1;

    while (nests && index < s.length) {
      var curStr = s.substr(index++, 1);

      if (curStr === closingChar) {
        nests--;
      } else if (curStr === openingChar) {
        nests++;
      }
    }

    if (nests === 0) {
      return index - 1;
    } else {
      return -1;
    }
  },

  split(s, sep = ",") {
    const a = [];
    const l = s.length;
    let i = 0;
    let start = 0;
    let previousStart = start;
    //;
    whileLoop: while (i < l) {
      var c = s.substr(i, 1);

      switch (c) {
        case "(":
          i = utils.findClosingIndex(s, i + 1, c, ")");
          if (i === -1) {
            break whileLoop;
          }
          break;
        // A parser regexp will end with the last ), so sequences like (...)(...)
        // will end after the second parenthesis pair, by mathing ) we prevent
        // an infinite loop when splitting the string.
        case ")":
          break whileLoop;
        case "[":
          i = utils.findClosingIndex(s, i + 1, c, "]");
          if (i === -1) {
            break whileLoop;
          }
          break;
        case "":
          i = utils.findClosingIndex(s, i + 1, c, "");
          if (i === -1) {
            break whileLoop;
          }
          break;
        case sep:
          a.push(utils.strip(s.substr(start, i - start)));
          start = i + 1;
          if (previousStart === start) {
            break whileLoop;
          }
          previousStart = start;
          break;
      }

      i++;
    }

    a.push(utils.strip(s.substr(start, i - start)));
    return a.filter((s) => s != null && s.length);
  },
};

module.exports = utils;
