/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const registry = require('../../lib/color-expressions');
const Pigments = require('../../lib/pigments');

const deserializers = {
  Palette: 'deserializePalette',
  ColorSearch: 'deserializeColorSearch',
  ColorProject: 'deserializeColorProject',
  ColorProjectElement: 'deserializeColorProjectElement',
  VariablesCollection: 'deserializeVariablesCollection'
};

beforeEach(function() {
  atom.config.set('pigments.markerType', 'native-background');
  atom.views.addViewProvider(Pigments.pigmentsViewProvider);

  for (var k in deserializers) {
    var v = deserializers[k];
    atom.deserializers.add({name: k, deserialize: Pigments[v]});
  }

  registry.removeExpression('pigments:variables');

  const jasmineContent = document.body.querySelector('#jasmine-content');
  jasmineContent.style.width = '100%';
  return jasmineContent.style.height = '100%';
});

afterEach(() => registry.removeExpression('pigments:variables'));
