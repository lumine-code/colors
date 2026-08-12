const { runs, waitsFor, waitsForPromise } = require("./helpers/waiters"); /*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { Disposable } = require("lumine");
const ColorsAPI = require("../lib/colors-api");
const registry = require("../lib/variable-expressions");

const { SERIALIZE_VERSION, SERIALIZE_MARKERS_VERSION } = require("../lib/versions");

describe("Colors", function () {
  let [workspaceElement, colors, project] = Array.from([]);

  beforeEach(async function () {
    workspaceElement = lumine.views.getView(lumine.workspace);
    jasmine.attachToDOM(workspaceElement);

    lumine.config.set("colors.sourceNames", ["**/*.sass", "**/*.styl"]);
    lumine.config.set("colors.ignoredNames", []);
    lumine.config.set("colors.ignoredScopes", []);
    lumine.config.set("colors.autocompleteScopes", []);

    registry.createExpression(
      "colors:txt_vars",
      "^[ \\t]*([a-zA-Z_$][a-zA-Z0-9\\-_]*)\\s*=(?!=)\\s*([^\\n\\r;]*);?$",
      ["txt"],
    );

    await waitsForPromise({ label: "colors activation" }, () =>
      lumine.packages.activatePackage("colors").then(function (pkg) {
        colors = pkg.mainModule;
        return (project = colors.getProject());
      }),
    );
  });

  afterEach(async function () {
    registry.removeExpression("colors:txt_vars");
    return project != null ? project.destroy() : undefined;
  });

  it("instanciates a ColorProject instance", async () => expect(colors.getProject()).toBeDefined());

  it("serializes the project", async function () {
    const date = new Date();
    spyOn(colors.getProject(), "getTimestamp").and.callFake(() => date);
    return expect(colors.serialize()).toEqual({
      project: {
        deserializer: "ColorProject",
        timestamp: date,
        version: SERIALIZE_VERSION,
        markersVersion: SERIALIZE_MARKERS_VERSION,
        globalSourceNames: ["**/*.sass", "**/*.styl"],
        globalIgnoredNames: [],
        buffers: {},
      },
    });
  });

  describe("when deactivated", function () {
    let [editor, editorElement, colorBuffer] = Array.from([]);
    beforeEach(async function () {
      await waitsForPromise({ label: "text-editor opened" }, () =>
        lumine.workspace.open("four-variables.styl").then(function (e) {
          editor = e;
          return (colorBuffer = project.colorBufferForEditor(editor));
        }),
      );

      await waitsFor("colors markers appended to the DOM", () =>
        editorElement.querySelector("colors-markers"),
      );

      await runs(async function () {
        spyOn(project, "destroy").and.callThrough();
        spyOn(colorBuffer, "destroy").and.callThrough();

        return colors.deactivate();
      });
    });

    it("destroys the colors project", async () => expect(project.destroy).toHaveBeenCalled());

    it("destroys all the color buffers that were created", async function () {
      expect(project.colorBufferForEditor(editor)).toBeUndefined();
      expect(project.colorBuffersByEditorId).toBeNull();
      return expect(colorBuffer.destroy).toHaveBeenCalled();
    });

    return it("destroys the color buffer element that were added to the DOM", async () =>
      expect(editorElement.querySelector("colors-markers")).not.toExist());
  });

  describe("colors:project-settings", function () {
    let item = null;
    beforeEach(async function () {
      lumine.commands.dispatch(workspaceElement, "colors:project-settings");

      await waitsFor("active pane item", function () {
        item = lumine.workspace.getActivePaneItem();
        return item != null;
      });
    });

    return it("opens a settings view in the active pane", async () =>
      item.matches("colors-color-project"));
  });

  //#       ###    ########  ####
  //#      ## ##   ##     ##  ##
  //#     ##   ##  ##     ##  ##
  //#    ##     ## ########   ##
  //#    ######### ##         ##
  //#    ##     ## ##         ##
  //#    ##     ## ##        ####

  describe("API provider", function () {
    let [service, editor] = Array.from([]);
    beforeEach(async function () {
      await waitsForPromise({ label: "text-editor opened" }, () =>
        lumine.workspace.open("four-variables.styl").then(function (e) {
          editor = e;
          return project.colorBufferForEditor(editor);
        }),
      );

      await runs(() => (service = colors.provideColorsProject()));

      await waitsForPromise({ label: "project initialized" }, () => project.initialize());
    });

    it("returns an object conforming to the API", async function () {
      expect(service instanceof ColorsAPI).toBeTruthy();

      expect(service.getProject()).toBe(project);

      expect(service.getPalette()).toEqual(project.getPalette());
      expect(service.getPalette()).not.toBe(project.getPalette());

      expect(service.getVariables()).toEqual(project.getVariables());
      return expect(service.getColorVariables()).toEqual(project.getColorVariables());
    });

    return describe("::observeColorBuffers", function () {
      let [spy] = Array.from([]);

      beforeEach(async function () {
        spy = jasmine.createSpy("did-create-color-buffer");
        return service.observeColorBuffers(spy);
      });

      it("calls the callback for every existing color buffer", async function () {
        expect(spy).toHaveBeenCalled();
        return expect(spy.calls.count()).toEqual(1);
      });

      return it("calls the callback on every new buffer creation", async function () {
        await waitsForPromise({ label: "text-editor opened" }, () =>
          lumine.workspace.open("buttons.styl"),
        );

        await runs(() => expect(spy.calls.count()).toEqual(2));
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

  describe("color expression consumer", function () {
    let [colorProvider, consumerDisposable, editor, colorBuffer, otherConsumerDisposable] =
      Array.from([]);
    beforeEach(async function () {
      return (colorProvider = {
        name: "todo",
        regexpString: "TODO",
        scopes: ["*"],
        priority: 0,
        handle(_match, _expression, _context) {
          return (this.red = 255);
        },
      });
    });

    afterEach(async function () {
      if (consumerDisposable != null) {
        consumerDisposable.dispose();
      }
      return otherConsumerDisposable != null ? otherConsumerDisposable.dispose() : undefined;
    });

    describe("when consumed before opening a text editor", function () {
      beforeEach(async function () {
        consumerDisposable = colors.consumeColorExpressions(colorProvider);

        await waitsForPromise({ label: "text-editor opened" }, () =>
          lumine.workspace.open("color-consumer-sample.txt").then(function (e) {
            editor = e;
            return (colorBuffer = project.colorBufferForEditor(editor));
          }),
        );

        await waitsForPromise({ label: "color buffer initialized" }, () =>
          colorBuffer.initialize(),
        );
        await waitsForPromise({ label: "color buffer variables available" }, () =>
          colorBuffer.variablesAvailable(),
        );
      });

      it("parses the new expression and renders a color", async () =>
        expect(colorBuffer.getColorMarkers().length).toEqual(1));

      it("returns a Disposable instance", async () =>
        expect(consumerDisposable instanceof Disposable).toBeTruthy());

      return describe("the returned disposable", function () {
        it("removes the provided expression from the registry", async function () {
          consumerDisposable.dispose();

          return expect(
            project.getColorExpressionsRegistry().getExpression("todo"),
          ).toBeUndefined();
        });

        return it("triggers an update in the opened editors", async function () {
          const updateSpy = jasmine.createSpy("did-update-color-markers");

          colorBuffer.onDidUpdateColorMarkers(updateSpy);
          consumerDisposable.dispose();

          await waitsFor(
            "did-update-color-markers event dispatched",
            () => updateSpy.calls.count() > 0,
          );

          await runs(() => expect(colorBuffer.getColorMarkers().length).toEqual(0));
        });
      });
    });

    describe("when consumed after opening a text editor", function () {
      beforeEach(async function () {
        await waitsForPromise({ label: "text-editor opened" }, () =>
          lumine.workspace.open("color-consumer-sample.txt").then(function (e) {
            editor = e;
            return (colorBuffer = project.colorBufferForEditor(editor));
          }),
        );

        await waitsForPromise({ label: "color buffer initialized" }, () =>
          colorBuffer.initialize(),
        );
        await waitsForPromise({ label: "color buffer variables available" }, () =>
          colorBuffer.variablesAvailable(),
        );
      });

      it("triggers an update in the opened editors", async function () {
        const updateSpy = jasmine.createSpy("did-update-color-markers");

        colorBuffer.onDidUpdateColorMarkers(updateSpy);
        consumerDisposable = colors.consumeColorExpressions(colorProvider);

        await waitsFor(
          "did-update-color-markers event dispatched",
          () => updateSpy.calls.count() > 0,
        );

        await runs(async function () {
          expect(colorBuffer.getColorMarkers().length).toEqual(1);

          return consumerDisposable.dispose();
        });

        await waitsFor(
          "did-update-color-markers event dispatched",
          () => updateSpy.calls.count() > 1,
        );

        await runs(() => expect(colorBuffer.getColorMarkers().length).toEqual(0));
      });

      return describe("when an array of expressions is passed", () =>
        it("triggers an update in the opened editors", async function () {
          const updateSpy = jasmine.createSpy("did-update-color-markers");

          colorBuffer.onDidUpdateColorMarkers(updateSpy);
          consumerDisposable = colors.consumeColorExpressions({
            expressions: [colorProvider],
          });

          await waitsFor(
            "did-update-color-markers event dispatched",
            () => updateSpy.calls.count() > 0,
          );

          await runs(async function () {
            expect(colorBuffer.getColorMarkers().length).toEqual(1);

            return consumerDisposable.dispose();
          });

          await waitsFor(
            "did-update-color-markers event dispatched",
            () => updateSpy.calls.count() > 1,
          );

          await runs(() => expect(colorBuffer.getColorMarkers().length).toEqual(0));
        }));
    });

    return describe("when the expression matches a variable value", function () {
      beforeEach(
        async () =>
          await waitsForPromise({ label: "project initialized" }, () => project.initialize()),
      );

      it("detects the new variable as a color variable", async function () {
        const variableSpy = jasmine.createSpy("did-update-variables");

        project.onDidUpdateVariables(variableSpy);

        lumine.config.set("colors.sourceNames", ["**/*.txt"]);

        await waitsFor("variables updated", () => variableSpy.calls.count() > 1);

        await runs(async function () {
          expect(project.getVariables().length).toEqual(6);
          expect(project.getColorVariables().length).toEqual(4);

          return (consumerDisposable = colors.consumeColorExpressions(colorProvider));
        });

        await waitsFor("variables updated", () => variableSpy.calls.count() > 2);

        await runs(async function () {
          expect(project.getVariables().length).toEqual(6);
          return expect(project.getColorVariables().length).toEqual(5);
        });
      });

      return describe("and there was an expression that could not be resolved before", () =>
        it("updates the invalid color as a now valid color", async function () {
          const variableSpy = jasmine.createSpy("did-update-variables");

          project.onDidUpdateVariables(variableSpy);

          lumine.config.set("colors.sourceNames", ["**/*.txt"]);

          await waitsFor("variables updated", () => variableSpy.calls.count() > 1);

          await runs(async function () {
            otherConsumerDisposable = colors.consumeColorExpressions({
              name: "bar",
              regexpString: "baz\\s+(\\w+)",
              handle(match, expression, context) {
                const [_, expr] = Array.from(match);

                const color = context.readColor(expr);

                if (context.isInvalid(color)) {
                  return (this.invalid = true);
                }

                return (this.rgba = color.rgba);
              },
            });

            consumerDisposable = colors.consumeColorExpressions(colorProvider);

            await waitsFor("variables updated", () => variableSpy.calls.count() > 2);

            await runs(async function () {
              expect(project.getVariables().length).toEqual(6);
              expect(project.getColorVariables().length).toEqual(6);
              expect(project.getVariableByName("bar").color.invalid).toBeFalsy();

              return consumerDisposable.dispose();
            });

            await waitsFor("variables updated", () => variableSpy.calls.count() > 3);

            await runs(async function () {
              expect(project.getVariables().length).toEqual(6);
              expect(project.getColorVariables().length).toEqual(5);
              return expect(project.getVariableByName("bar").color.invalid).toBeTruthy();
            });
          });
        }));
    });
  });

  //#    ##     ##    ###    ########   ######
  //#    ##     ##   ## ##   ##     ## ##    ##
  //#    ##     ##  ##   ##  ##     ## ##
  //#    ##     ## ##     ## ########   ######
  //#     ##   ##  ######### ##   ##         ##
  //#      ## ##   ##     ## ##    ##  ##    ##
  //#       ###    ##     ## ##     ##  ######

  return describe("variable expression consumer", function () {
    let [variableProvider, consumerDisposable] = Array.from([]);

    beforeEach(async function () {
      variableProvider = {
        name: "todo",
        regexpString: "(TODO):\\s*([^;\\n]+)",
      };

      await waitsForPromise({ label: "project initialized" }, () => project.initialize());
    });

    afterEach(async () => (consumerDisposable != null ? consumerDisposable.dispose() : undefined));

    it("updates the project variables when consumed", async function () {
      const variableSpy = jasmine.createSpy("did-update-variables");

      project.onDidUpdateVariables(variableSpy);

      lumine.config.set("colors.sourceNames", ["**/*.txt"]);

      await waitsFor("variables updated", () => variableSpy.calls.count() > 1);

      await runs(async function () {
        expect(project.getVariables().length).toEqual(6);
        expect(project.getColorVariables().length).toEqual(4);

        return (consumerDisposable = colors.consumeVariableExpressions(variableProvider));
      });

      await waitsFor(
        "variables updated after service consumed",
        () => variableSpy.calls.count() > 2,
      );

      await runs(async function () {
        expect(project.getVariables().length).toEqual(7);
        expect(project.getColorVariables().length).toEqual(4);

        return consumerDisposable.dispose();
      });

      await waitsFor(
        "variables updated after service disposed",
        () => variableSpy.calls.count() > 3,
      );

      await runs(async function () {
        expect(project.getVariables().length).toEqual(6);
        return expect(project.getColorVariables().length).toEqual(4);
      });
    });

    return describe("when an array of expressions is passed", () =>
      it("updates the project variables when consumed", async function () {
        let previousVariablesCount = null;
        lumine.config.set("colors.sourceNames", ["**/*.txt"]);

        await waitsFor("variables initialized", () => project.getVariables().length === 45);

        await runs(() => (previousVariablesCount = project.getVariables().length));

        await waitsFor("variables updated", () => project.getVariables().length === 6);

        await runs(async function () {
          expect(project.getVariables().length).toEqual(6);
          expect(project.getColorVariables().length).toEqual(4);

          previousVariablesCount = project.getVariables().length;

          return (consumerDisposable = colors.consumeVariableExpressions({
            expressions: [variableProvider],
          }));
        });

        await waitsFor(
          "variables updated after service consumed",
          () => project.getVariables().length !== previousVariablesCount,
        );

        await runs(async function () {
          expect(project.getVariables().length).toEqual(7);
          expect(project.getColorVariables().length).toEqual(4);

          previousVariablesCount = project.getVariables().length;

          return consumerDisposable.dispose();
        });

        await waitsFor(
          "variables updated after service disposed",
          () => project.getVariables().length !== previousVariablesCount,
        );

        await runs(async function () {
          expect(project.getVariables().length).toEqual(6);
          return expect(project.getColorVariables().length).toEqual(4);
        });
      }));
  });
});
