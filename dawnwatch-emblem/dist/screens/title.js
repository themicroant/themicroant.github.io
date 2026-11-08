/* Title screen (SPEC 14). */
import { $ } from '../ui.js';
import { VERSION } from '../version.js';
let wired = false;
let handlers = null;
function setReady(ready) {
    $('titleLoading').style.display = ready ? 'none' : 'block';
    const bn = $('btnNew'), bc = $('btnContinue');
    bn.disabled = !ready;
    bc.disabled = !ready;
}
/* Called by main once preloading has finished. */
export function markReady() {
    if (handlers)
        handlers.ready = true;
    setReady(true);
}
export function show(opts) {
    handlers = opts;
    $('titleVersion').textContent = 'v' + VERSION;
    $('btnContinue').style.display = opts.hasSave ? '' : 'none';
    setReady(opts.ready);
    if (wired)
        return;
    wired = true;
    $('btnNew').addEventListener('click', () => { if (handlers && handlers.ready)
        handlers.onNew(); });
    $('btnContinue').addEventListener('click', () => { if (handlers && handlers.ready)
        handlers.onContinue(); });
}
//# sourceMappingURL=title.js.map