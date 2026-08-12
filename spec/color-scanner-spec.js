const { runs, waitsFor, waitsForPromise } = require("./helpers/waiters"); /*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const ColorScanner = require("../lib/color-scanner");
const ColorContext = require("../lib/color-context");
const registry = require("../lib/color-expressions");

describe("ColorScanner", function () {
  let [scanner, editor, text, result, lastIndex] = Array.from([]);

  const withScannerForString = (string, block) =>
    describe(`with '${string.replace(/#/g, "+")}'`, function () {
      beforeEach(async function () {
        text = string;
        const context = new ColorContext({ registry });
        return (scanner = new ColorScanner({ context }));
      });

      afterEach(async () => (scanner = null));

      return block();
    });

  const withTextEditor = (fixture, block) =>
    describe(`with ${fixture} buffer`, function () {
      beforeEach(async function () {
        await waitsForPromise(() => lumine.workspace.open(fixture));
        await runs(async function () {
          editor = lumine.workspace.getActiveTextEditor();
          return (text = editor.getText());
        });
      });

      afterEach(async () => (editor = null));

      return block();
    });

  const withScannerForTextEditor = (fixture, block) =>
    withTextEditor(fixture, function () {
      beforeEach(async function () {
        const context = new ColorContext({ registry });
        return (scanner = new ColorScanner({ context }));
      });

      afterEach(async () => (scanner = null));

      return block();
    });

  return describe("::search", function () {
    withScannerForTextEditor("html-entities.html", function () {
      beforeEach(async () => (result = scanner.search(text, "html")));

      return it("returns nothing", async () => expect(result).toBeUndefined());
    });

    withScannerForTextEditor("css-color-with-prefix.less", function () {
      beforeEach(async () => (result = scanner.search(text, "less")));

      return it("returns nothing", async () => expect(result).toBeUndefined());
    });

    withScannerForTextEditor("four-variables.styl", function () {
      beforeEach(async () => (result = scanner.search(text, "styl")));

      it("returns the first buffer color match", async () => expect(result).toBeDefined());

      describe("the resulting buffer color", function () {
        it("has a text range", async () => expect(result.range).toEqual([13, 17]));

        it("has a color", async () => expect(result.color).toBeColor("#ffffff"));

        it("stores the matched text", async () => expect(result.match).toEqual("#fff"));

        it("stores the last index", async () => expect(result.lastIndex).toEqual(17));

        return it("stores match line", async () => expect(result.line).toEqual(0));
      });

      return describe("successive searches", function () {
        it("returns a buffer color for each match and then undefined", async function () {
          const doSearch = () => (result = scanner.search(text, "styl", result.lastIndex));

          expect(doSearch()).toBeDefined();
          expect(doSearch()).toBeDefined();
          expect(doSearch()).toBeDefined();
          return expect(doSearch()).toBeUndefined();
        });

        return it("stores the line of successive matches", async function () {
          const doSearch = () => (result = scanner.search(text, "styl", result.lastIndex));

          expect(doSearch().line).toEqual(2);
          expect(doSearch().line).toEqual(4);
          return expect(doSearch().line).toEqual(6);
        });
      });
    });

    withScannerForTextEditor("class-after-color.sass", function () {
      beforeEach(async () => (result = scanner.search(text, "sass")));

      it("returns the first buffer color match", async () => expect(result).toBeDefined());

      return describe("the resulting buffer color", function () {
        it("has a text range", async () => expect(result.range).toEqual([15, 20]));

        return it("has a color", async () => expect(result.color).toBeColor("#ffffff"));
      });
    });

    withScannerForTextEditor("project/styles/variables.styl", function () {
      beforeEach(async () => (result = scanner.search(text, "styl")));

      it("returns the first buffer color match", async () => expect(result).toBeDefined());

      return describe("the resulting buffer color", function () {
        it("has a text range", async () => expect(result.range).toEqual([18, 25]));

        return it("has a color", async () => expect(result.color).toBeColor("#BF616A"));
      });
    });

    withScannerForTextEditor("crlf.styl", function () {
      beforeEach(async () => (result = scanner.search(text, "styl")));

      it("returns the first buffer color match", async () => expect(result).toBeDefined());

      describe("the resulting buffer color", function () {
        it("has a text range", async () => expect(result.range).toEqual([7, 11]));

        return it("has a color", async () => expect(result.color).toBeColor("#ffffff"));
      });

      return it("finds the second color", async function () {
        const doSearch = () => (result = scanner.search(text, "styl", result.lastIndex));

        doSearch();

        return expect(result.color).toBeDefined();
      });
    });

    withScannerForTextEditor("color-in-tag-content.html", () =>
      it("finds both colors", async function () {
        result = { lastIndex: 0 };
        const doSearch = () => (result = scanner.search(text, "css", result.lastIndex));

        expect(doSearch()).toBeDefined();
        expect(doSearch()).toBeDefined();
        return expect(doSearch()).toBeUndefined();
      }),
    );

    withScannerForString("#add-something {}, #acedbe-foo {}, #acedbeef-foo {}", () =>
      it("does not find any matches", async function () {
        result = { lastIndex: 0 };
        const doSearch = () => (result = scanner.search(text, "css", result.lastIndex));

        return expect(doSearch()).toBeUndefined();
      }),
    );

    return withScannerForString("#add_something {}, #acedbe_foo {}, #acedbeef_foo {}", () =>
      it("does not find any matches", async function () {
        result = { lastIndex: 0 };
        const doSearch = () => (result = scanner.search(text, "css", result.lastIndex));

        return expect(doSearch()).toBeUndefined();
      }),
    );
  });
});
