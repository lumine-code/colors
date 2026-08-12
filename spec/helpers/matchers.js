// Custom matchers, moved from the Jasmine 1.3 shape (`this.addMatchers`, a
// boolean return and `this.actual`) to the one every Jasmine since 2 uses: a
// `compare(actual, ...)` returning `{pass, message}`.

const closeTo = (a, b, precision) => Math.abs(b - a) < Math.pow(10, -precision) / 2;

function colorFrom(colorOrRed, green = 0, blue = 0, alpha = 1) {
  switch (typeof colorOrRed) {
    case "object":
      return colorOrRed;
    case "number":
      return { red: colorOrRed, green, blue, alpha };
    case "string": {
      const text = colorOrRed.replace(/#|0x/, "");
      const hex = parseInt(text, 16);
      switch (text.length) {
        case 8:
          return {
            red: (hex >> 16) & 0xff,
            green: (hex >> 8) & 0xff,
            blue: hex & 0xff,
            alpha: ((hex >> 24) & 0xff) / 255,
          };
        case 6:
          return { red: (hex >> 16) & 0xff, green: (hex >> 8) & 0xff, blue: hex & 0xff, alpha };
        case 3:
          return {
            red: ((hex >> 8) & 0xf) * 17,
            green: ((hex >> 4) & 0xf) * 17,
            blue: (hex & 0xf) * 17,
            alpha,
          };
        default:
          return { red: 0, green: 0, blue: 0, alpha: 1 };
      }
    }
    default:
      return { red: 0, green: 0, blue: 0, alpha: 1 };
  }
}

beforeEach(() => {
  jasmine.addMatchers({
    toBeComponentArrayCloseTo() {
      return {
        compare(actual, expected, precision = 0) {
          const pass =
            actual.length === expected.length &&
            actual.every((value, i) => closeTo(value, expected[i], precision));
          return {
            pass,
            message: `Expected ${jasmine.pp(actual)} to be an array whose values are close to ${jasmine.pp(expected)} with a precision of ${precision}`,
          };
        },
      };
    },

    toBeValid() {
      return {
        compare(actual) {
          return {
            pass: actual.isValid(),
            message: `Expected ${jasmine.pp(actual)} to be a valid color`,
          };
        },
      };
    },

    toBeColor() {
      return {
        compare(actual, colorOrRed, green, blue, alpha) {
          const color = colorFrom(colorOrRed, green, blue, alpha);
          const pass =
            Math.round(actual.red) === color.red &&
            Math.round(actual.green) === color.green &&
            Math.round(actual.blue) === color.blue &&
            closeTo(actual.alpha, color.alpha, 1);
          return {
            pass,
            message: `Expected ${jasmine.pp(actual)} to be a color equal to ${jasmine.pp(color)}`,
          };
        },
      };
    },
  });
});
