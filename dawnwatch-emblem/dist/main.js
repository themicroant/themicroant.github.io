import { CHAPTERS, chapterOf } from './data/chapters.js';
import { HERO_DEFS, ENEMY_DEFS } from './data/units.js';
import { EPILOGUE, PROLOGUE, STORY } from './data/story.js';
import { applyVictory } from './progress.js';
import { hasSave, loadSave, newGameSave, writeSave } from './save.js';
import { fitStage, overwriteModal, preload, rewardsModal, showScreen, theEndCard } from './ui.js';
import * as title from './screens/title.js';
import * as chapters from './screens/chapterSelect.js';
import * as team from './screens/teamBuilder.js';
import * as dialog from './screens/dialog.js';
import * as battle from './screens/battle.js';
let save = null;
let ready = false;
function assetList() {
    const out = [];
    HERO_DEFS.forEach((d) => { out.push('assets/units/' + d.id + '.png'); });
    ENEMY_DEFS.forEach((d) => { out.push('assets/units/' + d.id + '.png'); });
    ['plain', 'forest', 'mountain', 'water', 'wall', 'fort'].forEach((t) => { out.push('assets/tiles/' + t + '.png'); });
    out.push('assets/ui/bg.png', 'assets/ui/title.png');
    return out;
}
/* ---------------- navigation ---------------- */
function goTitle() {
    title.show({ hasSave: hasSave(), ready, onNew: onNewGame, onContinue: onContinue });
    void showScreen('title');
}
function onNewGame() {
    if (hasSave())
        overwriteModal(() => { save = newGameSave(); void goChapters(null); });
    else {
        save = newGameSave();
        void goChapters(null);
    }
}
function onContinue() {
    save = loadSave();
    if (!save) {
        goTitle();
        return;
    }
    void goChapters(null);
}
async function goChapters(rewards) {
    const s = loadSave() ?? save;
    if (!s) {
        goTitle();
        return;
    }
    save = s;
    chapters.show({ save: s, onSelect: (n) => { goTeam(n); }, onBack: goTitle });
    await showScreen('chapters');
    if (rewards)
        rewardsModal(rewards, () => { });
}
function goTeam(chapter) {
    if (!save)
        return;
    team.show({
        chapter, save,
        onBack: () => { void goChapters(null); },
        onBattle: (s) => { save = s; startChapter(chapter); },
    });
    void showScreen('team');
}
function playDialog(scenes, onDone) {
    dialog.show(scenes, onDone);
    void showScreen('dialog');
}
function startChapter(chapter) {
    if (!save)
        return;
    const scenes = [];
    if (chapter === 1 && save.cleared.indexOf(1) < 0)
        scenes.push({ backdrop: 'bg', lines: PROLOGUE });
    scenes.push({ backdrop: chapter, lines: STORY[chapter].pre });
    playDialog(scenes, () => { launchBattle(chapter); });
}
function launchBattle(chapter) {
    if (!save)
        return;
    const deployed = [...save.team];
    const levels = { ...save.levels };
    let result = null;
    void battle.show({
        chapter: chapterOf(chapter), team: deployed, levels,
        onWin: () => {
            if (!save)
                return;
            result = applyVictory(save, chapter, deployed);
            save = result.save;
            writeSave(save);
        },
        onVictoryDone: () => { afterVictory(chapter, result); },
        onExit: () => { void goChapters(null); },
    });
}
function afterVictory(chapter, result) {
    const scenes = [{ backdrop: chapter, lines: STORY[chapter].post }];
    const last = chapter === CHAPTERS[CHAPTERS.length - 1].num;
    if (last)
        scenes.push({ backdrop: 'bg', lines: EPILOGUE });
    playDialog(scenes, () => {
        if (last)
            theEndCard(goTitle);
        else
            void goChapters(result);
    });
}
/* ---------------- boot ---------------- */
function boot() {
    fitStage();
    window.addEventListener('resize', fitStage);
    title.show({ hasSave: hasSave(), ready: false, onNew: onNewGame, onContinue: onContinue });
    void showScreen('title', true);
    void preload(assetList()).then(() => {
        ready = true;
        title.markReady();
    });
}
boot();
//# sourceMappingURL=main.js.map