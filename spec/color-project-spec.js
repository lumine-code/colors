/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const os = require('os');
const fs = require('fs-plus');
const path = require('path');
const temp = require('temp');

const {SERIALIZE_VERSION, SERIALIZE_MARKERS_VERSION} = require('../lib/versions');
const ColorProject = require('../lib/color-project');
const ColorBuffer = require('../lib/color-buffer');
const jsonFixture = require('./helpers/fixtures').jsonFixture(__dirname, 'fixtures');
const {click} = require('./helpers/events');

const TOTAL_VARIABLES_IN_PROJECT = 12;
const TOTAL_COLORS_VARIABLES_IN_PROJECT = 10;

describe('ColorProject', function() {
  let [project, promise, rootPath, paths, eventSpy] = Array.from([]);

  beforeEach(function() {
    atom.config.set('pigments.sourceNames', [
      '*.styl'
    ]);
    atom.config.set('pigments.ignoredNames', []);
    atom.config.set('pigments.filetypesForColorWords', ['*']);

    const [fixturesPath] = Array.from(atom.project.getPaths());
    rootPath = `${fixturesPath}/project`;
    atom.project.setPaths([rootPath]);

    return project = new ColorProject({
      ignoredNames: ['vendor/*'],
      sourceNames: ['*.less'],
      ignoredScopes: ['\\.comment']
    });
  });

  afterEach(() => project.destroy());

  describe('.deserialize', () => it('restores the project in its previous state', function() {
    const data = {
      root: rootPath,
      timestamp: new Date().toJSON(),
      version: SERIALIZE_VERSION,
      markersVersion: SERIALIZE_MARKERS_VERSION
    };

    const json = jsonFixture('base-project.json', data);
    project = ColorProject.deserialize(json);

    expect(project).toBeDefined();
    expect(project.getPaths()).toEqual([
      `${rootPath}/styles/buttons.styl`,
      `${rootPath}/styles/variables.styl`
    ]);
    expect(project.getVariables().length).toEqual(TOTAL_VARIABLES_IN_PROJECT);
    return expect(project.getColorVariables().length).toEqual(TOTAL_COLORS_VARIABLES_IN_PROJECT);
  }));

  describe('::initialize', function() {
    beforeEach(function() {
      eventSpy = jasmine.createSpy('did-initialize');
      project.onDidInitialize(eventSpy);
      return waitsForPromise(() => project.initialize());
    });

    it('loads the paths to scan in the project', () => expect(project.getPaths()).toEqual([
      `${rootPath}/styles/buttons.styl`,
      `${rootPath}/styles/variables.styl`
    ]));

    it('scans the loaded paths to retrieve the variables', function() {
      expect(project.getVariables()).toBeDefined();
      return expect(project.getVariables().length).toEqual(TOTAL_VARIABLES_IN_PROJECT);
    });

    return it('dispatches a did-initialize event', () => expect(eventSpy).toHaveBeenCalled());
  });

  describe('::findAllColors', () => it('returns all the colors in the legibles files of the project', function() {
    const search = project.findAllColors();
    return expect(search).toBeDefined();
  }));

  //#    ##     ##    ###    ########   ######     ##    ##  #######  ########
  //#    ##     ##   ## ##   ##     ## ##    ##    ###   ## ##     ##    ##
  //#    ##     ##  ##   ##  ##     ## ##          ####  ## ##     ##    ##
  //#    ##     ## ##     ## ########   ######     ## ## ## ##     ##    ##
  //#     ##   ##  ######### ##   ##         ##    ##  #### ##     ##    ##
  //#      ## ##   ##     ## ##    ##  ##    ##    ##   ### ##     ##    ##
  //#       ###    ##     ## ##     ##  ######     ##    ##  #######     ##
  //#
  //#    ##        #######     ###    ########  ######## ########
  //#    ##       ##     ##   ## ##   ##     ## ##       ##     ##
  //#    ##       ##     ##  ##   ##  ##     ## ##       ##     ##
  //#    ##       ##     ## ##     ## ##     ## ######   ##     ##
  //#    ##       ##     ## ######### ##     ## ##       ##     ##
  //#    ##       ##     ## ##     ## ##     ## ##       ##     ##
  //#    ########  #######  ##     ## ########  ######## ########

  describe('when the variables have not been loaded yet', function() {
    describe('::serialize', () => it('returns an object without paths nor variables', function() {
      const date = new Date;
      spyOn(project, 'getTimestamp').andCallFake(() => date);
      const expected = {
        deserializer: 'ColorProject',
        timestamp: date,
        version: SERIALIZE_VERSION,
        markersVersion: SERIALIZE_MARKERS_VERSION,
        globalSourceNames: ['*.styl'],
        globalIgnoredNames: [],
        ignoredNames: ['vendor/*'],
        sourceNames: ['*.less'],
        ignoredScopes: ['\\.comment'],
        buffers: {}
      };
      return expect(project.serialize()).toEqual(expected);
    }));

    describe('::getVariablesForPath', () => it('returns undefined', () => expect(project.getVariablesForPath(`${rootPath}/styles/variables.styl`)).toEqual([])));

    describe('::getVariableByName', () => it('returns undefined', () => expect(project.getVariableByName("foo")).toBeUndefined()));

    describe('::getVariableById', () => it('returns undefined', () => expect(project.getVariableById(0)).toBeUndefined()));

    describe('::getContext', () => it('returns an empty context', function() {
      expect(project.getContext()).toBeDefined();
      return expect(project.getContext().getVariablesCount()).toEqual(0);
    }));

    describe('::getPalette', () => it('returns an empty palette', function() {
      expect(project.getPalette()).toBeDefined();
      return expect(project.getPalette().getColorsCount()).toEqual(0);
    }));

    describe('::reloadVariablesForPath', function() {
      beforeEach(function() {
        spyOn(project, 'initialize').andCallThrough();

        return waitsForPromise(() => project.reloadVariablesForPath(`${rootPath}/styles/variables.styl`));
      });

      return it('returns a promise hooked on the initialize promise', () => expect(project.initialize).toHaveBeenCalled());
    });

    describe('::setIgnoredNames', function() {
      beforeEach(function() {
        project.setIgnoredNames([]);

        return waitsForPromise(() => project.initialize());
      });

      return it('initializes the project with the new paths', () => expect(project.getVariables().length).toEqual(32));
    });

    return describe('::setSourceNames', function() {
      beforeEach(function() {
        project.setSourceNames([]);

        return waitsForPromise(() => project.initialize());
      });

      return it('initializes the project with the new paths', () => expect(project.getVariables().length).toEqual(12));
    });
  });

  //#    ##     ##    ###    ########   ######
  //#    ##     ##   ## ##   ##     ## ##    ##
  //#    ##     ##  ##   ##  ##     ## ##
  //#    ##     ## ##     ## ########   ######
  //#     ##   ##  ######### ##   ##         ##
  //#      ## ##   ##     ## ##    ##  ##    ##
  //#       ###    ##     ## ##     ##  ######
  //#
  //#    ##        #######     ###    ########  ######## ########
  //#    ##       ##     ##   ## ##   ##     ## ##       ##     ##
  //#    ##       ##     ##  ##   ##  ##     ## ##       ##     ##
  //#    ##       ##     ## ##     ## ##     ## ######   ##     ##
  //#    ##       ##     ## ######### ##     ## ##       ##     ##
  //#    ##       ##     ## ##     ## ##     ## ##       ##     ##
  //#    ########  #######  ##     ## ########  ######## ########

  describe('when the project has no variables source files', function() {
    beforeEach(function() {
      atom.config.set('pigments.sourceNames', ['*.sass']);

      const [fixturesPath] = Array.from(atom.project.getPaths());
      rootPath = `${fixturesPath}-no-sources`;
      atom.project.setPaths([rootPath]);

      project = new ColorProject({});

      return waitsForPromise(() => project.initialize());
    });

    it('initializes the paths with an empty array', () => expect(project.getPaths()).toEqual([]));

    return it('initializes the variables with an empty array', () => expect(project.getVariables()).toEqual([]));
  });

  describe('when the project has custom source names defined', function() {
    beforeEach(function() {
      atom.config.set('pigments.sourceNames', ['*.sass']);

      const [fixturesPath] = Array.from(atom.project.getPaths());

      project = new ColorProject({sourceNames: ['*.styl']});

      return waitsForPromise(() => project.initialize());
    });

    it('initializes the paths with an empty array', () => expect(project.getPaths().length).toEqual(2));

    return it('initializes the variables with an empty array', function() {
      expect(project.getVariables().length).toEqual(TOTAL_VARIABLES_IN_PROJECT);
      return expect(project.getColorVariables().length).toEqual(TOTAL_COLORS_VARIABLES_IN_PROJECT);
    });
  });

  describe('when the project has looping variable definition', function() {
    beforeEach(function() {
      atom.config.set('pigments.sourceNames', ['*.sass']);

      const [fixturesPath] = Array.from(atom.project.getPaths());
      rootPath = `${fixturesPath}-with-recursion`;
      atom.project.setPaths([rootPath]);

      project = new ColorProject({});

      return waitsForPromise(() => project.initialize());
    });

    return it('ignores the looping definition', function() {
      expect(project.getVariables().length).toEqual(5);
      return expect(project.getColorVariables().length).toEqual(5);
    });
  });

  describe('when the variables have been loaded', function() {
    beforeEach(() => waitsForPromise(() => project.initialize()));

    describe('::serialize', () => it('returns an object with project properties', function() {
      const date = new Date;
      spyOn(project, 'getTimestamp').andCallFake(() => date);
      return expect(project.serialize()).toEqual({
        deserializer: 'ColorProject',
        ignoredNames: ['vendor/*'],
        sourceNames: ['*.less'],
        ignoredScopes: ['\\.comment'],
        timestamp: date,
        version: SERIALIZE_VERSION,
        markersVersion: SERIALIZE_MARKERS_VERSION,
        paths: [
          `${rootPath}/styles/buttons.styl`,
          `${rootPath}/styles/variables.styl`
        ],
        globalSourceNames: ['*.styl'],
        globalIgnoredNames: [],
        buffers: {},
        variables: project.variables.serialize()
      });
    }));

    describe('::getVariablesForPath', function() {
      it('returns the variables defined in the file', () => expect(project.getVariablesForPath(`${rootPath}/styles/variables.styl`).length).toEqual(TOTAL_VARIABLES_IN_PROJECT));

      return describe('for a file that was ignored in the scanning process', () => it('returns undefined', () => expect(project.getVariablesForPath(`${rootPath}/vendor/css/variables.less`)).toEqual([])));
    });

    describe('::deleteVariablesForPath', () => it('removes all the variables coming from the specified file', function() {
      project.deleteVariablesForPath(`${rootPath}/styles/variables.styl`);

      return expect(project.getVariablesForPath(`${rootPath}/styles/variables.styl`)).toEqual([]);
    }));

    describe('::getContext', () => it('returns a context with the project variables', function() {
      expect(project.getContext()).toBeDefined();
      return expect(project.getContext().getVariablesCount()).toEqual(TOTAL_VARIABLES_IN_PROJECT);
    }));

    describe('::getPalette', () => it('returns a palette with the colors from the project', function() {
      expect(project.getPalette()).toBeDefined();
      return expect(project.getPalette().getColorsCount()).toEqual(10);
    }));

    describe('::showVariableInFile', () => it('opens the file where is located the variable', function() {
      const spy = jasmine.createSpy('did-add-text-editor');
      atom.workspace.onDidAddTextEditor(spy);

      project.showVariableInFile(project.getVariables()[0]);

      waitsFor(() => spy.callCount > 0);

      return runs(function() {
        const editor = atom.workspace.getActiveTextEditor();

        return expect(editor.getSelectedBufferRange()).toEqual([[1,2],[1,14]]);
      });
    }));

    describe('::reloadVariablesForPath', () => describe('for a file that is part of the loaded paths', function() {
      describe('where the reload finds new variables', function() {
        beforeEach(function() {
          project.deleteVariablesForPath(`${rootPath}/styles/variables.styl`);

          eventSpy = jasmine.createSpy('did-update-variables');
          project.onDidUpdateVariables(eventSpy);
          return waitsForPromise(() => project.reloadVariablesForPath(`${rootPath}/styles/variables.styl`));
        });

        it('scans again the file to find variables', () => expect(project.getVariables().length).toEqual(TOTAL_VARIABLES_IN_PROJECT));

        return it('dispatches a did-update-variables event', () => expect(eventSpy).toHaveBeenCalled());
      });

      return describe('where the reload finds nothing new', function() {
        beforeEach(function() {
          eventSpy = jasmine.createSpy('did-update-variables');
          project.onDidUpdateVariables(eventSpy);
          return waitsForPromise(() => project.reloadVariablesForPath(`${rootPath}/styles/variables.styl`));
        });

        it('leaves the file variables intact', () => expect(project.getVariables().length).toEqual(TOTAL_VARIABLES_IN_PROJECT));

        return it('does not dispatch a did-update-variables event', () => expect(eventSpy).not.toHaveBeenCalled());
      });
    }));

    describe('::reloadVariablesForPaths', function() {
      describe('for a file that is part of the loaded paths', function() {
        describe('where the reload finds new variables', function() {
          beforeEach(function() {
            project.deleteVariablesForPaths([
              `${rootPath}/styles/variables.styl`, `${rootPath}/styles/buttons.styl`
            ]);
            eventSpy = jasmine.createSpy('did-update-variables');
            project.onDidUpdateVariables(eventSpy);
            return waitsForPromise(() => project.reloadVariablesForPaths([
              `${rootPath}/styles/variables.styl`,
              `${rootPath}/styles/buttons.styl`
            ]));
          });

          it('scans again the file to find variables', () => expect(project.getVariables().length).toEqual(TOTAL_VARIABLES_IN_PROJECT));

          return it('dispatches a did-update-variables event', () => expect(eventSpy).toHaveBeenCalled());
        });

        return describe('where the reload finds nothing new', function() {
          beforeEach(function() {
            eventSpy = jasmine.createSpy('did-update-variables');
            project.onDidUpdateVariables(eventSpy);
            return waitsForPromise(() => project.reloadVariablesForPaths([
              `${rootPath}/styles/variables.styl`,
              `${rootPath}/styles/buttons.styl`
            ]));
          });

          it('leaves the file variables intact', () => expect(project.getVariables().length).toEqual(TOTAL_VARIABLES_IN_PROJECT));

          return it('does not dispatch a did-update-variables event', () => expect(eventSpy).not.toHaveBeenCalled());
        });
      });

      return describe('for a file that is not part of the loaded paths', function() {
        beforeEach(function() {
          spyOn(project, 'loadVariablesForPath').andCallThrough();

          return waitsForPromise(() => project.reloadVariablesForPath(`${rootPath}/vendor/css/variables.less`));
        });

        return it('does nothing', () => expect(project.loadVariablesForPath).not.toHaveBeenCalled());
      });
    });

    describe('when a buffer with variables is open', function() {
      let [editor, colorBuffer] = Array.from([]);
      beforeEach(function() {
        eventSpy = jasmine.createSpy('did-update-variables');
        project.onDidUpdateVariables(eventSpy);

        waitsForPromise(() => atom.workspace.open('styles/variables.styl').then(o => editor = o));

        runs(function() {
          colorBuffer = project.colorBufferForEditor(editor);
          return spyOn(colorBuffer, 'scanBufferForVariables').andCallThrough();
        });

        waitsForPromise(() => project.initialize());
        return waitsForPromise(() => colorBuffer.variablesAvailable());
      });

      it('updates the project variable with the buffer ranges', () => project.getVariables().map((variable) =>
        expect(variable.bufferRange).toBeDefined()));

      describe('when a color is modified that does not affect other variables ranges', function() {
        let [variablesTextRanges] = Array.from([]);
        beforeEach(function() {
          variablesTextRanges = {};
          project.getVariablesForPath(editor.getPath()).forEach(variable => variablesTextRanges[variable.name] = variable.range);

          editor.setSelectedBufferRange([[1,7],[1,14]]);
          editor.insertText('#336');
          editor.getBuffer().emitter.emit('did-stop-changing');

          return waitsFor(() => eventSpy.callCount > 0);
        });

        it('reloads the variables with the buffer instead of the file', function() {
          expect(colorBuffer.scanBufferForVariables).toHaveBeenCalled();
          return expect(project.getVariables().length).toEqual(TOTAL_VARIABLES_IN_PROJECT);
        });

        it('uses the buffer ranges to detect which variables were really changed', function() {
          expect(eventSpy.argsForCall[0][0].destroyed).toBeUndefined();
          expect(eventSpy.argsForCall[0][0].created).toBeUndefined();
          return expect(eventSpy.argsForCall[0][0].updated.length).toEqual(1);
        });

        it('updates the text range of the other variables', () => project.getVariablesForPath(`${rootPath}/styles/variables.styl`).forEach(function(variable) {
          if (variable.name !== 'colors.red') {
            expect(variable.range[0]).toEqual(variablesTextRanges[variable.name][0] - 3);
            return expect(variable.range[1]).toEqual(variablesTextRanges[variable.name][1] - 3);
          }
        }));

        return it('dispatches a did-update-variables event', () => expect(eventSpy).toHaveBeenCalled());
      });

      describe('when a text is inserted that affects other variables ranges', function() {
        let [variablesTextRanges, variablesBufferRanges] = Array.from([]);
        beforeEach(function() {
          runs(function() {
            variablesTextRanges = {};
            variablesBufferRanges = {};
            project.getVariablesForPath(editor.getPath()).forEach(function(variable) {
              variablesTextRanges[variable.name] = variable.range;
              return variablesBufferRanges[variable.name] = variable.bufferRange;
            });

            spyOn(project.variables, 'addMany').andCallThrough();

            editor.setSelectedBufferRange([[0,0],[0,0]]);
            editor.insertText('\n\n');
            return editor.getBuffer().emitter.emit('did-stop-changing');
          });

          return waitsFor(() => project.variables.addMany.callCount > 0);
        });

        it('does not trigger a change event', () => expect(eventSpy.callCount).toEqual(0));

        return it('updates the range of the updated variables', () => project.getVariablesForPath(`${rootPath}/styles/variables.styl`).forEach(function(variable) {
          if (variable.name !== 'colors.red') {
            expect(variable.range[0]).toEqual(variablesTextRanges[variable.name][0] + 2);
            expect(variable.range[1]).toEqual(variablesTextRanges[variable.name][1] + 2);
            return expect(variable.bufferRange.isEqual(variablesBufferRanges[variable.name])).toBeFalsy();
          }
        }));
      });

      describe('when a color is removed', function() {
        let [variablesTextRanges] = Array.from([]);
        beforeEach(function() {
          runs(function() {
            variablesTextRanges = {};
            project.getVariablesForPath(editor.getPath()).forEach(variable => variablesTextRanges[variable.name] = variable.range);

            editor.setSelectedBufferRange([[1,0],[2,0]]);
            editor.insertText('');
            return editor.getBuffer().emitter.emit('did-stop-changing');
          });

          return waitsFor(() => eventSpy.callCount > 0);
        });

        it('reloads the variables with the buffer instead of the file', function() {
          expect(colorBuffer.scanBufferForVariables).toHaveBeenCalled();
          return expect(project.getVariables().length).toEqual(TOTAL_VARIABLES_IN_PROJECT - 1);
        });

        it('uses the buffer ranges to detect which variables were really changed', function() {
          expect(eventSpy.argsForCall[0][0].destroyed.length).toEqual(1);
          expect(eventSpy.argsForCall[0][0].created).toBeUndefined();
          return expect(eventSpy.argsForCall[0][0].updated).toBeUndefined();
        });

        it('can no longer be found in the project variables', function() {
          expect(project.getVariables().some(v => v.name === 'colors.red')).toBeFalsy();
          return expect(project.getColorVariables().some(v => v.name === 'colors.red')).toBeFalsy();
        });

        return it('dispatches a did-update-variables event', () => expect(eventSpy).toHaveBeenCalled());
      });

      return describe('when all the colors are removed', function() {
        let [variablesTextRanges] = Array.from([]);
        beforeEach(function() {
          runs(function() {
            variablesTextRanges = {};
            project.getVariablesForPath(editor.getPath()).forEach(variable => variablesTextRanges[variable.name] = variable.range);

            editor.setSelectedBufferRange([[0,0],[Infinity,Infinity]]);
            editor.insertText('');
            return editor.getBuffer().emitter.emit('did-stop-changing');
          });

          return waitsFor(() => eventSpy.callCount > 0);
        });

        it('removes every variable from the file', function() {
          expect(colorBuffer.scanBufferForVariables).toHaveBeenCalled();
          expect(project.getVariables().length).toEqual(0);

          expect(eventSpy.argsForCall[0][0].destroyed.length).toEqual(TOTAL_VARIABLES_IN_PROJECT);
          expect(eventSpy.argsForCall[0][0].created).toBeUndefined();
          return expect(eventSpy.argsForCall[0][0].updated).toBeUndefined();
        });

        it('can no longer be found in the project variables', function() {
          expect(project.getVariables().some(v => v.name === 'colors.red')).toBeFalsy();
          return expect(project.getColorVariables().some(v => v.name === 'colors.red')).toBeFalsy();
        });

        return it('dispatches a did-update-variables event', () => expect(eventSpy).toHaveBeenCalled());
      });
    });

    describe('::setIgnoredNames', function() {
      describe('with an empty array', function() {
        beforeEach(function() {
          expect(project.getVariables().length).toEqual(12);

          const spy = jasmine.createSpy('did-update-variables');
          project.onDidUpdateVariables(spy);
          project.setIgnoredNames([]);

          return waitsFor(() => spy.callCount > 0);
        });

        return it('reloads the variables from the new paths', () => expect(project.getVariables().length).toEqual(32));
      });

      return describe('with a more restrictive array', function() {
        beforeEach(function() {
          expect(project.getVariables().length).toEqual(12);

          const spy = jasmine.createSpy('did-update-variables');
          project.onDidUpdateVariables(spy);
          return waitsForPromise(() => project.setIgnoredNames(['vendor/*', '**/*.styl']));
        });

        return it('clears all the paths as there is no legible paths', () => expect(project.getPaths().length).toEqual(0));
      });
    });

    describe('when the project has multiple root directory', function() {
      beforeEach(function() {
        atom.config.set('pigments.sourceNames', ['**/*.sass', '**/*.styl']);

        const [fixturesPath] = Array.from(atom.project.getPaths());
        atom.project.setPaths([
          `${fixturesPath}`,
          `${fixturesPath}-with-recursion`
        ]);

        project = new ColorProject({});

        return waitsForPromise(() => project.initialize());
      });

      return it('finds the variables from the two directories', () => expect(project.getVariables().length).toEqual(17));
    });

    describe('when the project has VCS ignored files', function() {
      let [projectPath] = Array.from([]);
      beforeEach(function() {
        atom.config.set('pigments.sourceNames', ['*.sass']);

        const fixture = path.join(__dirname, 'fixtures', 'project-with-gitignore');

        projectPath = temp.mkdirSync('pigments-project');
        const dotGitFixture = path.join(fixture, 'git.git');
        const dotGit = path.join(projectPath, '.git');
        fs.copySync(dotGitFixture, dotGit);
        fs.writeFileSync(path.join(projectPath, '.gitignore'), fs.readFileSync(path.join(fixture, 'git.gitignore')));
        fs.writeFileSync(path.join(projectPath, 'base.sass'), fs.readFileSync(path.join(fixture, 'base.sass')));
        fs.writeFileSync(path.join(projectPath, 'ignored.sass'), fs.readFileSync(path.join(fixture, 'ignored.sass')));
        fs.mkdirSync(path.join(projectPath, 'bower_components'));
        fs.writeFileSync(path.join(projectPath, 'bower_components', 'some-ignored-file.sass'), fs.readFileSync(path.join(fixture, 'bower_components', 'some-ignored-file.sass')));

        // FIXME repo.getWorkingDirectory returns the project path prefixed with
        // /private
        return atom.project.setPaths([projectPath]);
      });

      describe('when the ignoreVcsIgnoredPaths setting is enabled', function() {
        beforeEach(function() {
          atom.config.set('pigments.ignoreVcsIgnoredPaths', true);
          project = new ColorProject({});

          return waitsForPromise(() => project.initialize());
        });

        it('finds the variables from the three files', function() {
          expect(project.getVariables().length).toEqual(3);
          return expect(project.getPaths().length).toEqual(1);
        });

        return describe('and then disabled', function() {
          beforeEach(function() {
            const spy = jasmine.createSpy('did-update-variables');
            project.onDidUpdateVariables(spy);
            atom.config.set('pigments.ignoreVcsIgnoredPaths', false);

            return waitsFor(() => spy.callCount > 0);
          });

          it('reloads the paths', () => expect(project.getPaths().length).toEqual(3));

          return it('reloads the variables', () => expect(project.getVariables().length).toEqual(10));
        });
      });

      return describe('when the ignoreVcsIgnoredPaths setting is disabled', function() {
        beforeEach(function() {
          atom.config.set('pigments.ignoreVcsIgnoredPaths', false);
          project = new ColorProject({});

          return waitsForPromise(() => project.initialize());
        });

        it('finds the variables from the three files', function() {
          expect(project.getVariables().length).toEqual(10);
          return expect(project.getPaths().length).toEqual(3);
        });

        return describe('and then enabled', function() {
          beforeEach(function() {
            const spy = jasmine.createSpy('did-update-variables');
            project.onDidUpdateVariables(spy);
            atom.config.set('pigments.ignoreVcsIgnoredPaths', true);

            return waitsFor(() => spy.callCount > 0);
          });

          it('reloads the paths', () => expect(project.getPaths().length).toEqual(1));

          return it('reloads the variables', () => expect(project.getVariables().length).toEqual(3));
        });
      });
    });

    //#     ######  ######## ######## ######## #### ##    ##  ######    ######
    //#    ##    ## ##          ##       ##     ##  ###   ## ##    ##  ##    ##
    //#    ##       ##          ##       ##     ##  ####  ## ##        ##
    //#     ######  ######      ##       ##     ##  ## ## ## ##   ####  ######
    //#          ## ##          ##       ##     ##  ##  #### ##    ##        ##
    //#    ##    ## ##          ##       ##     ##  ##   ### ##    ##  ##    ##
    //#     ######  ########    ##       ##    #### ##    ##  ######    ######

    describe('when the sourceNames setting is changed', function() {
      let [updateSpy] = Array.from([]);

      beforeEach(function() {
        const originalPaths = project.getPaths();
        atom.config.set('pigments.sourceNames', []);

        return waitsFor(() => project.getPaths().join(',') !== originalPaths.join(','));
      });

      it('updates the variables using the new pattern', () => expect(project.getVariables().length).toEqual(0));

      return describe('so that new paths are found', function() {
        beforeEach(function() {
          updateSpy = jasmine.createSpy('did-update-variables');

          const originalPaths = project.getPaths();
          project.onDidUpdateVariables(updateSpy);

          atom.config.set('pigments.sourceNames', ['**/*.styl']);

          waitsFor(() => project.getPaths().join(',') !== originalPaths.join(','));
          return waitsFor(() => updateSpy.callCount > 0);
        });

        return it('loads the variables from these new paths', () => expect(project.getVariables().length).toEqual(TOTAL_VARIABLES_IN_PROJECT));
      });
    });

    describe('when the ignoredNames setting is changed', function() {
      let [updateSpy] = Array.from([]);

      beforeEach(function() {
        const originalPaths = project.getPaths();
        atom.config.set('pigments.ignoredNames', ['**/*.styl']);

        return waitsFor(() => project.getPaths().join(',') !== originalPaths.join(','));
      });

      it('updates the found using the new pattern', () => expect(project.getVariables().length).toEqual(0));

      return describe('so that new paths are found', function() {
        beforeEach(function() {
          updateSpy = jasmine.createSpy('did-update-variables');

          const originalPaths = project.getPaths();
          project.onDidUpdateVariables(updateSpy);

          atom.config.set('pigments.ignoredNames', []);

          waitsFor(() => project.getPaths().join(',') !== originalPaths.join(','));
          return waitsFor(() => updateSpy.callCount > 0);
        });

        return it('loads the variables from these new paths', () => expect(project.getVariables().length).toEqual(TOTAL_VARIABLES_IN_PROJECT));
      });
    });

    describe('when the extendedSearchNames setting is changed', function() {
      const [updateSpy] = Array.from([]);

      beforeEach(() => project.setSearchNames(['*.foo']));

      it('updates the search names', () => expect(project.getSearchNames().length).toEqual(3));

      return it('serializes the setting', () => expect(project.serialize().searchNames).toEqual(['*.foo']));
    });

    describe('when the ignore global config settings are enabled', function() {
      describe('for the sourceNames field', function() {
        beforeEach(function() {
          project.sourceNames = ['*.foo'];
          return waitsForPromise(() => project.setIgnoreGlobalSourceNames(true));
        });

        it('ignores the content of the global config', () => expect(project.getSourceNames()).toEqual(['.pigments','*.foo']));

        return it('serializes the project setting', () => expect(project.serialize().ignoreGlobalSourceNames).toBeTruthy());
      });

      describe('for the ignoredNames field', function() {
        beforeEach(function() {
          atom.config.set('pigments.ignoredNames', ['*.foo']);
          project.ignoredNames = ['*.bar'];

          return project.setIgnoreGlobalIgnoredNames(true);
        });

        it('ignores the content of the global config', () => expect(project.getIgnoredNames()).toEqual(['*.bar']));

        return it('serializes the project setting', () => expect(project.serialize().ignoreGlobalIgnoredNames).toBeTruthy());
      });

      describe('for the ignoredScopes field', function() {
        beforeEach(function() {
          atom.config.set('pigments.ignoredScopes', ['\\.comment']);
          project.ignoredScopes = ['\\.source'];

          return project.setIgnoreGlobalIgnoredScopes(true);
        });

        it('ignores the content of the global config', () => expect(project.getIgnoredScopes()).toEqual(['\\.source']));

        return it('serializes the project setting', () => expect(project.serialize().ignoreGlobalIgnoredScopes).toBeTruthy());
      });

      return describe('for the searchNames field', function() {
        beforeEach(function() {
          atom.config.set('pigments.extendedSearchNames', ['*.css']);
          project.searchNames = ['*.foo'];

          return project.setIgnoreGlobalSearchNames(true);
        });

        it('ignores the content of the global config', () => expect(project.getSearchNames()).toEqual(['*.less','*.foo']));

        return it('serializes the project setting', () => expect(project.serialize().ignoreGlobalSearchNames).toBeTruthy());
      });
    });


    describe('::loadThemesVariables', function() {
      beforeEach(function() {
        atom.packages.activatePackage('atom-light-ui');
        atom.packages.activatePackage('atom-light-syntax');

        atom.config.set('core.themes', ['atom-light-ui', 'atom-light-syntax']);

        waitsForPromise(() => atom.themes.activateThemes());

        return waitsForPromise(() => atom.packages.activatePackage('pigments'));
      });

      afterEach(function() {
        atom.themes.deactivateThemes();
        return atom.themes.unwatchUserStylesheet();
      });

      return it('returns an array of 62 variables', function() {
        const themeVariables = project.loadThemesVariables();
        return expect(themeVariables.length).toEqual(62);
      });
    });

    return describe('when the includeThemes setting is enabled', function() {
      let spy;
      [paths, spy] = Array.from([]);
      beforeEach(function() {
        paths = project.getPaths();
        expect(project.getColorVariables().length).toEqual(10);

        atom.packages.activatePackage('atom-light-ui');
        atom.packages.activatePackage('atom-light-syntax');
        atom.packages.activatePackage('atom-dark-ui');
        atom.packages.activatePackage('atom-dark-syntax');

        atom.config.set('core.themes', ['atom-light-ui', 'atom-light-syntax']);

        waitsForPromise(() => atom.themes.activateThemes());

        waitsForPromise(() => atom.packages.activatePackage('pigments'));

        waitsForPromise(() => project.initialize());

        return runs(function() {
          spy = jasmine.createSpy('did-change-active-themes');
          atom.themes.onDidChangeActiveThemes(spy);
          return project.setIncludeThemes(true);
        });
      });

      afterEach(function() {
        atom.themes.deactivateThemes();
        return atom.themes.unwatchUserStylesheet();
      });

      it('includes the variables set for ui and syntax themes in the palette', () => expect(project.getColorVariables().length).toEqual(72));

      it('still includes the paths from the project', () => paths.map((p) =>
        expect(project.getPaths().indexOf(p)).not.toEqual(-1)));

      it('serializes the setting with the project', function() {
        const serialized = project.serialize();

        return expect(serialized.includeThemes).toEqual(true);
      });

      describe('and then disabled', function() {
        beforeEach(() => project.setIncludeThemes(false));

        it('removes all the paths to the themes stylesheets', () => expect(project.getColorVariables().length).toEqual(10));

        return describe('when the core.themes setting is modified', function() {
          beforeEach(function() {
            spyOn(project, 'loadThemesVariables').andCallThrough();
            atom.config.set('core.themes', ['atom-dark-ui', 'atom-dark-syntax']);

            return waitsFor(() => spy.callCount > 0);
          });

          return it('does not trigger a paths update', () => expect(project.loadThemesVariables).not.toHaveBeenCalled());
        });
      });

      return describe('when the core.themes setting is modified', function() {
        beforeEach(function() {
          spyOn(project, 'loadThemesVariables').andCallThrough();
          atom.config.set('core.themes', ['atom-dark-ui', 'atom-dark-syntax']);

          return waitsFor(() => spy.callCount > 0);
        });

        return it('triggers a paths update', () => expect(project.loadThemesVariables).toHaveBeenCalled());
      });
    });
  });

  //#    ########  ########  ######  ########  #######  ########  ########
  //#    ##     ## ##       ##    ##    ##    ##     ## ##     ## ##
  //#    ##     ## ##       ##          ##    ##     ## ##     ## ##
  //#    ########  ######    ######     ##    ##     ## ########  ######
  //#    ##   ##   ##             ##    ##    ##     ## ##   ##   ##
  //#    ##    ##  ##       ##    ##    ##    ##     ## ##    ##  ##
  //#    ##     ## ########  ######     ##     #######  ##     ## ########

  return describe('when restored', function() {
    const createProject = function(params={}) {
      const {stateFixture} = params;
      delete params.stateFixture;

      if (params.root == null) { params.root = rootPath; }
      if (params.timestamp == null) { params.timestamp =  new Date().toJSON(); }
      if (params.variableMarkers == null) { params.variableMarkers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]; }
      if (params.colorMarkers == null) { params.colorMarkers = [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]; }
      if (params.version == null) { params.version = SERIALIZE_VERSION; }
      if (params.markersVersion == null) { params.markersVersion = SERIALIZE_MARKERS_VERSION; }

      return ColorProject.deserialize(jsonFixture(stateFixture, params));
    };

    describe('with a timestamp more recent than the files last modification date', function() {
      beforeEach(function() {
        project = createProject({
          stateFixture: "empty-project.json"});

        return waitsForPromise(() => project.initialize());
      });

      return it('does not rescans the files', () => expect(project.getVariables().length).toEqual(1));
    });

    describe('with a version different that the current one', function() {
      beforeEach(function() {
        project = createProject({
          stateFixture: "empty-project.json",
          version: "0.0.0"
        });

        return waitsForPromise(() => project.initialize());
      });

      return it('drops the whole serialized state and rescans all the project', () => expect(project.getVariables().length).toEqual(12));
    });

    describe('with a serialized path that no longer exist', function() {
      beforeEach(function() {
        project = createProject({
          stateFixture: "rename-file-project.json"});

        return waitsForPromise(() => project.initialize());
      });

      it('drops drops the non-existing and reload the paths', () => expect(project.getPaths()).toEqual([
        `${rootPath}/styles/buttons.styl`,
        `${rootPath}/styles/variables.styl`
      ]));

      it('drops the variables from the removed paths', () => expect(project.getVariablesForPath(`${rootPath}/styles/foo.styl`).length).toEqual(0));

      return it('loads the variables from the new file', () => expect(project.getVariablesForPath(`${rootPath}/styles/variables.styl`).length).toEqual(12));
    });


    describe('with a sourceNames setting value different than when serialized', function() {
      beforeEach(function() {
        atom.config.set('pigments.sourceNames', []);

        project = createProject({
          stateFixture: "empty-project.json"});

        return waitsForPromise(() => project.initialize());
      });

      return it('drops the whole serialized state and rescans all the project', () => expect(project.getVariables().length).toEqual(0));
    });

    describe('with a markers version different that the current one', function() {
      beforeEach(function() {
        project = createProject({
          stateFixture: "empty-project.json",
          markersVersion: "0.0.0"
        });

        return waitsForPromise(() => project.initialize());
      });

      it('keeps the project related data', function() {
        expect(project.ignoredNames).toEqual(['vendor/*']);
        return expect(project.getPaths()).toEqual([
          `${rootPath}/styles/buttons.styl`,
          `${rootPath}/styles/variables.styl`
        ]);
      });

      return it('drops the variables and buffers data', () => expect(project.getVariables().length).toEqual(TOTAL_VARIABLES_IN_PROJECT));
    });

    describe('with a timestamp older than the files last modification date', function() {
      beforeEach(function() {
        project = createProject({
          timestamp: new Date(0).toJSON(),
          stateFixture: "empty-project.json"
        });

        return waitsForPromise(() => project.initialize());
      });

      return it('scans again all the files that have a more recent modification date', () => expect(project.getVariables().length).toEqual(TOTAL_VARIABLES_IN_PROJECT));
    });

    describe('with some files not saved in the project state', function() {
      beforeEach(function() {
        project = createProject({
          stateFixture: "partial-project.json"});

        return waitsForPromise(() => project.initialize());
      });

      return it('detects the new files and scans them', () => expect(project.getVariables().length).toEqual(12));
    });

    describe('with an open editor and the corresponding buffer state', function() {
      let [editor, colorBuffer] = Array.from([]);
      beforeEach(function() {
        waitsForPromise(() => atom.workspace.open('variables.styl').then(o => editor = o));

        runs(function() {
          project = createProject({
            stateFixture: "open-buffer-project.json",
            id: editor.id
          });

          return spyOn(ColorBuffer.prototype, 'variablesAvailable').andCallThrough();
        });

        return runs(() => colorBuffer = project.colorBuffersByEditorId[editor.id]);});

      it('restores the color buffer in its previous state', function() {
        expect(colorBuffer).toBeDefined();
        return expect(colorBuffer.getColorMarkers().length).toEqual(TOTAL_COLORS_VARIABLES_IN_PROJECT);
      });

      return it('does not wait for the project variables', () => expect(colorBuffer.variablesAvailable).not.toHaveBeenCalled());
    });

    return describe('with an open editor, the corresponding buffer state and a old timestamp', function() {
      let [editor, colorBuffer] = Array.from([]);
      beforeEach(function() {
        waitsForPromise(() => atom.workspace.open('variables.styl').then(o => editor = o));

        runs(function() {
          spyOn(ColorBuffer.prototype, 'updateVariableRanges').andCallThrough();
          return project = createProject({
            timestamp: new Date(0).toJSON(),
            stateFixture: "open-buffer-project.json",
            id: editor.id
          });
        });

        runs(() => colorBuffer = project.colorBuffersByEditorId[editor.id]);

        return waitsFor(() => colorBuffer.updateVariableRanges.callCount > 0);
      });

      return it('invalidates the color buffer markers as soon as the dirty paths have been determined', () => expect(colorBuffer.updateVariableRanges).toHaveBeenCalled());
    });
  });
});

//#    ########  ######## ########    ###    ##     ## ##       ########
//#    ##     ## ##       ##         ## ##   ##     ## ##          ##
//#    ##     ## ##       ##        ##   ##  ##     ## ##          ##
//#    ##     ## ######   ######   ##     ## ##     ## ##          ##
//#    ##     ## ##       ##       ######### ##     ## ##          ##
//#    ##     ## ##       ##       ##     ## ##     ## ##          ##
//#    ########  ######## ##       ##     ##  #######  ########    ##

describe('ColorProject', function() {
  let [project, rootPath] = Array.from([]);
  return describe('when the project has a pigments defaults file', function() {
    beforeEach(function() {
      atom.config.set('pigments.sourceNames', ['*.sass']);

      const [fixturesPath] = Array.from(atom.project.getPaths());
      rootPath = `${fixturesPath}/project-with-defaults`;
      atom.project.setPaths([rootPath]);

      project = new ColorProject({});

      return waitsForPromise(() => project.initialize());
    });

    return it('loads the defaults file content', () => expect(project.getColorVariables().length).toEqual(12));
  });
});
