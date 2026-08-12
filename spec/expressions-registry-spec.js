/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const ExpressionsRegistry = require("../lib/expressions-registry");

describe("ExpressionsRegistry", function () {
  let [registry, Dummy] = Array.from([]);

  beforeEach(function () {
    Dummy = class Dummy {
      constructor({ name, regexpString, priority, scopes, handle }) {
        this.name = name;
        this.regexpString = regexpString;
        this.priority = priority;
        this.scopes = scopes;
        this.handle = handle;
      }
    };

    return (registry = new ExpressionsRegistry(Dummy));
  });

  describe("::createExpression", () =>
    describe("called with enough data", () =>
      it("creates a new expression of this registry expressions type", function () {
        const expression = registry.createExpression("dummy", "foo");

        expect(expression.constructor).toBe(Dummy);
        return expect(registry.getExpressions()).toEqual([expression]);
      })));

  describe("::addExpression", () =>
    it("adds a previously created expression in the registry", function () {
      const expression = new Dummy({ name: "bar" });

      registry.addExpression(expression);

      expect(registry.getExpression("bar")).toBe(expression);
      return expect(registry.getExpressions()).toEqual([expression]);
    }));

  describe("::getExpressions", () =>
    it("returns the expression based on their priority", function () {
      const expression1 = registry.createExpression("dummy1", "", 2);
      const expression2 = registry.createExpression("dummy2", "", 0);
      const expression3 = registry.createExpression("dummy3", "", 1);

      return expect(registry.getExpressions()).toEqual([expression1, expression3, expression2]);
    }));

  describe("::removeExpression", () =>
    it("removes an expression with its name", function () {
      registry.createExpression("dummy", "foo");

      registry.removeExpression("dummy");

      return expect(registry.getExpressions()).toEqual([]);
    }));

  // The registry once had a serialize/deserialize pair, and these specs
  // pinned it: the handle was serialized by calling toString() on the
  // function and rebuilt with vm.runInNewContext. Both directions existed
  // only to carry the registry into a forked Task, and neither could
  // reconstruct a handler that closed over anything, so the scanning moved
  // into the renderer and the pair went with it.
});
