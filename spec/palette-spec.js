/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
require("./helpers/matchers");

const Color = require("../lib/color");
const Palette = require("../lib/palette");

describe("Palette", function () {
  let [palette, colors] = Array.from([]);

  const createVar = (name, color, path, line) => ({
    name,
    color,
    path,
    line,
  });

  beforeEach(function () {
    colors = [
      createVar("red", new Color("#ff0000"), "file.styl", 0),
      createVar("green", new Color("#00ff00"), "file.styl", 1),
      createVar("blue", new Color("#0000ff"), "file.styl", 2),
      createVar("redCopy", new Color("#ff0000"), "file.styl", 3),
      createVar("red", new Color("#ff0000"), "file2.styl", 0),
    ];
    return (palette = new Palette(colors));
  });

  describe("::getColorsCount", () =>
    it("returns the number of colors in the palette", () =>
      expect(palette.getColorsCount()).toEqual(5)));

  describe("::getColorsNames", () =>
    it("returns the names of the colors in the palette", () =>
      expect(palette.getColorsNames()).toEqual(["red", "green", "blue", "redCopy", "red"])));

  describe("::sortedByName", () =>
    it("returns the colors and names sorted by name", () =>
      expect(palette.sortedByName()).toEqual([
        colors[2],
        colors[1],
        colors[0],
        colors[4],
        colors[3],
      ])));

  return describe("::sortedByColor", () =>
    it("returns the colors and names sorted by colors", () =>
      expect(palette.sortedByColor()).toEqual([
        colors[0],
        colors[3],
        colors[4],
        colors[1],
        colors[2],
      ])));
});
