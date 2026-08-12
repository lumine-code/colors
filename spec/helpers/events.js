/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const event = (type, properties={}) => new Event(type, properties);

const mouseEvent = function(type, properties) {
  const defaults = {
    bubbles: true,
    cancelable: (type !== "mousemove"),
    view: window,
    detail: 0,
    pageX: 0,
    pageY: 0,
    clientX: 0,
    clientY: 0,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    metaKey: false,
    button: 0,
    relatedTarget: undefined
  };

  for (var k in defaults) { var v = defaults[k]; if ((properties[k] == null)) { properties[k] = v; } }

  return new MouseEvent(type, properties);
};

const objectCenterCoordinates = function(target) {
  const {top, left, width, height} = target.getBoundingClientRect();
  return {x: left + (width / 2), y: top + (height / 2)};
};

module.exports = {objectCenterCoordinates, mouseEvent, event};

['mousedown', 'mousemove', 'mouseup', 'click'].forEach(key => module.exports[key] = function(target, x, y, cx, cy, btn) {
  if ((x == null) || (y == null)) { ({x,y} = objectCenterCoordinates(target)); }

  if ((cx == null) || (cy == null)) {
    cx = x;
    cy = y;
  }

  return target.dispatchEvent(mouseEvent(key, {target, pageX: x, pageY: y, clientX: cx, clientY: cy, button: btn}));
});

module.exports.mousewheel = (target, deltaX=0, deltaY=0) => target.dispatchEvent(mouseEvent('mousewheel', {target, deltaX, deltaY}));

module.exports.change = target => target.dispatchEvent(event('change', {target}));
