/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
let ExpressionsRegistry;
let [Emitter, vm] = Array.from([]);

module.exports =
(ExpressionsRegistry = class ExpressionsRegistry {
  static deserialize(serializedData, expressionsType) {
    if (vm == null) { vm = require('vm'); }

    const registry = new ExpressionsRegistry(expressionsType);

    for (var name in serializedData.expressions) {
      var data = serializedData.expressions[name];
      var handle = vm.runInNewContext(data.handle.replace('function', "handle = function"), {console, require});
      registry.createExpression(name, data.regexpString, data.priority, data.scopes, handle);
    }

    registry.regexpStrings['none'] = serializedData.regexpString;

    return registry;
  }

  // The {Object} where color expression handlers are stored
  constructor(expressionsType) {
    this.expressionsType = expressionsType;
    if (Emitter == null) { ({
      Emitter
    } = require('event-kit')); }

    this.colorExpressions = {};
    this.emitter = new Emitter;
    this.regexpStrings = {};
  }

  dispose() {
    return this.emitter.dispose();
  }

  onDidAddExpression(callback) {
    return this.emitter.on('did-add-expression', callback);
  }

  onDidRemoveExpression(callback) {
    return this.emitter.on('did-remove-expression', callback);
  }

  onDidUpdateExpressions(callback) {
    return this.emitter.on('did-update-expressions', callback);
  }

  getExpressions() {
    return ((() => {
      const result = [];
      for (var k in this.colorExpressions) {
        var e = this.colorExpressions[k];
        result.push(e);
      }
      return result;
    })()).sort((a, b) => b.priority - a.priority);
  }

  getExpressionsForScope(scope) {
    const expressions = this.getExpressions();

    if (scope === '*') { return expressions; }

    const matchScope = a => (function(b) {
      const [aa, ab] = Array.from(a.split(':'));
      const [ba, bb] = Array.from(b.split(':'));

      return (aa === ba) && ((ab == null) || (bb == null) || (ab === bb));
    });

    return expressions.filter(e => e.scopes.includes('*') || e.scopes.some(matchScope(scope)));
  }

  getExpression(name) { return this.colorExpressions[name]; }

  getRegExp() {
    return this.regexpStrings['none'] != null ? this.regexpStrings['none'] : (this.regexpStrings['none'] = this.getExpressions().map(e => `(${e.regexpString})`).join('|'));
  }

  getRegExpForScope(scope) {
    return this.regexpStrings[scope] != null ? this.regexpStrings[scope] : (this.regexpStrings[scope] = this.getExpressionsForScope(scope).map(e => `(${e.regexpString})`).join('|'));
  }

  createExpression(name, regexpString, priority=0, scopes=['*'], handle) {
    if (typeof priority === 'function') {
      handle = priority;
      scopes = ['*'];
      priority = 0;
    } else if (typeof priority === 'object') {
      if (typeof scopes === 'function') { handle = scopes; }
      scopes = priority;
      priority = 0;
    }

    if ((scopes.length !== 1) || (scopes[0] !== '*')) { scopes.push('pigments'); }

    const newExpression = new this.expressionsType({name, regexpString, scopes, priority, handle});
    return this.addExpression(newExpression);
  }

  addExpression(expression, batch=false) {
    this.regexpStrings = {};
    this.colorExpressions[expression.name] = expression;

    if (!batch) {
      this.emitter.emit('did-add-expression', {name: expression.name, registry: this});
      this.emitter.emit('did-update-expressions', {name: expression.name, registry: this});
    }
    return expression;
  }

  createExpressions(expressions) {
    return this.addExpressions(expressions.map(e => {
      let {name, regexpString, handle, priority, scopes} = e;
      if (priority == null) { priority = 0; }
      const expression = new this.expressionsType({name, regexpString, scopes, handle});
      expression.priority = priority;
      return expression;
    })
    );
  }

  addExpressions(expressions) {
    for (var expression of expressions) {
      this.addExpression(expression, true);
      this.emitter.emit('did-add-expression', {name: expression.name, registry: this});
    }
    return this.emitter.emit('did-update-expressions', {registry: this});
  }

  removeExpression(name) {
    delete this.colorExpressions[name];
    this.regexpStrings = {};
    this.emitter.emit('did-remove-expression', {name, registry: this});
    return this.emitter.emit('did-update-expressions', {name, registry: this});
  }

  serialize() {
    const out = {
      regexpString: this.getRegExp(),
      expressions: {}
    };

    for (var key in this.colorExpressions) {
      var expression = this.colorExpressions[key];
      out.expressions[key] = {
        name: expression.name,
        regexpString: expression.regexpString,
        priority: expression.priority,
        scopes: expression.scopes,
        handle: (expression.handle != null ? expression.handle.toString() : undefined)
      };
    }

    return out;
  }
});
