// The three Jasmine 1.3 async primitives these specs were written against,
// expressed in terms of promises so they can be awaited.
//
// The editor deleted its Jasmine 1.3 shim, and the modern harness offers
// `conditionPromise` and friends instead. Rewriting several hundred call sites
// into bare `await` would have churned every spec in the suite for no gain, so
// the shapes stay and each call is awaited: `waitsForPromise` hands back the
// promise its callback returns, `runs` simply runs, and `waitsFor` polls.
//
// Both `waitsForPromise` and `waitsFor` were also callable with a leading label
// or options object, which was only ever used for failure messages, so the
// callback is taken as the last argument whatever precedes it.

function waitsForPromise(...args) {
  const body = args[args.length - 1];
  return body();
}

function runs(body) {
  return body();
}

function waitsFor(...args) {
  const condition = args[args.length - 1];
  // `conditionPromise` is a global the editor's spec harness injects.
  return conditionPromise(condition);
}

module.exports = { runs, waitsFor, waitsForPromise };
