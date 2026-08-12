/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
let ColorSearch;
let [Emitter, Minimatch, ColorContext, registry] = Array.from([]);

module.exports =
(ColorSearch = class ColorSearch {
  static deserialize(state) { return new ColorSearch(state.options); }

  constructor(options={}) {
    this.options = options;
    ({sourceNames: this.sourceNames, ignoredNames: this.ignoredNameSources, context: this.context, project: this.project} = this.options);
    if (Emitter == null) { ({Emitter} = require('atom')); }
    this.emitter = new Emitter;

    if (this.project != null) {
      this.init();
    } else {
      var subscription = atom.packages.onDidActivatePackage(pkg => {
        if (pkg.name === 'pigments') {
          subscription.dispose();
          this.project = pkg.mainModule.getProject();
          return this.init();
        }
      });
    }
  }

  init() {
    if (Minimatch == null) { ({Minimatch} = require('minimatch')); }
    if (ColorContext == null) { ColorContext = require('./color-context'); }

    if (this.context == null) { this.context = new ColorContext({registry: this.project.getColorExpressionsRegistry()}); }

    this.parser = this.context.parser;
    this.variables = this.context.getVariables();
    if (this.sourceNames == null) { this.sourceNames = []; }
    if (this.ignoredNameSources == null) { this.ignoredNameSources = []; }

    this.ignoredNames = [];
    for (var ignore of this.ignoredNameSources) {
      if (ignore != null) {
        try {
          this.ignoredNames.push(new Minimatch(ignore, {matchBase: true, dot: true}));
        } catch (error) {
          console.warn(`Error parsing ignore pattern (${ignore}): ${error.message}`);
        }
      }
    }

    if (this.searchRequested) { return this.search(); }
  }

  getTitle() { return 'Pigments Find Results'; }

  getURI() { return 'pigments://search'; }

  getIconName() { return "pigments"; }

  onDidFindMatches(callback) {
    return this.emitter.on('did-find-matches', callback);
  }

  onDidCompleteSearch(callback) {
    return this.emitter.on('did-complete-search', callback);
  }

  search() {
    if (this.project == null) {
      this.searchRequested = true;
      return;
    }

    const re = new RegExp(this.project.getColorExpressionsRegistry().getRegExp());
    const results = [];

    const promise = atom.workspace.scan(re, {paths: this.sourceNames}, m => {
      const relativePath = atom.project.relativize(m.filePath);
      const scope = this.project.scopeFromFileName(relativePath);
      if (this.isIgnored(relativePath)) { return; }

      const newMatches = [];
      for (var result of m.matches) {
        result.color = this.parser.parse(result.matchText, scope);
        // FIXME it should be handled way before, but it'll need a change
        // in how we test if a variable is a color.
        if (!(result.color != null ? result.color.isValid() : undefined)) { continue; }
        // FIXME Seems like, sometime the range of the result is undefined,
        // we'll ignore that for now and log the faulting result.
        if (result.range[0] == null) {
          console.warn("Color search returned a result with an invalid range", result);
          continue;
        }
        result.range[0][1] += result.matchText.indexOf(result.color.colorExpression);
        result.matchText = result.color.colorExpression;

        results.push(result);
        newMatches.push(result);
      }

      m.matches = newMatches;

      if (m.matches.length > 0) { return this.emitter.emit('did-find-matches', m); }
    });

    return promise.then(() => {
      this.results = results;
      return this.emitter.emit('did-complete-search', results);
    });
  }

  isIgnored(relativePath) {
    for (var ignoredName of this.ignoredNames) {
      if (ignoredName.match(relativePath)) { return true; }
    }
  }

  serialize() {
    return {
      deserializer: 'ColorSearch',
      options: {
        sourceNames: this.sourceNames,
        ignoredNames: this.ignoredNameSources
      }
    };
  }
});
