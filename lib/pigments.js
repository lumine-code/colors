/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
let [
  Palette, PaletteElement,
  ColorSearch, ColorResultsElement,
  ColorProject, ColorProjectElement,
  ColorBuffer, ColorBufferElement,
  ColorMarker,
  VariablesCollection, PigmentsProvider, PigmentsAPI,
  Disposable,
  url, uris
] = Array.from([]);

module.exports = {
  activate(state) {
    if (ColorProject == null) { ColorProject = require('./color-project'); }

    this.project = (state.project != null) ?
      ColorProject.deserialize(state.project)
    :
      new ColorProject();

    atom.commands.add('atom-workspace', {
      'pigments:find-colors': () => this.findColors(),
      'pigments:show-palette': () => this.showPalette(),
      'pigments:project-settings': () => this.showSettings(),
      'pigments:reload': () => this.reloadProjectVariables(),
      'pigments:report': () => this.createPigmentsReport()
    }
    );

    const convertMethod = action => { return event => {
      if (this.lastEvent != null) {
        action(this.colorMarkerForMouseEvent(this.lastEvent));
      } else {
        const editor = atom.workspace.getActiveTextEditor();
        const colorBuffer = this.project.colorBufferForEditor(editor);

        editor.getCursors().forEach(cursor => {
          const marker = colorBuffer.getColorMarkerAtBufferPosition(cursor.getBufferPosition());
          return action(marker);
        });
      }

      return this.lastEvent = null;
    }; };

    const copyMethod = action => { return event => {
      if (this.lastEvent != null) {
        action(this.colorMarkerForMouseEvent(this.lastEvent));
      } else {
        const editor = atom.workspace.getActiveTextEditor();
        const colorBuffer = this.project.colorBufferForEditor(editor);
        const cursor = editor.getLastCursor();
        const marker = colorBuffer.getColorMarkerAtBufferPosition(cursor.getBufferPosition());
        action(marker);
      }

      return this.lastEvent = null;
    }; };

    atom.commands.add('atom-text-editor', {
      'pigments:convert-to-hex': convertMethod(function(marker) {
        if (marker != null) { return marker.convertContentToHex(); }
      }),

      'pigments:convert-to-rgb': convertMethod(function(marker) {
        if (marker != null) { return marker.convertContentToRGB(); }
      }),

      'pigments:convert-to-rgba': convertMethod(function(marker) {
        if (marker != null) { return marker.convertContentToRGBA(); }
      }),

      'pigments:convert-to-hsl': convertMethod(function(marker) {
        if (marker != null) { return marker.convertContentToHSL(); }
      }),

      'pigments:convert-to-hsla': convertMethod(function(marker) {
        if (marker != null) { return marker.convertContentToHSLA(); }
      }),

      'pigments:copy-as-hex': copyMethod(function(marker) {
        if (marker != null) { return marker.copyContentAsHex(); }
      }),

      'pigments:copy-as-rgb': copyMethod(function(marker) {
        if (marker != null) { return marker.copyContentAsRGB(); }
      }),

      'pigments:copy-as-rgba': copyMethod(function(marker) {
        if (marker != null) { return marker.copyContentAsRGBA(); }
      }),

      'pigments:copy-as-hsl': copyMethod(function(marker) {
        if (marker != null) { return marker.copyContentAsHSL(); }
      }),

      'pigments:copy-as-hsla': copyMethod(function(marker) {
        if (marker != null) { return marker.copyContentAsHSLA(); }
      })
    }
    );

    atom.workspace.addOpener(uriToOpen => {
      if (!url) { url = require('url'); }

      const {protocol, host} = url.parse(uriToOpen);
      if (protocol !== 'pigments:') { return; }

      switch (host) {
        case 'search': return this.project.findAllColors();
        case 'palette': return this.project.getPalette();
        case 'settings': return atom.views.getView(this.project);
      }
    });

    return atom.contextMenu.add({
      'atom-text-editor': [{
        label: 'Pigments',
        submenu: [
          {label: 'Convert to hexadecimal', command: 'pigments:convert-to-hex'},
          {label: 'Convert to RGB', command: 'pigments:convert-to-rgb'},
          {label: 'Convert to RGBA', command: 'pigments:convert-to-rgba'},
          {label: 'Convert to HSL', command: 'pigments:convert-to-hsl'},
          {label: 'Convert to HSLA', command: 'pigments:convert-to-hsla'},
          {type: 'separator'},
          {label: 'Copy as hexadecimal', command: 'pigments:copy-as-hex'},
          {label: 'Copy as RGB', command: 'pigments:copy-as-rgb'},
          {label: 'Copy as RGBA', command: 'pigments:copy-as-rgba'},
          {label: 'Copy as HSL', command: 'pigments:copy-as-hsl'},
          {label: 'Copy as HSLA', command: 'pigments:copy-as-hsla'}
        ],
        shouldDisplay: event => this.shouldDisplayContextMenu(event)
      }]});
  },

  deactivate() {
    return __guardMethod__(this.getProject(), 'destroy', o => o.destroy());
  },

  provideAutocomplete() {
    if (PigmentsProvider == null) { PigmentsProvider = require('./pigments-provider'); }
    return new PigmentsProvider(this);
  },

  provideAPI() {
    if (PigmentsAPI == null) { PigmentsAPI = require('./pigments-api'); }
    return new PigmentsAPI(this.getProject());
  },

  consumeColorPicker(api) {
    if (Disposable == null) { ({
      Disposable
    } = require('atom')); }

    this.getProject().setColorPickerAPI(api);

    return new Disposable(() => {
      return this.getProject().setColorPickerAPI(null);
    });
  },

  consumeColorExpressions(options={}) {
    if (Disposable == null) { ({
      Disposable
    } = require('atom')); }

    const registry = this.getProject().getColorExpressionsRegistry();

    if (options.expressions != null) {
      const names = options.expressions.map(e => e.name);
      registry.createExpressions(options.expressions);

      return new Disposable(() => names.map((name) => registry.removeExpression(name)));
    } else {
      const {name, regexpString, handle, scopes, priority} = options;
      registry.createExpression(name, regexpString, priority, scopes, handle);

      return new Disposable(() => registry.removeExpression(name));
    }
  },

  consumeVariableExpressions(options={}) {
    if (Disposable == null) { ({
      Disposable
    } = require('atom')); }

    const registry = this.getProject().getVariableExpressionsRegistry();

    if (options.expressions != null) {
      const names = options.expressions.map(e => e.name);
      registry.createExpressions(options.expressions);

      return new Disposable(() => names.map((name) => registry.removeExpression(name)));
    } else {
      const {name, regexpString, handle, scopes, priority} = options;
      registry.createExpression(name, regexpString, priority, scopes, handle);

      return new Disposable(() => registry.removeExpression(name));
    }
  },

  deserializePalette(state) {
    if (Palette == null) { Palette = require('./palette'); }
    return Palette.deserialize(state);
  },

  deserializeColorSearch(state) {
    if (ColorSearch == null) { ColorSearch = require('./color-search'); }
    return ColorSearch.deserialize(state);
  },

  deserializeColorProject(state) {
    if (ColorProject == null) { ColorProject = require('./color-project'); }
    return ColorProject.deserialize(state);
  },

  deserializeColorProjectElement(state) {
    if (ColorProjectElement == null) { ColorProjectElement = require('./color-project-element'); }
    const element = new ColorProjectElement;

    if (this.project != null) {
      element.setModel(this.getProject());
    } else {
      var subscription = atom.packages.onDidActivatePackage(pkg => {
        if (pkg.name === 'pigments') {
          subscription.dispose();
          return element.setModel(this.getProject());
        }
      });
    }

    return element;
  },

  deserializeVariablesCollection(state) {
    if (VariablesCollection == null) { VariablesCollection = require('./variables-collection'); }
    return VariablesCollection.deserialize(state);
  },

  pigmentsViewProvider(model) {
    let element;
    element = (() => {
      if (model instanceof (ColorBuffer != null ? ColorBuffer : (ColorBuffer = require('./color-buffer')))) {
      if (ColorBufferElement == null) { ColorBufferElement = require('./color-buffer-element'); }
      return element = new ColorBufferElement;
    } else if (model instanceof (ColorSearch != null ? ColorSearch : (ColorSearch = require('./color-search')))) {
      if (ColorResultsElement == null) { ColorResultsElement = require('./color-results-element'); }
      return element = new ColorResultsElement;
    } else if (model instanceof (ColorProject != null ? ColorProject : (ColorProject = require('./color-project')))) {
      if (ColorProjectElement == null) { ColorProjectElement = require('./color-project-element'); }
      return element = new ColorProjectElement;
    } else if (model instanceof (Palette != null ? Palette : (Palette = require('./palette')))) {
      if (PaletteElement == null) { PaletteElement = require('./palette-element'); }
      return element = new PaletteElement;
    }
    })();

    if (element != null) { element.setModel(model); }
    return element;
  },

  shouldDisplayContextMenu(event) {
    this.lastEvent = event;
    setTimeout((() => { return this.lastEvent = null; }), 10);
    return (this.colorMarkerForMouseEvent(event) != null);
  },

  colorMarkerForMouseEvent(event) {
    const editor = atom.workspace.getActiveTextEditor();
    const colorBuffer = this.project.colorBufferForEditor(editor);
    const colorBufferElement = atom.views.getView(colorBuffer);
    return (colorBufferElement != null ? colorBufferElement.colorMarkerForMouseEvent(event) : undefined);
  },

  serialize() { return {project: this.project.serialize()}; },

  getProject() { return this.project; },

  findColors() {
    if (uris == null) { uris = require('./uris'); }

    let pane = atom.workspace.paneForURI(uris.SEARCH);
    if (!pane) { pane = atom.workspace.getActivePane(); }

    return atom.workspace.openURIInPane(uris.SEARCH, pane, {});
  },

  showPalette() {
    if (uris == null) { uris = require('./uris'); }

    return this.project.initialize().then(function() {
      let pane = atom.workspace.paneForURI(uris.PALETTE);
      if (!pane) { pane = atom.workspace.getActivePane(); }

      return atom.workspace.openURIInPane(uris.PALETTE, pane, {});}).catch(reason => console.error(reason));
  },

  showSettings() {
    if (uris == null) { uris = require('./uris'); }

    return this.project.initialize().then(function() {
      let pane = atom.workspace.paneForURI(uris.SETTINGS);
      if (!pane) { pane = atom.workspace.getActivePane(); }

      return atom.workspace.openURIInPane(uris.SETTINGS, pane, {});}).catch(reason => console.error(reason));
  },

  reloadProjectVariables() { return this.project.reload(); },

  createPigmentsReport() {
    return atom.workspace.open('pigments-report.json').then(editor => {
      return editor.setText(this.createReport());
    });
  },

  createReport() {
    const o = {
      atom: atom.getVersion(),
      pigments: atom.packages.getLoadedPackage('pigments').metadata.version,
      platform: require('os').platform(),
      config: atom.config.get('pigments'),
      project: {
        config: {
          sourceNames: this.project.sourceNames,
          searchNames: this.project.searchNames,
          ignoredNames: this.project.ignoredNames,
          ignoredScopes: this.project.ignoredScopes,
          includeThemes: this.project.includeThemes,
          ignoreGlobalSourceNames: this.project.ignoreGlobalSourceNames,
          ignoreGlobalSearchNames: this.project.ignoreGlobalSearchNames,
          ignoreGlobalIgnoredNames: this.project.ignoreGlobalIgnoredNames,
          ignoreGlobalIgnoredScopes: this.project.ignoreGlobalIgnoredScopes
        },
        paths: this.project.getPaths(),
        variables: {
          colors: this.project.getColorVariables().length,
          total: this.project.getVariables().length
        }
      }
    };

    return JSON.stringify(o, null, 2)
    .replace(new RegExp(`${atom.project.getPaths().join('|')}`, 'g'), '<root>');
  }
};

function __guardMethod__(obj, methodName, transform) {
  if (typeof obj !== 'undefined' && obj !== null && typeof obj[methodName] === 'function') {
    return transform(obj, methodName);
  } else {
    return undefined;
  }
}