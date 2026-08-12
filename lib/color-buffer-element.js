/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */

const {registerOrUpdateElement, EventsDelegation} = require('atom-utils');

let [Emitter, CompositeDisposable] = Array.from([]);

let nextHighlightId = 0;

class ColorBufferElement extends HTMLElement {
  static initClass() {
    EventsDelegation.includeInto(this);
  }

  createdCallback() {
    if (Emitter == null) {
      ({Emitter, CompositeDisposable} = require('atom'));
    }

    [this.editorScrollLeft, this.editorScrollTop] = Array.from([0, 0]);
    this.emitter = new Emitter;
    this.subscriptions = new CompositeDisposable;
    this.displayedMarkers = [];
    this.usedMarkers = [];
    this.unusedMarkers = [];
    return this.viewsByMarkers = new WeakMap;
  }

  attachedCallback() {
    this.attached = true;
    return this.update();
  }

  detachedCallback() {
    return this.attached = false;
  }

  onDidUpdate(callback) {
    return this.emitter.on('did-update', callback);
  }

  getModel() { return this.colorBuffer; }

  setModel(colorBuffer) {
    this.colorBuffer = colorBuffer;
    ({editor: this.editor} = this.colorBuffer);
    if (this.editor.isDestroyed()) { return; }
    this.editorElement = atom.views.getView(this.editor);

    this.colorBuffer.initialize().then(() => this.update());

    this.subscriptions.add(this.colorBuffer.onDidUpdateColorMarkers(() => this.update()));
    this.subscriptions.add(this.colorBuffer.onDidDestroy(() => this.destroy()));

    this.subscriptions.add(this.editor.onDidChange(() => {
      return this.usedMarkers.forEach(function(marker) {
        if (marker.colorMarker != null) {
          marker.colorMarker.invalidateScreenRangeCache();
        }
        return marker.checkScreenRange();
      });
    })
    );

    this.subscriptions.add(this.editor.onDidAddCursor(() => {
      return this.requestSelectionUpdate();
    })
    );
    this.subscriptions.add(this.editor.onDidRemoveCursor(() => {
      return this.requestSelectionUpdate();
    })
    );
    this.subscriptions.add(this.editor.onDidChangeCursorPosition(() => {
      return this.requestSelectionUpdate();
    })
    );
    this.subscriptions.add(this.editor.onDidAddSelection(() => {
      return this.requestSelectionUpdate();
    })
    );
    this.subscriptions.add(this.editor.onDidRemoveSelection(() => {
      return this.requestSelectionUpdate();
    })
    );
    this.subscriptions.add(this.editor.onDidChangeSelectionRange(() => {
      return this.requestSelectionUpdate();
    })
    );

    this.subscriptions.add(atom.config.observe('pigments.maxDecorationsInGutter', () => {
      return this.update();
    })
    );

    this.subscriptions.add(atom.config.observe('pigments.markerType', type => {
      this.initializeNativeDecorations(type);
      return this.previousType = type;
    })
    );

    this.subscriptions.add(this.editorElement.onDidAttach(() => this.attach()));
    return this.subscriptions.add(this.editorElement.onDidDetach(() => this.detach()));
  }

  attach() {
    if (this.parentNode != null) { return; }
    if (this.editorElement == null) { return; }
    return __guard__(this.getEditorRoot().querySelector('.lines'), x => x.appendChild(this));
  }

  detach() {
    if (this.parentNode == null) { return; }

    return this.parentNode.removeChild(this);
  }

  destroy() {
    this.detach();
    this.subscriptions.dispose();
    this.destroyNativeDecorations();

    return this.colorBuffer = null;
  }

  update() {
    if (this.isGutterType()) {
      return this.updateGutterDecorations();
    } else {
      return this.updateHighlightDecorations(this.previousType);
    }
  }

  getEditorRoot() { return this.editorElement; }

  isGutterType(type=this.previousType) {
    return ['gutter', 'native-dot', 'native-square-dot'].includes(type);
  }

  isDotType(type=this.previousType) {
    return ['native-dot', 'native-square-dot'].includes(type);
  }

  initializeNativeDecorations(type) {
    this.destroyNativeDecorations();

    if (this.isGutterType(type)) {
      return this.initializeGutter(type);
    } else {
      return this.updateHighlightDecorations(type);
    }
  }

  destroyNativeDecorations() {
    if (this.isGutterType()) {
      return this.destroyGutter();
    } else {
      return this.destroyHighlightDecorations();
    }
  }

  //#   ##     ## ##  ######   ##     ## ##       ##  ######   ##     ## ########
  //#   ##     ## ## ##    ##  ##     ## ##       ## ##    ##  ##     ##    ##
  //#   ##     ## ## ##        ##     ## ##       ## ##        ##     ##    ##
  //#   ######### ## ##   #### ######### ##       ## ##   #### #########    ##
  //#   ##     ## ## ##    ##  ##     ## ##       ## ##    ##  ##     ##    ##
  //#   ##     ## ## ##    ##  ##     ## ##       ## ##    ##  ##     ##    ##
  //#   ##     ## ##  ######   ##     ## ######## ##  ######   ##     ##    ##

  updateHighlightDecorations(type) {
    let m;
    if (this.editor.isDestroyed()) { return; }

    if (this.styleByMarkerId == null) { this.styleByMarkerId = {}; }
    if (this.decorationByMarkerId == null) { this.decorationByMarkerId = {}; }

    const markers = this.colorBuffer.getValidColorMarkers();

    for (m of this.displayedMarkers) {
      if (!markers.includes(m)) {
        if (this.decorationByMarkerId[m.id] != null) {
          this.decorationByMarkerId[m.id].destroy();
        }
        this.removeChild(this.styleByMarkerId[m.id]);
        delete this.styleByMarkerId[m.id];
        delete this.decorationByMarkerId[m.id];
      }
    }

    const markersByRows = {};
    const maxRowLength = 0;

    for (m of markers) {
      if ((m.color != null ? m.color.isValid() : undefined) && !this.displayedMarkers.includes(m)) {
        var {className, style} = this.getHighlighDecorationCSS(m, type);
        this.appendChild(style);
        this.styleByMarkerId[m.id] = style;
        if (type === 'native-background') {
          this.decorationByMarkerId[m.id] = this.editor.decorateMarker(m.marker, {
            type: 'text',
            class: `pigments-${type} ${className}`
          });
        } else {
          this.decorationByMarkerId[m.id] = this.editor.decorateMarker(m.marker, {
            type: 'highlight',
            class: `pigments-${type} ${className}`
          });
        }
      }
    }

    this.displayedMarkers = markers;
    return this.emitter.emit('did-update');
  }

  destroyHighlightDecorations() {
    for (var id in this.decorationByMarkerId) {
      var deco = this.decorationByMarkerId[id];
      if (this.styleByMarkerId[id] != null) { this.removeChild(this.styleByMarkerId[id]); }
      deco.destroy();
    }

    delete this.decorationByMarkerId;
    delete this.styleByMarkerId;
    return this.displayedMarkers = [];
  }

  getHighlighDecorationCSS(marker, type) {
    const className = `pigments-highlight-${nextHighlightId++}`;
    const style = document.createElement('style');
    const l = marker.color.luma;

    if (type === 'native-background') {
      style.innerHTML = `\
.${className} {
  background-color: ${marker.color.toCSS()};
  background-image:
    linear-gradient(to bottom, ${marker.color.toCSS()} 0%, ${marker.color.toCSS()} 100%),
    url(atom://pigments/resources/transparent-background.png);
  color: ${l > 0.43 ? 'black' : 'white'};
}\
`;
    } else if (type === 'native-underline') {
      style.innerHTML = `\
.${className} .region {
  background-color: ${marker.color.toCSS()};
  background-image:
    linear-gradient(to bottom, ${marker.color.toCSS()} 0%, ${marker.color.toCSS()} 100%),
    url(atom://pigments/resources/transparent-background.png);
}\
`;
    } else if (type === 'native-outline') {
      style.innerHTML = `\
.${className} .region {
  border-color: ${marker.color.toCSS()};
}\
`;
    }

    return {className, style};
  }

  //#     ######   ##     ## ######## ######## ######## ########
  //#    ##    ##  ##     ##    ##       ##    ##       ##     ##
  //#    ##        ##     ##    ##       ##    ##       ##     ##
  //#    ##   #### ##     ##    ##       ##    ######   ########
  //#    ##    ##  ##     ##    ##       ##    ##       ##   ##
  //#    ##    ##  ##     ##    ##       ##    ##       ##    ##
  //#     ######    #######     ##       ##    ######## ##     ##

  initializeGutter(type) {
    const options = {name: `pigments-${type}`};
    if (type !== 'gutter') { options.priority = 1000; }

    this.gutter = this.editor.addGutter(options);
    this.displayedMarkers = [];
    if (this.decorationByMarkerId == null) { this.decorationByMarkerId = {}; }
    const gutterContainer = this.getEditorRoot().querySelector('.gutter-container');
    this.gutterSubscription = new CompositeDisposable;

    this.gutterSubscription.add(this.subscribeTo(gutterContainer, {
      mousedown: e => {
        let targetDecoration = e.path[0];

        if (!targetDecoration.matches('span')) {
          targetDecoration = targetDecoration.querySelector('span');
        }

        if (targetDecoration == null) { return; }

        const {
          markerId
        } = targetDecoration.dataset;
        const colorMarker = this.displayedMarkers.filter(m => m.id === Number(markerId))[0];

        if ((colorMarker == null) || (this.colorBuffer == null)) { return; }

        return this.colorBuffer.selectColorMarkerAndOpenPicker(colorMarker);
      }
    }
    )
    );

    if (this.isDotType(type)) {
      this.gutterSubscription.add(this.editorElement.onDidChangeScrollLeft(() => {
        return requestAnimationFrame(() => {
          return this.updateDotDecorationsOffsets(this.editorElement.getFirstVisibleScreenRow(), this.editorElement.getLastVisibleScreenRow());
        });
      })
      );

      this.gutterSubscription.add(this.editorElement.onDidChangeScrollTop(() => {
        return requestAnimationFrame(() => {
          return this.updateDotDecorationsOffsets(this.editorElement.getFirstVisibleScreenRow(), this.editorElement.getLastVisibleScreenRow());
        });
      })
      );

      this.gutterSubscription.add(this.editor.onDidChange(changes => {
        if (Array.isArray(changes)) {
          return (changes != null ? changes.forEach(change => {
            return this.updateDotDecorationsOffsets(change.start.row, change.newExtent.row);
          }) : undefined);

        } else if ((changes.start != null) && (changes.newExtent != null)) {
          return this.updateDotDecorationsOffsets(changes.start.row, changes.newExtent.row);
        }
      })
      );
    }

    return this.updateGutterDecorations(type);
  }

  destroyGutter() {
    try { this.gutter.destroy(); } catch (error) {}
    this.gutterSubscription.dispose();
    this.displayedMarkers = [];
    for (var id in this.decorationByMarkerId) { var decoration = this.decorationByMarkerId[id]; decoration.destroy(); }
    delete this.decorationByMarkerId;
    return delete this.gutterSubscription;
  }

  updateGutterDecorations(type=this.previousType) {
    let decoWidth, m;
    if (this.editor.isDestroyed()) { return; }

    const markers = this.colorBuffer.getValidColorMarkers();

    for (m of this.displayedMarkers) {
      if (!markers.includes(m)) {
        if (this.decorationByMarkerId[m.id] != null) {
          this.decorationByMarkerId[m.id].destroy();
        }
        delete this.decorationByMarkerId[m.id];
      }
    }

    const markersByRows = {};
    let maxRowLength = 0;
    const scrollLeft = this.editorElement.getScrollLeft();
    const maxDecorationsInGutter = atom.config.get('pigments.maxDecorationsInGutter');

    for (m of markers) {
      if ((m.color != null ? m.color.isValid() : undefined) && !this.displayedMarkers.includes(m)) {
        this.decorationByMarkerId[m.id] = this.gutter.decorateMarker(m.marker, {
          type: 'gutter',
          class: 'pigments-gutter-marker',
          item: this.getGutterDecorationItem(m)
        });
      }

      var deco = this.decorationByMarkerId[m.id];
      var {
        row
      } = m.marker.getStartScreenPosition();
      if (markersByRows[row] == null) { markersByRows[row] = 0; }

      if (markersByRows[row] >= maxDecorationsInGutter) { continue; }

      var rowLength = 0;

      if (type !== 'gutter') {
        try {
          rowLength = this.editorElement.pixelPositionForScreenPosition([row, Infinity]).left;
        } catch (error) {}
      }

      decoWidth = 14;

      deco.properties.item.style.left = `${(rowLength + (markersByRows[row] * decoWidth)) - scrollLeft}px`;

      markersByRows[row]++;
      maxRowLength = Math.max(maxRowLength, markersByRows[row]);
    }

    if (type === 'gutter') {
      atom.views.getView(this.gutter).style.minWidth = `${maxRowLength * decoWidth}px`;
    } else {
      atom.views.getView(this.gutter).style.width = "0px";
    }

    this.displayedMarkers = markers;
    return this.emitter.emit('did-update');
  }

  updateDotDecorationsOffsets(rowStart, rowEnd) {
    const markersByRows = {};
    const scrollLeft = this.editorElement.getScrollLeft();

    return __range__(rowStart, rowEnd, true).map((row) =>
      (() => {
        const result = [];
        for (var m of this.displayedMarkers) {
          var deco = this.decorationByMarkerId[m.id];
          if (m.marker == null) { continue; }
          var markerRow = m.marker.getStartScreenPosition().row;
          if (row !== markerRow) { continue; }

          if (markersByRows[row] == null) { markersByRows[row] = 0; }

          var rowLength = this.editorElement.pixelPositionForScreenPosition([row, Infinity]).left;

          var decoWidth = 14;

          deco.properties.item.style.left = `${(rowLength + (markersByRows[row] * decoWidth)) - scrollLeft}px`;
          result.push(markersByRows[row]++);
        }
        return result;
      })());
  }

  getGutterDecorationItem(marker) {
    const div = document.createElement('div');
    div.innerHTML = `\
<span style='background-image: linear-gradient(to bottom, ${marker.color.toCSS()} 0%, ${marker.color.toCSS()} 100%), url(atom://pigments/resources/transparent-background.png);' data-marker-id='${marker.id}'></span>\
`;
    return div;
  }

  //#     ######  ######## ##       ########  ######  ########
  //#    ##    ## ##       ##       ##       ##    ##    ##
  //#    ##       ##       ##       ##       ##          ##
  //#     ######  ######   ##       ######   ##          ##
  //#          ## ##       ##       ##       ##          ##
  //#    ##    ## ##       ##       ##       ##    ##    ##
  //#     ######  ######## ######## ########  ######     ##

  requestSelectionUpdate() {
    if (this.updateRequested) { return; }

    this.updateRequested = true;
    return requestAnimationFrame(() => {
      this.updateRequested = false;
      if (this.editor.getBuffer().isDestroyed()) { return; }
      return this.updateSelections();
    });
  }

  updateSelections() {
    if (this.editor.isDestroyed()) { return; }
    return (() => {
      const result = [];
      for (var marker of this.displayedMarkers) {
        var decoration = this.decorationByMarkerId[marker.id];

        if (decoration != null) { result.push(this.hideDecorationIfInSelection(marker, decoration)); } else {
          result.push(undefined);
        }
      }
      return result;
    })();
  }

  hideDecorationIfInSelection(marker, decoration) {
    const selections = this.editor.getSelections();

    const props = decoration.getProperties();
    let classes = props.class.split(/\s+/g);

    for (var selection of selections) {
      var range = selection.getScreenRange();
      var markerRange = marker.getScreenRange();

      if ((markerRange == null) || (range == null)) { continue; }
      if (markerRange.intersectsWith(range)) {
        if (classes[0].match(/-in-selection$/) == null) { classes[0] += '-in-selection'; }
        props.class = classes.join(' ');
        decoration.setProperties(props);
        return;
      }
    }

    classes = classes.map(cls => cls.replace('-in-selection', ''));
    props.class = classes.join(' ');
    return decoration.setProperties(props);
  }

  hideMarkerIfInSelectionOrFold(marker, view) {
    const selections = this.editor.getSelections();

    return (() => {
      const result = [];
      for (var selection of selections) {
        var range = selection.getScreenRange();
        var markerRange = marker.getScreenRange();

        if ((markerRange == null) || (range == null)) { continue; }

        if (markerRange.intersectsWith(range)) { view.classList.add('hidden'); }
        if  (this.editor.isFoldedAtBufferRow(marker.getBufferRange().start.row)) { result.push(view.classList.add('in-fold')); } else {
          result.push(undefined);
        }
      }
      return result;
    })();
  }

  //#     ######   #######  ##    ## ######## ######## ##     ## ########
  //#    ##    ## ##     ## ###   ##    ##    ##        ##   ##     ##
  //#    ##       ##     ## ####  ##    ##    ##         ## ##      ##
  //#    ##       ##     ## ## ## ##    ##    ######      ###       ##
  //#    ##       ##     ## ##  ####    ##    ##         ## ##      ##
  //#    ##    ## ##     ## ##   ###    ##    ##        ##   ##     ##
  //#     ######   #######  ##    ##    ##    ######## ##     ##    ##
  //#
  //#    ##     ## ######## ##    ## ##     ##
  //#    ###   ### ##       ###   ## ##     ##
  //#    #### #### ##       ####  ## ##     ##
  //#    ## ### ## ######   ## ## ## ##     ##
  //#    ##     ## ##       ##  #### ##     ##
  //#    ##     ## ##       ##   ### ##     ##
  //#    ##     ## ######## ##    ##  #######

  colorMarkerForMouseEvent(event) {
    const position = this.screenPositionForMouseEvent(event);

    if (position == null) { return; }

    const bufferPosition = this.colorBuffer.editor.bufferPositionForScreenPosition(position);

    return this.colorBuffer.getColorMarkerAtBufferPosition(bufferPosition);
  }

  screenPositionForMouseEvent(event) {
    const pixelPosition = this.pixelPositionForMouseEvent(event);

    if (pixelPosition == null) { return; }

    if (this.editorElement.screenPositionForPixelPosition != null) {
      return this.editorElement.screenPositionForPixelPosition(pixelPosition);
    } else {
      return this.editor.screenPositionForPixelPosition(pixelPosition);
    }
  }

  pixelPositionForMouseEvent(event) {
    const {clientX, clientY} = event;

    const scrollTarget = (this.editorElement.getScrollTop != null) ?
      this.editorElement
    :
      this.editor;

    const rootElement = this.getEditorRoot();

    if (rootElement.querySelector('.lines') == null) { return; }

    let {top, left} = rootElement.querySelector('.lines').getBoundingClientRect();
    top = (clientY - top) + scrollTarget.getScrollTop();
    left = (clientX - left) + scrollTarget.getScrollLeft();
    return {top, left};
  }
}
ColorBufferElement.initClass();

module.exports =
(ColorBufferElement =
registerOrUpdateElement('pigments-markers', ColorBufferElement.prototype));

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}
function __range__(left, right, inclusive) {
  let range = [];
  let ascending = left < right;
  let end = !inclusive ? right : ascending ? right + 1 : right - 1;
  for (let i = left; ascending ? i < end : i > end; ascending ? i++ : i--) {
    range.push(i);
  }
  return range;
}