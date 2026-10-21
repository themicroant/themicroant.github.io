import { chapterOf } from '../data/chapters.js';
import { terrainOfMap, COLS, ROWS } from '../logic.js';
import { baseDef, displayName } from '../data/units.js';
import { $, h, spriteImg, tileEl, unitMeta } from '../ui.js';
const CHAR_MS = 25; // 40 characters per second
let R = null;
let wired = false;
function drawBackdrop(scene) {
    const bd = $('dlgBackdrop');
    bd.innerHTML = '';
    if (scene.backdrop !== 'bg') {
        const ch = chapterOf(scene.backdrop);
        const map = h('div', 'dlg-map');
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++)
                map.appendChild(tileEl(terrainOfMap(ch.map, c, r).key, c, r));
        }
        bd.appendChild(map);
    }
}
function setPortrait(slot, id, dim, fade) {
    if (id === null) {
        slot.innerHTML = '';
        return;
    }
    if (fade) {
        slot.innerHTML = '';
        const m = unitMeta(id);
        const inner = h('div', 'dp' + (m.side === 'enemy' ? ' flip' : ''));
        spriteImg(m, inner);
        slot.appendChild(inner);
        slot.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 150, easing: 'linear' });
    }
    slot.classList.toggle('dim', dim);
}
function finishSequence() {
    if (!R || R.finished)
        return;
    R.finished = true;
    stopTimer();
    const cb = R.onDone;
    cb();
}
function stopTimer() {
    if (R && R.timer !== null) {
        window.clearInterval(R.timer);
        R.timer = null;
    }
}
function renderText() {
    if (!R)
        return;
    const t = $('dlgText');
    t.textContent = R.text.substring(0, R.shown);
    $('dlgNext').style.visibility = R.typing ? 'hidden' : 'visible';
}
function startLine() {
    if (!R)
        return;
    const scene = R.scenes[R.sceneIdx];
    const line = scene.lines[R.lineIdx];
    drawBackdropIfNew();
    const narrator = line.speaker === 'narrator';
    const plate = $('dlgPlate');
    if (narrator) {
        plate.style.display = 'none';
        $('dlgPortraitL').classList.add('dim');
        $('dlgPortraitR').classList.add('dim');
    }
    else {
        const side = baseDef(line.speaker).side;
        plate.style.display = 'flex';
        plate.textContent = displayName(line.speaker);
        plate.className = side === 'player' ? 'left' : 'right';
        if (side === 'player') {
            const change = R.left !== line.speaker;
            R.left = line.speaker;
            setPortrait($('dlgPortraitL'), line.speaker, false, change);
            $('dlgPortraitR').classList.add('dim');
        }
        else {
            const change = R.right !== line.speaker;
            R.right = line.speaker;
            setPortrait($('dlgPortraitR'), line.speaker, false, change);
            $('dlgPortraitL').classList.add('dim');
        }
    }
    const txt = $('dlgText');
    txt.classList.toggle('narr', narrator);
    R.text = line.text;
    R.shown = 0;
    R.typing = true;
    renderText();
    stopTimer();
    R.timer = window.setInterval(() => {
        if (!R)
            return;
        R.shown++;
        if (R.shown >= R.text.length) {
            R.shown = R.text.length;
            R.typing = false;
            stopTimer();
        }
        renderText();
    }, CHAR_MS);
}
let drawnScene = -1;
function drawBackdropIfNew() {
    if (!R || drawnScene === R.sceneIdx)
        return;
    drawnScene = R.sceneIdx;
    drawBackdrop(R.scenes[R.sceneIdx]);
}
function advance() {
    if (!R || R.finished)
        return;
    if (R.typing) {
        R.shown = R.text.length;
        R.typing = false;
        stopTimer();
        renderText();
        return;
    }
    const scene = R.scenes[R.sceneIdx];
    if (R.lineIdx + 1 < scene.lines.length) {
        R.lineIdx++;
        startLine();
        return;
    }
    if (R.sceneIdx + 1 < R.scenes.length) {
        R.sceneIdx++;
        R.lineIdx = 0;
        startLine();
        return;
    }
    finishSequence();
}
export function show(scenes, onDone) {
    const nonEmpty = scenes.filter((s) => s.lines.length > 0);
    if (nonEmpty.length === 0) {
        onDone();
        return;
    }
    stopTimer();
    R = {
        scenes: nonEmpty, sceneIdx: 0, lineIdx: 0, text: '', shown: 0, timer: null, typing: false,
        finished: false, onDone, left: null, right: null,
    };
    drawnScene = -1;
    $('dlgPortraitL').innerHTML = '';
    $('dlgPortraitR').innerHTML = '';
    $('dlgPortraitL').classList.remove('dim');
    $('dlgPortraitR').classList.remove('dim');
    if (!wired) {
        wired = true;
        $('screen-dialog').addEventListener('click', () => { advance(); });
        $('btnSkip').addEventListener('click', (e) => { e.stopPropagation(); finishSequence(); });
    }
    startLine();
}
//# sourceMappingURL=dialog.js.map