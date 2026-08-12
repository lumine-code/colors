const { runs, waitsFor, waitsForPromise } = require("./helpers/waiters"); /*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const path = require("path");
require("./helpers/spec-helper");
const { mousedown } = require("./helpers/events");

const ColorBufferElement = require("../lib/color-buffer-element");

const sleep = async function (duration) {
  const t = new Date();
  await waitsFor(() => new Date() - t > duration);
};

describe("ColorBufferElement", function () {
  let [editor, editorElement, colorBuffer, colors, project, colorBufferElement, jasmineContent] =
    Array.from([]);

  const isVisible = (decoration) => !/-in-selection/.test(decoration.properties.class);

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

  const jsonFixture = function (fixture, data) {
    const jsonPath = path.resolve(__dirname, "fixtures", fixture);
    let json = fs.readFileSync(jsonPath).toString();
    json = json.replace(/#\{(\w+)\}/g, (m, w) => data[w]);

    return JSON.parse(json);
  };

  const getEditorDecorations = (_type) =>
    editor
      .getDecorations()
      .filter((d) => d.properties.class.startsWith("colors-native-background"));

  beforeEach(async function () {
    const workspaceElement = lumine.views.getView(lumine.workspace);
    jasmineContent = document.body.querySelector("#jasmine-content");

    jasmineContent.appendChild(workspaceElement);

    lumine.config.set("editor.softWrap", true);
    lumine.config.set("editor.softWrapAtPreferredLineLength", true);
    lumine.config.set("editor.preferredLineLength", 40);

    lumine.config.set("colors.delayBeforeScan", 0);
    lumine.config.set("colors.sourceNames", ["*.styl", "*.less"]);

    await waitsForPromise(() =>
      lumine.workspace.open("four-variables.styl").then(function (o) {
        editor = o;
        return (editorElement = lumine.views.getView(editor));
      }),
    );

    await waitsForPromise(() =>
      lumine.packages.activatePackage("colors").then(function (pkg) {
        colors = pkg.mainModule;
        return (project = colors.getProject());
      }),
    );
  });

  afterEach(async () => (colorBuffer != null ? colorBuffer.destroy() : undefined));

  return describe("when an editor is opened", function () {
    beforeEach(async function () {
      colorBuffer = project.colorBufferForEditor(editor);
      colorBufferElement = lumine.views.getView(colorBuffer);
      return colorBufferElement.attach();
    });

    it("is associated to the ColorBuffer model", async function () {
      expect(colorBufferElement).toBeDefined();
      return expect(colorBufferElement.getModel()).toBe(colorBuffer);
    });

    it("attaches itself in the target text editor element", async function () {
      expect(colorBufferElement.parentNode).toExist();
      return expect(editorElement.querySelector(".lines colors-markers")).toExist();
    });

    describe("when the color buffer is initialized", function () {
      beforeEach(async () => await waitsForPromise(() => colorBuffer.initialize()));

      it("creates markers views for every visible buffer marker", async () =>
        expect(getEditorDecorations("native-background").length).toEqual(3));

      describe("when the project variables are initialized", () =>
        it("creates markers for the new valid colors", async function () {
          await waitsForPromise(() => colorBuffer.variablesAvailable());
          await runs(() => expect(getEditorDecorations("native-background").length).toEqual(4));
        }));

      describe("when a selection intersects a marker range", function () {
        beforeEach(async () => spyOn(colorBufferElement, "updateSelections").and.callThrough());

        describe("after the markers views was created", function () {
          beforeEach(async function () {
            await waitsForPromise(() => colorBuffer.variablesAvailable());
            await runs(() =>
              editor.setSelectedBufferRange([
                [2, 12],
                [2, 14],
              ]),
            );
            await waitsFor(() => colorBufferElement.updateSelections.calls.count() > 0);
          });

          return it("hides the intersected marker", async function () {
            const decorations = getEditorDecorations("native-background");

            expect(isVisible(decorations[0])).toBeTruthy();
            expect(isVisible(decorations[1])).toBeTruthy();
            expect(isVisible(decorations[2])).toBeTruthy();
            return expect(isVisible(decorations[3])).toBeFalsy();
          });
        });

        return describe("before all the markers views was created", function () {
          beforeEach(async function () {
            await runs(() =>
              editor.setSelectedBufferRange([
                [0, 0],
                [2, 14],
              ]),
            );
            await waitsFor(() => colorBufferElement.updateSelections.calls.count() > 0);
          });

          it("hides the existing markers", async function () {
            const decorations = getEditorDecorations("native-background");

            expect(isVisible(decorations[0])).toBeFalsy();
            expect(isVisible(decorations[1])).toBeTruthy();
            return expect(isVisible(decorations[2])).toBeTruthy();
          });

          return describe("and the markers are updated", function () {
            beforeEach(async function () {
              await waitsForPromise("colors available", () => colorBuffer.variablesAvailable());
              await waitsFor("last marker visible", function () {
                const decorations = getEditorDecorations("native-background");
                return isVisible(decorations[3]);
              });
            });

            return it("hides the created markers", async function () {
              const decorations = getEditorDecorations("native-background");
              expect(isVisible(decorations[0])).toBeFalsy();
              expect(isVisible(decorations[1])).toBeTruthy();
              expect(isVisible(decorations[2])).toBeTruthy();
              return expect(isVisible(decorations[3])).toBeTruthy();
            });
          });
        });
      });

      describe("when some markers are destroyed", function () {
        let [spy] = Array.from([]);
        beforeEach(async function () {
          for (var el of colorBufferElement.usedMarkers) {
            spyOn(el, "release").and.callThrough();
          }

          spy = jasmine.createSpy("did-update");
          colorBufferElement.onDidUpdate(spy);
          editBuffer("", { start: [4, 0], end: [8, 0] });
          await waitsFor(() => spy.calls.count() > 0);
        });

        return it("releases the unused markers", async () =>
          expect(getEditorDecorations("native-background").length).toEqual(2));
      });

      describe("when the current pane is splitted to the right", function () {
        beforeEach(async function () {
          const version = parseFloat(
            lumine.application.getVersion().split(".").slice(1, 2).join("."),
          );
          if (version > 5) {
            lumine.commands.dispatch(editorElement, "pane:split-right-and-copy-active-item");
          } else {
            lumine.commands.dispatch(editorElement, "pane:split-right");
          }

          await waitsFor("text editor", () => (editor = lumine.workspace.getTextEditors()[1]));

          await waitsFor(
            "color buffer element",
            () => (colorBufferElement = lumine.views.getView(project.colorBufferForEditor(editor))),
          );
          await waitsFor(
            "color buffer element markers",
            () => getEditorDecorations("native-background").length,
          );
        });

        return it("should keep all the buffer elements attached", async function () {
          const editors = lumine.workspace.getTextEditors();

          return editors.forEach(function (editor) {
            editorElement = lumine.views.getView(editor);
            colorBufferElement = editorElement.querySelector("colors-markers");
            expect(colorBufferElement).toExist();

            return expect(getEditorDecorations("native-background").length).toEqual(4);
          });
        });
      });

      return describe("when the marker type is set to gutter", function () {
        let [gutter] = Array.from([]);

        beforeEach(async function () {
          await waitsForPromise(() => colorBuffer.initialize());
          await runs(async function () {
            lumine.config.set("colors.markerType", "gutter");
            return (gutter = editorElement.querySelector('[gutter-name="colors-gutter"]'));
          });
        });

        it("removes the markers", async () =>
          expect(colorBufferElement.querySelectorAll("colors-color-marker").length).toEqual(0));

        it("adds a custom gutter to the text editor", async () => expect(gutter).toExist());

        it("sets the size of the gutter based on the number of markers in the same row", async () =>
          expect(gutter.style.minWidth).toEqual("14px"));

        it("adds a gutter decoration for each color marker", async function () {
          const decorations = editor.getDecorations().filter((d) => d.properties.type === "gutter");
          return expect(decorations.length).toEqual(3);
        });

        describe("when the variables become available", function () {
          beforeEach(async () => await waitsForPromise(() => colorBuffer.variablesAvailable()));

          it("creates decorations for the new valid colors", async function () {
            const decorations = editor
              .getDecorations()
              .filter((d) => d.properties.type === "gutter");
            return expect(decorations.length).toEqual(4);
          });

          return describe("when many markers are added on the same line", function () {
            beforeEach(async function () {
              const updateSpy = jasmine.createSpy("did-update");
              colorBufferElement.onDidUpdate(updateSpy);

              editor.moveToBottom();
              editBuffer("\nlist = #123456, #987654, #abcdef\n");
              await waitsFor(() => updateSpy.calls.count() > 0);
            });

            it("adds the new decorations to the gutter", async function () {
              const decorations = editor
                .getDecorations()
                .filter((d) => d.properties.type === "gutter");

              return expect(decorations.length).toEqual(7);
            });

            it("sets the size of the gutter based on the number of markers in the same row", async () =>
              expect(gutter.style.minWidth).toEqual("42px"));

            return describe("clicking on a gutter decoration", function () {
              beforeEach(async function () {
                project.colorPickerAPI = { open: jasmine.createSpy("color-picker.open") };

                const decoration = editorElement.querySelector(".colors-gutter-marker span");
                return mousedown(decoration);
              });

              it("selects the text in the editor", async () =>
                expect(editor.getSelectedScreenRange()).toEqual([
                  [0, 13],
                  [0, 17],
                ]));

              return it("opens the color picker", async () =>
                expect(project.colorPickerAPI.open).toHaveBeenCalled());
            });
          });
        });

        describe("when the marker is changed again", function () {
          beforeEach(async () => lumine.config.set("colors.markerType", "native-background"));

          it("removes the gutter", async () =>
            expect(editorElement.querySelector('[gutter-name="colors-gutter"]')).not.toExist());

          return it("recreates the markers", async () =>
            expect(getEditorDecorations("native-background").length).toEqual(3));
        });

        return describe("when a new buffer is opened", function () {
          beforeEach(async function () {
            await waitsForPromise(() =>
              lumine.workspace.open("project/styles/variables.styl").then(function (e) {
                editor = e;
                editorElement = lumine.views.getView(editor);
                colorBuffer = project.colorBufferForEditor(editor);
                return (colorBufferElement = lumine.views.getView(colorBuffer));
              }),
            );

            await waitsForPromise(() => colorBuffer.initialize());
            await waitsForPromise(() => colorBuffer.variablesAvailable());

            await runs(
              () => (gutter = editorElement.querySelector('[gutter-name="colors-gutter"]')),
            );
          });

          return it("creates the decorations in the new buffer gutter", async function () {
            const decorations = editor
              .getDecorations()
              .filter((d) => d.properties.type === "gutter");

            return expect(decorations.length).toEqual(10);
          });
        });
      });
    });

    describe("when the editor is moved to another pane", function () {
      let [pane, newPane] = Array.from([]);
      beforeEach(async function () {
        pane = lumine.workspace.getActivePane();
        newPane = pane.splitDown({ copyActiveItem: false });
        colorBuffer = project.colorBufferForEditor(editor);
        colorBufferElement = lumine.views.getView(colorBuffer);

        pane.moveItemToPane(editor, newPane, 0);

        await waitsFor(() => getEditorDecorations("native-background").length);
      });

      return it("moves the editor with the buffer to the new pane", async () =>
        expect(getEditorDecorations("native-background").length).toEqual(3));
    });

    describe("when colors.supportedFiletypes settings is defined", function () {
      const loadBuffer = async function (filePath) {
        await waitsForPromise(() =>
          lumine.workspace.open(filePath).then(function (o) {
            editor = o;
            editorElement = lumine.views.getView(editor);
            colorBuffer = project.colorBufferForEditor(editor);
            colorBufferElement = lumine.views.getView(colorBuffer);
            return colorBufferElement.attach();
          }),
        );

        await waitsForPromise(() => colorBuffer.initialize());
        await waitsForPromise(() => colorBuffer.variablesAvailable());
      };

      beforeEach(async function () {
        await waitsForPromise(() => lumine.packages.activatePackage("language-coffee-script"));
        await waitsForPromise(() => lumine.packages.activatePackage("language-less"));
      });

      describe("with the default wildcard", function () {
        beforeEach(async () => lumine.config.set("colors.supportedFiletypes", ["*"]));

        return it("supports every filetype", async function () {
          loadBuffer("scope-filter.coffee");
          await runs(() => expect(getEditorDecorations("native-background").length).toEqual(2));

          loadBuffer("project/vendor/css/variables.less");
          await runs(() => expect(getEditorDecorations("native-background").length).toEqual(20));
        });
      });

      describe("with a filetype", function () {
        beforeEach(async () => lumine.config.set("colors.supportedFiletypes", ["coffee"]));

        return it("supports the specified file type", async function () {
          loadBuffer("scope-filter.coffee");
          await runs(() => expect(getEditorDecorations("native-background").length).toEqual(2));

          loadBuffer("project/vendor/css/variables.less");
          await runs(() => expect(getEditorDecorations("native-background").length).toEqual(0));
        });
      });

      return describe("with many filetypes", function () {
        beforeEach(async function () {
          lumine.config.set("colors.supportedFiletypes", ["coffee"]);
          return project.setSupportedFiletypes(["less"]);
        });

        it("supports the specified file types", async function () {
          loadBuffer("scope-filter.coffee");
          await runs(() => expect(getEditorDecorations("native-background").length).toEqual(2));

          loadBuffer("project/vendor/css/variables.less");
          await runs(() => expect(getEditorDecorations("native-background").length).toEqual(20));

          loadBuffer("four-variables.styl");
          await runs(() => expect(getEditorDecorations("native-background").length).toEqual(0));
        });

        return describe("with global file types ignored", function () {
          beforeEach(async function () {
            lumine.config.set("colors.supportedFiletypes", ["coffee"]);
            project.setIgnoreGlobalSupportedFiletypes(true);
            return project.setSupportedFiletypes(["less"]);
          });

          return it("supports the specified file types", async function () {
            loadBuffer("scope-filter.coffee");
            await runs(() => expect(getEditorDecorations("native-background").length).toEqual(0));

            loadBuffer("project/vendor/css/variables.less");
            await runs(() => expect(getEditorDecorations("native-background").length).toEqual(20));

            loadBuffer("four-variables.styl");
            await runs(() => expect(getEditorDecorations("native-background").length).toEqual(0));
          });
        });
      });
    });

    return describe("when colors.ignoredScopes settings is defined", function () {
      beforeEach(async function () {
        await waitsForPromise(() => lumine.packages.activatePackage("language-coffee-script"));

        await waitsForPromise(() =>
          lumine.workspace.open("scope-filter.coffee").then(function (o) {
            editor = o;
            editorElement = lumine.views.getView(editor);
            colorBuffer = project.colorBufferForEditor(editor);
            colorBufferElement = lumine.views.getView(colorBuffer);
            return colorBufferElement.attach();
          }),
        );

        await waitsForPromise(() => colorBuffer.initialize());
      });

      describe("with one filter", function () {
        beforeEach(async () => lumine.config.set("colors.ignoredScopes", ["\\.comment"]));

        return it("ignores the colors that matches the defined scopes", async () =>
          expect(getEditorDecorations("native-background").length).toEqual(1));
      });

      describe("with two filters", function () {
        beforeEach(async () =>
          lumine.config.set("colors.ignoredScopes", ["\\.string", "\\.comment"]),
        );

        return it("ignores the colors that matches the defined scopes", async () =>
          expect(getEditorDecorations("native-background").length).toEqual(0));
      });

      describe("with an invalid filter", function () {
        beforeEach(async () => lumine.config.set("colors.ignoredScopes", ["\\"]));

        return it("ignores the filter", async () =>
          expect(getEditorDecorations("native-background").length).toEqual(2));
      });

      return describe("when the project ignoredScopes is defined", function () {
        beforeEach(async function () {
          lumine.config.set("colors.ignoredScopes", ["\\.string"]);
          return project.setIgnoredScopes(["\\.comment"]);
        });

        return it("ignores the colors that matches the defined scopes", async () =>
          expect(getEditorDecorations("native-background").length).toEqual(0));
      });
    });
  });
});
