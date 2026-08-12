/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */

beforeEach(function() {
  const compare = (a, b, p) => Math.abs(b - a) < (Math.pow(10, -p) / 2);

  return this.addMatchers({
    toBeComponentArrayCloseTo(arr, precision=0) {
      const notText = this.isNot ? " not" : "";
      this.message = () => `Expected ${jasmine.pp(this.actual)} to${notText} be an array whose values are close to ${jasmine.pp(arr)} with a precision of ${precision}`;

      if (this.actual.length !== arr.length) { return false; }

      return this.actual.every((value, i) => compare(value, arr[i], precision));
    },

    toBeValid() {
      const notText = this.isNot ? " not" : "";
      this.message = () => `Expected ${jasmine.pp(this.actual)} to${notText} be a valid color`;

      return this.actual.isValid();
    },

    toBeColor(colorOrRed,green=0,blue=0,alpha=1) {
      const color = (() => { let red;
      switch (typeof colorOrRed) {
        case 'object': return colorOrRed;
        case 'number': return {red: colorOrRed, green, blue, alpha};
        case 'string':
          colorOrRed = colorOrRed.replace(/#|0x/, '');
          var hex = parseInt(colorOrRed, 16);
          switch (colorOrRed.length) {
            case 8:
              alpha = ((hex >> 24) & 0xff) / 255;
              red = (hex >> 16) & 0xff;
              green = (hex >> 8) & 0xff;
              blue = hex & 0xff;
              break;
            case 6:
              red = (hex >> 16) & 0xff;
              green = (hex >> 8) & 0xff;
              blue = hex & 0xff;
              break;
            case 3:
              red = ((hex >> 8) & 0xf) * 17;
              green = ((hex >> 4) & 0xf) * 17;
              blue = (hex & 0xf) * 17;
              break;
            default:
              red = 0;
              green = 0;
              blue = 0;
              alpha = 1;
          }

          return {red, green, blue, alpha};
        default:
          return {red: 0, green: 0, blue: 0, alpha: 1};
      } })();

      const notText = this.isNot ? " not" : "";
      this.message = () => `Expected ${jasmine.pp(this.actual)} to${notText} be a color equal to ${jasmine.pp(color)}`;

      return (Math.round(this.actual.red) === color.red) &&
      (Math.round(this.actual.green) === color.green) &&
      (Math.round(this.actual.blue) === color.blue) &&
      compare(this.actual.alpha, color.alpha, 1);
    }
  });
});
