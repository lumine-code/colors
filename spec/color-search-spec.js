/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
require('./helpers/matchers');
const ColorSearch = require('../lib/color-search');

describe('ColorSearch', function() {
  let [search, pigments, project] = Array.from([]);

  beforeEach(function() {
    atom.config.set('pigments.sourceNames', [
      '**/*.styl',
      '**/*.less'
    ]);
    atom.config.set('pigments.extendedSearchNames', [
      '**/*.css'
    ]);
    atom.config.set('pigments.ignoredNames', [
      'project/vendor/**'
    ]);

    waitsForPromise(() => atom.packages.activatePackage('pigments').then(function(pkg) {
      pigments = pkg.mainModule;
      return project = pigments.getProject();
    }));

    return waitsForPromise(() => project.initialize());
  });

  return describe('when created with basic options', function() {
    beforeEach(() => search = project.findAllColors());

    it('dispatches a did-complete-search when finalizing its search', function() {
      const spy = jasmine.createSpy('did-complete-search');
      search.onDidCompleteSearch(spy);
      search.search();
      waitsFor(() => spy.callCount > 0);
      return runs(() => expect(spy.argsForCall[0][0].length).toEqual(26));
    });

    return it('dispatches a did-find-matches event for every file', function() {
      const completeSpy = jasmine.createSpy('did-complete-search');
      const findSpy = jasmine.createSpy('did-find-matches');
      search.onDidCompleteSearch(completeSpy);
      search.onDidFindMatches(findSpy);
      search.search();
      waitsFor(() => completeSpy.callCount > 0);
      return runs(function() {
        expect(findSpy.callCount).toEqual(7);
        return expect(findSpy.argsForCall[0][0].matches.length).toEqual(3);
      });
    });
  });
});
