/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */

describe('autocomplete provider', function() {
  let [completionDelay, editor, editorView, pigments, autocompleteMain, autocompleteManager, jasmineContent, project] = Array.from([]);

  beforeEach(function() {
    runs(function() {
      jasmineContent = document.body.querySelector('#jasmine-content');

      atom.config.set('pigments.autocompleteScopes', ['*']);
      atom.config.set('pigments.sourceNames', [
        '**/*.styl',
        '**/*.less'
      ]);

      // Set to live completion
      atom.config.set('autocomplete-plus.enableAutoActivation', true);
      // Set the completion delay
      completionDelay = 100;
      atom.config.set('autocomplete-plus.autoActivationDelay', completionDelay);
      completionDelay += 100; // Rendering delay
      const workspaceElement = atom.views.getView(atom.workspace);

      return jasmineContent.appendChild(workspaceElement);
    });

    waitsForPromise('autocomplete-plus activation', () => atom.packages.activatePackage('autocomplete-plus').then(pkg => autocompleteMain = pkg.mainModule));

    waitsForPromise('pigments activation', () => atom.packages.activatePackage('pigments').then(pkg => pigments = pkg.mainModule));

    runs(function() {
      spyOn(autocompleteMain, 'consumeProvider').andCallThrough();
      return spyOn(pigments, 'provideAutocomplete').andCallThrough();
    });

    waitsForPromise('open sample file', () => atom.workspace.open('sample.styl').then(function(e) {
      editor = e;
      editor.setText('');
      return editorView = atom.views.getView(editor);
    }));

    waitsForPromise('pigments project initialized', function() {
      project = pigments.getProject();
      return project.initialize();
    });

    return runs(function() {
      ({
        autocompleteManager
      } = autocompleteMain);
      spyOn(autocompleteManager, 'findSuggestions').andCallThrough();
      return spyOn(autocompleteManager, 'displaySuggestions').andCallThrough();
    });
  });

  describe('writing the name of a color', function() {
    it('returns suggestions for the matching colors', function() {
      runs(function() {
        expect(editorView.querySelector('.autocomplete-plus')).not.toExist();

        editor.moveToBottom();
        editor.insertText('border: 1px solid ');
        editor.moveToBottom();
        editor.insertText('b');
        editor.insertText('a');

        return advanceClock(completionDelay);
      });

      waitsFor(() => autocompleteManager.displaySuggestions.calls.length === 1);

      waitsFor(() => editorView.querySelector('.autocomplete-plus li') != null);

      return runs(function() {
        const popup = editorView.querySelector('.autocomplete-plus');
        expect(popup).toExist();
        expect(popup.querySelector('span.word').textContent).toEqual('base-color');

        const preview = popup.querySelector('.color-suggestion-preview');
        expect(preview).toExist();
        return expect(preview.style.background).toEqual('rgb(255, 255, 255)');
      });
    });

    it('replaces the prefix even when it contains a @', function() {
      runs(function() {
        expect(editorView.querySelector('.autocomplete-plus')).not.toExist();

        editor.moveToBottom();
        editor.insertText('@');
        editor.insertText('b');
        editor.insertText('a');

        return advanceClock(completionDelay);
      });

      waitsFor(() => autocompleteManager.displaySuggestions.calls.length === 1);

      waitsFor(() => editorView.querySelector('.autocomplete-plus li') != null);

      return runs(function() {
        atom.commands.dispatch(editorView, 'autocomplete-plus:confirm');
        return expect(editor.getText()).not.toContain('@@');
      });
    });

    it('replaces the prefix even when it contains a $', function() {
      runs(function() {
        expect(editorView.querySelector('.autocomplete-plus')).not.toExist();

        editor.moveToBottom();
        editor.insertText('$');
        editor.insertText('o');
        editor.insertText('t');

        return advanceClock(completionDelay);
      });

      waitsFor(() => autocompleteManager.displaySuggestions.calls.length === 1);

      waitsFor(() => editorView.querySelector('.autocomplete-plus li') != null);

      return runs(function() {
        atom.commands.dispatch(editorView, 'autocomplete-plus:confirm');
        expect(editor.getText()).toContain('$other-color');
        return expect(editor.getText()).not.toContain('$$');
      });
    });

    return describe('when the extendAutocompleteToColorValue setting is enabled', function() {
      beforeEach(() => atom.config.set('pigments.extendAutocompleteToColorValue', true));

      describe('with an opaque color', () => it('displays the color hexadecimal code in the completion item', function() {
        runs(function() {
          expect(editorView.querySelector('.autocomplete-plus')).not.toExist();

          editor.moveToBottom();
          editor.insertText('b');
          editor.insertText('a');
          editor.insertText('s');

          return advanceClock(completionDelay);
        });

        waitsFor(() => autocompleteManager.displaySuggestions.calls.length === 1);

        waitsFor(() => editorView.querySelector('.autocomplete-plus li') != null);

        return runs(function() {
          const popup = editorView.querySelector('.autocomplete-plus');
          expect(popup).toExist();
          expect(popup.querySelector('span.word').textContent).toEqual('base-color');

          return expect(popup.querySelector('span.right-label').textContent).toContain('#ffffff');
        });
      }));

      describe('when the autocompleteSuggestionsFromValue setting is enabled', function() {
        beforeEach(() => atom.config.set('pigments.autocompleteSuggestionsFromValue', true));

        it('suggests color variables from hexadecimal values', function() {
          runs(function() {
            expect(editorView.querySelector('.autocomplete-plus')).not.toExist();

            editor.moveToBottom();
            editor.insertText('#');
            editor.insertText('f');
            editor.insertText('f');

            return advanceClock(completionDelay);
          });

          waitsFor(() => autocompleteManager.displaySuggestions.calls.length === 1);

          waitsFor(() => editorView.querySelector('.autocomplete-plus li') != null);

          return runs(function() {
            const popup = editorView.querySelector('.autocomplete-plus');
            expect(popup).toExist();
            expect(popup.querySelector('span.word').textContent).toEqual('var1');

            return expect(popup.querySelector('span.right-label').textContent).toContain('#ffffff');
          });
        });

        it('suggests color variables from hexadecimal values when in a CSS expression', function() {
          runs(function() {
            expect(editorView.querySelector('.autocomplete-plus')).not.toExist();

            editor.moveToBottom();
            editor.insertText('border: 1px solid ');
            editor.moveToBottom();
            editor.insertText('#');
            editor.insertText('f');
            editor.insertText('f');

            return advanceClock(completionDelay);
          });

          waitsFor(() => autocompleteManager.displaySuggestions.calls.length === 1);

          waitsFor(() => editorView.querySelector('.autocomplete-plus li') != null);

          return runs(function() {
            const popup = editorView.querySelector('.autocomplete-plus');
            expect(popup).toExist();
            expect(popup.querySelector('span.word').textContent).toEqual('var1');

            return expect(popup.querySelector('span.right-label').textContent).toContain('#ffffff');
          });
        });

        it('suggests color variables from rgb values', function() {
          runs(function() {
            expect(editorView.querySelector('.autocomplete-plus')).not.toExist();

            editor.moveToBottom();
            editor.insertText('border: 1px solid ');
            editor.moveToBottom();
            editor.insertText('r');
            editor.insertText('g');
            editor.insertText('b');
            editor.insertText('(');
            editor.insertText('2');
            editor.insertText('5');
            editor.insertText('5');
            editor.insertText(',');
            editor.insertText(' ');

            return advanceClock(completionDelay);
          });

          waitsFor(() => autocompleteManager.displaySuggestions.calls.length === 1);

          waitsFor(() => editorView.querySelector('.autocomplete-plus li') != null);

          return runs(function() {
            const popup = editorView.querySelector('.autocomplete-plus');
            expect(popup).toExist();
            expect(popup.querySelector('span.word').textContent).toEqual('var1');

            return expect(popup.querySelector('span.right-label').textContent).toContain('#ffffff');
          });
        });

        return describe('and when extendAutocompleteToVariables is true', function() {
          beforeEach(() => atom.config.set('pigments.extendAutocompleteToVariables', true));

          return it('returns suggestions for the matching variable value', function() {
            runs(function() {
              expect(editorView.querySelector('.autocomplete-plus')).not.toExist();

              editor.moveToBottom();
              editor.insertText('border: ');
              editor.moveToBottom();
              editor.insertText('6');
              editor.insertText('p');
              editor.insertText('x');
              editor.insertText(' ');

              return advanceClock(completionDelay);
            });

            waitsFor(() => autocompleteManager.displaySuggestions.calls.length === 1);

            waitsFor(() => editorView.querySelector('.autocomplete-plus li') != null);

            return runs(function() {
              const popup = editorView.querySelector('.autocomplete-plus');
              expect(popup).toExist();
              expect(popup.querySelector('span.word').textContent).toEqual('button-padding');

              return expect(popup.querySelector('span.right-label').textContent).toEqual('6px 8px');
            });
          });
        });
      });


      return describe('with a transparent color', () => it('displays the color hexadecimal code in the completion item', function() {
        runs(function() {
          expect(editorView.querySelector('.autocomplete-plus')).not.toExist();

          editor.moveToBottom();
          editor.insertText('$');
          editor.insertText('o');
          editor.insertText('t');

          return advanceClock(completionDelay);
        });

        waitsFor(() => autocompleteManager.displaySuggestions.calls.length === 1);

        waitsFor(() => editorView.querySelector('.autocomplete-plus li') != null);

        return runs(function() {
          const popup = editorView.querySelector('.autocomplete-plus');
          expect(popup).toExist();
          expect(popup.querySelector('span.word').textContent).toEqual('$other-color');

          return expect(popup.querySelector('span.right-label').textContent).toContain('rgba(255,0,0,0.5)');
        });
      }));
    });
  });

  describe('writing the name of a non-color variable', () => it('returns suggestions for the matching variable', function() {
    atom.config.set('pigments.extendAutocompleteToVariables', false);
    runs(function() {
      expect(editorView.querySelector('.autocomplete-plus')).not.toExist();

      editor.moveToBottom();
      editor.insertText('f');
      editor.insertText('o');
      editor.insertText('o');

      return advanceClock(completionDelay);
    });

    waitsFor(() => autocompleteManager.displaySuggestions.calls.length === 1);

    return runs(() => expect(editorView.querySelector('.autocomplete-plus')).not.toExist());
  }));

  return describe('when extendAutocompleteToVariables is true', function() {
    beforeEach(() => atom.config.set('pigments.extendAutocompleteToVariables', true));

    return describe('writing the name of a non-color variable', () => it('returns suggestions for the matching variable', function() {
      runs(function() {
        expect(editorView.querySelector('.autocomplete-plus')).not.toExist();

        editor.moveToBottom();
        editor.insertText('b');
        editor.insertText('u');
        editor.insertText('t');
        editor.insertText('t');
        editor.insertText('o');
        editor.insertText('n');
        editor.insertText('-');
        editor.insertText('p');

        return advanceClock(completionDelay);
      });

      waitsFor(() => autocompleteManager.displaySuggestions.calls.length === 1);

      waitsFor(() => editorView.querySelector('.autocomplete-plus li') != null);

      return runs(function() {
        const popup = editorView.querySelector('.autocomplete-plus');
        expect(popup).toExist();
        expect(popup.querySelector('span.word').textContent).toEqual('button-padding');

        return expect(popup.querySelector('span.right-label').textContent).toEqual('6px 8px');
      });
    }));
  });
});

describe('autocomplete provider', function() {
  let [completionDelay, editor, editorView, pigments, autocompleteMain, autocompleteManager, jasmineContent, project] = Array.from([]);

  return describe('for sass files', function() {
    beforeEach(function() {
      runs(function() {
        jasmineContent = document.body.querySelector('#jasmine-content');

        atom.config.set('pigments.autocompleteScopes', ['*']);
        atom.config.set('pigments.sourceNames', [
          '**/*.sass',
          '**/*.scss'
        ]);

        // Set to live completion
        atom.config.set('autocomplete-plus.enableAutoActivation', true);
        // Set the completion delay
        completionDelay = 100;
        atom.config.set('autocomplete-plus.autoActivationDelay', completionDelay);
        completionDelay += 100; // Rendering delay
        const workspaceElement = atom.views.getView(atom.workspace);

        return jasmineContent.appendChild(workspaceElement);
      });

      waitsForPromise('autocomplete-plus activation', () => atom.packages.activatePackage('autocomplete-plus').then(pkg => autocompleteMain = pkg.mainModule));

      waitsForPromise('pigments activation', () => atom.packages.activatePackage('pigments').then(pkg => pigments = pkg.mainModule));

      runs(function() {
        spyOn(autocompleteMain, 'consumeProvider').andCallThrough();
        return spyOn(pigments, 'provideAutocomplete').andCallThrough();
      });

      waitsForPromise('open sample file', () => atom.workspace.open('sample.styl').then(function(e) {
        editor = e;
        return editorView = atom.views.getView(editor);
      }));

      waitsForPromise('pigments project initialized', function() {
        project = pigments.getProject();
        return project.initialize();
      });

      return runs(function() {
        ({
          autocompleteManager
        } = autocompleteMain);
        spyOn(autocompleteManager, 'findSuggestions').andCallThrough();
        return spyOn(autocompleteManager, 'displaySuggestions').andCallThrough();
      });
    });

    return it('does not display the alternate sass version', function() {
      runs(function() {
        expect(editorView.querySelector('.autocomplete-plus')).not.toExist();

        editor.moveToBottom();
        editor.insertText('$');
        editor.insertText('b');
        editor.insertText('a');

        return advanceClock(completionDelay);
      });

      waitsFor('suggestions displayed callback', () => autocompleteManager.displaySuggestions.calls.length === 1);

      waitsFor('autocomplete lis', () => editorView.querySelector('.autocomplete-plus li') != null);

      return runs(function() {
        const lis = editorView.querySelectorAll('.autocomplete-plus li');
        const hasAlternate = Array.prototype.some.call(lis, li => li.querySelector('span.word').textContent === '$base_color');

        return expect(hasAlternate).toBeFalsy();
      });
    });
  });
});
