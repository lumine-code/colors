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

  describe("::serialize", () =>
    it("serializes the registry with the function content", function () {
      registry.createExpression("dummy", "foo");
      registry.createExpression("dummy2", "bar", (a, b, c) => a + b - c);

      const serialized = registry.serialize();

      expect(serialized.regexpString).toEqual("(foo)|(bar)");
      expect(serialized.expressions.dummy).toEqual({
        name: "dummy",
        regexpString: "foo",
        handle: undefined,
        priority: 0,
        scopes: ["*"],
      });

      return expect(serialized.expressions.dummy2).toEqual({
        name: "dummy2",
        regexpString: "bar",
        handle: registry.getExpression("dummy2").handle.toString(),
        priority: 0,
        scopes: ["*"],
      });
    }));

  return describe(".deserialize", () =>
    it("deserializes the provided expressions using the specified model", function () {
      const serialized = {
        regexpString: "foo|bar",
        expressions: {
          dummy: {
            name: "dummy",
            regexpString: "foo",
            handle: "function (a,b,c) { return a + b - c; }",
            priority: 0,
            scopes: ["*"],
          },
        },
      };

      const deserialized = ExpressionsRegistry.deserialize(serialized, Dummy);

      expect(deserialized.getRegExp()).toEqual("foo|bar");
      expect(deserialized.getExpression("dummy").name).toEqual("dummy");
      expect(deserialized.getExpression("dummy").regexpString).toEqual("foo");
      return expect(deserialized.getExpression("dummy").handle(1, 2, 3)).toEqual(0);
    }));
});
