/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const {click} = require('./helpers/events');
const ColorSearch = require('../lib/color-search');

describe('ColorResultsElement', function() {
  let [search, resultsElement, colors, project, completeSpy, findSpy] = Array.from([]);

  beforeEach(function() {
    lumine.config.set('colors.sourceNames', [
      '**/*.styl',
      '**/*.less'
    ]);

    waitsForPromise(() => lumine.packages.activatePackage('colors').then(function(pkg) {
      colors = pkg.mainModule;
      return project = colors.getProject();
    }));

    waitsForPromise(() => project.initialize());

    return runs(function() {
      search = project.findAllColors();
      spyOn(search, 'search').andCallThrough();
      completeSpy = jasmine.createSpy('did-complete-search');
      search.onDidCompleteSearch(completeSpy);

      resultsElement = lumine.views.getView(search);

      return jasmine.attachToDOM(resultsElement);
    });
  });

  afterEach(() => waitsFor(() => completeSpy.callCount > 0));

  it('is associated with ColorSearch model', () => expect(resultsElement).toBeDefined());

  it('starts the search', () => expect(search.search).toHaveBeenCalled());

  return describe('when matches are found', function() {
    beforeEach(() => waitsFor(() => completeSpy.callCount > 0));

    it('groups results by files', function() {
      const fileResults = resultsElement.querySelectorAll('.list-nested-item');

      expect(fileResults.length).toEqual(8);

      return expect(fileResults[0].querySelectorAll('li.list-item').length).toEqual(3);
    });

    describe('when a file item is clicked', function() {
      let [fileItem] = Array.from([]);
      beforeEach(function() {
        fileItem = resultsElement.querySelector('.list-nested-item > .list-item');
        return click(fileItem);
      });

      return it('collapses the file matches', () => expect(resultsElement.querySelector('.list-nested-item.collapsed')).toExist());
    });

    return describe('when a matches item is clicked', function() {
      let [matchItem, spy] = Array.from([]);
      beforeEach(function() {
        spy = jasmine.createSpy('did-add-text-editor');

        lumine.workspace.onDidAddTextEditor(spy);
        matchItem = resultsElement.querySelector('.search-result.list-item');
        click(matchItem);

        return waitsFor(() => spy.callCount > 0);
      });

      return it('opens the file', function() {
        expect(spy).toHaveBeenCalled();
        const {textEditor} = spy.argsForCall[0][0];
        return expect(textEditor.getSelectedBufferRange()).toEqual([[1,13],[1,23]]);
      });
    });
  });
});
