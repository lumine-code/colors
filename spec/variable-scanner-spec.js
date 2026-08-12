/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const path = require("path");
const VariableScanner = require("../lib/variable-scanner");
const registry = require("../lib/variable-expressions");
const scopeFromFileName = require("../lib/scope-from-file-name");

describe("VariableScanner", function () {
  let [scanner, editor, text, scope] = Array.from([]);

  const withTextEditor = (fixture, block) =>
    describe(`with ${fixture} buffer`, function () {
      beforeEach(function () {
        waitsForPromise(() => lumine.workspace.open(fixture));
        return runs(function () {
          editor = lumine.workspace.getActiveTextEditor();
          text = editor.getText();
          return (scope = scopeFromFileName(editor.getPath()));
        });
      });

      afterEach(function () {
        editor = null;
        return (scope = null);
      });

      return block();
    });

  const withScannerForTextEditor = (fixture, block) =>
    withTextEditor(fixture, function () {
      beforeEach(() => (scanner = new VariableScanner({ registry, scope })));

      afterEach(() => (scanner = null));

      return block();
    });

  return describe("::search", function () {
    let [result] = Array.from([]);

    withScannerForTextEditor("four-variables.styl", function () {
      beforeEach(() => (result = scanner.search(text)));

      it("returns the first match", () => expect(result).toBeDefined());

      describe("the result object", function () {
        it("has a match string", () => expect(result.match).toEqual("base-color = #fff"));

        it("has a lastIndex property", () => expect(result.lastIndex).toEqual(17));

        it("has a range property", () => expect(result.range).toEqual([0, 17]));

        return it("has a variable result", function () {
          expect(result[0].name).toEqual("base-color");
          expect(result[0].value).toEqual("#fff");
          expect(result[0].range).toEqual([0, 17]);
          return expect(result[0].line).toEqual(0);
        });
      });

      describe("the second result object", function () {
        beforeEach(() => (result = scanner.search(text, result.lastIndex)));

        it("has a match string", () =>
          expect(result.match).toEqual("other-color = transparentize(base-color, 50%)"));

        it("has a lastIndex property", () => expect(result.lastIndex).toEqual(64));

        it("has a range property", () => expect(result.range).toEqual([19, 64]));

        return it("has a variable result", function () {
          expect(result[0].name).toEqual("other-color");
          expect(result[0].value).toEqual("transparentize(base-color, 50%)");
          expect(result[0].range).toEqual([19, 64]);
          return expect(result[0].line).toEqual(2);
        });
      });

      return describe("successive searches", () =>
        it("returns a result for each match and then undefined", function () {
          const doSearch = () => (result = scanner.search(text, result.lastIndex));

          expect(doSearch()).toBeDefined();
          expect(doSearch()).toBeDefined();
          expect(doSearch()).toBeDefined();
          return expect(doSearch()).toBeUndefined();
        }));
    });

    withScannerForTextEditor("incomplete-stylus-hash.styl", function () {
      beforeEach(() => (result = scanner.search(text)));

      return it("does not find any variables", () => expect(result).toBeUndefined());
    });

    withScannerForTextEditor("variables-in-arguments.scss", function () {
      beforeEach(() => (result = scanner.search(text)));

      return it("does not find any variables", () => expect(result).toBeUndefined());
    });

    withScannerForTextEditor("attribute-selectors.scss", function () {
      beforeEach(() => (result = scanner.search(text)));

      return it("does not find any variables", () => expect(result).toBeUndefined());
    });

    withScannerForTextEditor("variables-in-conditions.scss", function () {
      beforeEach(function () {
        result = null;
        const doSearch = () =>
          (result = scanner.search(text, result != null ? result.lastIndex : undefined));

        doSearch();
        return doSearch();
      });

      return it("does not find the variable in the if clause", () =>
        expect(result).toBeUndefined());
    });

    withScannerForTextEditor("variables-after-mixins.scss", function () {
      beforeEach(function () {
        result = null;
        const doSearch = () =>
          (result = scanner.search(text, result != null ? result.lastIndex : undefined));

        return doSearch();
      });

      return it("finds the variable after the mixin", () => expect(result).toBeDefined());
    });

    withScannerForTextEditor("variables-from-other-process.less", function () {
      beforeEach(function () {
        result = null;
        const doSearch = () =>
          (result = scanner.search(text, result != null ? result.lastIndex : undefined));

        return doSearch();
      });

      return it("finds the variable with an interpolation tag", () => expect(result).toBeDefined());
    });

    return withScannerForTextEditor("crlf.styl", function () {
      beforeEach(function () {
        result = null;
        const doSearch = () =>
          (result = scanner.search(text, result != null ? result.lastIndex : undefined));

        doSearch();
        return doSearch();
      });

      return it("finds all the variables even with crlf mode", () => expect(result).toBeDefined());
    });
  });
});
