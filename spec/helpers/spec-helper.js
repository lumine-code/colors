/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const registry = require("../../lib/color-expressions");
const Colors = require("../../lib/main");

const deserializers = {
  Palette: "deserializePalette",
  ColorSearch: "deserializeColorSearch",
  ColorProject: "deserializeColorProject",
  ColorProjectElement: "deserializeColorProjectElement",
  VariablesCollection: "deserializeVariablesCollection",
};

beforeEach(function () {
  lumine.config.set("colors.markerType", "native-background");
  lumine.views.addViewProvider(Colors.colorsViewProvider);

  for (var k in deserializers) {
    var v = deserializers[k];
    lumine.deserializers.add({ name: k, deserialize: Colors[v] });
  }

  registry.removeExpression("colors:variables");

  const jasmineContent = document.body.querySelector("#jasmine-content");
  jasmineContent.style.width = "100%";
  return (jasmineContent.style.height = "100%");
});

afterEach(() => registry.removeExpression("colors:variables"));
