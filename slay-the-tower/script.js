'use strict';

/* =========================================================================
   SLAY THE TOWER — a tiny Slay the Spire-inspired deckbuilding roguelike
   Pure vanilla JS, single-page, no build step.
   ========================================================================= */

/* ---------------------------------------------------------------------- */
/* SOUND — synthesized via the Web Audio API (no asset files, works offline) */
/* ---------------------------------------------------------------------- */

const Sound = (() => {
  let ctx = null;
  let muted = false;
  try { muted = localStorage.getItem('stt-muted') === '1'; } catch (e) { /* ignore */ }

  function context() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { ctx = new AC(); } catch (e) { return null; }
    }
    return ctx;
  }
  // Browsers require a user gesture before audio can play; call on first tap.
  function unlock() { const c = context(); if (c && c.state === 'suspended') c.resume(); }

  // One short enveloped oscillator note, optionally sliding in pitch.
  function tone(freq, dur, type, gain, slideTo) {
    if (muted) return;
    const c = context();
    if (!c) return;
    const t = c.currentTime;
    const osc = c.createOscillator();
    const env = c.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(gain || 0.14, t + 0.012);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(env); env.connect(c.destination);
    osc.start(t); osc.stop(t + dur + 0.03);
  }
  // A quick arpeggio of notes for jingles.
  function arp(freqs, dur, type, gain) {
    freqs.forEach((f, i) => setTimeout(() => tone(f, dur, type, gain), i * 80));
  }

  return {
    unlock,
    toggleMute() { muted = !muted; try { localStorage.setItem('stt-muted', muted ? '1' : '0'); } catch (e) {} return muted; },
    isMuted() { return muted; },
    click() { tone(300, 0.05, 'square', 0.07); },
    select() { tone(440, 0.09, 'triangle', 0.12, 660); },
    card() { tone(520, 0.07, 'triangle', 0.1, 720); },
    attack() { tone(190, 0.13, 'sawtooth', 0.16, 90); },
    block() { tone(300, 0.13, 'sine', 0.14, 440); },
    hurt() { tone(160, 0.18, 'square', 0.16, 70); },
    heal() { arp([523, 659, 784], 0.16, 'sine', 0.12); },
    potion() { tone(420, 0.14, 'triangle', 0.14, 920); },
    relic() { arp([523, 784, 1047], 0.18, 'triangle', 0.12); },
    victory() { arp([523, 659, 784, 1047], 0.3, 'triangle', 0.15); },
    defeat() { arp([392, 330, 262, 174], 0.34, 'sawtooth', 0.14); },
    map() { tone(320, 0.1, 'sine', 0.1, 520); },
  };
})();

/* ---------------------------------------------------------------------- */
/* DATA: CARDS                                                            */
/* ---------------------------------------------------------------------- */

// Each library entry: name, emoji, type (attack/skill/power), rarity,
// base stats, and an optional "upgraded" override object merged onto base.
const CARD_LIBRARY = {
  strike: { name: 'Strike', emoji: '⚔️', type: 'attack', rarity: 'starter',
    base: { cost: 1, dmg: 6 }, upgraded: { dmg: 9 },
    desc: c => `Deal ${c.dmg} damage.` },
  defend: { name: 'Defend', emoji: '🛡️', type: 'skill', rarity: 'starter',
    base: { cost: 1, block: 5 }, upgraded: { block: 8 },
    desc: c => `Gain ${c.block} Block.` },
  bash: { name: 'Bash', emoji: '💥', type: 'attack', rarity: 'starter',
    base: { cost: 2, dmg: 8, vulnerable: 2 }, upgraded: { dmg: 11, vulnerable: 3 },
    desc: c => `Deal ${c.dmg} damage. Apply ${c.vulnerable} Vulnerable.` },

  cleave: { name: 'Cleave', emoji: '🌀', type: 'attack', rarity: 'common',
    base: { cost: 1, dmg: 8, aoe: true }, upgraded: { dmg: 11 },
    desc: c => `Deal ${c.dmg} damage to ALL enemies.` },
  twinStrike: { name: 'Twin Strike', emoji: '🗡️', type: 'attack', rarity: 'common',
    base: { cost: 1, dmg: 5, hits: 2 }, upgraded: { dmg: 7 },
    desc: c => `Deal ${c.dmg} damage twice.` },
  ironWave: { name: 'Iron Wave', emoji: '🌊', type: 'attack', rarity: 'common',
    base: { cost: 1, dmg: 5, block: 5 }, upgraded: { dmg: 7, block: 7 },
    desc: c => `Deal ${c.dmg} damage. Gain ${c.block} Block.` },
  pommelStrike: { name: 'Pommel Strike', emoji: '🔨', type: 'attack', rarity: 'common',
    base: { cost: 1, dmg: 9, draw: 1 }, upgraded: { dmg: 12 },
    desc: c => `Deal ${c.dmg} damage. Draw ${c.draw} card.` },
  shrugItOff: { name: 'Shrug It Off', emoji: '🙆', type: 'skill', rarity: 'common',
    base: { cost: 1, block: 8, draw: 1 }, upgraded: { block: 11 },
    desc: c => `Gain ${c.block} Block. Draw ${c.draw} card.` },
  trueGrit: { name: 'True Grit', emoji: '🦾', type: 'skill', rarity: 'common',
    base: { cost: 1, block: 7, exhaust: true }, upgraded: { block: 10 },
    desc: c => `Gain ${c.block} Block. Exhaust.` },
  warcry: { name: 'Warcry', emoji: '📣', type: 'skill', rarity: 'common',
    base: { cost: 0, strength: 2 }, upgraded: { strength: 3 },
    desc: c => `Gain ${c.strength} Strength for this combat.` },

  clothesline: { name: 'Clothesline', emoji: '🩸', type: 'attack', rarity: 'uncommon',
    base: { cost: 2, dmg: 12, weak: 2 }, upgraded: { dmg: 16, weak: 3 },
    desc: c => `Deal ${c.dmg} damage. Apply ${c.weak} Weak.` },
  heavyStrike: { name: 'Heavy Strike', emoji: '💪', type: 'attack', rarity: 'uncommon',
    base: { cost: 2, dmg: 16 }, upgraded: { dmg: 21 },
    desc: c => `Deal ${c.dmg} damage.` },
  inflame: { name: 'Inflame', emoji: '🔥', type: 'power', rarity: 'uncommon',
    base: { cost: 1, strength: 3, exhaust: true }, upgraded: { strength: 4 },
    desc: c => `Gain ${c.strength} Strength permanently this fight. Exhaust.` },
  battleTrance: { name: 'Battle Trance', emoji: '🌟', type: 'skill', rarity: 'uncommon',
    base: { cost: 0, draw: 3, exhaust: true }, upgraded: { draw: 4 },
    desc: c => `Draw ${c.draw} cards. Exhaust.` },

  offering: { name: 'Offering', emoji: '🕯️', type: 'skill', rarity: 'rare',
    base: { cost: 0, loseHp: 3, energy: 2, draw: 3, exhaust: true }, upgraded: { loseHp: 2, draw: 4 },
    desc: c => `Lose ${c.loseHp} HP. Gain ${c.energy} Energy. Draw ${c.draw} cards. Exhaust.` },
  bludgeon: { name: 'Bludgeon', emoji: '🪓', type: 'attack', rarity: 'rare',
    base: { cost: 3, dmg: 28 }, upgraded: { dmg: 36 },
    desc: c => `Deal ${c.dmg} damage.` },
  immolate: { name: 'Immolate', emoji: '☄️', type: 'attack', rarity: 'rare',
    base: { cost: 2, dmg: 12, aoe: true, exhaust: true }, upgraded: { dmg: 16 },
    desc: c => `Deal ${c.dmg} damage to ALL enemies. Exhaust.` },
};

const REWARD_POOL_KEYS = Object.keys(CARD_LIBRARY).filter(k => CARD_LIBRARY[k].rarity !== 'starter');
const RARITY_WEIGHT = { common: 60, uncommon: 30, rare: 10 };

function getCardData(card) {
  const lib = CARD_LIBRARY[card.key];
  const stats = card.upgraded ? Object.assign({}, lib.base, lib.upgraded) : Object.assign({}, lib.base);
  return Object.assign({ name: lib.name, emoji: lib.emoji, type: lib.type, rarity: lib.rarity }, stats,
    { desc: lib.desc(stats) });
}

let uidCounter = 1;
function makeCard(key, upgraded) {
  return { uid: uidCounter++, key, upgraded: !!upgraded };
}

function buildStartingDeck() {
  const deck = [];
  for (let i = 0; i < 5; i++) deck.push(makeCard('strike'));
  for (let i = 0; i < 4; i++) deck.push(makeCard('defend'));
  deck.push(makeCard('bash'));
  return deck;
}

function weightedCardPick(excludeKeys) {
  const pool = REWARD_POOL_KEYS.filter(k => !excludeKeys.includes(k));
  const weighted = [];
  pool.forEach(k => {
    const w = RARITY_WEIGHT[CARD_LIBRARY[k].rarity] || 10;
    for (let i = 0; i < w; i++) weighted.push(k);
  });
  return weighted[Math.floor(Math.random() * weighted.length)];
}

function randomCardChoices(n) {
  const chosen = [];
  for (let i = 0; i < n; i++) {
    const key = weightedCardPick(chosen);
    if (key) chosen.push(key);
  }
  return chosen.map(k => makeCard(k));
}

/* ---------------------------------------------------------------------- */
/* DATA: RELICS                                                           */
/* ---------------------------------------------------------------------- */

const RELIC_LIBRARY = {
  burningBlood: { name: 'Burning Blood', emoji: '🩸', desc: 'Heal 6 HP after every combat.' },
  vajra: { name: 'Vajra Stone', emoji: '💎', desc: 'Start each combat with 1 Strength.' },
  anchor: { name: 'Anchor', emoji: '⚓', desc: 'Start each combat with 10 Block.' },
  energyCore: { name: 'Energy Core', emoji: '🔋', desc: 'Gain 1 additional Energy each turn.' },
  regenCharm: { name: 'Regen Charm', emoji: '❤️‍🩹', desc: 'Heal 2 HP at the start of each of your turns.' },
  goldenIdol: { name: 'Golden Idol', emoji: '🗿', desc: 'Gain 25% more gold from battles.' },
  ringSnake: { name: 'Ring of the Snake', emoji: '🐍', desc: 'Draw 1 additional card each turn.' },
  bronzeScales: { name: 'Bronze Scales', emoji: '🐚', desc: 'Attackers take 3 damage when they hit you.' },
  oldCoin: { name: 'Old Coin', emoji: '🪙', desc: 'A pouch of ancient gold. (Already spent: +100g on pickup.)' },
};

/* ---------------------------------------------------------------------- */
/* DATA: POTIONS                                                          */
/* ---------------------------------------------------------------------- */

const POTION_LIBRARY = {
  firePotion: { name: 'Fire Potion', emoji: '🧨', desc: 'Deal 20 damage to one enemy.', target: true },
  healPotion: { name: 'Heal Potion', emoji: '💗', desc: 'Heal 20 HP.', target: false },
  blockPotion: { name: 'Block Potion', emoji: '🧪', desc: 'Gain 12 Block.', target: false },
  energyPotion: { name: 'Energy Potion', emoji: '⚡', desc: 'Gain 2 Energy.', target: false },
};
const POTION_KEYS = Object.keys(POTION_LIBRARY);

/* ---------------------------------------------------------------------- */
/* DATA: ENEMIES                                                          */
/* ---------------------------------------------------------------------- */

const ENEMY_LIBRARY = {
  slime: { name: 'Acid Slime', emoji: '🟢', hp: [38, 46], pattern: ['attack', 'attack', 'defend'],
    moves: { attack: { kind: 'attack', dmg: [7, 10] }, defend: { kind: 'defend', block: [8, 11] } } },
  goblin: { name: 'Goblin Grunt', emoji: '👺', hp: [35, 42], pattern: ['attack', 'attack', 'weaken'],
    moves: { attack: { kind: 'attack', dmg: [8, 12] }, weaken: { kind: 'debuff', weak: 2, dmg: [4, 6] } } },
  bat: { name: 'Cave Bat', emoji: '🦇', hp: [30, 36], pattern: ['attack', 'attack', 'attack', 'defend'],
    moves: { attack: { kind: 'attack', dmg: [6, 9] }, defend: { kind: 'defend', block: [6, 8] } } },
  cultist: { name: 'Cultist', emoji: '🧙', hp: [40, 48], pattern: ['ritual', 'attack', 'attack'],
    moves: { ritual: { kind: 'buff', strength: 3 }, attack: { kind: 'attack', dmg: [9, 13] } } },
  hound: { name: 'Shadow Hound', emoji: '🐺', hp: [32, 38], pattern: ['attack', 'attack', 'vulnerable'],
    moves: { attack: { kind: 'attack', dmg: [7, 10] }, vulnerable: { kind: 'debuff', vulnerable: 2, dmg: [5, 7] } } },
  skeleton: { name: 'Bone Warrior', emoji: '💀', hp: [36, 44], pattern: ['defend', 'attack', 'attack'],
    moves: { attack: { kind: 'attack', dmg: [8, 11] }, defend: { kind: 'defend', block: [7, 9] } } },
};
const NORMAL_ENEMY_KEYS = Object.keys(ENEMY_LIBRARY);

const ELITE_LIBRARY = {
  ogre: { name: 'Rock Ogre', emoji: '👹', hp: [70, 80], pattern: ['smash', 'smash', 'defend'],
    moves: { smash: { kind: 'attack', dmg: [16, 20] }, defend: { kind: 'defend', block: [15, 18] } } },
  sentinel: { name: 'Stone Sentinel', emoji: '🗿', hp: [75, 85], pattern: ['charge', 'attack', 'attack'],
    moves: { charge: { kind: 'buff', strength: 4 }, attack: { kind: 'attack', dmg: [13, 17] } } },
};
const ELITE_KEYS = Object.keys(ELITE_LIBRARY);

const BOSS_LIBRARY = {
  guardian: { name: 'Tower Guardian', emoji: '🐉', hp: [180, 200], pattern: ['slam', 'slam', 'roar', 'attack', 'attack'],
    moves: {
      slam: { kind: 'attack', dmg: [22, 26] },
      roar: { kind: 'debuff', weak: 3, vulnerable: 2, dmg: [0, 0] },
      attack: { kind: 'attack', dmg: [14, 18] },
    } },
};

/* ---------------------------------------------------------------------- */
/* DATA: EVENTS                                                           */
/* ---------------------------------------------------------------------- */

const EVENTS = [
  { text: '🕳️ You find a strange shrine humming with power. Do you touch it?',
    choices: [
      { label: '🖐️ Touch it (+5 Max HP, lose 8 HP now)', effect: p => { p.maxHp += 5; p.hp = Math.max(1, p.hp - 8); p.hp = Math.min(p.hp, p.maxHp); return 'The shrine surges through you. Max HP +5, but it hurt.'; } },
      { label: '🚶 Walk away', effect: () => 'You leave the shrine undisturbed.' },
    ] },
  { text: '🧺 A merchant\'s cart lies overturned. Coins are scattered everywhere.',
    choices: [
      { label: '💰 Gather the coins (+40 Gold)', effect: p => { p.gold += 40; return 'You pocket 40 gold.'; } },
      { label: '🙏 Leave it for the merchant', effect: p => { p.maxHp += 2; p.hp += 2; return 'Your good deed toughens your resolve. Max HP +2.'; } },
    ] },
  { text: '📜 An old tome offers forbidden knowledge, at a cost.',
    choices: [
      { label: '📖 Read it (+1 random card, lose 5 HP)', effect: p => { const c = makeCard(weightedCardPick([])); p.deck.push(c); p.hp = Math.max(1, p.hp - 5); return `You learn ${CARD_LIBRARY[c.key].name}, but it costs you 5 HP.`; } },
      { label: '🔥 Burn it', effect: p => { p.gold += 15; return 'You sell the ashes for 15 gold.'; } },
    ] },
  { text: '⚰️ A dusty sarcophagus stands ajar. Something glints inside.',
    choices: [
      { label: '🏺 Take the relic (random relic)', effect: p => { const key = pickUnownedRelic(p); if (key) { p.relics.push(key); return `You claim ${RELIC_LIBRARY[key].name} ${RELIC_LIBRARY[key].emoji}!`; } p.gold += 50; return 'No relics left to find; you take 50 gold instead.'; } },
      { label: '🚪 Close it and leave', effect: () => 'You decide some things are best left buried.' },
    ] },
  { text: '🧝 A wandering healer offers to mend your wounds — for a price.',
    choices: [
      { label: '💗 Pay 30 Gold to heal fully', effect: p => { if (p.gold >= 30) { p.gold -= 30; p.hp = p.maxHp; return 'You are fully healed!'; } return 'You cannot afford it.'; } },
      { label: '🚶 Decline', effect: () => 'You continue on your way.' },
    ] },
  { text: '🃏 A gambler challenges you to a game of chance.',
    choices: [
      { label: '🎲 Gamble 25 Gold', effect: p => { if (p.gold < 25) return 'You cannot afford to gamble.'; p.gold -= 25; if (Math.random() < 0.5) { p.gold += 60; return 'You win! +60 gold.'; } return 'You lose the bet.'; } },
      { label: '🚫 Refuse', effect: () => 'You keep your coin purse closed.' },
    ] },
];

function pickUnownedRelic(player) {
  const owned = new Set(player.relics);
  const options = Object.keys(RELIC_LIBRARY).filter(k => !owned.has(k));
  if (!options.length) return null;
  return options[Math.floor(Math.random() * options.length)];
}

/* ---------------------------------------------------------------------- */
/* MAP GENERATION                                                         */
/* ---------------------------------------------------------------------- */

const TOTAL_ROWS = 13;

function buildMap() {
  const counts = [3, 4, 4, 4, 3, 4, 4, 4, 3, 4, 4, 3, 1];
  const rows = [];
  for (let r = 0; r < TOTAL_ROWS; r++) {
    const n = counts[r];
    const row = [];
    for (let c = 0; c < n; c++) row.push({ row: r, col: c, type: null, visited: false });
    rows.push(row);
  }

  // Assign node types
  rows[0].forEach(n => (n.type = 'combat'));
  rows[TOTAL_ROWS - 1].forEach(n => (n.type = 'boss'));
  rows[TOTAL_ROWS - 2].forEach(n => (n.type = 'rest'));

  const weights = { combat: 45, elite: 12, rest: 10, shop: 10, treasure: 8, event: 15 };
  for (let r = 1; r < TOTAL_ROWS - 2; r++) {
    rows[r].forEach(node => {
      const options = Object.keys(weights).slice();
      if (r < 2) { // no elites on floor 1
        const idx = options.indexOf('elite');
        if (idx >= 0) options.splice(idx, 1);
      }
      const bag = [];
      options.forEach(t => { for (let i = 0; i < weights[t]; i++) bag.push(t); });
      node.type = bag[Math.floor(Math.random() * bag.length)];
    });
  }

  // Build forward edges (row r -> row r+1), ensure every node has >=1 outgoing
  // and every node (except row0) has >=1 incoming.
  const edges = {}; // key `${r}-${c}` -> array of target col indices in row r+1
  for (let r = 0; r < TOTAL_ROWS - 1; r++) {
    const fromCount = rows[r].length;
    const toCount = rows[r + 1].length;
    for (let c = 0; c < fromCount; c++) {
      const candidates = [c - 1, c, c + 1].filter(x => x >= 0 && x < toCount);
      if (!candidates.length) candidates.push(Math.min(c, toCount - 1));
      edges[`${r}-${c}`] = candidates;
    }
    // ensure incoming coverage
    const incoming = new Set();
    for (let c = 0; c < fromCount; c++) edges[`${r}-${c}`].forEach(t => incoming.add(t));
    for (let t = 0; t < toCount; t++) {
      if (!incoming.has(t)) {
        const srcCol = Math.min(fromCount - 1, Math.round((t * (fromCount - 1)) / Math.max(1, toCount - 1)));
        edges[`${r}-${srcCol}`].push(t);
      }
    }
  }

  return { rows, edges };
}

function reachableNextCols(map, row, col) {
  if (row < 0) return map.rows[0].map(n => n.col);
  const key = `${row}-${col}`;
  return map.edges[key] || [];
}

/* ---------------------------------------------------------------------- */
/* GAME STATE                                                             */
/* ---------------------------------------------------------------------- */

let state = null;

function newPlayer() {
  return {
    maxHp: 70, hp: 70, gold: 99,
    deck: buildStartingDeck(),
    relics: ['burningBlood'],
    potions: [],
    maxPotions: 3,
  };
}

function newRunState() {
  return {
    screen: 'menu',
    player: newPlayer(),
    map: buildMap(),
    position: { row: -1, col: -1 },
    floorsClimbed: 0,
    combat: null,
    rewardData: null,
    eventData: null,
    restData: null,
    shopData: null,
    chestData: null,
  };
}

function hasRelic(p, key) { return p.relics.includes(key); }

/* ---------------------------------------------------------------------- */
/* COMBAT ENGINE                                                          */
/* ---------------------------------------------------------------------- */

function scaledRange(range, floor) {
  const mult = 1 + floor * 0.045;
  return [Math.round(range[0] * mult), Math.round(range[1] * mult)];
}
function rollRange(range) { return range[0] + Math.floor(Math.random() * (range[1] - range[0] + 1)); }

function spawnEnemy(key, lib, floor) {
  const data = lib[key];
  const [lo, hi] = scaledRange(data.hp, floor);
  const hp = rollRange([lo, hi]);
  return {
    uid: uidCounter++, key, name: data.name, emoji: data.emoji,
    hp, maxHp: hp, block: 0, strength: 0, vulnerable: 0, weak: 0,
    patternIdx: 0, pattern: data.pattern, moves: data.moves, floor,
    nextMove: data.pattern[0],
  };
}

/* --- ENCOUNTER DIFFICULTY RATING ---------------------------------------
   Every candidate encounter is scored as the *expected fraction of the
   player's max HP it will cost to clear*, using a rough combat model:
   burn through the enemies' HP at an assumed player offense rate, taking
   their average damage each turn minus an assumed block rate. Candidate
   encounters are then filtered to a per-floor target band so the first
   fights are winnable and difficulty ramps smoothly. See requirements §8. */

// Assumed player capability, growing as the deck improves over the run.
function playerOffensePerTurn(floor) { return 12 + floor * 1.5; }  // enemy HP removed/turn
function playerBlockPerTurn(floor) { return 7 + floor * 0.8; }     // incoming damage blocked/turn

// Average HP (scaled) and average damage-per-turn this enemy threatens.
function enemyThreat(data, floor) {
  const mult = 1 + floor * 0.045;
  const hp = ((data.hp[0] + data.hp[1]) / 2) * mult;
  let dmgSum = 0, strengthPerCycle = 0;
  data.pattern.forEach(moveKey => {
    const mv = data.moves[moveKey];
    if ((mv.kind === 'attack' || mv.kind === 'debuff') && mv.dmg) {
      dmgSum += (mv.dmg[0] + mv.dmg[1]) / 2;
    }
    if (mv.kind === 'buff' && mv.strength) strengthPerCycle += mv.strength;
  });
  const patLen = data.pattern.length || 1;
  let dpt = (dmgSum / patLen) * mult;
  // Strength buffs ramp future hits; approximate their sustained value.
  dpt += (strengthPerCycle / patLen) * 2.5 * mult;
  return { hp, dpt };
}

// Expected fraction of max HP lost clearing this set of enemies.
function encounterDifficulty(threats, floor, maxHp) {
  let totalHp = 0, totalDpt = 0;
  threats.forEach(t => { totalHp += t.hp; totalDpt += t.dpt; });
  const economy = 1 + 0.09 * (threats.length - 1); // juggling multiple foes is harder
  totalDpt *= economy;
  const turns = Math.max(1, totalHp / playerOffensePerTurn(floor));
  const rawIncoming = totalDpt * turns;
  const blocked = Math.min(rawIncoming, playerBlockPerTurn(floor) * turns) * 0.82;
  return Math.max(0, rawIncoming - blocked) / maxHp;
}

// Per-floor tuning for a node: the "ideal" expected HP-loss we aim each
// encounter at (ramps up as the run progresses), a hard ceiling we never
// exceed (keeps fights winnable), and how many of the closest-to-ideal
// candidates to randomize among (for variety).
function difficultyTuning(nodeType, floor) {
  if (nodeType === 'elite') return { ideal: 0.30 + floor * 0.006, cap: 0.60, variety: 2 };
  return { ideal: 0.13 + floor * 0.011, cap: 0.45, variety: 4 };
}

function buildEncounter(node, floor) {
  if (node.type === 'boss') {
    return [spawnEnemy('guardian', BOSS_LIBRARY, floor)];
  }
  const isElite = node.type === 'elite';
  const lib = isElite ? ELITE_LIBRARY : ENEMY_LIBRARY;
  const keys = isElite ? ELITE_KEYS : NORMAL_ENEMY_KEYS;
  const maxHp = state.player.maxHp;
  const tuning = difficultyTuning(node.type, floor);

  // Enumerate candidates: every single enemy, plus (for normal fights) every
  // 2-enemy pairing. Rate each by expected HP loss, drop anything past the
  // safety cap, then randomize among the few closest to the floor's ideal.
  const candidates = keys.map(k => [k]);
  if (!isElite) {
    for (let i = 0; i < keys.length; i++) {
      for (let j = i; j < keys.length; j++) candidates.push([keys[i], keys[j]]);
    }
  }
  const scored = candidates
    .map(group => ({ group, diff: encounterDifficulty(group.map(k => enemyThreat(lib[k], floor)), floor, maxHp) }))
    .sort((a, b) => Math.abs(a.diff - tuning.ideal) - Math.abs(b.diff - tuning.ideal));
  const safe = scored.filter(s => s.diff <= tuning.cap);
  const pool = (safe.length ? safe : scored).slice(0, tuning.variety);
  const pick = pool[Math.floor(Math.random() * pool.length)];

  return pick.group.map(k => spawnEnemy(k, lib, floor));
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function startCombat(node, floor) {
  const p = state.player;
  const enemies = buildEncounter(node, floor);
  state.combat = {
    nodeType: node.type,
    floor,
    enemies,
    drawPile: shuffle(p.deck.slice()),
    discardPile: [],
    exhaustPile: [],
    hand: [],
    energy: 0,
    maxEnergy: 3 + (hasRelic(p, 'energyCore') ? 1 : 0),
    turn: 0,
    playerBlock: 0,
    playerVulnerable: 0,
    playerWeak: 0,
    playerStrength: hasRelic(p, 'vajra') ? 1 : 0,
    selectedCardUid: null,
    log: [],
    over: false,
    fx: [], // queued visual effects (floating numbers, hit flashes) for next render
  };
  logCombat(`⚔️ ${enemies.length > 1 ? 'Enemies' : enemies[0].name} appear${enemies.length > 1 ? '' : 's'}!`);
  startPlayerTurn();
}

function logCombat(msg) {
  state.combat.log.unshift(msg);
  if (state.combat.log.length > 40) state.combat.log.length = 40;
}

function drawCards(n) {
  const c = state.combat;
  for (let i = 0; i < n; i++) {
    if (!c.drawPile.length) {
      if (!c.discardPile.length) return;
      c.drawPile = shuffle(c.discardPile.splice(0));
      logCombat('🔄 Reshuffled discard into draw pile.');
    }
    c.hand.push(c.drawPile.pop());
  }
}

function startPlayerTurn() {
  const c = state.combat;
  const p = state.player;
  c.turn++;
  // discard remaining hand from previous turn
  c.discardPile.push(...c.hand);
  c.hand = [];
  c.playerBlock = 0;
  if (c.turn === 1 && hasRelic(p, 'anchor')) c.playerBlock = 10;
  if (c.turn > 1) {
    c.playerVulnerable = Math.max(0, c.playerVulnerable - 1);
    c.playerWeak = Math.max(0, c.playerWeak - 1);
  }
  c.energy = c.maxEnergy;
  const drawAmt = 5 + (hasRelic(p, 'ringSnake') ? 1 : 0);
  drawCards(drawAmt);
  if (hasRelic(p, 'regenCharm')) p.hp = Math.min(p.maxHp, p.hp + 2);
  c.selectedCardUid = null;
  render();
}

function calcOutgoingDamage(baseDmg, strength, weak) {
  let dmg = baseDmg + (strength || 0);
  if (weak > 0) dmg = Math.floor(dmg * 0.75);
  return Math.max(0, dmg);
}
function applyVulnerable(dmg, vulnerableStacks) {
  return vulnerableStacks > 0 ? Math.floor(dmg * 1.5) : dmg;
}
function dealDamageToTarget(target, dmg, isEnemyTarget) {
  let remaining = dmg;
  const block = isEnemyTarget ? target.block : state.combat.playerBlock;
  const absorbed = Math.min(block, remaining);
  remaining -= absorbed;
  if (isEnemyTarget) target.block -= absorbed; else state.combat.playerBlock -= absorbed;
  target.hp = Math.max(0, target.hp - remaining);
  return remaining;
}

function playCard(card, targetEnemy) {
  const c = state.combat;
  const p = state.player;
  const data = getCardData(card);
  if (c.energy < data.cost) return;
  c.energy -= data.cost;
  c.hand = c.hand.filter(h => h.uid !== card.uid);

  if (data.dmg) Sound.attack();
  else if (data.block) Sound.block();
  else Sound.card();

  if (data.dmg) {
    const baseDmg = calcOutgoingDamage(data.dmg, c.playerStrength, c.playerWeak);
    const hits = data.hits || 1;
    const targets = data.aoe ? c.enemies.filter(e => e.hp > 0) : [targetEnemy];
    targets.forEach(en => {
      for (let h = 0; h < hits; h++) {
        if (en.hp <= 0) return;
        const dmg = applyVulnerable(baseDmg, en.vulnerable);
        const dealt = dealDamageToTarget(en, dmg, true);
        c.fx.push({ kind: 'enemyDmg', enemyUid: en.uid, n: dmg });
        logCombat(`${data.emoji} ${data.name} hits ${en.name} for ${dmg} damage.`);
        if (hasRelic(p, 'bronzeScales') && dealt >= 0) { /* thorns is for when player is hit, not here */ }
      }
    });
  }
  if (data.block) {
    c.playerBlock += data.block;
    c.fx.push({ kind: 'playerBlock', n: data.block });
    logCombat(`🛡️ You gain ${data.block} Block.`);
  }
  if (data.vulnerable && targetEnemy) {
    targetEnemy.vulnerable += data.vulnerable;
    logCombat(`☠️ ${targetEnemy.name} is Vulnerable (${targetEnemy.vulnerable}).`);
  }
  if (data.weak && targetEnemy) {
    targetEnemy.weak += data.weak;
    logCombat(`⬇️ ${targetEnemy.name} is Weak (${targetEnemy.weak}).`);
  }
  if (data.strength) {
    c.playerStrength += data.strength;
    logCombat(`💪 You gain ${data.strength} Strength.`);
  }
  if (data.draw) drawCards(data.draw);
  if (data.energy) c.energy += data.energy;
  if (data.loseHp) p.hp = Math.max(1, p.hp - data.loseHp);

  if (data.exhaust) c.exhaustPile.push(card);
  else c.discardPile.push(card);

  c.selectedCardUid = null;
  checkCombatEnd();
  render();
}

function usePotion(key, targetEnemy) {
  const c = state.combat;
  const p = state.player;
  if (!p.potions.includes(key)) return;
  const data = POTION_LIBRARY[key];
  if (data.target && !targetEnemy) { state.pendingPotion = key; render(); return; }
  p.potions.splice(p.potions.indexOf(key), 1);
  if (key === 'firePotion') {
    const dealt = dealDamageToTarget(targetEnemy, 20, true);
    c.fx.push({ kind: 'enemyDmg', enemyUid: targetEnemy.uid, n: 20 });
    Sound.attack();
    logCombat(`🧨 Fire Potion deals 20 damage to ${targetEnemy.name}.`);
  } else if (key === 'healPotion') {
    p.hp = Math.min(p.maxHp, p.hp + 20);
    c.fx.push({ kind: 'heal', n: 20 });
    Sound.heal();
    logCombat('💗 Heal Potion restores 20 HP.');
  } else if (key === 'blockPotion') {
    c.playerBlock += 12;
    c.fx.push({ kind: 'playerBlock', n: 12 });
    Sound.block();
    logCombat('🧪 Block Potion grants 12 Block.');
  } else if (key === 'energyPotion') {
    c.energy += 2;
    Sound.potion();
    logCombat('⚡ Energy Potion grants 2 Energy.');
  }
  state.pendingPotion = null;
  checkCombatEnd();
  render();
}

function endPlayerTurn() {
  if (state.combat.over) return;
  Sound.click();
  enemyTurn();
}

function enemyTurn() {
  const c = state.combat;
  const p = state.player;
  for (const enemy of c.enemies) {
    if (enemy.hp <= 0) continue;
    enemy.block = 0;
    const move = enemy.moves[enemy.nextMove];
    if (move.kind === 'attack') {
      const [lo, hi] = scaledRange(move.dmg, enemy.floor);
      let dmg = calcOutgoingDamage(rollRange([lo, hi]), enemy.strength, enemy.weak);
      dmg = applyVulnerable(dmg, c.playerVulnerable);
      // dealDamageToTarget already applies the HP loss (and honors Block); do
      // not subtract again here or the player takes double damage.
      const dealt = dealDamageToTarget(p, dmg, false);
      if (dealt > 0) { c.fx.push({ kind: 'playerDmg', n: dealt }); Sound.hurt(); }
      logCombat(`${enemy.emoji} ${enemy.name} attacks for ${dmg} damage.`);
      if (dealt > 0 && hasRelic(p, 'bronzeScales')) {
        dealDamageToTarget(enemy, 3, true);
        logCombat(`🐚 Bronze Scales reflects 3 damage to ${enemy.name}.`);
      }
    } else if (move.kind === 'defend') {
      const [lo, hi] = scaledRange(move.block, enemy.floor);
      enemy.block += rollRange([lo, hi]);
      logCombat(`🛡️ ${enemy.name} braces for ${enemy.block} Block.`);
    } else if (move.kind === 'buff') {
      enemy.strength += move.strength;
      logCombat(`💪 ${enemy.name} gains ${move.strength} Strength.`);
    } else if (move.kind === 'debuff') {
      if (move.dmg && (move.dmg[1] > 0)) {
        const [lo, hi] = scaledRange(move.dmg, enemy.floor);
        const dmg = applyVulnerable(rollRange([lo, hi]), c.playerVulnerable);
        const dealt = dealDamageToTarget(p, dmg, false); // applies HP loss once
        if (dealt > 0) { c.fx.push({ kind: 'playerDmg', n: dealt }); Sound.hurt(); }
        logCombat(`${enemy.emoji} ${enemy.name} strikes for ${dmg} damage.`);
      }
      if (move.weak) { c.playerWeak += move.weak; logCombat(`⬇️ You are Weak (${c.playerWeak}).`); }
      if (move.vulnerable) { c.playerVulnerable += move.vulnerable; logCombat(`☠️ You are Vulnerable (${c.playerVulnerable}).`); }
    }
    enemy.vulnerable = Math.max(0, enemy.vulnerable - 1);
    enemy.weak = Math.max(0, enemy.weak - 1);
    enemy.patternIdx = (enemy.patternIdx + 1) % enemy.pattern.length;
    enemy.nextMove = enemy.pattern[enemy.patternIdx];

    if (p.hp <= 0) break;
  }
  checkCombatEnd();
  if (!state.combat.over) startPlayerTurn();
  else render();
}

function checkCombatEnd() {
  const c = state.combat;
  const p = state.player;
  if (p.hp <= 0) {
    p.hp = 0;
    c.over = true;
    state.screen = 'gameover';
    Sound.defeat();
    return true;
  }
  if (c.enemies.every(e => e.hp <= 0)) {
    c.over = true;
    resolveCombatVictory();
    return true;
  }
  return false;
}

function resolveCombatVictory() {
  const c = state.combat;
  const p = state.player;
  if (c.nodeType === 'boss') Sound.victory(); else Sound.select();
  if (hasRelic(p, 'burningBlood')) p.hp = Math.min(p.maxHp, p.hp + 6);

  let goldWon = c.nodeType === 'elite' ? (25 + Math.floor(Math.random() * 15))
    : c.nodeType === 'boss' ? (100 + Math.floor(Math.random() * 30))
    : (10 + Math.floor(Math.random() * 12));
  if (hasRelic(p, 'goldenIdol')) goldWon = Math.round(goldWon * 1.25);
  p.gold += goldWon;

  let relicWon = null;
  if (c.nodeType === 'elite' || c.nodeType === 'boss') {
    relicWon = pickUnownedRelic(p);
    if (relicWon) {
      p.relics.push(relicWon);
      if (relicWon === 'oldCoin') p.gold += 100;
      setTimeout(() => Sound.relic(), 300);
    }
  }

  let potionWon = null;
  if (c.nodeType !== 'boss' && p.potions.length < p.maxPotions && Math.random() < 0.4) {
    potionWon = POTION_KEYS[Math.floor(Math.random() * POTION_KEYS.length)];
    p.potions.push(potionWon);
  }

  const cardChoiceCount = 3;
  const cardChoices = c.nodeType === 'boss' ? [] : randomCardChoices(cardChoiceCount);

  state.rewardData = { gold: goldWon, relic: relicWon, potion: potionWon, cardChoices, isBoss: c.nodeType === 'boss' };

  if (c.nodeType === 'boss') {
    state.screen = 'victory';
  } else {
    state.screen = 'reward';
  }
}

/* ---------------------------------------------------------------------- */
/* NON-COMBAT NODES                                                       */
/* ---------------------------------------------------------------------- */

function enterRest() {
  state.restData = { used: false };
  state.screen = 'rest';
}

function doRestHeal() {
  const p = state.player;
  const amt = Math.round(p.maxHp * 0.3);
  p.hp = Math.min(p.maxHp, p.hp + amt);
  state.restData.used = true;
  state.restData.msg = `🔥 You rest and recover ${amt} HP.`;
  Sound.heal();
  render();
}

function doRestUpgrade(cardUid) {
  const p = state.player;
  const card = p.deck.find(c => c.uid === cardUid);
  if (card && !card.upgraded) card.upgraded = true;
  state.restData.used = true;
  state.restData.msg = `⚒️ You upgrade ${CARD_LIBRARY[card.key].name} to ${CARD_LIBRARY[card.key].name}+!`;
  Sound.relic();
  render();
}

function enterShop() {
  const cardStock = randomCardChoices(5).map(c => ({ card: c, price: shopPrice(CARD_LIBRARY[c.key].rarity) }));
  const relicKeys = [];
  for (let i = 0; i < 2; i++) { const k = pickUnownedRelic({ relics: state.player.relics.concat(relicKeys) }); if (k) relicKeys.push(k); }
  const potionStock = [0, 1].map(() => POTION_KEYS[Math.floor(Math.random() * POTION_KEYS.length)]);
  state.shopData = {
    cardStock,
    relicStock: relicKeys.map(k => ({ key: k, price: 150 })),
    potionStock: potionStock.map(k => ({ key: k, price: 45 })),
    removePrice: 75,
    removeUsed: false,
  };
  state.screen = 'shop';
}
function shopPrice(rarity) { return rarity === 'rare' ? 135 : rarity === 'uncommon' ? 90 : 55; }

function buyCard(idx) {
  const p = state.player;
  const item = state.shopData.cardStock[idx];
  if (!item || item.bought || p.gold < item.price) return;
  p.gold -= item.price;
  p.deck.push(item.card);
  item.bought = true;
  Sound.click();
  render();
}
function buyRelic(idx) {
  const p = state.player;
  const item = state.shopData.relicStock[idx];
  if (!item || item.bought || p.gold < item.price) return;
  p.gold -= item.price;
  p.relics.push(item.key);
  if (item.key === 'oldCoin') p.gold += 100;
  item.bought = true;
  Sound.relic();
  render();
}
function buyPotion(idx) {
  const p = state.player;
  const item = state.shopData.potionStock[idx];
  if (!item || item.bought || p.gold < item.price || p.potions.length >= p.maxPotions) return;
  p.gold -= item.price;
  p.potions.push(item.key);
  item.bought = true;
  Sound.click();
  render();
}
function removeCardFromDeck(cardUid) {
  const p = state.player;
  const sd = state.shopData;
  if (sd.removeUsed || p.gold < sd.removePrice) return;
  const idx = p.deck.findIndex(c => c.uid === cardUid);
  if (idx === -1) return;
  p.gold -= sd.removePrice;
  p.deck.splice(idx, 1);
  sd.removeUsed = true;
  render();
}

function enterEvent() {
  const ev = EVENTS[Math.floor(Math.random() * EVENTS.length)];
  state.eventData = { event: ev, resolved: false, resultMsg: '' };
  state.screen = 'event';
}
function resolveEventChoice(idx) {
  const ed = state.eventData;
  if (ed.resolved) return;
  const choice = ed.event.choices[idx];
  const msg = choice.effect(state.player);
  ed.resolved = true;
  ed.resultMsg = msg;
  Sound.select();
  render();
}

function enterChest() {
  const p = state.player;
  const relicKey = pickUnownedRelic(p);
  const gold = 20 + Math.floor(Math.random() * 25);
  state.chestData = { relicKey, gold, opened: false };
  state.screen = 'chest';
}
function openChest() {
  const p = state.player;
  const cd = state.chestData;
  if (cd.opened) return;
  cd.opened = true;
  p.gold += cd.gold;
  if (cd.relicKey) {
    p.relics.push(cd.relicKey);
    if (cd.relicKey === 'oldCoin') p.gold += 100;
    Sound.relic();
  } else {
    Sound.select();
  }
  render();
}

/* ---------------------------------------------------------------------- */
/* MAP NAVIGATION                                                         */
/* ---------------------------------------------------------------------- */

function enterNode(row, col) {
  const node = state.map.rows[row][col];
  node.visited = true;
  state.position = { row, col };
  state.floorsClimbed = row + 1;
  Sound.select();

  if (node.type === 'combat' || node.type === 'elite' || node.type === 'boss') {
    startCombat(node, row);
    state.screen = 'combat';
  } else if (node.type === 'rest') {
    enterRest();
  } else if (node.type === 'shop') {
    enterShop();
  } else if (node.type === 'event') {
    enterEvent();
  } else if (node.type === 'treasure') {
    enterChest();
  }
  render();
}

function backToMap() {
  state.screen = state.player.hp <= 0 ? 'gameover' : 'map';
  render();
}

/* ---------------------------------------------------------------------- */
/* RENDERING                                                              */
/* ---------------------------------------------------------------------- */

const NODE_ICON = { combat: '⚔️', elite: '💀', rest: '🔥', shop: '💰', treasure: '🎁', event: '❓', boss: '👑' };

const el = id => document.getElementById(id);

function showScreen(name) {
  ['menu', 'map', 'combat', 'reward', 'rest', 'shop', 'event', 'chest', 'gameover', 'victory'].forEach(s => {
    el(`${s}-screen`).classList.toggle('hidden', s !== name);
  });
  el('topbar').classList.toggle('hidden', name === 'menu');
}

function render() {
  if (!state) return;
  showScreen(state.screen);
  renderTopbar();
  if (state.screen === 'map') renderMap();
  if (state.screen === 'combat') renderCombat();
  if (state.screen === 'reward') renderReward();
  if (state.screen === 'rest') renderRest();
  if (state.screen === 'shop') renderShop();
  if (state.screen === 'event') renderEvent();
  if (state.screen === 'chest') renderChest();
  if (state.screen === 'gameover') renderGameOver();
  if (state.screen === 'victory') renderVictory();
}

function renderTopbar() {
  if (state.screen === 'menu') return;
  const p = state.player;
  el('tb-floor').textContent = state.floorsClimbed;
  el('tb-hp').textContent = p.hp;
  el('tb-maxhp').textContent = p.maxHp;
  el('tb-gold').textContent = p.gold;
  el('tb-relics').textContent = `🏺 ${p.relics.length}`;
  el('tb-potions').textContent = `🧪 ${p.potions.length}/${p.maxPotions}`;
  el('btn-mute').textContent = Sound.isMuted() ? '🔇' : '🔊';
}

function renderMap() {
  const wrap = el('map-rows');
  wrap.innerHTML = '';
  const reachable = new Set(reachableNextCols(state.map, state.position.row, state.position.col).map(c => c));
  const nodeEls = {}; // `${r}-${c}` -> element, for edge drawing
  state.map.rows.forEach((row, r) => {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'map-row';
    row.forEach(node => {
      const btn = document.createElement('div');
      const isCurrent = state.position.row === r && state.position.col === node.col;
      const isNext = r === state.position.row + 1 && reachable.has(node.col);
      let cls = 'node';
      if (node.visited) cls += ' visited';
      if (isCurrent) cls += ' current';
      if (isNext) cls += ' reachable';
      if (!isNext && !isCurrent && !node.visited) cls += ' faded';
      btn.className = cls;
      btn.textContent = NODE_ICON[node.type] || '❔';
      btn.title = node.type;
      if (isNext) btn.onclick = () => enterNode(r, node.col);
      rowDiv.appendChild(btn);
      nodeEls[`${r}-${node.col}`] = btn;
    });
    wrap.appendChild(rowDiv);
  });
  drawMapEdges(nodeEls, reachable);
}

// Draw connector lines between each node and its reachable nodes one row up,
// as an SVG overlay measured from the laid-out node positions. Edges leaving
// the current node toward a reachable node are highlighted as the live path.
function drawMapEdges(nodeEls, reachable) {
  const svg = el('map-edges');
  const graph = el('map-graph');
  const w = graph.clientWidth, h = graph.clientHeight;
  if (!w || !h) return;
  svg.setAttribute('width', w);
  svg.setAttribute('height', h);
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  const gRect = graph.getBoundingClientRect();
  const center = (r, c) => {
    const node = nodeEls[`${r}-${c}`];
    if (!node) return null;
    const rect = node.getBoundingClientRect();
    return { x: rect.left - gRect.left + rect.width / 2, y: rect.top - gRect.top + rect.height / 2 };
  };
  let lines = '';
  for (let r = 0; r < TOTAL_ROWS - 1; r++) {
    state.map.rows[r].forEach(node => {
      const from = center(r, node.col);
      if (!from) return;
      (state.map.edges[`${r}-${node.col}`] || []).forEach(tc => {
        const to = center(r + 1, tc);
        if (!to) return;
        const isActive = state.position.row === r && state.position.col === node.col && reachable.has(tc);
        const cls = isActive ? 'active' : (node.visited ? 'trav' : '');
        lines += `<line x1="${from.x.toFixed(1)}" y1="${from.y.toFixed(1)}" x2="${to.x.toFixed(1)}" y2="${to.y.toFixed(1)}"${cls ? ` class="${cls}"` : ''} />`;
      });
    });
  }
  svg.innerHTML = lines;
}

function cardEl(card, opts) {
  opts = opts || {};
  const data = getCardData(card);
  const div = document.createElement('div');
  div.className = 'card' + (card.upgraded ? ' upgraded' : '') + (opts.unaffordable ? ' unaffordable' : '') + (opts.selected ? ' selected' : '');
  div.innerHTML = `
    <div class="cost">${data.cost}</div>
    <div class="emoji">${data.emoji}</div>
    <div class="cname">${data.name}${card.upgraded ? '+' : ''}</div>
    <div class="ctype">${data.type}</div>
    <div class="cdesc">${data.desc}</div>
  `;
  if (opts.onClick) div.onclick = opts.onClick;
  return div;
}

// Spawn a floating number that rises from a combatant's card. Removed after
// its animation so repeated hits don't accumulate stale nodes.
function addFloat(container, entry, i) {
  const span = document.createElement('span');
  const cls = entry.kind === 'playerBlock' ? 'block' : entry.kind === 'heal' ? 'heal' : 'dmg';
  const prefix = entry.kind === 'playerBlock' ? '🛡️' : entry.kind === 'heal' ? '💚+' : '';
  span.className = 'float-num ' + cls;
  span.textContent = prefix + entry.n;
  span.style.animationDelay = (i * 0.11) + 's';
  container.appendChild(span);
  setTimeout(() => span.remove(), 1100 + i * 110);
}

function renderCombat() {
  const c = state.combat;
  const p = state.player;
  const fx = c.fx || [];

  const enemiesRow = el('enemies-row');
  enemiesRow.innerHTML = '';
  const selected = c.hand.find(h => h.uid === c.selectedCardUid);
  const selectedData = selected ? getCardData(selected) : null;
  const needsTarget = selectedData && !selectedData.aoe && (selectedData.dmg || selectedData.vulnerable || selectedData.weak);
  const pendingPotion = state.pendingPotion;

  c.enemies.forEach(en => {
    const div = document.createElement('div');
    const enemyFx = fx.filter(f => f.enemyUid === en.uid);
    const tookHit = enemyFx.some(f => f.kind === 'enemyDmg' && f.n > 0);
    div.className = 'enemy' + (en.hp <= 0 ? ' dead' : '') +
      ((needsTarget || pendingPotion) && en.hp > 0 ? ' targetable' : '') + (tookHit ? ' hit' : '');
    const move = en.moves[en.nextMove];
    let intentHtml = '❔';
    if (move.kind === 'attack') {
      const [lo, hi] = scaledRange(move.dmg, en.floor);
      intentHtml = `⚔️<span class="intent-num">${lo}-${hi}</span>`;
    } else if (move.kind === 'defend') {
      intentHtml = '🛡️';
    } else if (move.kind === 'buff') {
      intentHtml = '💪';
    } else if (move.kind === 'debuff') {
      intentHtml = move.dmg && move.dmg[1] > 0 ? `☠️⚔️<span class="intent-num">${scaledRange(move.dmg, en.floor)[0]}-${scaledRange(move.dmg, en.floor)[1]}</span>` : '☠️';
    }
    const statuses = [];
    if (en.strength) statuses.push(`💪${en.strength}`);
    if (en.vulnerable) statuses.push(`☠️${en.vulnerable}`);
    if (en.weak) statuses.push(`⬇️${en.weak}`);
    div.innerHTML = `
      <div class="emoji">${en.emoji}</div>
      <div class="name">${en.name}</div>
      <div class="hpbar"><div class="hpbar-fill" style="width:${Math.max(0, (en.hp / en.maxHp) * 100)}%"></div></div>
      <div class="hptext">${en.hp}/${en.maxHp} HP ${en.block ? `🛡️${en.block}` : ''}</div>
      <div class="statuses">${statuses.join(' ')}</div>
      <div class="intent">${intentHtml}</div>
    `;
    if (en.hp > 0) {
      if (needsTarget) div.onclick = () => playCard(selected, en);
      else if (pendingPotion) div.onclick = () => usePotion(pendingPotion, en);
    }
    enemiesRow.appendChild(div);
    enemyFx.filter(f => f.kind === 'enemyDmg').forEach((f, i) => addFloat(div, f, i));
  });

  const statusRow = el('player-status-row');
  statusRow.innerHTML = `
    <div class="pill">❤️ ${p.hp}/${p.maxHp}</div>
    <div class="pill">🛡️ ${c.playerBlock}</div>
    ${c.playerStrength ? `<div class="pill">💪 ${c.playerStrength}</div>` : ''}
    ${c.playerVulnerable ? `<div class="pill">☠️ ${c.playerVulnerable}</div>` : ''}
    ${c.playerWeak ? `<div class="pill">⬇️ ${c.playerWeak}</div>` : ''}
  `;
  const playerFx = fx.filter(f => f.kind === 'playerDmg' || f.kind === 'playerBlock' || f.kind === 'heal');
  playerFx.forEach((f, i) => addFloat(statusRow, f, i));
  if (playerFx.some(f => f.kind === 'playerDmg' && f.n > 0)) {
    const screen = el('combat-screen');
    screen.classList.remove('hurt');
    void screen.offsetWidth; // restart the shake animation if already applied
    screen.classList.add('hurt');
    setTimeout(() => screen.classList.remove('hurt'), 450);
  }

  const hand = el('hand');
  hand.innerHTML = '';
  c.hand.forEach(card => {
    const data = getCardData(card);
    const affordable = c.energy >= data.cost;
    hand.appendChild(cardEl(card, {
      unaffordable: !affordable,
      selected: card.uid === c.selectedCardUid,
      onClick: () => {
        if (!affordable) return;
        const dt = getCardData(card);
        const needsTgt = !dt.aoe && (dt.dmg || dt.vulnerable || dt.weak);
        const aliveEnemies = c.enemies.filter(e => e.hp > 0);
        if (needsTgt && aliveEnemies.length > 1) {
          c.selectedCardUid = c.selectedCardUid === card.uid ? null : card.uid;
          render();
        } else if (needsTgt) {
          playCard(card, aliveEnemies[0]);
        } else {
          playCard(card, null);
        }
      },
    }));
  });

  const potionBar = el('potion-bar');
  potionBar.innerHTML = '';
  p.potions.forEach((key, i) => {
    const data = POTION_LIBRARY[key];
    const btn = document.createElement('button');
    btn.textContent = `${data.emoji} ${data.name}`;
    btn.title = data.desc;
    btn.onclick = () => {
      if (data.target) { state.pendingPotion = state.pendingPotion === key ? null : key; render(); }
      else usePotion(key, null);
    };
    potionBar.appendChild(btn);
  });

  el('draw-count').textContent = `Draw: ${c.drawPile.length}`;
  el('discard-count').textContent = `Discard: ${c.discardPile.length}`;
  el('energy-count').textContent = `⚡ ${c.energy}/${c.maxEnergy}`;
  el('turn-count').textContent = `Turn ${c.turn}`;
  el('combat-log').innerHTML = c.log.map(m => `<div>${m}</div>`).join('');
  el('btn-end-turn').disabled = c.over;

  c.fx = []; // effects for this render have been applied
}

function renderReward() {
  const r = state.rewardData;
  const p = state.player;
  const panel = el('reward-panel');
  panel.innerHTML = `<h2>🏆 Victory!</h2>`;
  const goldLine = document.createElement('div');
  goldLine.className = 'reward-line';
  goldLine.textContent = `💰 You found ${r.gold} gold.`;
  panel.appendChild(goldLine);
  if (r.relic) {
    const rl = document.createElement('div');
    rl.className = 'reward-line';
    rl.innerHTML = `🏺 You found a relic: <strong>${RELIC_LIBRARY[r.relic].emoji} ${RELIC_LIBRARY[r.relic].name}</strong> — ${RELIC_LIBRARY[r.relic].desc}`;
    panel.appendChild(rl);
  }
  if (r.potion) {
    const pl = document.createElement('div');
    pl.className = 'reward-line';
    pl.innerHTML = `🧪 You found a potion: <strong>${POTION_LIBRARY[r.potion].emoji} ${POTION_LIBRARY[r.potion].name}</strong>`;
    panel.appendChild(pl);
  }
  const h3 = document.createElement('h3');
  h3.textContent = 'Choose a card to add to your deck:';
  panel.appendChild(h3);
  const cardsDiv = document.createElement('div');
  cardsDiv.className = 'reward-cards';
  r.cardChoices.forEach(card => {
    cardsDiv.appendChild(cardEl(card, {
      onClick: () => {
        if (r.taken) return;
        p.deck.push(card);
        r.taken = true;
        backToMap();
      },
    }));
  });
  panel.appendChild(cardsDiv);
  const skipBtn = document.createElement('button');
  skipBtn.textContent = '⏭️ Skip';
  skipBtn.onclick = () => { if (!r.taken) { r.taken = true; backToMap(); } };
  panel.appendChild(skipBtn);
}

function renderRest() {
  const rd = state.restData;
  const p = state.player;
  const panel = el('rest-panel');
  panel.innerHTML = `<h2>🔥 Campfire</h2>`;
  if (rd.used) {
    const msg = document.createElement('p');
    msg.textContent = rd.msg;
    panel.appendChild(msg);
    const cont = document.createElement('button');
    cont.textContent = '➡️ Continue';
    cont.onclick = backToMap;
    panel.appendChild(cont);
    return;
  }
  const p1 = document.createElement('p');
  p1.textContent = 'Rest and recover, or upgrade a card in your deck.';
  panel.appendChild(p1);
  const btnRow = document.createElement('div');
  btnRow.style.display = 'flex';
  btnRow.style.gap = '10px';
  btnRow.style.justifyContent = 'center';
  btnRow.style.marginBottom = '16px';
  const restBtn = document.createElement('button');
  restBtn.textContent = `💤 Rest (+${Math.round(p.maxHp * 0.3)} HP)`;
  restBtn.onclick = doRestHeal;
  const upgBtnToggle = document.createElement('button');
  upgBtnToggle.textContent = '⚒️ Upgrade a Card';
  upgBtnToggle.onclick = () => { rd.showUpgrade = true; render(); };
  btnRow.appendChild(restBtn);
  btnRow.appendChild(upgBtnToggle);
  panel.appendChild(btnRow);

  if (rd.showUpgrade) {
    const upgradable = p.deck.filter(c => !c.upgraded);
    const list = document.createElement('div');
    list.className = 'deck-list';
    if (!upgradable.length) {
      const none = document.createElement('p');
      none.textContent = 'No cards left to upgrade!';
      list.appendChild(none);
    }
    upgradable.forEach(card => {
      list.appendChild(cardEl(card, { onClick: () => doRestUpgrade(card.uid) }));
    });
    panel.appendChild(list);
  }
}

function renderShop() {
  const sd = state.shopData;
  const p = state.player;
  const panel = el('shop-panel');
  panel.innerHTML = `<h2>💰 Shop</h2><p>Gold: <strong>${p.gold}</strong> 💰</p>`;

  const cardSection = document.createElement('div');
  cardSection.className = 'shop-section';
  cardSection.innerHTML = '<h3>🃏 Cards</h3>';
  const cardRow = document.createElement('div');
  cardRow.className = 'shop-cards';
  sd.cardStock.forEach((item, idx) => {
    const wrap = document.createElement('div');
    wrap.className = 'shop-item';
    const cardDiv = cardEl(item.card, {
      unaffordable: item.bought || p.gold < item.price,
      onClick: () => buyCard(idx),
    });
    wrap.appendChild(cardDiv);
    const price = document.createElement('div');
    price.className = 'price';
    price.textContent = item.bought ? 'SOLD' : `💰 ${item.price}`;
    wrap.appendChild(price);
    cardRow.appendChild(wrap);
  });
  cardSection.appendChild(cardRow);
  panel.appendChild(cardSection);

  const relicSection = document.createElement('div');
  relicSection.className = 'shop-section';
  relicSection.innerHTML = '<h3>🏺 Relics</h3>';
  sd.relicStock.forEach((item, idx) => {
    const badge = document.createElement('div');
    badge.className = 'relic-badge';
    badge.style.cursor = item.bought ? 'default' : 'pointer';
    badge.style.opacity = item.bought || p.gold < item.price ? .5 : 1;
    badge.innerHTML = `<div class="emoji">${RELIC_LIBRARY[item.key].emoji}</div><div class="rname">${RELIC_LIBRARY[item.key].name}</div><div class="price">${item.bought ? 'SOLD' : '💰 ' + item.price}</div>`;
    badge.title = RELIC_LIBRARY[item.key].desc;
    if (!item.bought) badge.onclick = () => buyRelic(idx);
    relicSection.appendChild(badge);
  });
  panel.appendChild(relicSection);

  const potionSection = document.createElement('div');
  potionSection.className = 'shop-section';
  potionSection.innerHTML = '<h3>🧪 Potions</h3>';
  sd.potionStock.forEach((item, idx) => {
    const badge = document.createElement('div');
    badge.className = 'relic-badge';
    badge.style.cursor = item.bought ? 'default' : 'pointer';
    badge.style.opacity = item.bought || p.gold < item.price || p.potions.length >= p.maxPotions ? .5 : 1;
    badge.innerHTML = `<div class="emoji">${POTION_LIBRARY[item.key].emoji}</div><div class="rname">${POTION_LIBRARY[item.key].name}</div><div class="price">${item.bought ? 'SOLD' : '💰 ' + item.price}</div>`;
    badge.title = POTION_LIBRARY[item.key].desc;
    if (!item.bought) badge.onclick = () => buyPotion(idx);
    potionSection.appendChild(badge);
  });
  panel.appendChild(potionSection);

  const removeSection = document.createElement('div');
  removeSection.className = 'shop-section';
  removeSection.innerHTML = `<h3>🔥 Card Removal — 💰 ${sd.removePrice}</h3>`;
  if (sd.removeUsed) {
    removeSection.innerHTML += '<p>Service used this visit.</p>';
  } else {
    const list = document.createElement('div');
    list.className = 'deck-list';
    p.deck.forEach(card => {
      list.appendChild(cardEl(card, {
        unaffordable: p.gold < sd.removePrice,
        onClick: () => removeCardFromDeck(card.uid),
      }));
    });
    removeSection.appendChild(list);
  }
  panel.appendChild(removeSection);

  const leaveBtn = document.createElement('button');
  leaveBtn.textContent = '🚪 Leave Shop';
  leaveBtn.style.marginTop = '16px';
  leaveBtn.onclick = backToMap;
  panel.appendChild(leaveBtn);
}

function renderEvent() {
  const ed = state.eventData;
  const panel = el('event-panel');
  panel.innerHTML = `<h2>❓ Event</h2>`;
  const text = document.createElement('div');
  text.className = 'event-text';
  text.textContent = ed.event.text;
  panel.appendChild(text);
  if (ed.resolved) {
    const res = document.createElement('p');
    res.textContent = ed.resultMsg;
    panel.appendChild(res);
    const cont = document.createElement('button');
    cont.textContent = '➡️ Continue';
    cont.onclick = backToMap;
    panel.appendChild(cont);
    return;
  }
  const choices = document.createElement('div');
  choices.className = 'event-choices';
  ed.event.choices.forEach((choice, idx) => {
    const btn = document.createElement('button');
    btn.textContent = choice.label;
    btn.onclick = () => resolveEventChoice(idx);
    choices.appendChild(btn);
  });
  panel.appendChild(choices);
}

function renderChest() {
  const cd = state.chestData;
  const panel = el('chest-panel');
  panel.innerHTML = `<h2>🎁 Treasure Chest</h2>`;
  if (!cd.opened) {
    const p1 = document.createElement('p');
    p1.textContent = 'A locked chest sits before you.';
    panel.appendChild(p1);
    const btn = document.createElement('button');
    btn.textContent = '🔓 Open Chest';
    btn.onclick = openChest;
    panel.appendChild(btn);
  } else {
    const p1 = document.createElement('p');
    p1.innerHTML = `💰 You found ${cd.gold} gold.` + (cd.relicKey ? `<br>🏺 You found <strong>${RELIC_LIBRARY[cd.relicKey].emoji} ${RELIC_LIBRARY[cd.relicKey].name}</strong> — ${RELIC_LIBRARY[cd.relicKey].desc}` : '');
    panel.appendChild(p1);
    const cont = document.createElement('button');
    cont.textContent = '➡️ Continue';
    cont.onclick = backToMap;
    panel.appendChild(cont);
  }
}

function renderGameOver() {
  el('gameover-stats').textContent = `You climbed ${state.floorsClimbed} of ${TOTAL_ROWS} floors, gathered ${state.player.gold} gold, and found ${state.player.relics.length} relics.`;
}
function renderVictory() {
  const r = state.rewardData;
  el('victory-stats').textContent = `You defeated the Tower Guardian! Final gold: ${state.player.gold + (r ? r.gold : 0)}. Relics found: ${state.player.relics.length}.`;
}

function renderDeckOverlay() {
  const list = el('deck-list');
  list.innerHTML = '';
  const deck = state.player.deck.slice().sort((a, b) => CARD_LIBRARY[a.key].name.localeCompare(CARD_LIBRARY[b.key].name));
  deck.forEach(card => list.appendChild(cardEl(card, {})));
  const relicsHeader = document.createElement('h3');
  relicsHeader.textContent = `🏺 Relics (${state.player.relics.length})`;
  list.appendChild(relicsHeader);
  const relicWrap = document.createElement('div');
  relicWrap.style.display = 'flex';
  relicWrap.style.flexWrap = 'wrap';
  relicWrap.style.justifyContent = 'center';
  state.player.relics.forEach(key => {
    const badge = document.createElement('div');
    badge.className = 'relic-badge';
    badge.title = RELIC_LIBRARY[key].desc;
    badge.innerHTML = `<div class="emoji">${RELIC_LIBRARY[key].emoji}</div><div class="rname">${RELIC_LIBRARY[key].name}</div>`;
    relicWrap.appendChild(badge);
  });
  list.appendChild(relicWrap);
}

/* ---------------------------------------------------------------------- */
/* INIT / EVENT WIRING                                                    */
/* ---------------------------------------------------------------------- */

function startNewRun() {
  Sound.unlock();
  Sound.map();
  state = newRunState();
  state.screen = 'map';
  render();
}

el('btn-new-run').onclick = startNewRun;
el('btn-restart-1').onclick = startNewRun;
el('btn-restart-2').onclick = startNewRun;
el('btn-end-turn').onclick = endPlayerTurn;
el('btn-view-deck').onclick = () => { Sound.click(); renderDeckOverlay(); el('deck-overlay').classList.remove('hidden'); };
el('btn-close-deck').onclick = () => el('deck-overlay').classList.add('hidden');
el('btn-mute').onclick = () => { const muted = Sound.toggleMute(); if (!muted) { Sound.unlock(); Sound.click(); } render(); };

// The map's connector lines are measured from laid-out node positions, so
// redraw them when the viewport changes size (rotation, address bar show/hide).
window.addEventListener('resize', () => { if (state && state.screen === 'map') renderMap(); });

// Unlock the audio context on the very first user interaction (mobile browsers
// block audio until a gesture occurs).
window.addEventListener('pointerdown', () => Sound.unlock(), { once: true });

state = newRunState();
render();
