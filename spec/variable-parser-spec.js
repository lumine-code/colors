/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const VariableParser = require('../lib/variable-parser');
const registry = require('../lib/variable-expressions');

describe('VariableParser', function() {
  let [parser] = Array.from([]);

  const itParses = function(expression) {
    return {
      as(variables) {
        it(`parses '${expression}' as variables ${jasmine.pp(variables)}`, function() {
          const results = parser.parse(expression);

          expect(results.length).toEqual(Object.keys(variables).length);
          return (() => {
            const result = [];
            for (var {name, value, range} of results) {
              var expected = variables[name];
              if (expected.value != null) {
                result.push(expect(value).toEqual(expected.value));
              } else if (expected.range != null) {
                result.push(expect(range).toEqual(expected.range));
              } else {
                result.push(expect(value).toEqual(expected));
              }
            }
            return result;
          })();
        });

        return this;
      },

      asDefault(variables) {
        it(`parses '${expression}' as default variables ${jasmine.pp(variables)}`, function() {
          const results = parser.parse(expression);

          expect(results.length).toEqual(Object.keys(variables).length);
          return (() => {
            const result = [];
            for (var {name, value, range, default: isDefault} of results) {
              var expected = variables[name];
              expect(isDefault).toBeTruthy();
              if (expected.value != null) {
                result.push(expect(value).toEqual(expected.value));
              } else if (expected.range != null) {
                result.push(expect(range).toEqual(expected.range));
              } else {
                result.push(expect(value).toEqual(expected));
              }
            }
            return result;
          })();
        });

        return this;
      },


      asUndefined() {
        return it(`does not parse '${expression}' as a variable expression`, function() {
          const results = parser.parse(expression);

          return expect(results).toBeUndefined();
        });
      }
    };
  };

  beforeEach(() => parser = new VariableParser(registry));

  itParses('color = white').as({'color': 'white'});
  itParses('non-color = 10px').as({'non-color': '10px'});

  itParses('$color: white').as({'$color': 'white'});
  itParses('$color: white !default').asDefault({'$color': 'white'});
  itParses('$color: white // foo').as({'$color': 'white'});
  itParses('$color  : white').as({'$color': 'white'});
  itParses('$some-color: white;').as({
    '$some-color': 'white',
    '$some_color': 'white'
  });
  itParses('$some_color  : white').as({
    '$some-color': 'white',
    '$some_color': 'white'
  });
  itParses('$non-color: 10px;').as({
    '$non-color': '10px',
    '$non_color': '10px'
  });
  itParses('$non_color: 10px').as({
    '$non-color': '10px',
    '$non_color': '10px'
  });

  itParses('@color: white;').as({'@color': 'white'});
  itParses('@non-color: 10px;').as({'@non-color': '10px'});
  itParses('@non--color: 10px;').as({'@non--color': '10px'});

  itParses('--color: white;').as({'var(--color)': 'white'});
  itParses('--non-color: 10px;').as({'var(--non-color)': '10px'});

  itParses('\\definecolor{orange}{gray}{1}').as({
    '{orange}': 'gray(100%)'
  });

  itParses('\\definecolor{orange}{RGB}{255,127,0}').as({
    '{orange}': 'rgb(255,127,0)'
  });

  itParses('\\definecolor{orange}{rgb}{1,0.5,0}').as({
    '{orange}': 'rgb(255,127,0)'
  });

  itParses('\\definecolor{orange}{cmyk}{0,0.5,1,0}').as({
    '{orange}': 'cmyk(0,0.5,1,0)'
  });

  itParses('\\definecolor{orange}{HTML}{FF7F00}').as({
    '{orange}': '#FF7F00'
  });

  itParses('\\definecolor{darkgreen}{blue!20!black!30!green}').as({
    '{darkgreen}': '{blue!20!black!30!green}'
  });

  itParses('\n.error--large(@color: red) {\n  background-color: @color;\n}').asUndefined();

  itParses(`\
colors = {
  red: rgb(255,0,0),
  green: rgb(0,255,0),
  blue: rgb(0,0,255)
  value: 10px
  light: {
    base: lightgrey
  }
  dark: {
    base: slategrey
  }
}\
`).as({
    'colors.red': {
      value: 'rgb(255,0,0)',
      range: [[1,2], [1,14]]
    },
    'colors.green': {
      value: 'rgb(0,255,0)',
      range: [[2,2], [2,16]]
    },
    'colors.blue': {
      value: 'rgb(0,0,255)',
      range: [[3,2],[3,15]]
    },
    'colors.value': {
      value: '10px',
      range: [[4,2],[4,13]]
    },
    'colors.light.base': {
      value: 'lightgrey',
      range: [[9,4],[9,17]]
    },
    'colors.dark.base': {
      value: 'slategrey',
      range: [[12,4],[12,14]]
    }
  });

  itParses('var colora="#f00";').as({
    'colora': '#f00'
  });
  
  itParses("let colorb = '#00ff00';").as({
    'colorb': '#00ff00'
  });
  
  return itParses("const colorc= `blue`;").as({
    'colorc': 'blue'
  });
});

