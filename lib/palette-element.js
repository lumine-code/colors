/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const {SpacePenDSL, EventsDelegation, registerOrUpdateElement} = require('atom-utils');

let [CompositeDisposable, THEME_VARIABLES, pigments, Palette, StickyTitle] = Array.from([]);

class PaletteElement extends HTMLElement {
  static initClass() {
    SpacePenDSL.includeInto(this);
    EventsDelegation.includeInto(this);
  }

  static content() {
    const sort = atom.config.get('pigments.sortPaletteColors');
    const group = atom.config.get('pigments.groupPaletteColors');
    const merge = atom.config.get('pigments.mergeColorDuplicates');
    const optAttrs = function(bool, name, attrs) {
      if (bool) { attrs[name] = name; }
      return attrs;
    };

    return this.div({class: 'pigments-palette-panel'}, () => {
      this.div({class: 'pigments-palette-controls settings-view pane-item'}, () => {
        return this.div({class: 'pigments-palette-controls-wrapper'}, () => {
          this.span({class: 'input-group-inline'}, () => {
            this.label({for: 'sort-palette-colors'}, 'Sort Colors');
            return this.select({outlet: 'sort', id: 'sort-palette-colors'}, () => {
              this.option(optAttrs(sort === 'none', 'selected', {value: 'none'}), 'None');
              this.option(optAttrs(sort === 'by name', 'selected', {value: 'by name'}), 'By Name');
              return this.option(optAttrs(sort === 'by file', 'selected', {value: 'by color'}), 'By Color');
            });
          });

          this.span({class: 'input-group-inline'}, () => {
            this.label({for: 'sort-palette-colors'}, 'Group Colors');
            return this.select({outlet: 'group', id: 'group-palette-colors'}, () => {
              this.option(optAttrs(group === 'none', 'selected', {value: 'none'}), 'None');
              return this.option(optAttrs(group === 'by file', 'selected', {value: 'by file'}), 'By File');
            });
          });

          return this.span({class: 'input-group-inline'}, () => {
            this.input(optAttrs(merge, 'checked', {type: 'checkbox', id: 'merge-duplicates', outlet: 'merge'}));
            return this.label({for: 'merge-duplicates'}, 'Merge Duplicates');
          });
        });
      });

      return this.div({class: 'pigments-palette-list native-key-bindings', tabindex: -1}, () => {
        return this.ol({outlet: 'list'});
      });
    });
  }

  createdCallback() {
    if (pigments == null) { pigments = require('./pigments'); }

    this.project = pigments.getProject();

    if (this.project != null) {
      return this.init();
    } else {
      let subscription;
      return subscription = atom.packages.onDidActivatePackage(pkg => {
        if (pkg.name === 'pigments') {
          subscription.dispose();
          this.project = pigments.getProject();
          return this.init();
        }
      });
    }
  }

  init() {
    if (this.project.isDestroyed()) { return; }

    if (CompositeDisposable == null) { ({
      CompositeDisposable
    } = require('atom')); }

    this.subscriptions = new CompositeDisposable;
    this.subscriptions.add(this.project.onDidUpdateVariables(() => {
      if (this.palette != null) {
        this.palette.variables = this.project.getColorVariables();
        if (this.attached) { return this.renderList(); }
      }
    })
    );


    this.subscriptions.add(atom.config.observe('pigments.sortPaletteColors', sortPaletteColors => {
      this.sortPaletteColors = sortPaletteColors;
      if ((this.palette != null) && this.attached) { return this.renderList(); }
    })
    );

    this.subscriptions.add(atom.config.observe('pigments.groupPaletteColors', groupPaletteColors => {
      this.groupPaletteColors = groupPaletteColors;
      if ((this.palette != null) && this.attached) { return this.renderList(); }
    })
    );

    this.subscriptions.add(atom.config.observe('pigments.mergeColorDuplicates', mergeColorDuplicates => {
      this.mergeColorDuplicates = mergeColorDuplicates;
      if ((this.palette != null) && this.attached) { return this.renderList(); }
    })
    );

    this.subscriptions.add(this.subscribeTo(this.sort, { 'change'(e) {
      return atom.config.set('pigments.sortPaletteColors', e.target.value);
    }
  }
    )
    );

    this.subscriptions.add(this.subscribeTo(this.group, { 'change'(e) {
      return atom.config.set('pigments.groupPaletteColors', e.target.value);
    }
  }
    )
    );

    this.subscriptions.add(this.subscribeTo(this.merge, { 'change'(e) {
      return atom.config.set('pigments.mergeColorDuplicates', e.target.checked);
    }
  }
    )
    );

    return this.subscriptions.add(this.subscribeTo(this.list, '[data-variable-id]', { 'click': e => {
      const variableId = Number(e.target.dataset.variableId);
      const variable = this.project.getVariableById(variableId);

      return this.project.showVariableInFile(variable);
    }
  }
    )
    );
  }

  attachedCallback() {
    if (this.palette != null) { this.renderList(); }
    return this.attached = true;
  }

  detachedCallback() {
    this.subscriptions.dispose();
    return this.attached = false;
  }

  getModel() { return this.palette; }

  setModel(palette) { this.palette = palette; if (this.attached) { return this.renderList(); } }

  getColorsList(palette) {
    switch (this.sortPaletteColors) {
      case 'by color': return palette.sortedByColor();
      case 'by name': return palette.sortedByName();
      default: return palette.variables.slice();
    }
  }

  renderList() {
    let palette;
    if (this.stickyTitle != null) {
      this.stickyTitle.dispose();
    }
    this.list.innerHTML = '';

    if (this.groupPaletteColors === 'by file') {
      if (StickyTitle == null) { StickyTitle = require('./sticky-title'); }

      const palettes = this.getFilesPalettes();
      for (var file in palettes) {
        palette = palettes[file];
        var li = document.createElement('li');
        li.className = 'pigments-color-group';
        var ol = document.createElement('ol');

        li.appendChild(this.getGroupHeader(atom.project.relativize(file)));
        li.appendChild(ol);
        this.buildList(ol, this.getColorsList(palette));
        this.list.appendChild(li);
      }

      return this.stickyTitle = new StickyTitle(
        this.list.querySelectorAll('.pigments-color-group-header-content'),
        this.querySelector('.pigments-palette-list')
      );
    } else {
      return this.buildList(this.list, this.getColorsList(this.palette));
    }
  }

  getGroupHeader(label) {
    if (THEME_VARIABLES == null) { ({
      THEME_VARIABLES
    } = require('./uris')); }

    const header = document.createElement('div');
    header.className = 'pigments-color-group-header';

    const content = document.createElement('div');
    content.className = 'pigments-color-group-header-content';
    if (label === THEME_VARIABLES) {
      content.textContent = 'Atom Themes';
    } else {
      content.textContent = label;
    }

    header.appendChild(content);
    return header;
  }

  getFilesPalettes() {
    if (Palette == null) { Palette = require('./palette'); }

    const palettes = {};

    this.palette.eachColor(variable => {
      const {path} = variable;

      if (palettes[path] == null) { palettes[path] = new Palette([]); }
      return palettes[path].variables.push(variable);
    });

    return palettes;
  }

  buildList(container, paletteColors) {
    if (THEME_VARIABLES == null) { ({
      THEME_VARIABLES
    } = require('./uris')); }

    paletteColors = this.checkForDuplicates(paletteColors);
    return (() => {
      const result = [];
      for (var variables of paletteColors) {
        var li = document.createElement('li');
        li.className = 'pigments-color-item';
        var {color, isAlternate} = variables[0];

        if (isAlternate) { continue; }
        if (color.toCSS == null) { continue; }

        var html = `\
<div class="pigments-color">
    <span class="pigments-color-preview"
          style="background-color: ${color.toCSS()}">
    </span>
    <span class="pigments-color-properties">
      <span class="pigments-color-component"><strong>R:</strong> ${Math.round(color.red)}</span>
      <span class="pigments-color-component"><strong>G:</strong> ${Math.round(color.green)}</span>
      <span class="pigments-color-component"><strong>B:</strong> ${Math.round(color.blue)}</span>
      <span class="pigments-color-component"><strong>A:</strong> ${Math.round(color.alpha * 1000) / 1000}</span>
    </span>
</div>
<div class="pigments-color-details">\
`;

        for (var {name, path, line, id} of variables) {
          html += `\
<span class="pigments-color-occurence">
      <span class="name">${name}</span>\
`;

          if (path !== THEME_VARIABLES) {
            html += `\
<span data-variable-id="${id}">
    <span class="path">${atom.project.relativize(path)}</span>
    <span class="line">at line ${line + 1}</span>
</span>\
`;
          }

          html += '</span>';
        }

        html += '</div>';

        li.innerHTML = html;

        result.push(container.appendChild(li));
      }
      return result;
    })();
  }

  checkForDuplicates(paletteColors) {
    let v;
    const results = [];
    if (this.mergeColorDuplicates) {
      const map = new Map();

      const colors = [];

      const findColor = function(color) {
        for (var col of colors) { if ((typeof col.isEqual === 'function' ? col.isEqual(color) : undefined)) { return col; } }
      };

      for (v of paletteColors) {
        var key;
        if (key = findColor(v.color)) {
          map.get(key).push(v);
        } else {
          map.set(v.color, [v]);
          colors.push(v.color);
        }
      }

      map.forEach((vars, color) => results.push(vars));

      return results;
    } else {
      return (() => {
        const result = [];
        for (v of paletteColors) {           result.push([v]);
        }
        return result;
      })();
    }
  }
}
PaletteElement.initClass();


module.exports =
(PaletteElement =
registerOrUpdateElement('pigments-palette', PaletteElement.prototype));
