/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS104: Avoid inline assignments
 * DS204: Change includes calls to have a more natural evaluation order
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const path = require("path");
const ColorBuffer = require("../lib/color-buffer");
const registry = require("../lib/color-expressions");
const jsonFixture = require("./helpers/fixtures").jsonFixture(__dirname, "fixtures");

describe("ColorBuffer", function () {
  let [editor, colorBuffer, colors, project] = Array.from([]);

  const sleep = function (ms) {
    const start = new Date();
    return () => new Date() - start >= ms;
  };

  const editBuffer = function (text, options = {}) {
    if (options.start != null) {
      let range;
      if (options.end != null) {
        range = [options.start, options.end];
      } else {
        range = [options.start, options.start];
      }

      editor.setSelectedBufferRange(range);
    }

    editor.insertText(text);
    if (!options.noEvent) {
      return advanceClock(500);
    }
  };

  beforeEach(function () {
    lumine.config.set("colors.delayBeforeScan", 0);
    lumine.config.set("colors.ignoredBufferNames", []);
    lumine.config.set("colors.filetypesForColorWords", ["*"]);
    lumine.config.set("colors.sourceNames", ["*.styl", "*.less"]);

    lumine.config.set("colors.ignoredNames", ["project/vendor/**"]);

    waitsForPromise(() => lumine.workspace.open("four-variables.styl").then((o) => (editor = o)));

    return waitsForPromise(() =>
      lumine.packages
        .activatePackage("colors")
        .then(function (pkg) {
          colors = pkg.mainModule;
          return (project = colors.getProject());
        })
        .catch((err) => console.error(err)),
    );
  });

  afterEach(() => (colorBuffer != null ? colorBuffer.destroy() : undefined));

  it("creates a color buffer for each editor in the workspace", () =>
    expect(project.colorBuffersByEditorId[editor.id]).toBeDefined());

  describe("when the file path matches an entry in ignoredBufferNames", function () {
    beforeEach(function () {
      expect(project.hasColorBufferForEditor(editor)).toBeTruthy();

      return lumine.config.set("colors.ignoredBufferNames", ["**/*.styl"]);
    });

    it("destroys the color buffer for this file", () =>
      expect(project.hasColorBufferForEditor(editor)).toBeFalsy());

    it("recreates the color buffer when the settings no longer ignore the file", function () {
      expect(project.hasColorBufferForEditor(editor)).toBeFalsy();

      lumine.config.set("colors.ignoredBufferNames", []);

      return expect(project.hasColorBufferForEditor(editor)).toBeTruthy();
    });

    return it("prevents the creation of a new color buffer", function () {
      waitsForPromise(() => lumine.workspace.open("variables.styl").then((o) => (editor = o)));

      return runs(() => expect(project.hasColorBufferForEditor(editor)).toBeFalsy());
    });
  });

  describe("when an editor with a path is not in the project paths is opened", function () {
    beforeEach(() => waitsFor(() => project.getPaths() != null));

    describe("when the file is already saved on disk", function () {
      let pathToOpen = null;

      beforeEach(() => (pathToOpen = project.paths.shift()));

      return it("adds the path to the project immediately", function () {
        spyOn(project, "appendPath");

        waitsForPromise(() =>
          lumine.workspace.open(pathToOpen).then(function (o) {
            editor = o;
            return (colorBuffer = project.colorBufferForEditor(editor));
          }),
        );

        return runs(() => expect(project.appendPath).toHaveBeenCalledWith(pathToOpen));
      });
    });

    return describe("when the file is not yet saved on disk", function () {
      beforeEach(function () {
        waitsForPromise(() =>
          lumine.workspace.open("foo-de-fafa.styl").then(function (o) {
            editor = o;
            return (colorBuffer = project.colorBufferForEditor(editor));
          }),
        );

        return waitsForPromise(() => colorBuffer.variablesAvailable());
      });

      it("does not fails when updating the colorBuffer", () =>
        expect(() => colorBuffer.update()).not.toThrow());

      return it("adds the path to the project paths on save", function () {
        spyOn(colorBuffer, "update").andCallThrough();
        spyOn(project, "appendPath");
        editor.getBuffer().emitter.emit("did-save", { path: editor.getPath() });

        waitsFor(() => colorBuffer.update.callCount > 0);

        return runs(() => expect(project.appendPath).toHaveBeenCalledWith(editor.getPath()));
      });
    });
  });

  describe("when an editor without path is opened", function () {
    beforeEach(function () {
      waitsForPromise(() =>
        lumine.workspace.open().then(function (o) {
          editor = o;
          return (colorBuffer = project.colorBufferForEditor(editor));
        }),
      );

      return waitsForPromise(() => colorBuffer.variablesAvailable());
    });

    it("does not fails when updating the colorBuffer", () =>
      expect(() => colorBuffer.update()).not.toThrow());

    return describe("when the file is saved and aquires a path", function () {
      describe("that is legible", function () {
        beforeEach(function () {
          spyOn(colorBuffer, "update").andCallThrough();
          spyOn(editor, "getPath").andReturn("new-path.styl");
          editor.emitter.emit("did-change-path", editor.getPath());

          return waitsFor(() => colorBuffer.update.callCount > 0);
        });

        return it("adds the path to the project paths", function () {
          let needle;
          return expect(
            ((needle = "new-path.styl"), project.getPaths().includes(needle)),
          ).toBeTruthy();
        });
      });

      describe("that is not legible", function () {
        beforeEach(function () {
          spyOn(colorBuffer, "update").andCallThrough();
          spyOn(editor, "getPath").andReturn("new-path.sass");
          editor.emitter.emit("did-change-path", editor.getPath());

          return waitsFor(() => colorBuffer.update.callCount > 0);
        });

        return it("does not add the path to the project paths", function () {
          let needle;
          return expect(
            ((needle = "new-path.styl"), project.getPaths().includes(needle)),
          ).toBeFalsy();
        });
      });

      return describe("that is ignored", function () {
        beforeEach(function () {
          spyOn(colorBuffer, "update").andCallThrough();
          spyOn(editor, "getPath").andReturn("project/vendor/new-path.styl");
          editor.emitter.emit("did-change-path", editor.getPath());

          return waitsFor(() => colorBuffer.update.callCount > 0);
        });

        return it("does not add the path to the project paths", function () {
          let needle;
          return expect(
            ((needle = "new-path.styl"), project.getPaths().includes(needle)),
          ).toBeFalsy();
        });
      });
    });
  });

  // FIXME Using a 1s sleep seems to do nothing on Travis, it'll need
  // a better solution.
  describe("with rapid changes that triggers a rescan", function () {
    beforeEach(function () {
      colorBuffer = project.colorBufferForEditor(editor);
      waitsFor(() => colorBuffer.initialized && colorBuffer.variableInitialized);

      runs(function () {
        spyOn(colorBuffer, "terminateRunningTask").andCallThrough();
        spyOn(colorBuffer, "updateColorMarkers").andCallThrough();
        spyOn(colorBuffer, "scanBufferForVariables").andCallThrough();

        editor.moveToBottom();

        editor.insertText("#fff\n");
        return editor.getBuffer().emitter.emit("did-stop-changing");
      });

      waitsFor(() => colorBuffer.scanBufferForVariables.callCount > 0);

      return runs(() => editor.insertText(" "));
    });

    return it("terminates the currently running task", () =>
      expect(colorBuffer.terminateRunningTask).toHaveBeenCalled());
  });

  describe("when created without a previous state", function () {
    beforeEach(function () {
      colorBuffer = project.colorBufferForEditor(editor);
      return waitsForPromise(() => colorBuffer.initialize());
    });

    it("scans the buffer for colors without waiting for the project variables", function () {
      expect(colorBuffer.getColorMarkers().length).toEqual(4);
      return expect(colorBuffer.getValidColorMarkers().length).toEqual(3);
    });

    it("creates the corresponding markers in the text editor", () =>
      expect(colorBuffer.getMarkerLayer().findMarkers().length).toEqual(4));

    it("knows that it is legible as a variables source file", () =>
      expect(colorBuffer.isVariablesSource()).toBeTruthy());

    describe("when the editor is destroyed", () =>
      it("destroys the color buffer at the same time", function () {
        editor.destroy();

        return expect(project.colorBuffersByEditorId[editor.id]).toBeUndefined();
      }));

    describe("::getColorMarkerAtBufferPosition", function () {
      describe("when the buffer position is contained in a marker range", () =>
        it("returns the corresponding color marker", function () {
          const colorMarker = colorBuffer.getColorMarkerAtBufferPosition([2, 15]);
          return expect(colorMarker).toEqual(colorBuffer.colorMarkers[1]);
        }));

      return describe("when the buffer position is not contained in a marker range", () =>
        it("returns undefined", () =>
          expect(colorBuffer.getColorMarkerAtBufferPosition([1, 15])).toBeUndefined()));
    });

    //#    ##     ##    ###    ########   ######
    //#    ##     ##   ## ##   ##     ## ##    ##
    //#    ##     ##  ##   ##  ##     ## ##
    //#    ##     ## ##     ## ########   ######
    //#     ##   ##  ######### ##   ##         ##
    //#      ## ##   ##     ## ##    ##  ##    ##
    //#       ###    ##     ## ##     ##  ######

    describe("when the project variables becomes available", function () {
      let [updateSpy] = Array.from([]);
      beforeEach(function () {
        updateSpy = jasmine.createSpy("did-update-color-markers");
        colorBuffer.onDidUpdateColorMarkers(updateSpy);
        return waitsForPromise(() => colorBuffer.variablesAvailable());
      });

      it("replaces the invalid markers that are now valid", function () {
        expect(colorBuffer.getValidColorMarkers().length).toEqual(4);
        expect(updateSpy.argsForCall[0][0].created.length).toEqual(1);
        return expect(updateSpy.argsForCall[0][0].destroyed.length).toEqual(1);
      });

      describe("when a variable is edited", function () {
        let [colorsUpdateSpy] = Array.from([]);
        beforeEach(function () {
          colorsUpdateSpy = jasmine.createSpy("did-update-color-markers");
          colorBuffer.onDidUpdateColorMarkers(colorsUpdateSpy);
          return editBuffer("#336699", { start: [0, 13], end: [0, 17] });
        });

        return it("updates the modified colors", function () {
          waitsFor(() => colorsUpdateSpy.callCount > 0);
          return runs(function () {
            expect(colorsUpdateSpy.argsForCall[0][0].destroyed.length).toEqual(2);
            return expect(colorsUpdateSpy.argsForCall[0][0].created.length).toEqual(2);
          });
        });
      });

      describe("when a new variable is added", function () {
        const [colorsUpdateSpy] = Array.from([]);

        beforeEach(function () {
          waitsForPromise(() => colorBuffer.variablesAvailable());

          return runs(function () {
            updateSpy = jasmine.createSpy("did-update-color-markers");
            colorBuffer.onDidUpdateColorMarkers(updateSpy);
            editor.moveToBottom();
            editBuffer("\nfoo = base-color");
            return waitsFor(() => updateSpy.callCount > 0);
          });
        });

        return it("dispatches the new marker in a did-update-color-markers event", function () {
          expect(updateSpy.argsForCall[0][0].destroyed.length).toEqual(0);
          return expect(updateSpy.argsForCall[0][0].created.length).toEqual(1);
        });
      });

      describe("when a variable is removed", function () {
        let [colorsUpdateSpy] = Array.from([]);
        beforeEach(function () {
          colorsUpdateSpy = jasmine.createSpy("did-update-color-markers");
          colorBuffer.onDidUpdateColorMarkers(colorsUpdateSpy);
          editBuffer("", { start: [0, 0], end: [0, 17] });
          return waitsFor(() => colorsUpdateSpy.callCount > 0);
        });

        return it("invalidates colors that were relying on the deleted variables", function () {
          expect(colorBuffer.getColorMarkers().length).toEqual(3);
          return expect(colorBuffer.getValidColorMarkers().length).toEqual(2);
        });
      });

      return describe("::serialize", function () {
        beforeEach(() => waitsForPromise(() => colorBuffer.variablesAvailable()));

        return it("returns the whole buffer data", function () {
          const expected = jsonFixture("four-variables-buffer.json", {
            id: editor.id,
            root: lumine.project.getPaths()[0],
            colorMarkers: colorBuffer.getColorMarkers().map((m) => m.marker.id),
          });

          return expect(colorBuffer.serialize()).toEqual(expected);
        });
      });
    });

    //#     ######   #######  ##        #######  ########   ######
    //#    ##    ## ##     ## ##       ##     ## ##     ## ##    ##
    //#    ##       ##     ## ##       ##     ## ##     ## ##
    //#    ##       ##     ## ##       ##     ## ########   ######
    //#    ##       ##     ## ##       ##     ## ##   ##         ##
    //#    ##    ## ##     ## ##       ##     ## ##    ##  ##    ##
    //#     ######   #######  ########  #######  ##     ##  ######

    describe("with a buffer with only colors", function () {
      beforeEach(function () {
        waitsForPromise(() => lumine.workspace.open("buttons.styl").then((o) => (editor = o)));

        return runs(() => (colorBuffer = project.colorBufferForEditor(editor)));
      });

      it("creates the color markers for the variables used in the buffer", function () {
        waitsForPromise(() => colorBuffer.variablesAvailable());
        return runs(() => expect(colorBuffer.getColorMarkers().length).toEqual(3));
      });

      describe("when a color marker is edited", function () {
        let [colorsUpdateSpy] = Array.from([]);

        beforeEach(function () {
          waitsForPromise(() => colorBuffer.variablesAvailable());

          return runs(function () {
            colorsUpdateSpy = jasmine.createSpy("did-update-color-markers");
            colorBuffer.onDidUpdateColorMarkers(colorsUpdateSpy);
            editBuffer("#336699", { start: [1, 13], end: [1, 23] });
            return waitsFor(() => colorsUpdateSpy.callCount > 0);
          });
        });

        it("updates the modified color marker", function () {
          const markers = colorBuffer.getColorMarkers();
          const marker = markers[markers.length - 1];
          return expect(marker.color).toBeColor("#336699");
        });

        return it("updates only the affected marker", function () {
          expect(colorsUpdateSpy.argsForCall[0][0].destroyed.length).toEqual(1);
          return expect(colorsUpdateSpy.argsForCall[0][0].created.length).toEqual(1);
        });
      });

      describe("when new lines changes the markers range", function () {
        let [colorsUpdateSpy] = Array.from([]);

        beforeEach(function () {
          waitsForPromise(() => colorBuffer.variablesAvailable());

          return runs(function () {
            colorsUpdateSpy = jasmine.createSpy("did-update-color-markers");
            colorBuffer.onDidUpdateColorMarkers(colorsUpdateSpy);
            editBuffer("#fff\n\n", { start: [0, 0], end: [0, 0] });
            return waitsFor(() => colorsUpdateSpy.callCount > 0);
          });
        });

        return it("does not destroys the previous markers", function () {
          expect(colorsUpdateSpy.argsForCall[0][0].destroyed.length).toEqual(0);
          return expect(colorsUpdateSpy.argsForCall[0][0].created.length).toEqual(1);
        });
      });

      describe("when a new color is added", function () {
        let [colorsUpdateSpy] = Array.from([]);

        beforeEach(function () {
          waitsForPromise(() => colorBuffer.variablesAvailable());

          return runs(function () {
            colorsUpdateSpy = jasmine.createSpy("did-update-color-markers");
            colorBuffer.onDidUpdateColorMarkers(colorsUpdateSpy);
            editor.moveToBottom();
            editBuffer("\n#336699");
            return waitsFor(() => colorsUpdateSpy.callCount > 0);
          });
        });

        it("adds a marker for the new color", function () {
          const markers = colorBuffer.getColorMarkers();
          const marker = markers[markers.length - 1];
          expect(markers.length).toEqual(4);
          expect(marker.color).toBeColor("#336699");
          return expect(colorBuffer.getMarkerLayer().findMarkers().length).toEqual(4);
        });

        return it("dispatches the new marker in a did-update-color-markers event", function () {
          expect(colorsUpdateSpy.argsForCall[0][0].destroyed.length).toEqual(0);
          return expect(colorsUpdateSpy.argsForCall[0][0].created.length).toEqual(1);
        });
      });

      return describe("when a color marker is edited", function () {
        let [colorsUpdateSpy] = Array.from([]);

        beforeEach(function () {
          waitsForPromise(() => colorBuffer.variablesAvailable());

          return runs(function () {
            colorsUpdateSpy = jasmine.createSpy("did-update-color-markers");
            colorBuffer.onDidUpdateColorMarkers(colorsUpdateSpy);
            editBuffer("", { start: [1, 2], end: [1, 23] });
            return waitsFor(() => colorsUpdateSpy.callCount > 0);
          });
        });

        it("updates the modified color marker", () =>
          expect(colorBuffer.getColorMarkers().length).toEqual(2));

        it("updates only the affected marker", function () {
          expect(colorsUpdateSpy.argsForCall[0][0].destroyed.length).toEqual(1);
          return expect(colorsUpdateSpy.argsForCall[0][0].created.length).toEqual(0);
        });

        return it("removes the previous editor markers", () =>
          expect(colorBuffer.getMarkerLayer().findMarkers().length).toEqual(2));
      });
    });

    describe("with a buffer whose scope is not one of source files", function () {
      beforeEach(function () {
        waitsForPromise(() =>
          lumine.workspace.open("project/lib/main.coffee").then((o) => (editor = o)),
        );

        runs(() => (colorBuffer = project.colorBufferForEditor(editor)));

        return waitsForPromise(() => colorBuffer.variablesAvailable());
      });

      return it("does not renders colors from variables", () =>
        expect(colorBuffer.getColorMarkers().length).toEqual(4));
    });

    return describe("with a buffer in crlf mode", function () {
      beforeEach(function () {
        waitsForPromise(() => lumine.workspace.open("crlf.styl").then((o) => (editor = o)));

        runs(() => (colorBuffer = project.colorBufferForEditor(editor)));

        return waitsForPromise(() => colorBuffer.variablesAvailable());
      });

      return it("creates a marker for each colors", () =>
        expect(colorBuffer.getValidColorMarkers().length).toEqual(2));
    });
  });

  //#    ####  ######   ##    ##  #######  ########  ######## ########
  //#     ##  ##    ##  ###   ## ##     ## ##     ## ##       ##     ##
  //#     ##  ##        ####  ## ##     ## ##     ## ##       ##     ##
  //#     ##  ##   #### ## ## ## ##     ## ########  ######   ##     ##
  //#     ##  ##    ##  ##  #### ##     ## ##   ##   ##       ##     ##
  //#     ##  ##    ##  ##   ### ##     ## ##    ##  ##       ##     ##
  //#    ####  ######   ##    ##  #######  ##     ## ######## ########

  describe("with a buffer part of the global ignored files", function () {
    beforeEach(function () {
      project.setIgnoredNames([]);
      lumine.config.set("colors.ignoredNames", ["project/vendor/*"]);

      waitsForPromise(() =>
        lumine.workspace.open("project/vendor/css/variables.less").then((o) => (editor = o)),
      );

      runs(() => (colorBuffer = project.colorBufferForEditor(editor)));

      return waitsForPromise(() => colorBuffer.variablesAvailable());
    });

    it("knows that it is part of the ignored files", () =>
      expect(colorBuffer.isIgnored()).toBeTruthy());

    it("knows that it is a variables source file", () =>
      expect(colorBuffer.isVariablesSource()).toBeTruthy());

    return it("scans the buffer for variables for in-buffer use only", function () {
      expect(colorBuffer.getColorMarkers().length).toEqual(20);
      const validMarkers = colorBuffer.getColorMarkers().filter((m) => m.color.isValid());

      return expect(validMarkers.length).toEqual(20);
    });
  });

  describe("with a buffer part of the project ignored files", function () {
    beforeEach(function () {
      waitsForPromise(() =>
        lumine.workspace.open("project/vendor/css/variables.less").then((o) => (editor = o)),
      );

      runs(() => (colorBuffer = project.colorBufferForEditor(editor)));

      return waitsForPromise(() => colorBuffer.variablesAvailable());
    });

    it("knows that it is part of the ignored files", () =>
      expect(colorBuffer.isIgnored()).toBeTruthy());

    it("knows that it is a variables source file", () =>
      expect(colorBuffer.isVariablesSource()).toBeTruthy());

    it("scans the buffer for variables for in-buffer use only", function () {
      expect(colorBuffer.getColorMarkers().length).toEqual(20);
      const validMarkers = colorBuffer.getColorMarkers().filter((m) => m.color.isValid());

      return expect(validMarkers.length).toEqual(20);
    });

    return describe("when the buffer is edited", function () {
      beforeEach(function () {
        const colorsUpdateSpy = jasmine.createSpy("did-update-color-markers");
        colorBuffer.onDidUpdateColorMarkers(colorsUpdateSpy);
        editor.moveToBottom();
        editBuffer("\n\n@new-color: @base0;\n");
        return waitsFor(() => colorsUpdateSpy.callCount > 0);
      });

      return it("finds the newly added color", function () {
        expect(colorBuffer.getColorMarkers().length).toEqual(21);
        const validMarkers = colorBuffer.getColorMarkers().filter((m) => m.color.isValid());

        return expect(validMarkers.length).toEqual(21);
      });
    });
  });

  //#    ##    ##  #######  ##     ##    ###    ########   ######
  //#    ###   ## ##     ## ##     ##   ## ##   ##     ## ##    ##
  //#    ####  ## ##     ## ##     ##  ##   ##  ##     ## ##
  //#    ## ## ## ##     ## ##     ## ##     ## ########   ######
  //#    ##  #### ##     ##  ##   ##  ######### ##   ##         ##
  //#    ##   ### ##     ##   ## ##   ##     ## ##    ##  ##    ##
  //#    ##    ##  #######     ###    ##     ## ##     ##  ######

  describe("with a buffer not being a variable source", function () {
    beforeEach(function () {
      waitsForPromise(() =>
        lumine.workspace.open("project/lib/main.coffee").then((o) => (editor = o)),
      );

      runs(() => (colorBuffer = project.colorBufferForEditor(editor)));

      return waitsForPromise(() => colorBuffer.variablesAvailable());
    });

    it("knows that it is not part of the source files", () =>
      expect(colorBuffer.isVariablesSource()).toBeFalsy());

    it("knows that it is not part of the ignored files", () =>
      expect(colorBuffer.isIgnored()).toBeFalsy());

    it("scans the buffer for variables for in-buffer use only", function () {
      expect(colorBuffer.getColorMarkers().length).toEqual(4);
      const validMarkers = colorBuffer.getColorMarkers().filter((m) => m.color.isValid());

      return expect(validMarkers.length).toEqual(4);
    });

    return describe("when the buffer is edited", function () {
      beforeEach(function () {
        const colorsUpdateSpy = jasmine.createSpy("did-update-color-markers");
        spyOn(project, "reloadVariablesForPath").andCallThrough();
        colorBuffer.onDidUpdateColorMarkers(colorsUpdateSpy);
        editor.moveToBottom();
        editBuffer("\n\n@new-color = red;\n");
        return waitsFor(() => colorsUpdateSpy.callCount > 0);
      });

      it("finds the newly added color", function () {
        expect(colorBuffer.getColorMarkers().length).toEqual(5);
        const validMarkers = colorBuffer.getColorMarkers().filter((m) => m.color.isValid());

        return expect(validMarkers.length).toEqual(5);
      });

      return it("does not ask the project to reload the variables", function () {
        if (parseFloat(lumine.getVersion()) >= 1.19) {
          return expect(project.reloadVariablesForPath).not.toHaveBeenCalled();
        } else {
          return expect(project.reloadVariablesForPath.mostRecentCall.args[0]).not.toEqual(
            colorBuffer.editor.getPath(),
          );
        }
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

  return describe("when created with a previous state", function () {
    describe("with variables and colors", function () {
      beforeEach(function () {
        waitsForPromise(() => project.initialize());
        return runs(function () {
          project.colorBufferForEditor(editor).destroy();

          const state = jsonFixture("four-variables-buffer.json", {
            id: editor.id,
            root: lumine.project.getPaths()[0],
            colorMarkers: __range__(-1, -4, true),
          });
          state.editor = editor;
          state.project = project;
          return (colorBuffer = new ColorBuffer(state));
        });
      });

      it("creates markers from the state object", () =>
        expect(colorBuffer.getColorMarkers().length).toEqual(4));

      it("restores the markers properties", function () {
        const colorMarker = colorBuffer.getColorMarkers()[3];
        expect(colorMarker.color).toBeColor(255, 255, 255, 0.5);
        return expect(colorMarker.color.variables).toEqual(["base-color"]);
      });

      it("restores the editor markers", () =>
        expect(colorBuffer.getMarkerLayer().findMarkers().length).toEqual(4));

      return it("restores the ability to fetch markers", function () {
        expect(colorBuffer.findColorMarkers().length).toEqual(4);

        return colorBuffer.findColorMarkers().map((marker) => expect(marker).toBeDefined());
      });
    });

    return describe("with an invalid color", function () {
      beforeEach(function () {
        waitsForPromise(() =>
          lumine.workspace.open("invalid-color.styl").then((o) => (editor = o)),
        );

        waitsForPromise(() => project.initialize());

        return runs(function () {
          const state = jsonFixture("invalid-color-buffer.json", {
            id: editor.id,
            root: lumine.project.getPaths()[0],
            colorMarkers: [-1],
          });
          state.editor = editor;
          state.project = project;
          return (colorBuffer = new ColorBuffer(state));
        });
      });

      return it("creates markers from the state object", function () {
        expect(colorBuffer.getColorMarkers().length).toEqual(1);
        return expect(colorBuffer.getValidColorMarkers().length).toEqual(0);
      });
    });
  });
});

function __range__(left, right, inclusive) {
  let range = [];
  let ascending = left < right;
  let end = !inclusive ? right : ascending ? right + 1 : right - 1;
  for (let i = left; ascending ? i < end : i > end; ascending ? i++ : i--) {
    range.push(i);
  }
  return range;
}
