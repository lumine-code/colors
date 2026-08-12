// Registers the package's view provider for specs that build a ColorProject or
// a ColorBuffer directly rather than activating the package.
//
// The manifest's `viewProviders` entry only takes effect when the package
// activates, so a spec that constructs the model itself gets "Can't create a
// view for ColorBuffer instance" the moment the project opens an editor.

// Registered per spec rather than once per file: the harness rebuilds the
// environment between specs, and a provider added to the previous registry is
// not on the new one.
function registerViewProvider() {
  const main = require("../../lib/main");
  return lumine.views.addViewProvider((model) => main.colorsViewProvider(model));
}

module.exports = { registerViewProvider };
