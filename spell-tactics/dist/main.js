import { HEROES, heroOf } from './data/heroes.js';
import { ENEMIES } from './data/enemies.js';
import { itemOf } from './data/items.js';
import { EPILOGUE, PROLOGUE, SITES } from './data/sites.js';
import { applyBattle, guestFor } from './progress.js';
import { clearSave, hasSave, loadSave, newGameSave, writeSave } from './save.js';
import { bar, button, clearModals, confirmModal, fitStage, h, modal, portraitEl, preload } from './ui.js';
import { XP_PER_LEVEL } from './rules.js';
import * as title from './screens/title.js';
import * as overworld from './screens/overworld.js';
import * as party from './screens/party.js';
import * as shop from './screens/shop.js';
import * as deploy from './screens/deploy.js';
import * as dialog from './screens/dialog.js';
import * as battle from './screens/battle.js';
let save = null;
function persist() { if (save)
    writeSave(save); }
function goTitle() {
    clearModals();
    title.show({
        hasSave: hasSave(),
        onNew: () => { if (hasSave())
            confirmModal('Start over?', 'This replaces your saved campaign.', 'New Game', newGame);
        else
            newGame(); },
        onContinue: () => { save = loadSave(); if (save)
            goMap();
        else
            newGame(); },
        onHelp: battle.help,
    });
}
function newGame() {
    save = newGameSave();
    persist();
    dialog.show(PROLOGUE, 'linear-gradient(180deg,#141b3d,#05070f)', 'The Nine Shards', () => { if (save) {
        save.seenIntro = true;
        persist();
    } goMap(); });
}
function goMap() {
    if (!save) {
        goTitle();
        return;
    }
    clearModals();
    overworld.show({ save, onSite: enterSite, onParty: () => goParty(goMap), onShop: goShop, onMenu: mapMenu });
}
function goParty(back, focus) {
    if (!save)
        return;
    party.show(save, back, persist, focus);
}
function goShop() {
    if (!save)
        return;
    shop.show(save, goMap, persist);
}
function mapMenu() {
    const close = modal(h('div', null, h('h2', null, 'Menu'), h('div', 'col-btns', button('Resume', () => close(), 'btn primary'), button('How to play', () => { close(); battle.help(); }), button('Title screen', () => { close(); goTitle(); }), button('Delete save', () => { close(); confirmModal('Delete save?', 'Your campaign progress will be lost.', 'Delete', () => { clearSave(); save = null; goTitle(); }); }))), { dismiss: true });
}
function enterSite(site) {
    if (!save)
        return;
    const first = save.cleared.indexOf(site.id) < 0;
    const go = () => goDeploy(site);
    if (first)
        dialog.show(site.pre, site.backdrop, `${site.icon} ${site.name}`, go);
    else
        go();
}
function goDeploy(site) {
    if (!save)
        return;
    const guest = guestFor(save, site);
    persist();
    deploy.show({
        save, site, guest,
        onBack: goMap,
        onParty: () => goParty(() => goDeploy(site)),
        onStart: (team) => startBattle(site, team),
    });
}
function startBattle(site, team) {
    if (!save)
        return;
    const s = save;
    battle.show({
        site,
        heroes: team.map((id) => JSON.parse(JSON.stringify(s.heroes[id]))),
        bag: s.bag,
        onEnd: (win, units, bag) => finishBattle(site, team, win, units, bag),
        onRetreat: (units, bag) => {
            const r = applyBattle(s, site, units, false, bag);
            persist();
            results(r, site, () => goMap(), null);
        },
    });
}
function finishBattle(site, team, win, units, bag) {
    if (!save)
        return;
    const r = applyBattle(save, site, units, win, bag);
    persist();
    if (!win) {
        results(r, site, goMap, () => startBattle(site, team));
        return;
    }
    results(r, site, () => {
        if (!r.firstClear) {
            goMap();
            return;
        }
        const last = site.id === SITES[SITES.length - 1].id;
        dialog.show(site.post, site.backdrop, null, () => {
            if (last)
                dialog.show(EPILOGUE, 'linear-gradient(180deg,#3d3214,#0c1538)', 'Epilogue', theEnd);
            else
                goMap();
        });
    }, null);
}
function results(r, site, onContinue, onRetry) {
    const close = modal(h('div', 'results', h('h2', r.win ? 'win' : 'lose', r.win ? `Victory — ${site.name}` : 'Defeat'), !r.win ? h('p', 'muted', 'Your heroes keep the experience they earned. Items used are gone.') : null, h('div', 'res-heroes', ...r.gains.map((g) => {
        const hs = save.heroes[g.id];
        return h('div', 'res-hero' + (g.deployed ? '' : ' bench'), portraitEl({ sprite: heroOf(g.id).sprite }, false, 'mini'), h('div', 'res-mid', h('b', null, `${heroOf(g.id).name} Lv ${hs.level}`), bar(hs.xp, XP_PER_LEVEL, 'xp', false)), h('div', 'res-r', h('small', null, `+${g.xp} XP`), g.levels ? h('span', 'lvup', `Level up! +${g.levels * 2} SP`) : null));
    })), r.win ? h('div', 'res-loot', h('span', 'loot', `💰 +${r.gold}`), ...r.loot.map((id) => h('span', 'loot', `${itemOf(id).icon} ${itemOf(id).name}`)), r.firstClear ? h('span', 'loot', '✦ Star Shard: +1 SP for every hero') : null) : null, r.recruit ? h('div', 'res-recruit', portraitEl({ sprite: heroOf(r.recruit).sprite }, false, 'mini'), h('b', null, `${heroOf(r.recruit).name} joins the company!`)) : null, h('div', 'row-btns', onRetry ? button('Retry', () => { close(); onRetry(); }) : null, button(r.win ? 'Continue' : 'Back to map', () => { close(); onContinue(); }, 'btn primary'))));
}
function theEnd() {
    clearModals();
    const close = modal(h('div', 'theend', h('h2', null, 'The End'), h('p', null, 'The Star Heart shines again. Thank you for playing!'), h('p', 'muted', 'All sites can still be replayed for experience and gold.'), h('div', 'row-btns', button('Back to the map', () => { close(); goMap(); }, 'btn primary'))));
}
async function boot() {
    fitStage();
    window.addEventListener('resize', fitStage);
    const urls = [...HEROES.map((x) => x.sprite), ...ENEMIES.filter((e) => e.art.sprite).map((e) => e.art.sprite),
        ...['plain', 'forest', 'mountain', 'water', 'wall', 'fort'].map((t) => `assets/tiles/${t}.jpg`), 'assets/ui/bg.jpg', 'assets/ui/title.jpg'];
    await preload([...new Set(urls)]);
    goTitle();
}
void boot();
//# sourceMappingURL=main.js.map