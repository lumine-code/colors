const { compile, compileForPathOrAncestor, matchesAny } = require("../lib/globs");

describe("globs", () => {
  describe("compile()", () => {
    it("matches a basename pattern anywhere in the tree", () => {
      const matches = compile(["*.less"]);
      expect(matches("styles/variables.less")).toBe(true);
      expect(matches("variables.less")).toBe(true);
      expect(matches("variables.css")).toBe(false);
    });

    it("matches Windows-separated paths", () => {
      const matches = compile(["**/vendor/**"]);
      expect(matches(["src", "vendor", "a.less"].join(require("path").sep))).toBe(true);
    });

    it("skips invalid patterns without abandoning the rest", () => {
      spyOn(console, "warn");
      const matches = compile(["[", "*.less"]);
      expect(matches("a.less")).toBe(true);
    });
  });

  describe("compileForPathOrAncestor()", () => {
    it("ignores a file because an ancestor directory matches", () => {
      const isIgnored = compileForPathOrAncestor(["**/vendor"]);
      expect(isIgnored("src/vendor/css/variables.less")).toBe(true);
      expect(isIgnored("src/lib/variables.less")).toBe(false);
    });

    it("returns false for an undefined path, as an untitled editor has none", () => {
      const isIgnored = compileForPathOrAncestor(["**/vendor"]);
      expect(isIgnored(undefined)).toBe(false);
      expect(isIgnored(null)).toBe(false);
      expect(isIgnored("")).toBe(false);
    });
  });

  describe("matchesAny()", () => {
    it("returns false for an empty value or pattern list", () => {
      expect(matchesAny(undefined, ["*.less"])).toBe(false);
      expect(matchesAny("a.less", [])).toBe(false);
    });

    it("matches against any pattern in the list", () => {
      expect(matchesAny("a.styl", ["*.less", "*.styl"])).toBe(true);
    });
  });
});
