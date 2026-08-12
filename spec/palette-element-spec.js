/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Color = require("../lib/color");
const Palette = require("../lib/palette");
const { THEME_VARIABLES } = require("../lib/uris");
const { change, click } = require("./helpers/events");

describe("PaletteElement", function () {
  let [nextID, palette, paletteElement, workspaceElement, colors, project] = Array.from([0]);

  const createVar = (name, color, path, line, isAlternate = false) => ({
    name,
    color,
    path,
    line,
    id: nextID++,
    isAlternate,
  });

  beforeEach(function () {
    workspaceElement = lumine.views.getView(lumine.workspace);
    lumine.config.set("colors.sourceNames", ["*.styl", "*.less"]);

    waitsForPromise(() =>
      lumine.packages.activatePackage("colors").then(function (pkg) {
        colors = pkg.mainModule;
        return (project = colors.getProject());
      }),
    );

    return waitsForPromise(() => project.initialize());
  });

  afterEach(() => project.destroy());

  describe("as a view provider", function () {
    beforeEach(function () {
      palette = new Palette([
        createVar("red", new Color("#ff0000"), "file.styl", 0),
        createVar("green", new Color("#00ff00"), "file.styl", 1),
        createVar("blue", new Color("#0000ff"), "file.styl", 2),
        createVar("redCopy", new Color("#ff0000"), "file.styl", 3),
        createVar("red_copy", new Color("#ff0000"), "file.styl", 3, true),
        createVar("red", new Color("#ff0000"), THEME_VARIABLES, 0),
      ]);

      paletteElement = lumine.views.getView(palette);
      return jasmine.attachToDOM(paletteElement);
    });

    it("is associated with the Palette model", () => expect(paletteElement).toBeDefined());

    it("does not render alernate form of a variable", () =>
      expect(paletteElement.querySelectorAll("li").length).toEqual(5));

    return it("does not render the file link when the variable comes from a theme", () =>
      expect(
        paletteElement.querySelectorAll("li")[4].querySelector(" [data-variable-id]"),
      ).not.toExist());
  });

  describe("when colors:show-palette commands is triggered", function () {
    beforeEach(function () {
      lumine.commands.dispatch(workspaceElement, "colors:show-palette");

      waitsFor(() => (paletteElement = workspaceElement.querySelector("colors-palette")));

      return runs(function () {
        palette = paletteElement.getModel();
        return jasmine.attachToDOM(paletteElement);
      });
    });

    it("opens a palette element", () => expect(paletteElement).toBeDefined());

    it("creates as many list item as there is colors in the project", function () {
      expect(paletteElement.querySelectorAll("li").length).not.toEqual(0);
      return expect(paletteElement.querySelectorAll("li").length).toEqual(
        palette.variables.filter((v) => !v.isAlternate).length,
      );
    });

    it("binds colors with project variables", function () {
      const projectVariables = project.getColorVariables();

      const li = paletteElement.querySelector("li");
      return expect(li.querySelector(".path").textContent).toEqual(
        lumine.project.relativize(projectVariables[0].path),
      );
    });

    describe("clicking on a result path", () =>
      it("shows the variable in its file", function () {
        spyOn(project, "showVariableInFile");

        const pathElement = paletteElement.querySelector("[data-variable-id]");

        click(pathElement);

        return waitsFor(() => project.showVariableInFile.callCount > 0);
      }));

    describe("when the sortPaletteColors settings is set to color", function () {
      beforeEach(() => lumine.config.set("colors.sortPaletteColors", "by color"));

      return it("reorders the colors", function () {
        const sortedColors = project
          .getPalette()
          .sortedByColor()
          .filter((v) => !v.isAlternate);
        const lis = paletteElement.querySelectorAll("li");

        return (() => {
          const result = [];
          for (let i = 0; i < sortedColors.length; i++) {
            var { name } = sortedColors[i];
            result.push(expect(lis[i].querySelector(".name").textContent).toEqual(name));
          }
          return result;
        })();
      });
    });

    describe("when the sortPaletteColors settings is set to name", function () {
      beforeEach(() => lumine.config.set("colors.sortPaletteColors", "by name"));

      return it("reorders the colors", function () {
        const sortedColors = project
          .getPalette()
          .sortedByName()
          .filter((v) => !v.isAlternate);
        const lis = paletteElement.querySelectorAll("li");

        return (() => {
          const result = [];
          for (let i = 0; i < sortedColors.length; i++) {
            var { name } = sortedColors[i];
            result.push(expect(lis[i].querySelector(".name").textContent).toEqual(name));
          }
          return result;
        })();
      });
    });

    describe("when the groupPaletteColors setting is set to file", function () {
      beforeEach(() => lumine.config.set("colors.groupPaletteColors", "by file"));

      it("renders the list with sublists for each files", function () {
        const ols = paletteElement.querySelectorAll("ol ol");
        return expect(ols.length).toEqual(5);
      });

      it("adds a header with the file path for each sublist", function () {
        const ols = paletteElement.querySelectorAll(".colors-color-group-header");
        return expect(ols.length).toEqual(5);
      });

      describe("and the sortPaletteColors is set to name", function () {
        beforeEach(() => lumine.config.set("colors.sortPaletteColors", "by name"));

        return it("sorts the nested list items", function () {
          const palettes = paletteElement.getFilesPalettes();
          const ols = paletteElement.querySelectorAll(".colors-color-group");
          let n = 0;

          return (() => {
            const result = [];
            for (var file in palettes) {
              palette = palettes[file];
              var ol = ols[n++];
              var lis = ol.querySelectorAll("li");
              var sortedColors = palette.sortedByName().filter((v) => !v.isAlternate);

              result.push(
                (() => {
                  const result1 = [];
                  for (let i = 0; i < sortedColors.length; i++) {
                    var { name } = sortedColors[i];
                    result1.push(expect(lis[i].querySelector(".name").textContent).toEqual(name));
                  }
                  return result1;
                })(),
              );
            }
            return result;
          })();
        });
      });

      return describe("when the mergeColorDuplicates", function () {
        beforeEach(() => lumine.config.set("colors.mergeColorDuplicates", true));

        return it("groups identical colors together", function () {
          const lis = paletteElement.querySelectorAll("li");

          return expect(lis.length).toEqual(40);
        });
      });
    });

    describe("sorting selector", function () {
      let [sortSelect] = Array.from([]);

      return describe("when changed", function () {
        beforeEach(function () {
          sortSelect = paletteElement.querySelector("#sort-palette-colors");
          sortSelect.querySelector('option[value="by name"]').setAttribute("selected", "selected");

          return change(sortSelect);
        });

        return it("changes the settings value", () =>
          expect(lumine.config.get("colors.sortPaletteColors")).toEqual("by name"));
      });
    });

    return describe("grouping selector", function () {
      let [groupSelect] = Array.from([]);

      return describe("when changed", function () {
        beforeEach(function () {
          groupSelect = paletteElement.querySelector("#group-palette-colors");
          groupSelect.querySelector('option[value="by file"]').setAttribute("selected", "selected");

          return change(groupSelect);
        });

        return it("changes the settings value", () =>
          expect(lumine.config.get("colors.groupPaletteColors")).toEqual("by file"));
      });
    });
  });

  describe("when the palette settings differs from defaults", function () {
    beforeEach(function () {
      lumine.config.set("colors.sortPaletteColors", "by name");
      lumine.config.set("colors.groupPaletteColors", "by file");
      return lumine.config.set("colors.mergeColorDuplicates", true);
    });

    return describe("when colors:show-palette commands is triggered", function () {
      beforeEach(function () {
        lumine.commands.dispatch(workspaceElement, "colors:show-palette");

        waitsFor(() => (paletteElement = workspaceElement.querySelector("colors-palette")));

        return runs(() => (palette = paletteElement.getModel()));
      });

      describe("the sorting selector", () =>
        it("selects the current value", function () {
          const sortSelect = paletteElement.querySelector("#sort-palette-colors");
          return expect(sortSelect.querySelector("option[selected]").value).toEqual("by name");
        }));

      describe("the grouping selector", () =>
        it("selects the current value", function () {
          const groupSelect = paletteElement.querySelector("#group-palette-colors");
          return expect(groupSelect.querySelector("option[selected]").value).toEqual("by file");
        }));

      return it("checks the merge checkbox", function () {
        const mergeCheckBox = paletteElement.querySelector("#merge-duplicates");
        return expect(mergeCheckBox.checked).toBeTruthy();
      });
    });
  });

  return describe("when the project variables are modified", function () {
    let [spy, initialColorCount] = Array.from([]);
    beforeEach(function () {
      lumine.commands.dispatch(workspaceElement, "colors:show-palette");

      waitsFor(() => (paletteElement = workspaceElement.querySelector("colors-palette")));

      runs(function () {
        palette = paletteElement.getModel();
        initialColorCount = palette.getColorsCount();
        spy = jasmine.createSpy("onDidUpdateVariables");

        project.onDidUpdateVariables(spy);

        return lumine.config.set("colors.sourceNames", ["*.styl", "*.less", "*.sass"]);
      });

      return waitsFor(() => spy.callCount > 0);
    });

    return it("updates the palette", function () {
      expect(palette.getColorsCount()).not.toEqual(initialColorCount);

      const lis = paletteElement.querySelectorAll("li");

      return expect(lis.length).not.toEqual(initialColorCount);
    });
  });
});
