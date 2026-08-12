/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
require("./helpers/matchers");
const ColorSearch = require("../lib/color-search");

describe("ColorSearch", function () {
  let [search, colors, project] = Array.from([]);

  beforeEach(function () {
    lumine.config.set("colors.sourceNames", ["**/*.styl", "**/*.less"]);
    lumine.config.set("colors.extendedSearchNames", ["**/*.css"]);
    lumine.config.set("colors.ignoredNames", ["project/vendor/**"]);

    waitsForPromise(() =>
      lumine.packages.activatePackage("colors").then(function (pkg) {
        colors = pkg.mainModule;
        return (project = colors.getProject());
      }),
    );

    return waitsForPromise(() => project.initialize());
  });

  return describe("when created with basic options", function () {
    beforeEach(() => (search = project.findAllColors()));

    it("dispatches a did-complete-search when finalizing its search", function () {
      const spy = jasmine.createSpy("did-complete-search");
      search.onDidCompleteSearch(spy);
      search.search();
      waitsFor(() => spy.callCount > 0);
      return runs(() => expect(spy.argsForCall[0][0].length).toEqual(26));
    });

    return it("dispatches a did-find-matches event for every file", function () {
      const completeSpy = jasmine.createSpy("did-complete-search");
      const findSpy = jasmine.createSpy("did-find-matches");
      search.onDidCompleteSearch(completeSpy);
      search.onDidFindMatches(findSpy);
      search.search();
      waitsFor(() => completeSpy.callCount > 0);
      return runs(function () {
        expect(findSpy.callCount).toEqual(7);
        return expect(findSpy.argsForCall[0][0].matches.length).toEqual(3);
      });
    });
  });
});
