/* Foundry input integration. The touch toolbar owns its screen corner, so the
 * desktop launcher joins that toolbar instead of covering a native action.
 * Loaded after 98-foundry.js and before 99-start.js. No core controls replaced.
 */
(() => {
  'use strict';
  const launcher = document.querySelector('.ed-foundry-launch');
  const sync = syncTouchControls;
  let previousHost;
  syncTouchControls = function (force = false) {
    sync(force);
    const host = TOUCH.el;
    if (!launcher || host === previousHost) return;
    previousHost = host;
    launcher.hidden = !!host;
    if (!host) return;
    const bar = host.querySelector('.ed-touch-bar');
    if (!bar) return;
    const button = formElement('button', 'Foundry', bar, {
      type: 'button', 'aria-label': 'Open creature Foundry', 'data-foundry-touch': ''
    });
    button.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation(); window.__edFoundry.open();
    });
  };
})();
