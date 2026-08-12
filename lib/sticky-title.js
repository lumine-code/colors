/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
let StickyTitle;
const {EventsDelegation} = require('atom-utils');
let CompositeDisposable = null;

module.exports =
(StickyTitle = (function() {
  StickyTitle = class StickyTitle {
    static initClass() {
      EventsDelegation.includeInto(this);
    }

    constructor(stickies, scrollContainer) {
      this.stickies = stickies;
      this.scrollContainer = scrollContainer;
      if (CompositeDisposable == null) { ({
        CompositeDisposable
      } = require('atom')); }

      this.subscriptions = new CompositeDisposable;
      Array.prototype.forEach.call(this.stickies, function(sticky) {
        sticky.parentNode.style.height = sticky.offsetHeight + 'px';
        return sticky.style.width = sticky.offsetWidth + 'px';
      });

      this.subscriptions.add(this.subscribeTo(this.scrollContainer, { 'scroll': e => {
        return this.scroll(e);
      }
    }
      )
      );
    }

    dispose() {
      this.subscriptions.dispose();
      this.stickies = null;
      return this.scrollContainer = null;
    }

    scroll(e) {
      const delta = this.lastScrollTop ?
        this.lastScrollTop - this.scrollContainer.scrollTop
      :
        0;

      Array.prototype.forEach.call(this.stickies, (sticky, i) => {
        const nextSticky = this.stickies[i + 1];
        const prevSticky = this.stickies[i - 1];
        const scrollTop = this.scrollContainer.getBoundingClientRect().top;
        const parentTop = sticky.parentNode.getBoundingClientRect().top;
        const {top} = sticky.getBoundingClientRect();

        if (parentTop < scrollTop) {
          if (!sticky.classList.contains('absolute')) {
            sticky.classList.add('fixed');
            sticky.style.top = scrollTop + 'px';

            if (nextSticky != null) {
              const nextTop = nextSticky.parentNode.getBoundingClientRect().top;
              if ((top + sticky.offsetHeight) >= nextTop) {
                sticky.classList.add('absolute');
                return sticky.style.top = this.scrollContainer.scrollTop + 'px';
              }
            }
          }

        } else {
          sticky.classList.remove('fixed');

          if ((prevSticky != null) && prevSticky.classList.contains('absolute')) {
            let prevTop = prevSticky.getBoundingClientRect().top;
            if (delta < 0) { prevTop -= prevSticky.offsetHeight; }

            if (scrollTop <= prevTop) {
              prevSticky.classList.remove('absolute');
              return prevSticky.style.top = scrollTop + 'px';
            }
          }
        }
      });

      return this.lastScrollTop = this.scrollContainer.scrollTop;
    }
  };
  StickyTitle.initClass();
  return StickyTitle;
})());
