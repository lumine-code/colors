const ColorContext = require("../lib/color-context");
const DVIPnames = require("../lib/dvipnames");
const registry = require("../lib/color-expressions");

// The `colors:latex_predefined_dvipnames` expression looks its names up on the
// context. Its table was lost in the CoffeeScript conversion while the
// expression survived, so every one of these threw on lookup -- and because the
// scanner runs as the package activates, that took the whole package down.
describe("DVIP names", function () {
  it("puts the table on the color context", function () {
    const context = new ColorContext({ registry });

    expect(context.DVIPnames).toBeDefined();
    expect(context.DVIPnames.Gray).toEqual("#949698");
  });

  it("parses every name the expression matches", function () {
    const context = new ColorContext({ registry });
    const names = Object.keys(DVIPnames);

    // The expression is scoped to tex, so the names only resolve in that scope.
    expect(names.length).toBeGreaterThan(0);

    for (const name of names) {
      const color = context.readColor(`{${name}}`, "tex");

      expect(color).toBeDefined();
      expect(color.isValid()).toBeTruthy();
      expect(`#${color.hex}`.toLowerCase()).toEqual(DVIPnames[name].toLowerCase());
    }
  });
});
