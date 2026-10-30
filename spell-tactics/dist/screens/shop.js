import { itemOf } from '../data/items.js';
import { siteOf } from '../data/sites.js';
import { addItem, shopStock } from '../progress.js';
import { button, h, showScreen, toast } from '../ui.js';
import { itemText, SLOT_LABEL } from './common.js';
let tab = 'buy';
export function show(save, onBack, onChange) {
    const render = () => {
        const list = h('div', 'shop-list');
        if (tab === 'buy') {
            let lastSite = -1;
            for (const id of shopStock(save)) {
                const it = itemOf(id);
                if (it.site !== lastSite) {
                    lastSite = it.site;
                    list.append(h('div', 'shop-sec', it.site === 0 ? 'General goods' : `${siteOf(it.site).icon} ${siteOf(it.site).name}`));
                }
                const owned = save.bag[id] ?? 0;
                list.append(h('div', 'li', h('span', 'li-icon', it.icon), h('div', 'li-mid', h('b', null, it.name, h('small', null, ` ${SLOT_LABEL[it.slot]}${it.weapon ? ' · ' + it.weapon : ''}${owned ? ' · own ' + owned : ''}`)), h('small', null, itemText(it))), button(`💰${it.price}`, () => { save.gold -= it.price; addItem(save, id); onChange(); toast(`Bought ${it.name}`); render(); }, 'btn small primary', save.gold < it.price)));
            }
            if (save.cleared.length === 0)
                list.append(h('p', 'muted', 'Clear battle sites to bring their themed gear to the market.'));
        }
        else {
            const ids = Object.keys(save.bag).filter((id) => save.bag[id] > 0);
            if (!ids.length)
                list.append(h('p', 'muted', 'Nothing to sell. Equipped items must be unequipped first.'));
            for (const id of ids) {
                const it = itemOf(id);
                const price = Math.floor(it.price / 2);
                list.append(h('div', 'li', h('span', 'li-icon', it.icon), h('div', 'li-mid', h('b', null, it.name, h('small', null, ` ×${save.bag[id]}`)), h('small', null, itemText(it))), button(`+💰${price}`, () => { save.gold += price; addItem(save, id, -1); onChange(); render(); }, 'btn small')));
            }
        }
        showScreen(h('div', 'shop', h('div', 'hdr', button('‹ Back', onBack, 'btn small'), h('div', 'hdr-t', 'Starwell Market'), h('div', 'gold', `💰 ${save.gold}`)), h('div', 'seg', button('Buy', () => { tab = 'buy'; render(); }, 'seg-b' + (tab === 'buy' ? ' on' : '')), button('Sell', () => { tab = 'sell'; render(); }, 'seg-b' + (tab === 'sell' ? ' on' : ''))), list));
    };
    render();
}
//# sourceMappingURL=shop.js.map