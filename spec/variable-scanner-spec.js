const { runs, _waitsFor, waitsForPromise } = require("./helpers/waiters"); /*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const VariableScanner = require("../lib/variable-scanner");
const registry = require("../lib/variable-expressions");
const scopeFromFileName = require("../lib/scope-from-file-name");

describe("VariableScanner", function () {
  let [scanner, editor, text, scope] = Array.from([]);

  const withTextEditor = (fixture, block) =>
    describe(`with ${fixture} buffer`, function () {
      beforeEach(async function () {
        await waitsForPromise(() => lumine.workspace.open(fixture));
        await runs(async function () {
          editor = lumine.workspace.getActiveTextEditor();
          text = editor.getText();
          return (scope = scopeFromFileName(editor.getPath()));
        });
      });

      afterEach(async function () {
        editor = null;
        return (scope = null);
      });

      return block();
    });

  const withScannerForTextEditor = (fixture, block) =>
    withTextEditor(fixture, function () {
      beforeEach(async () => (scanner = new VariableScanner({ registry, scope })));

      afterEach(async () => (scanner = null));

      return block();
    });

  return describe("::search", function () {
    let [result] = Array.from([]);

    withScannerForTextEditor("four-variables.styl", function () {
      beforeEach(async () => (result = scanner.search(text)));

      it("returns the first match", async () => expect(result).toBeDefined());

      describe("the result object", function () {
        it("has a match string", async () => expect(result.match).toEqual("base-color = #fff"));

        it("has a lastIndex property", async () => expect(result.lastIndex).toEqual(17));

        it("has a range property", async () => expect(result.range).toEqual([0, 17]));

        return it("has a variable result", async function () {
          expect(result[0].name).toEqual("base-color");
          expect(result[0].value).toEqual("#fff");
          expect(result[0].range).toEqual([0, 17]);
          return expect(result[0].line).toEqual(0);
        });
      });

      describe("the second result object", function () {
        beforeEach(async () => (result = scanner.search(text, result.lastIndex)));

        it("has a match string", async () =>
          expect(result.match).toEqual("other-color = transparentize(base-color, 50%)"));

        it("has a lastIndex property", async () => expect(result.lastIndex).toEqual(64));

        it("has a range property", async () => expect(result.range).toEqual([19, 64]));

        return it("has a variable result", async function () {
          expect(result[0].name).toEqual("other-color");
          expect(result[0].value).toEqual("transparentize(base-color, 50%)");
          expect(result[0].range).toEqual([19, 64]);
          return expect(result[0].line).toEqual(2);
        });
      });

      return describe("successive searches", () =>
        it("returns a result for each match and then undefined", async function () {
          const doSearch = () => (result = scanner.search(text, result.lastIndex));

          expect(doSearch()).toBeDefined();
          expect(doSearch()).toBeDefined();
          expect(doSearch()).toBeDefined();
          return expect(doSearch()).toBeUndefined();
        }));
    });

    withScannerForTextEditor("incomplete-stylus-hash.styl", function () {
      beforeEach(async () => (result = scanner.search(text)));

      return it("does not find any variables", async () => expect(result).toBeUndefined());
    });

    withScannerForTextEditor("variables-in-arguments.scss", function () {
      beforeEach(async () => (result = scanner.search(text)));

      return it("does not find any variables", async () => expect(result).toBeUndefined());
    });

    withScannerForTextEditor("attribute-selectors.scss", function () {
      beforeEach(async () => (result = scanner.search(text)));

      return it("does not find any variables", async () => expect(result).toBeUndefined());
    });

    withScannerForTextEditor("variables-in-conditions.scss", function () {
      beforeEach(async function () {
        result = null;
        const doSearch = () =>
          (result = scanner.search(text, result != null ? result.lastIndex : undefined));

        doSearch();
        return doSearch();
      });

      return it("does not find the variable in the if clause", async () =>
        expect(result).toBeUndefined());
    });

    withScannerForTextEditor("variables-after-mixins.scss", function () {
      beforeEach(async function () {
        result = null;
        const doSearch = () =>
          (result = scanner.search(text, result != null ? result.lastIndex : undefined));

        return doSearch();
      });

      return it("finds the variable after the mixin", async () => expect(result).toBeDefined());
    });

    withScannerForTextEditor("variables-from-other-process.less", function () {
      beforeEach(async function () {
        result = null;
        const doSearch = () =>
          (result = scanner.search(text, result != null ? result.lastIndex : undefined));

        return doSearch();
      });

      return it("finds the variable with an interpolation tag", async () =>
        expect(result).toBeDefined());
    });

    return withScannerForTextEditor("crlf.styl", function () {
      beforeEach(async function () {
        result = null;
        const doSearch = () =>
          (result = scanner.search(text, result != null ? result.lastIndex : undefined));

        doSearch();
        return doSearch();
      });

      return it("finds all the variables even with crlf mode", async () =>
        expect(result).toBeDefined());
    });
  });
});
