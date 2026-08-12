/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const async = require('async');
const fs = require('fs');
const path = require('path');
const {Minimatch} = require('minimatch');

const PathsChunkSize = 100;

class PathLoader {
  constructor(rootPath, config) {
    let ignoreVcsIgnores;
    this.rootPath = rootPath;
    ({timestamp: this.timestamp, sourceNames: this.sourceNames, ignoreVcsIgnores, traverseSymlinkDirectories: this.traverseSymlinkDirectories, ignoredNames: this.ignoredNames, knownPaths: this.knownPaths} = config);

    if (this.knownPaths == null) { this.knownPaths = []; }
    this.paths = [];
    this.lostPaths = [];
    this.scannedPaths = [];

    this.repo = null;
    if (ignoreVcsIgnores) {
      const repo = atom.project.repositories[0].getRepo().workingDirectory;
      if (atom.project.repositories[0].isProjectAtRoot() === true) { this.repo = repo; }
    }
  }

  load(done) {
    return this.loadPath(this.rootPath, () => {
      for (var p of this.knownPaths) {
        if (!this.scannedPaths.includes(p) && (p.indexOf(this.rootPath) === 0)) {
          this.lostPaths.push(p);
        }
      }

      this.flushPaths();
      if (this.repo != null) {
        this.repo.destroy();
      }
      return done();
    });
  }

  isSource(loadedPath) {
    const relativePath = path.relative(this.rootPath, loadedPath);
    for (var sourceName of this.sourceNames) {
      if (sourceName.match(relativePath)) { return true; }
    }
  }

  isIgnored(loadedPath, stats) {
    const relativePath = path.relative(this.rootPath, loadedPath);
    if (this.repo != null ? this.repo.isPathIgnored(relativePath) : undefined) {
      return true;
    } else {
      for (var ignoredName of this.ignoredNames) {
        if (ignoredName.match(relativePath)) { return true; }
      }

      return false;
    }
  }

  isKnown(loadedPath) { return this.knownPaths.includes(loadedPath); }

  hasChanged(loadedPath, stats) {
    if (stats && (this.timestamp != null)) {
      return stats.ctime >= this.timestamp;
    } else {
      return false;
    }
  }

  pathLoaded(loadedPath, stats, done) {
    this.scannedPaths.push(loadedPath);
    if (this.isSource(loadedPath) && !this.isIgnored(loadedPath, stats)) {
      if (this.isKnown(loadedPath)) {
        if (this.hasChanged(loadedPath, stats)) { this.paths.push(loadedPath); }
      } else {
        this.paths.push(loadedPath);
      }
    } else {
      if (this.knownPaths.includes(loadedPath)) { this.lostPaths.push(loadedPath); }
    }

    if ((this.paths.length + this.lostPaths.length) === PathsChunkSize) { this.flushPaths(); }
    return done();
  }

  flushPaths() {
    if (this.paths.length) { emit('load-paths:paths-found', this.paths); }
    if (this.lostPaths.length) { emit('load-paths:paths-lost', this.lostPaths); }
    this.paths = [];
    return this.lostPaths = [];
  }

  loadPath(pathToLoad, done) {
    if (this.isIgnored(pathToLoad)) { return done(); }
    return fs.lstat(pathToLoad, (error, stats) => {
      if (error != null) { return done(); }
      if (stats.isSymbolicLink()) {
        return fs.stat(pathToLoad, (error, stats) => {
          if (error != null) { return done(); }
          if (stats.isFile()) {
            return this.pathLoaded(pathToLoad, stats, done);
          } else if (stats.isDirectory()) {
            if (this.traverseSymlinkDirectories) {
              return this.loadFolder(pathToLoad, done);
            } else {
              return done();
            }
          }
        });
      } else if (stats.isDirectory()) {
        return this.loadFolder(pathToLoad, done);
      } else if (stats.isFile()) {
        return this.pathLoaded(pathToLoad, stats, done);
      } else {
        return done();
      }
    });
  }

  loadFolder(folderPath, done) {
    return fs.readdir(folderPath, (error, children=[]) => {
      return async.each(
        children,
        (childName, next) => {
          return this.loadPath(path.join(folderPath, childName), next);
        },
        done
      );
    });
  }
}

module.exports = function(config) {
  let error;
  const newConf = {
    ignoreVcsIgnores: config.ignoreVcsIgnores,
    traverseSymlinkDirectories: config.traverseSymlinkDirectories,
    knownPaths: config.knownPaths,
    ignoredNames: [],
    sourceNames: []
  };

  if (config.timestamp != null) {
    newConf.timestamp = new Date(Date.parse(config.timestamp));
  }

  for (var source of config.sourceNames) {
    if (source) {
      try {
        newConf.sourceNames.push(new Minimatch(source, {matchBase: true, dot: true}));
      } catch (error1) {
        error = error1;
        console.warn(`Error parsing source pattern (${source}): ${error.message}`);
      }
    }
  }

  for (var ignore of config.ignoredNames) {
    if (ignore) {
      try {
        newConf.ignoredNames.push(new Minimatch(ignore, {matchBase: true, dot: true}));
      } catch (error2) {
        error = error2;
        console.warn(`Error parsing ignore pattern (${ignore}): ${error.message}`);
      }
    }
  }

  return async.each(
    config.paths,
    (rootPath, next) => new PathLoader(rootPath, newConf).load(next),
    this.async()
  );
};
