/* Title screen (SPEC 14). */
import { button, h, showScreen } from '../ui.js';
import { VERSION } from '../version.js';
export function show(o) {
    showScreen(h('div', 'title', h('div', 'title-logo', h('div', 'tl-main', 'Spell Tactics'), h('div', 'tl-sub', 'The Nine Shards')), h('div', 'title-btns', o.hasSave ? button('Continue', o.onContinue, 'btn primary big') : null, button('New Game', o.onNew, 'btn big' + (o.hasSave ? '' : ' primary')), button('How to play', o.onHelp, 'btn')), h('div', 'title-ver', VERSION)));
}
//# sourceMappingURL=title.js.map