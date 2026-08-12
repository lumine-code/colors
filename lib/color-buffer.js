/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * DS104: Avoid inline assignments
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
let ColorBuffer;
let [
  Color, ColorMarker, VariablesCollection,
  Emitter, CompositeDisposable, Task, Range,
  fs
] = Array.from([]);

module.exports =
(ColorBuffer = class ColorBuffer {
  constructor(params={}) {
    let colorMarkers;
    if (Emitter == null) {
      ({Emitter, CompositeDisposable, Task, Range} = require('atom'));
    }

    ({editor: this.editor, project: this.project, colorMarkers} = params);
    ({id: this.id} = this.editor);
    this.emitter = new Emitter;
    this.subscriptions = new CompositeDisposable;
    this.ignoredScopes=[];

    this.colorMarkersByMarkerId = {};

    this.subscriptions.add(this.editor.onDidDestroy(() => this.destroy()));

    const tokenized = () => {
      return __guard__(this.getColorMarkers(), x => x.forEach(marker => marker.checkMarkerScope(true)));
    };

    if (this.editor.onDidTokenize != null) {
      this.subscriptions.add(this.editor.onDidTokenize(tokenized));
    } else {
      this.subscriptions.add(this.editor.displayBuffer.onDidTokenize(tokenized));
    }

    this.subscriptions.add(this.editor.onDidChange(() => {
      if (this.initialized && this.variableInitialized) { this.terminateRunningTask(); }
      if (this.timeout != null) { return clearTimeout(this.timeout); }
    })
    );

    this.subscriptions.add(this.editor.onDidStopChanging(() => {
      if (this.delayBeforeScan === 0) {
        return this.update();
      } else {
        if (this.timeout != null) { clearTimeout(this.timeout); }
        return this.timeout = setTimeout(() => {
          this.update();
          return this.timeout = null;
        }
        , this.delayBeforeScan);
      }
    })
    );

    this.subscriptions.add(this.editor.onDidChangePath(path => {
      if (this.isVariablesSource()) { this.project.appendPath(path); }
      return this.update();
    })
    );

    if ((this.project.getPaths() != null) && this.isVariablesSource() && !this.project.hasPath(this.editor.getPath())) {
      if (fs == null) { fs = require('fs'); }

      if (fs.existsSync(this.editor.getPath())) {
        this.project.appendPath(this.editor.getPath());
      } else {
        var saveSubscription = this.editor.onDidSave(({path}) => {
          this.project.appendPath(path);
          this.update();
          saveSubscription.dispose();
          return this.subscriptions.remove(saveSubscription);
        });

        this.subscriptions.add(saveSubscription);
      }
    }

    this.subscriptions.add(this.project.onDidUpdateVariables(() => {
      if (!this.variableInitialized) { return; }
      return this.scanBufferForColors().then(results => this.updateColorMarkers(results));
    })
    );

    this.subscriptions.add(this.project.onDidChangeIgnoredScopes(() => {
      return this.updateIgnoredScopes();
    })
    );

    this.subscriptions.add(atom.config.observe('pigments.delayBeforeScan', (delayBeforeScan=0) => {
      this.delayBeforeScan = delayBeforeScan;
      
  }));

    if (this.editor.addMarkerLayer != null) {
      this.markerLayer = this.editor.addMarkerLayer();
    } else {
      this.markerLayer = this.editor;
    }

    if (colorMarkers != null) {
      this.restoreMarkersState(colorMarkers);
      this.cleanUnusedTextEditorMarkers();
    }

    this.updateIgnoredScopes();
    this.initialize();
  }

  onDidUpdateColorMarkers(callback) {
    return this.emitter.on('did-update-color-markers', callback);
  }

  onDidDestroy(callback) {
    return this.emitter.on('did-destroy', callback);
  }

  initialize() {
    if (this.colorMarkers != null) { return Promise.resolve(); }
    if (this.initializePromise != null) { return this.initializePromise; }

    this.updateVariableRanges();

    this.initializePromise = this.scanBufferForColors().then(results => {
      return this.createColorMarkers(results);
  }).then(results => {
      this.colorMarkers = results;
      return this.initialized = true;
    });

    this.initializePromise.then(() => this.variablesAvailable());

    return this.initializePromise;
  }

  restoreMarkersState(colorMarkers) {
    if (Color == null) { Color = require('./color'); }
    if (ColorMarker == null) { ColorMarker = require('./color-marker'); }

    this.updateVariableRanges();

    return this.colorMarkers = colorMarkers
    .filter(state => state != null)
    .map(state => {
      let left;
      const marker = (left = this.editor.getMarker(state.markerId)) != null ? left : this.markerLayer.markBufferRange(state.bufferRange, { invalidate: 'touch' });
      const color = new Color(state.color);
      color.variables = state.variables;
      color.invalid = state.invalid;
      return this.colorMarkersByMarkerId[marker.id] = new ColorMarker({
        marker,
        color,
        text: state.text,
        colorBuffer: this
      });
  });
  }

  cleanUnusedTextEditorMarkers() {
    return this.markerLayer.findMarkers().forEach(m => {
      if (this.colorMarkersByMarkerId[m.id] == null) { return m.destroy(); }
    });
  }

  variablesAvailable() {
    if (this.variablesPromise != null) { return this.variablesPromise; }

    return this.variablesPromise = this.project.initialize()
    .then(results => {
      if (this.destroyed) { return; }
      if (results == null) { return; }

      if (this.isIgnored() && this.isVariablesSource()) { return this.scanBufferForVariables(); }
  }).then(results => {
      return this.scanBufferForColors({variables: results});
    }).then(results => {
      return this.updateColorMarkers(results);
    }).then(() => {
      return this.variableInitialized = true;
    }).catch(reason => console.log(reason));
  }

  update() {
    this.terminateRunningTask();

    const promise = this.isIgnored() ?
      this.scanBufferForVariables()
    : !this.isVariablesSource() ?
      Promise.resolve([])
    :
      this.project.reloadVariablesForPath(this.editor.getPath());

    return promise.then(results => {
      return this.scanBufferForColors({variables: results});
  }).then(results => {
      return this.updateColorMarkers(results);
    }).catch(reason => console.log(reason));
  }

  terminateRunningTask() { return (this.task != null ? this.task.terminate() : undefined); }

  destroy() {
    if (this.destroyed) { return; }

    this.terminateRunningTask();
    this.subscriptions.dispose();
    if (this.colorMarkers != null) {
      this.colorMarkers.forEach(marker => marker.destroy());
    }
    this.destroyed = true;
    this.emitter.emit('did-destroy');
    return this.emitter.dispose();
  }

  isVariablesSource() { return this.project.isVariablesSourcePath(this.editor.getPath()); }

  isIgnored() {
    const p = this.editor.getPath();
    return this.project.isIgnoredPath(p) || !atom.project.contains(p);
  }

  isDestroyed() { return this.destroyed; }

  getPath() { return this.editor.getPath(); }

  getScope() { return this.project.scopeFromFileName(this.getPath()); }

  updateIgnoredScopes() {
    this.ignoredScopes = this.project.getIgnoredScopes().map(function(scope) {
      try { return new RegExp(scope); } catch (error) {}}).filter(re => re != null);

    __guard__(this.getColorMarkers(), x => x.forEach(marker => marker.checkMarkerScope(true)));
    return this.emitter.emit('did-update-color-markers', {created: [], destroyed: []});
  }


  //#    ##     ##    ###    ########   ######
  //#    ##     ##   ## ##   ##     ## ##    ##
  //#    ##     ##  ##   ##  ##     ## ##
  //#    ##     ## ##     ## ########   ######
  //#     ##   ##  ######### ##   ##         ##
  //#      ## ##   ##     ## ##    ##  ##    ##
  //#       ###    ##     ## ##     ##  ######

  updateVariableRanges() {
    const variablesForBuffer = this.project.getVariablesForPath(this.editor.getPath());
    return variablesForBuffer.forEach(variable => {
      return variable.bufferRange != null ? variable.bufferRange : (variable.bufferRange = Range.fromObject([
        this.editor.getBuffer().positionForCharacterIndex(variable.range[0]),
        this.editor.getBuffer().positionForCharacterIndex(variable.range[1])
      ]));
  });
  }

  scanBufferForVariables() {
    if (this.destroyed) { return Promise.reject("This ColorBuffer is already destroyed"); }
    if (!this.editor.getPath()) { return Promise.resolve([]); }

    let results = [];
    const taskPath = require.resolve('./tasks/scan-buffer-variables-handler');
    const {
      editor
    } = this;
    const buffer = this.editor.getBuffer();
    const config = {
      buffer: this.editor.getText(),
      registry: this.project.getVariableExpressionsRegistry().serialize(),
      scope: this.getScope()
    };

    return new Promise((resolve, reject) => {
      this.task = Task.once(
        taskPath,
        config,
        () => {
          this.task = null;
          return resolve(results);
      });

      return this.task.on('scan-buffer:variables-found', variables => results = results.concat(variables.map(function(variable) {
        variable.path = editor.getPath();
        variable.bufferRange = Range.fromObject([
          buffer.positionForCharacterIndex(variable.range[0]),
          buffer.positionForCharacterIndex(variable.range[1])
        ]);
        return variable;
      })
      ));
    });
  }

  //#     ######   #######  ##        #######  ########
  //#    ##    ## ##     ## ##       ##     ## ##     ##
  //#    ##       ##     ## ##       ##     ## ##     ##
  //#    ##       ##     ## ##       ##     ## ########
  //#    ##       ##     ## ##       ##     ## ##   ##
  //#    ##    ## ##     ## ##       ##     ## ##    ##
  //#     ######   #######  ########  #######  ##     ##
  //#
  //#    ##     ##    ###    ########  ##    ## ######## ########   ######
  //#    ###   ###   ## ##   ##     ## ##   ##  ##       ##     ## ##    ##
  //#    #### ####  ##   ##  ##     ## ##  ##   ##       ##     ## ##
  //#    ## ### ## ##     ## ########  #####    ######   ########   ######
  //#    ##     ## ######### ##   ##   ##  ##   ##       ##   ##         ##
  //#    ##     ## ##     ## ##    ##  ##   ##  ##       ##    ##  ##    ##
  //#    ##     ## ##     ## ##     ## ##    ## ######## ##     ##  ######

  getMarkerLayer() { return this.markerLayer; }

  getColorMarkers() { return this.colorMarkers; }

  getValidColorMarkers() {
    let left;
    return (left = __guard__(this.getColorMarkers(), x => x.filter(m => (m.color != null ? m.color.isValid() : undefined) && !m.isIgnored()))) != null ? left : [];
  }

  getColorMarkerAtBufferPosition(bufferPosition) {
    const markers = this.markerLayer.findMarkers({
      containsBufferPosition: bufferPosition
    });

    for (var marker of markers) {
      if (this.colorMarkersByMarkerId[marker.id] != null) {
        return this.colorMarkersByMarkerId[marker.id];
      }
    }
  }

  createColorMarkers(results) {
    if (this.destroyed) { return Promise.resolve([]); }

    if (ColorMarker == null) { ColorMarker = require('./color-marker'); }

    return new Promise((resolve, reject) => {
      const newResults = [];

      var processResults = () => {
        const startDate = new Date;

        if (this.editor.isDestroyed()) { return resolve([]); }

        while (results.length) {
          var result = results.shift();

          var marker = this.markerLayer.markBufferRange(result.bufferRange, {invalidate: 'touch'});
          newResults.push(this.colorMarkersByMarkerId[marker.id] = new ColorMarker({
            marker,
            color: result.color,
            text: result.match,
            colorBuffer: this
          }));

          if ((new Date() - startDate) > 10) {
            requestAnimationFrame(processResults);
            return;
          }
        }

        return resolve(newResults);
      };

      return processResults();
    });
  }

  findExistingMarkers(results) {
    const newMarkers = [];
    const toCreate = [];

    return new Promise((resolve, reject) => {
      var processResults = () => {
        const startDate = new Date;

        while (results.length) {
          var marker;
          var result = results.shift();

          if ((marker = this.findColorMarker(result))) {
            newMarkers.push(marker);
          } else {
            toCreate.push(result);
          }

          if ((new Date() - startDate) > 10) {
            requestAnimationFrame(processResults);
            return;
          }
        }

        return resolve({newMarkers, toCreate});
      };

      return processResults();
    });
  }

  updateColorMarkers(results) {
    let newMarkers = null;
    let createdMarkers = null;

    return this.findExistingMarkers(results).then(({newMarkers: markers, toCreate}) => {
      newMarkers = markers;
      return this.createColorMarkers(toCreate);
  }).then(results => {
      let toDestroy;
      createdMarkers = results;
      newMarkers = newMarkers.concat(results);

      if (this.colorMarkers != null) {
        toDestroy = this.colorMarkers.filter(marker => !newMarkers.includes(marker));
        toDestroy.forEach(marker => {
          delete this.colorMarkersByMarkerId[marker.id];
          return marker.destroy();
        });
      } else {
        toDestroy = [];
      }

      this.colorMarkers = newMarkers;
      return this.emitter.emit('did-update-color-markers', {
        created: createdMarkers,
        destroyed: toDestroy
      });
    });
  }

  findColorMarker(properties={}) {
    if (this.colorMarkers == null) { return; }
    for (var marker of this.colorMarkers) {
      if (marker != null ? marker.match(properties) : undefined) { return marker; }
    }
  }

  findColorMarkers(properties={}) {
    const markers = this.markerLayer.findMarkers(properties);
    return markers.map(marker => {
      return this.colorMarkersByMarkerId[marker.id];
  })
    .filter(marker => marker != null);
  }

  findValidColorMarkers(properties) {
    return this.findColorMarkers(properties).filter(marker => {
      return (marker != null) && (marker.color != null ? marker.color.isValid() : undefined) && !(marker != null ? marker.isIgnored() : undefined);
    });
  }

  selectColorMarkerAndOpenPicker(colorMarker) {
    if (this.destroyed) { return; }

    this.editor.setSelectedBufferRange(colorMarker.marker.getBufferRange());

    // For the moment it seems only colors in #RRGGBB format are detected
    // by the color picker, so we'll exclude anything else
    if (!__guard__(this.editor.getSelectedText(), x => x.match(/^#[0-9a-fA-F]{3,8}$/))) { return; }

    if (this.project.colorPickerAPI != null) {
      return this.project.colorPickerAPI.open(this.editor, this.editor.getLastCursor());
    }
  }

  scanBufferForColors(options={}) {
    let left, left1, left2;
    if (this.destroyed) { return Promise.reject("This ColorBuffer is already destroyed"); }

    if (Color == null) { Color = require('./color'); }

    let results = [];
    const taskPath = require.resolve('./tasks/scan-buffer-colors-handler');
    const buffer = this.editor.getBuffer();
    const registry = this.project.getColorExpressionsRegistry().serialize();

    if (options.variables != null) {
      if (VariablesCollection == null) { VariablesCollection = require('./variables-collection'); }

      const collection = new VariablesCollection();
      collection.addMany(options.variables);
      options.variables = collection;
    }

    const variables = this.isVariablesSource() ?
      // In the case of files considered as source, the variables in the project
      // are needed when parsing the files.
      ((left = (options.variables != null ? options.variables.getVariables() : undefined)) != null ? left : []).concat((left1 = this.project.getVariables()) != null ? left1 : [])
    :
      // Files that are not part of the sources will only use the variables
      // defined in them and so the global variables expression must be
      // discarded before sending the registry to the child process.
      (left2 = (options.variables != null ? options.variables.getVariables() : undefined)) != null ? left2 : [];

    delete registry.expressions['pigments:variables'];
    delete registry.regexpString;

    const config = {
      buffer: this.editor.getText(),
      bufferPath: this.getPath(),
      scope: this.getScope(),
      variables,
      colorVariables: variables.filter(v => v.isColor),
      registry
    };

    return new Promise((resolve, reject) => {
      this.task = Task.once(
        taskPath,
        config,
        () => {
          this.task = null;
          return resolve(results);
      });

      return this.task.on('scan-buffer:colors-found', colors => results = results.concat(colors.map(function(res) {
        res.color = new Color(res.color);
        res.bufferRange = Range.fromObject([
          buffer.positionForCharacterIndex(res.range[0]),
          buffer.positionForCharacterIndex(res.range[1])
        ]);
        return res;
      })
      ));
    });
  }

  serialize() {
    return {
      id: this.id,
      path: this.editor.getPath(),
      colorMarkers: (this.colorMarkers != null ? this.colorMarkers.map(marker => marker.serialize()) : undefined)
    };
  }
});

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}