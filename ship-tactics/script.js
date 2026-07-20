'use strict';
/* ========================================================================
   Snap Ships Tactics: Duel — engine
   See docs/requirements.md for the full spec this implements.
   ======================================================================== */

/* ---------------------------------------------------------------------- */
/* CONSTANTS                                                               */
/* ---------------------------------------------------------------------- */
const ARENA_SIZE = GameData.arena.size;
const BASE_RADIUS = 45;
const DIST = { S: 130, L: 260 };
const RANGE_BAND = 130;
const DIE_FACES = [1, 2, 3, 4, 5, 6, 7, 8, 'BLANK', 'CRIT'];
const COMPASS = [
  { deg: 0, label: '⬆️', row: 0, col: 1 }, { deg: 45, label: '↗️', row: 0, col: 2 },
  { deg: 90, label: '➡️', row: 1, col: 2 }, { deg: 135, label: '↘️', row: 2, col: 2 },
  { deg: 180, label: '⬇️', row: 2, col: 1 }, { deg: 225, label: '↙️', row: 2, col: 0 },
  { deg: 270, label: '⬅️', row: 1, col: 0 }, { deg: 315, label: '↖️', row: 0, col: 0 },
];
// AI part-disable preference: earliest entries are disabled first (least valuable to keep).
const AI_DISABLE_PRIORITY_SCARAB = ['fins2', 'scarabCockpit', 'fb3', 'bladeWings', 'mantis', 'gatling'];
const AI_DISABLE_PRIORITY_SABRE = ['mk16', 'xr70', 'sdu14', 'xf25wings', 'xf25cockpit', 'fins1'];

/* ---------------------------------------------------------------------- */
/* GEOMETRY HELPERS                                                        */
/* ---------------------------------------------------------------------- */
function toRad(deg) { return (deg * Math.PI) / 180; }
function norm360(deg) { return ((deg % 360) + 360) % 360; }
function dirVector(facingDeg) {
  const r = toRad(facingDeg);
  return { dx: Math.sin(r), dy: -Math.cos(r) };
}
function project(x, y, facingDeg, dist) {
  const v = dirVector(facingDeg);
  return { x: x + v.dx * dist, y: y + v.dy * dist };
}
function dist2(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function edgeDistance(a, b) { return Math.max(0, dist2(a, b) - BASE_RADIUS * 2); }
// Absolute bearing from `from` to `to`, 0 = north(up), clockwise.
function bearing(from, to) {
  const dx = to.x - from.x, dy = to.y - from.y;
  let deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
  return norm360(deg);
}
function angleDiff(a, b) { let d = Math.abs(norm360(a) - norm360(b)) % 360; if (d > 180) d = 360 - d; return d; }
function halfBaseAngle(d) { return d > 0 ? (Math.asin(Math.min(1, BASE_RADIUS / d)) * 180) / Math.PI : 90; }
function rangeBand(d) { return Math.max(1, Math.ceil(d / RANGE_BAND)); }

// Is `target` within `attacker`'s forward arc of the given full width (degrees), centered on attacker.facing?
function inForwardArc(attacker, target, widthDeg) {
  if (widthDeg >= 360) return true;
  const d = dist2(attacker, target);
  const b = bearing(attacker, target);
  const diff = angleDiff(b, attacker.facing);
  const inset = halfBaseAngle(d);
  return diff - inset <= widthDeg / 2;
}
// Is `attacker`'s *entire* base within `defender`'s rear arc of given width (Flank=180, Rear=90)?
function fullyInRearArc(defender, attacker, widthDeg) {
  const d = dist2(defender, attacker);
  const b = bearing(defender, attacker);
  const rearFacing = norm360(defender.facing + 180);
  const diff = angleDiff(b, rearFacing);
  const inset = halfBaseAngle(d);
  return diff + inset <= widthDeg / 2;
}
function inBounds(x, y) { return x >= BASE_RADIUS && x <= ARENA_SIZE - BASE_RADIUS && y >= BASE_RADIUS && y <= ARENA_SIZE - BASE_RADIUS; }
function clampToBounds(x, y) { return { x: Math.min(Math.max(x, BASE_RADIUS), ARENA_SIZE - BASE_RADIUS), y: Math.min(Math.max(y, BASE_RADIUS), ARENA_SIZE - BASE_RADIUS) }; }
function overlapsTerrain(ship, tile) { return dist2(ship, tile) <= BASE_RADIUS + tile.radius; }
function lineCrossesTerrain(a, b, tile) {
  // Distance from tile center to segment a-b.
  const abx = b.x - a.x, aby = b.y - a.y;
  const len2 = abx * abx + aby * aby;
  let t = len2 > 0 ? ((tile.x - a.x) * abx + (tile.y - a.y) * aby) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const px = a.x + abx * t, py = a.y + aby * t;
  return Math.hypot(px - tile.x, py - tile.y) <= tile.radius;
}

/* ---------------------------------------------------------------------- */
/* STATE                                                                   */
/* ---------------------------------------------------------------------- */
let state = null;
let pendingResolve = null; // resolves the current player `choose()` promise

function freshShip(key) {
  const tpl = GameData.ships[key];
  const ship = JSON.parse(JSON.stringify(tpl));
  ship.hull = ship.hullMax;
  ship.evasion = ship.evasionDefault;
  ship.power = ship.powerMax;
  ship.x = ship.deploy.x; ship.y = ship.deploy.y; ship.facing = ship.deploy.facing;
  ship.deployed = false;
  ship.assignedMissiles = [];
  ship.parts.forEach(p => { p.power = 0; p.heat = 0; p.disabled = false; });
  return ship;
}

function newMatch() {
  state = {
    phase: 'start',
    ships: { player: freshShip('sabre'), ai: freshShip('scarab') },
    active: null,
    log: [],
    fastForward: false,
    prompt: null,
    diceTray: [],
    stats: { player: { dealt: 0, taken: 0 }, ai: { dealt: 0, taken: 0 } },
    winner: null,
  };
}

function otherSideOf(side) { return side === 'player' ? 'ai' : 'player'; }

function log(text, cls) {
  state.log.push({ text, cls: cls || '' });
  if (state.log.length > 300) state.log.shift();
  renderLog();
}

function wait(ms) { return new Promise(resolve => setTimeout(resolve, state.fastForward ? 0 : ms)); }

/* ---------------------------------------------------------------------- */
/* PLAYER PROMPTS                                                          */
/* ---------------------------------------------------------------------- */
// promptText: string. options: [{label, value, disabled, cls}]. Resolves to the chosen value.
function choose(promptText, options, long) {
  return new Promise(resolve => {
    state.prompt = { text: promptText, options, long: !!long };
    pendingResolve = resolve;
    renderActionBar();
  });
}
function pickOption(value) {
  if (!pendingResolve) return;
  const r = pendingResolve;
  pendingResolve = null;
  state.prompt = null;
  r(value);
}

/* ---------------------------------------------------------------------- */
/* DICE                                                                    */
/* ---------------------------------------------------------------------- */
function rollDie() { return DIE_FACES[Math.floor(Math.random() * 10)]; }
function isHitFace(face, hitNumber) { if (face === 'BLANK') return false; if (face === 'CRIT') return true; return face >= hitNumber; }

async function rollDiceAnimated(n, hitNumber) {
  const results = [];
  state.diceTray = [];
  renderDiceTray(hitNumber);
  Sound.fire();
  for (let i = 0; i < n; i++) {
    results.push(rollDie());
    state.diceTray = results.slice();
    renderDiceTray(hitNumber);
    await wait(160);
  }
  return results;
}

/* ---------------------------------------------------------------------- */
/* CORE RESOLUTION PRIMITIVES                                              */
/* ---------------------------------------------------------------------- */
function payCost(ship, ability, powerOverride) {
  const p = powerOverride != null ? powerOverride : (ability.costPower || 0);
  ship.power = Math.max(0, ship.power - p);
  // heat is drawn from the unlimited supply directly onto the part; caller adds it to the part.
}

function applyDamage(ship, amount, attackerSideForStats) {
  if (amount <= 0) return;
  ship.hull = Math.max(0, ship.hull - amount);
  const side = state.ships.player === ship ? 'player' : 'ai';
  state.stats[side].taken += amount;
  if (attackerSideForStats) state.stats[attackerSideForStats].dealt += amount;
  renderHud();
}

function undisabledParts(ship) { return ship.parts.filter(p => !p.disabled); }

async function disablePart(ship, part, attackerSide) {
  part.disabled = true;
  ship.power += part.power;
  const heatReturned = part.heat;
  part.power = 0; part.heat = 0;
  const side = state.ships.player === ship ? 'player' : 'ai';
  log(`💥 ${ship.name}'s ${part.name} is disabled!`, 'crit');
  Sound.crit();
  if (heatReturned > 0) {
    log(`🔥 ${heatReturned} heat cube(s) vent from ${part.name}, dealing ${heatReturned} more damage!`, 'dmg');
    applyDamage(ship, heatReturned, attackerSide);
  }
  renderHud();
  await wait(300);
}

// Resolve which part on `ship` gets disabled by a rolled CRIT, attacker is `attackerSide`.
async function resolveCritOnShip(ship, attackerSide) {
  const undisabled = undisabledParts(ship);
  if (undisabled.length === 0) return;
  const isSabreSelfPick = ship.chassisAbilityKey === 'sabreCrit' && ship.parts.every(p => !p.disabled);
  const defenderSide = state.ships.player === ship ? 'player' : 'ai';

  if (isSabreSelfPick) {
    log(`🛡️ ${ship.name}'s chassis ability: no disabled parts yet — its pilot chooses what's hit.`, 'system');
    const part = await choosePartToDisable(defenderSide, ship, undisabled, 'Choose which part takes the critical hit:');
    await disablePart(ship, part, attackerSide);
    return;
  }

  const locFace = rollDie();
  log(`🎯 Crit location roll: ${locFace === 'BLANK' ? '—' : locFace}`, 'system');
  let part = null;
  if (locFace === 'CRIT') {
    log(`${attackerSide === 'player' ? 'You choose' : 'The Scarab chooses'} which part to disable.`, 'system');
    part = await choosePartToDisable(attackerSide, ship, undisabled, `Choose a part of ${ship.name} to disable:`);
  } else if (locFace === 'BLANK' || locFace > ship.parts.length || ship.parts[locFace - 1].disabled) {
    log(`${defenderSide === 'player' ? 'You choose' : 'The Scarab chooses'} which of its own parts is disabled.`, 'system');
    part = await choosePartToDisable(defenderSide, ship, undisabled, 'Choose which of your parts is disabled:');
  } else {
    part = ship.parts[locFace - 1];
  }
  await disablePart(ship, part, attackerSide);
}

// chooserSide picks a part on `ship` from `options`. Player gets buttons; AI uses a priority list.
async function choosePartToDisable(chooserSide, ship, options, promptText) {
  if (chooserSide === 'player') {
    const value = await choose(promptText, options.map(p => ({ label: `${p.emoji} ${p.name}`, value: p.key })));
    return ship.parts.find(p => p.key === value);
  }
  const priority = ship.key === 'scarab' ? AI_DISABLE_PRIORITY_SCARAB : AI_DISABLE_PRIORITY_SABRE;
  for (const key of priority) {
    const found = options.find(p => p.key === key);
    if (found) return found;
  }
  return options[0];
}

/* ---------------------------------------------------------------------- */
/* TERRAIN                                                                  */
/* ---------------------------------------------------------------------- */
async function checkTerrainEntry(side, ship, before) {
  for (const tile of GameData.terrain) {
    const wasOn = overlapsTerrain(before, tile);
    const nowOn = overlapsTerrain(ship, tile);
    if (nowOn && !wasOn) {
      const type = GameData.terrainTypes[tile.type];
      log(`${tile.emoji} ${ship.name} enters ${type.name}.`, 'system');
      if (type.onEnter === 'evade1') {
        ship.evasion = Math.min(6, ship.evasion + 1);
        log(`${ship.name} gains Evade 1 (Evasion ${ship.evasion}).`, 'system');
        renderHud();
      } else if (type.onEnter === 'ventOne') {
        await promptVentOne(side, ship, `${tile.emoji} Ice Cloud: vent 1 cube from any part.`);
      }
      await wait(250);
    }
  }
}

function softCoverBetween(attacker, defender) {
  return GameData.terrain.some(tile => {
    const type = GameData.terrainTypes[tile.type];
    if (type.cover !== 'soft') return false;
    if (overlapsTerrain(attacker, tile)) return false; // attacker ignores tiles it overlaps
    return lineCrossesTerrain(attacker, defender, tile);
  });
}

/* ---------------------------------------------------------------------- */
/* VENTING                                                                  */
/* ---------------------------------------------------------------------- */
function cubesOnShip(ship) {
  const list = [];
  ship.parts.forEach(p => {
    for (let i = 0; i < p.power; i++) list.push({ part: p, type: 'power' });
    for (let i = 0; i < p.heat; i++) list.push({ part: p, type: 'heat' });
  });
  return list;
}

async function promptVentOne(side, ship, promptText) {
  const cubes = cubesOnShip(ship);
  if (cubes.length === 0) return;
  if (side === 'player') {
    const opts = [];
    const seen = new Set();
    cubes.forEach(c => {
      const k = c.part.key + c.type;
      if (seen.has(k)) return;
      seen.add(k);
      const isPower = c.type === 'power';
      opts.push({ label: `${isPower ? '⚡ Vent Power' : '🔥 Vent Heat'} — ${c.part.name}`, value: k });
    });
    const val = await choose(promptText, opts);
    const c = cubes.find(cc => cc.part.key + cc.type === val);
    ventCube(ship, c.part, c.type);
  } else {
    // AI: prefer venting heat, then power, from the least useful part.
    const heatCube = cubes.find(c => c.type === 'heat') || cubes[0];
    ventCube(ship, heatCube.part, heatCube.type);
  }
  renderHud();
}

function ventCube(ship, part, type) {
  if (type === 'power') { part.power = Math.max(0, part.power - 1); ship.power += 1; }
  else { part.heat = Math.max(0, part.heat - 1); }
  Sound.vent();
  log(`💨 Vent 1 ${type === 'power' ? '⚡power' : '🔥heat'} from ${part.name}.`, 'system');
}

async function doVentStep(side, ship) {
  const max = ship.ventPerActivation;
  if (side === 'player') {
    let vented = 0;
    while (vented < max) {
      const cubes = cubesOnShip(ship);
      if (cubes.length === 0) break;
      const seen = new Set();
      const opts = [];
      cubes.forEach(c => {
        const k = c.part.key + c.type;
        if (seen.has(k)) return;
        seen.add(k);
        const isPower = c.type === 'power';
        opts.push({
          label: `${isPower ? '⚡ Vent Power' : '🔥 Vent Heat'} — ${c.part.name}`,
          value: k,
        });
      });
      opts.push({ label: '✅ Done Venting', value: '__done__', cls: 'primary' });
      const val = await choose(
        `💨 Vent Step — parts with cubes on them are locked and can't act again until vented. ` +
        `Clear up to ${max - vented} more cube(s), any parts, any mix. ⚡ Power returns to your pool to spend again; ` +
        `🔥 Heat is discarded for good. Venting is optional — tap ❓ above for a full walkthrough.`,
        opts, true
      );
      if (val === '__done__') break;
      const c = cubes.find(cc => cc.part.key + cc.type === val);
      ventCube(ship, c.part, c.type);
      vented++;
      renderHud();
    }
  } else {
    let vented = 0;
    while (vented < max) {
      const cubes = cubesOnShip(ship);
      if (cubes.length === 0) break;
      const heatCube = cubes.find(c => c.type === 'heat');
      const target = heatCube || cubes[0];
      ventCube(ship, target.part, target.type);
      vented++;
      renderHud();
      await wait(120);
    }
  }
}

/* ---------------------------------------------------------------------- */
/* MOVEMENT RESOLUTION (collision + arena edge + terrain)                  */
/* ---------------------------------------------------------------------- */
// Moves `ship` toward `dest`; handles collision with `other` and leaving the arena.
// Returns true if a collision occurred.
async function resolveMovement(side, ship, other, dest, opts) {
  opts = opts || {};
  const before = { x: ship.x, y: ship.y };
  const willCollide = dist2(dest, other) < BASE_RADIUS * 2;
  const wasAlreadyTouching = edgeDistance(ship, other) <= 0.5;

  if (!inBounds(dest.x, dest.y) && !willCollide) {
    const clamped = clampToBounds(dest.x, dest.y);
    ship.x = clamped.x; ship.y = clamped.y;
    ship.evasion = Math.max(0, ship.evasion - 1);
    log(`🧱 ${ship.name} hits the arena edge! Evasion -1 (now ${ship.evasion}).`, 'system');
    Sound.hit();
    renderHud(); renderArena();
    const rotateChoice = await chooseEdgeRotate(side, ship, other);
    if (rotateChoice !== 0) { ship.facing = norm360(ship.facing + rotateChoice); renderArena(); }
    await checkTerrainEntry(side, ship, before);
    return false;
  }

  if (dist2(dest, other) < BASE_RADIUS * 2) {
    // Collision (or Ram target).
    const dir = dist2(dest, other) > 0.01
      ? { x: (dest.x - other.x) / dist2(dest, other), y: (dest.y - other.y) / dist2(dest, other) }
      : { x: (before.x - other.x) / Math.max(0.01, dist2(before, other)), y: (before.y - other.y) / Math.max(0.01, dist2(before, other)) };
    let cx = other.x + dir.x * BASE_RADIUS * 2, cy = other.y + dir.y * BASE_RADIUS * 2;
    const clamped = clampToBounds(cx, cy);
    ship.x = clamped.x; ship.y = clamped.y;
    renderArena();
    log(`💢 ${ship.name} collides with ${other.name}!`, 'system');
    Sound.hit();

    if (opts.isRam) {
      await performRamAttack(side, ship, other, opts.ramAbility);
    } else if (!wasAlreadyTouching) {
      await resolveCollisionDamage(side, ship, other);
    } else {
      log('Bases were already touching — no collision damage.', 'system');
    }
    if (state.phase === 'gameover') return true;
    await checkTerrainEntry(side, ship, before);
    return true;
  }

  ship.x = dest.x; ship.y = dest.y;
  renderArena();
  await checkTerrainEntry(side, ship, before);
  return false;
}

async function resolveCollisionDamage(side, ship, other) {
  const otherSide = otherSideOf(side);
  for (const [roller, rollerSide, target, targetSide] of [[ship, side, other, otherSide], [other, otherSide, ship, side]]) {
    let dice = [];
    for (let i = 0; i < roller.size; i++) dice.push(rollDie());
    if (roller.chassisAbilityKey === 'scarabCollisionReroll') {
      const blankIdx = dice.indexOf('BLANK');
      if (blankIdx !== -1) { dice[blankIdx] = rollDie(); log(`♻️ ${roller.name}'s ability rerolls a die.`, 'system'); }
    }
    state.diceTray = dice; renderDiceTray(5);
    await wait(300);
    let dmg = 0, crits = 0;
    dice.forEach(f => { if (f === 'CRIT') { dmg += 1; crits++; } else if (f !== 'BLANK' && f >= 5) dmg += 1; });
    log(`${roller.name} rolls collision dice: ${dice.join(', ')} → ${dmg} damage to ${target.name}.`, dmg > 0 ? 'dmg' : '');
    applyDamage(target, dmg, rollerSide);
    if (checkGameOver()) return;
    for (let i = 0; i < crits; i++) { await resolveCritOnShip(target, rollerSide); if (checkGameOver()) return; }
  }
  state.diceTray = []; renderDiceTray();
}

async function performRamAttack(side, ship, other, ability) {
  log(`🗡️ ${ship.name}'s Ram connects!`, 'system');
  await performAttackRoll(side, ship, other, ability, true);
}

/* ---------------------------------------------------------------------- */
/* ATTACKS                                                                  */
/* ---------------------------------------------------------------------- */
function attackIsLegal(ship, other, ability) {
  if (ability.arc && !inForwardArc(ship, other, ability.arc)) return false;
  if (ability.rangeMin != null) {
    const band = rangeBand(edgeDistance(ship, other));
    if (band < ability.rangeMin || band > ability.rangeMax) return false;
  }
  return true;
}

async function performAttackRoll(side, ship, other, ability, isRam) {
  const otherSide = otherSideOf(side);
  const isFlank = fullyInRearArc(other, ship, 180);
  const isRear = fullyInRearArc(other, ship, 90);
  const softCover = !isRam && softCoverBetween(ship, other);
  let hitNumber = ability.hitBase + other.evasion + (isFlank ? -1 : 0) + (softCover ? 2 : 0);
  hitNumber = Math.max(0, hitNumber);
  if (isFlank) log('↩️ Flank bonus: Hit Number -1.', 'system');
  if (isRear) log('🎯 Rear attack: +1 damage if this hits.', 'system');
  if (softCover) log('☁️ Soft cover in the way: Hit Number +2.', 'system');
  if (isRam) log('🗡️ Ram attacks ignore terrain cover.', 'system');

  let dice = await rollDiceAnimated(ability.dice, hitNumber);
  log(`🎲 Rolls [${dice.join(', ')}] needing ${hitNumber}+.`, 'system');

  // Sabre's Cockpit reroll reaction.
  if (ship.key === 'sabre' && side === 'player') {
    const cockpit = ship.parts.find(p => p.key === 'xf25cockpit');
    if (cockpit && !cockpit.disabled && cockpit.power === 0 && cockpit.heat === 0 && ship.power > 0) {
      const rerollN = await choose('🧑‍🚀 Cockpit Reaction: reroll dice?', [
        { label: `Reroll 1 (1⚡)`, value: 1, disabled: ship.power < 1 },
        { label: `Reroll 2 (2⚡)`, value: 2, disabled: ship.power < 2 },
        { label: 'No Reroll', value: 0, cls: 'primary' },
      ]);
      if (rerollN > 0) {
        cockpit.power = rerollN; ship.power -= rerollN;
        for (let i = 0; i < rerollN; i++) {
          const idx = await choose(`Choose die #${i + 1} to reroll:`, dice.map((f, di) => ({ label: `Die ${di + 1}: ${f}`, value: di })));
          dice[idx] = rollDie();
          state.diceTray = dice.slice(); renderDiceTray(hitNumber);
          await wait(150);
        }
        log(`♻️ Rerolled → [${dice.join(', ')}]`, 'system');
      }
    }
  }

  let hits = 0, crits = 0;
  dice.forEach(f => { if (isHitFace(f, hitNumber)) { hits++; if (f === 'CRIT') crits++; } });
  let damage = hits * ability.damage;
  if (isRear && hits > 0) damage += 1;

  if (hits > 0) { Sound.hit(); } else { Sound.miss(); }
  log(`${hits > 0 ? '💥' : '❌'} ${hits} hit(s) → ${damage} damage to ${other.name}.`, damage > 0 ? 'dmg' : '');
  applyDamage(other, damage, side);
  if (checkGameOver()) return;

  for (let i = 0; i < crits; i++) {
    await resolveCritOnShip(other, side);
    if (checkGameOver()) return;
  }
  state.diceTray = []; renderDiceTray();
}

async function performAntiMissile(side, ship, ability) {
  const missiles = ship.assignedMissiles;
  if (missiles.length === 0) return;
  log(`🛡️ ${ship.name} fires anti-missile defense at ${missiles.length} missile(s).`, 'system');
  const survivors = [];
  for (const m of missiles) {
    const missileData = GameData.missiles[m.type];
    const face = rollDie();
    state.diceTray = [face]; renderDiceTray(missileData.quality);
    await wait(180);
    const destroyed = face === 'CRIT' || (face !== 'BLANK' && face >= missileData.quality);
    log(`Roll ${face} vs Quality ${missileData.quality}: ${destroyed ? '💥 destroyed' : 'survives'}.`, '');
    if (!destroyed) survivors.push(m);
  }
  ship.assignedMissiles = survivors;
  state.diceTray = []; renderDiceTray();
  renderHud();
}

async function resolveMissileImpacts(side, ship, other) {
  if (ship.assignedMissiles.length === 0) return;
  const otherSide = otherSideOf(side);
  const groups = {};
  ship.assignedMissiles.forEach(m => { groups[m.type] = (groups[m.type] || 0) + 1; });
  for (const type of Object.keys(groups)) {
    const count = groups[type];
    const missileData = GameData.missiles[type];
    log(`${missileData.emoji} ${count} ${missileData.name}(s) impact ${ship.name}!`, 'system');
    const softCover = GameData.terrain.some(tile => GameData.terrainTypes[tile.type].cover === 'soft' && overlapsTerrain(ship, tile));
    const hitNumber = Math.max(0, missileData.hit + ship.evasion + (softCover ? 2 : 0));
    const dice = await rollDiceAnimated(count * missileData.dice, hitNumber);
    log(`🎲 [${dice.join(', ')}] needing ${hitNumber}+.`, 'system');
    let hits = 0, crits = 0;
    dice.forEach(f => { if (isHitFace(f, hitNumber)) { hits++; if (f === 'CRIT') crits++; } });
    const damage = hits * missileData.damage;
    applyDamage(ship, damage, otherSide);
    log(`${damage > 0 ? '💥' : '❌'} ${hits} hit(s) → ${damage} damage.`, damage > 0 ? 'dmg' : '');
    if (checkGameOver()) return;
    for (let i = 0; i < crits; i++) { await resolveCritOnShip(ship, otherSide); if (checkGameOver()) return; }
  }
  ship.assignedMissiles = [];
  state.diceTray = []; renderDiceTray();
  renderHud();
}

/* ---------------------------------------------------------------------- */
/* ABILITY EXECUTION                                                        */
/* ---------------------------------------------------------------------- */
async function executeAbility(side, ship, other, part, ability) {
  payCost(ship, ability);
  if (ability.costHeat) part.heat += ability.costHeat;
  part.power += ability.costPower || 0;
  renderHud();

  switch (ability.effect) {
    case 'moveForward': {
      const dest = project(ship.x, ship.y, ship.facing, DIST[ability.dist]);
      log(`${part.emoji} ${ship.name} uses ${ability.name}: moves forward.`, '');
      Sound.move();
      await resolveMovement(side, ship, other, dest);
      break;
    }
    case 'moveLateral': {
      const dir = await chooseLateralDirection(side, ship, other);
      const heading = norm360(ship.facing + (dir === 'left' ? -45 : 45));
      const dest = project(ship.x, ship.y, heading, DIST[ability.dist]);
      log(`${part.emoji} ${ship.name} uses ${ability.name}: strafes ${dir}.`, '');
      Sound.move();
      await resolveMovement(side, ship, other, dest);
      break;
    }
    case 'moveFree': {
      const heading = await chooseCompassDirection(side, ship, other);
      const dest = project(ship.x, ship.y, heading, DIST[ability.dist]);
      log(`${part.emoji} ${ship.name} uses ${ability.name}.`, '');
      Sound.move();
      const collided = await resolveMovement(side, ship, other, dest);
      if (checkGameOver()) break;
      if (ability.allowUTurn && !collided) {
        const doUturn = await chooseUTurn(side, ship, other);
        if (doUturn) { ship.facing = norm360(ship.facing + 180); log(`${ship.name} performs a U-Turn.`, ''); renderArena(); }
      }
      break;
    }
    case 'rotate': {
      const delta = await promptRotate(side, ship, other, ability.rotateMax, true);
      ship.facing = norm360(ship.facing + delta);
      log(`${part.emoji} ${ship.name} uses ${ability.name}: rotates ${delta}°.`, '');
      Sound.rotate();
      renderArena();
      break;
    }
    case 'attack': {
      log(`${part.emoji} ${ship.name} fires ${ability.name}!`, '');
      await performAttackRoll(side, ship, other, ability, false);
      break;
    }
    case 'antiMissile': {
      await performAntiMissile(side, ship, ability);
      break;
    }
    case 'launch': {
      const missileData = GameData.missiles[ability.missileType];
      for (let i = 0; i < ability.missileCount; i++) other.assignedMissiles.push({ type: ability.missileType });
      log(`${part.emoji} ${ship.name} launches ${ability.missileCount}x ${missileData.name} at ${other.name}!`, '');
      Sound.missile();
      renderHud(); renderArena();
      break;
    }
    case 'evade': {
      ship.evasion = Math.min(6, ship.evasion + ability.evadeAmount);
      log(`${part.emoji} ${ship.name} uses ${ability.name}: Evasion → ${ship.evasion}.`, '');
      renderHud();
      break;
    }
    case 'special': {
      ship.evasion = Math.min(6, ship.evasion + ability.evasionBonus);
      log(`${part.emoji} ${ship.name} uses ${ability.name}: Evasion → ${ship.evasion}.`, '');
      renderHud();
      break;
    }
    case 'ram': {
      const dest = project(ship.x, ship.y, ship.facing, DIST[ability.dist]);
      log(`${part.emoji} ${ship.name} charges with ${ability.name}!`, '');
      Sound.move();
      await resolveMovement(side, ship, other, dest, { isRam: true, ramAbility: ability });
      break;
    }
    default:
      break;
  }
  renderHud();
}

async function executeRepair(side, ship, part) {
  ship.power = Math.max(0, ship.power - part.repairCost);
  part.disabled = false;
  part.power = part.repairCost;
  log(`🔧 ${ship.name} repairs ${part.name} (${part.repairCost}⚡ locked until vented).`, 'good');
  renderHud();
}

/* ---------------------------------------------------------------------- */
/* PLAYER SUB-PROMPTS                                                       */
/* ---------------------------------------------------------------------- */
async function chooseLateralDirection(side, ship, other) {
  if (side === 'player') {
    return choose('Strafe which way?', [{ label: '⬅️ Left', value: 'left' }, { label: 'Right ➡️', value: 'right' }]);
  }
  const left = project(ship.x, ship.y, norm360(ship.facing - 45), DIST.S);
  const right = project(ship.x, ship.y, norm360(ship.facing + 45), DIST.S);
  return dist2(left, other) < dist2(right, other) ? 'left' : 'right';
}

async function chooseCompassDirection(side, ship, other) {
  if (side === 'player') {
    const val = await choose('Choose a heading (world-relative):', COMPASS.map(c => ({ label: c.label, value: c.deg, compass: true, row: c.row, col: c.col })));
    return val;
  }
  const b = bearing(ship, other);
  let best = COMPASS[0], bestDiff = 999;
  COMPASS.forEach(c => { const d = angleDiff(c.deg, b); if (d < bestDiff) { bestDiff = d; best = c; } });
  return best.deg;
}

async function chooseEdgeRotate(side, ship, other) {
  if (side === 'player') {
    return choose('At the arena edge — rotate 90°?', [
      { label: '↺ Left 90°', value: -90 }, { label: 'Right 90° ↻', value: 90 }, { label: 'No Rotation', value: 0, cls: 'primary' },
    ]);
  }
  const options = [-90, 0, 90];
  let best = 0, bestDiff = angleDiff(ship.facing, bearing(ship, other));
  options.forEach(o => {
    const d = angleDiff(norm360(ship.facing + o), bearing(ship, other));
    if (d < bestDiff) { bestDiff = d; best = o; }
  });
  return best;
}

async function chooseUTurn(side, ship, other) {
  if (side === 'player') {
    return choose('Perform a U-Turn (180°)?', [{ label: '🔄 U-Turn', value: true }, { label: 'Keep Facing', value: false, cls: 'primary' }]);
  }
  return !inForwardArc(ship, other, 180);
}

// Returns a rotation delta (multiple of 45, |delta| <= max*45).
async function promptRotate(side, ship, other, max, mandatoryConfirm) {
  if (side === 'player') {
    let delta = 0;
    for (;;) {
      const opts = [];
      if (delta > -max * 45) opts.push({ label: '↺ -45°', value: 'minus' });
      if (delta < max * 45) opts.push({ label: '+45° ↻', value: 'plus' });
      opts.push({ label: `✅ Confirm (${delta}°)`, value: 'confirm', cls: 'primary' });
      const previewFacing = norm360(ship.facing + delta);
      const savedFacing = ship.facing;
      ship.facing = previewFacing; renderArena(); ship.facing = savedFacing;
      const v = await choose(`Rotate up to ${max} increment(s) of 45° (either direction).`, opts);
      if (v === 'minus') delta -= 45;
      else if (v === 'plus') delta += 45;
      else { renderArena(); return delta; }
    }
  }
  // AI: face the opponent, capped at max*45.
  const b = bearing(ship, other);
  let diff = b - ship.facing;
  diff = ((diff + 540) % 360) - 180; // shortest signed diff
  const steps = Math.max(-max, Math.min(max, Math.round(diff / 45)));
  return steps * 45;
}

/* ---------------------------------------------------------------------- */
/* PART ACTION MENU                                                        */
/* ---------------------------------------------------------------------- */
function buildPartActionOptions(ship, other) {
  const opts = [];
  ship.parts.forEach(part => {
    if (part.disabled) {
      if (ship.power >= part.repairCost) {
        opts.push({ label: `🔧 Repair ${part.name} (${part.repairCost}⚡)`, value: `repair:${part.key}` });
      }
      return;
    }
    if (part.power > 0 || part.heat > 0) return; // locked until vented
    part.abilities.forEach(ability => {
      if (ability.kind !== 'action') return;
      const affordable = ship.power >= (ability.costPower || 0);
      let legal = true, note = '';
      if (ability.effect === 'attack' || ability.effect === 'launch') {
        legal = attackIsLegal(ship, other, ability);
        if (!legal) note = ' (out of range/arc)';
      }
      opts.push({
        label: `${part.emoji} ${ability.name}${note}`,
        value: `ability:${part.key}:${ability.key}`,
        disabled: !affordable || !legal,
      });
      if (ability.antiMissile && ship.assignedMissiles.length > 0 && affordable) {
        opts.push({ label: `${part.emoji} ${ability.name} (Anti-Missile)`, value: `antimissile:${part.key}:${ability.key}` });
      }
    });
  });
  opts.push({ label: '🏁 End Activation', value: '__end__', cls: 'danger' });
  return opts;
}

async function doPartActionStep(side, ship, other) {
  if (side === 'player') {
    const value = await choose('Part Actions — spend power, any order, any number:', buildPartActionOptions(ship, other));
    if (value === '__end__') return false;
    await routePartAction(side, ship, other, value);
    return true;
  }
  return aiDoPartAction(ship, other);
}

async function routePartAction(side, ship, other, value) {
  if (value.startsWith('repair:')) {
    const key = value.split(':')[1];
    const part = ship.parts.find(p => p.key === key);
    await executeRepair(side, ship, part);
    return;
  }
  const [kind, partKey, abilityKey] = value.split(':');
  const part = ship.parts.find(p => p.key === partKey);
  const ability = part.abilities.find(a => a.key === abilityKey);
  if (kind === 'antimissile') {
    payCost(ship, ability);
    if (ability.costHeat) part.heat += ability.costHeat;
    part.power += ability.costPower || 0;
    renderHud();
    await performAntiMissile(side, ship, ability);
    return;
  }
  await executeAbility(side, ship, other, part, ability);
}

/* ---------------------------------------------------------------------- */
/* AI HEURISTICS                                                           */
/* ---------------------------------------------------------------------- */
function expectedDamage(ship, other, ability) {
  if (!attackIsLegal(ship, other, ability)) return -1;
  const isFlank = fullyInRearArc(other, ship, 180);
  const softCover = softCoverBetween(ship, other);
  const hitNumber = Math.max(0, ability.hitBase + other.evasion + (isFlank ? -1 : 0) + (softCover ? 2 : 0));
  // Faces are 1-8, BLANK, CRIT (10 total). Numeric faces >= hitNumber, plus CRIT (always hits).
  const numericHits = Math.max(0, Math.min(8, 9 - Math.max(hitNumber, 1)));
  const pHit = (numericHits + 1) / 10;
  return ability.dice * pHit * ability.damage;
}

async function aiDoPartAction(ship, other) {
  const usable = [];
  ship.parts.forEach(part => {
    if (part.disabled || part.power > 0 || part.heat > 0) return;
    part.abilities.forEach(ability => {
      if (ability.kind !== 'action') return;
      if (ship.power < (ability.costPower || 0)) return;
      usable.push({ part, ability });
    });
  });

  // 1. Best available attack.
  let bestAttack = null, bestScore = 0;
  usable.filter(u => u.ability.effect === 'attack' || u.ability.effect === 'ram').forEach(u => {
    let score;
    if (u.ability.effect === 'ram') {
      const dest = project(ship.x, ship.y, ship.facing, DIST[u.ability.dist]);
      score = dist2(dest, other) < BASE_RADIUS * 2 ? u.ability.dice * 0.6 * u.ability.damage : -1;
    } else {
      score = expectedDamage(ship, other, u.ability);
    }
    if (score > bestScore) { bestScore = score; bestAttack = u; }
  });
  if (bestAttack) {
    await wait(500);
    await routePartAction('ai', ship, other, `ability:${bestAttack.part.key}:${bestAttack.ability.key}`);
    return true;
  }

  // 2. Anti-missile if threatened.
  if (ship.assignedMissiles.length > 0) {
    const am = usable.find(u => u.ability.antiMissile);
    if (am) {
      await wait(400);
      await routePartAction('ai', ship, other, `antimissile:${am.part.key}:${am.ability.key}`);
      return true;
    }
  }

  // 3. Reposition to get in range/arc.
  const moveOpt = usable.find(u => u.ability.effect === 'moveForward' || u.ability.effect === 'moveLateral' || u.ability.effect === 'moveFree');
  if (moveOpt && edgeDistance(ship, other) > 60) {
    await wait(400);
    await routePartAction('ai', ship, other, `ability:${moveOpt.part.key}:${moveOpt.ability.key}`);
    return true;
  }

  // 4. Rotate to face the target if not yet aligned and rotate part available.
  const rotateOpt = usable.find(u => u.ability.effect === 'rotate');
  if (rotateOpt && !inForwardArc(ship, other, 90)) {
    await wait(400);
    await routePartAction('ai', ship, other, `ability:${rotateOpt.part.key}:${rotateOpt.ability.key}`);
    return true;
  }

  // 5. Boost own evasion if not maxed.
  const specialOpt = usable.find(u => u.ability.effect === 'special');
  if (specialOpt && ship.evasion < 6) {
    await wait(400);
    await routePartAction('ai', ship, other, `ability:${specialOpt.part.key}:${specialOpt.ability.key}`);
    return true;
  }

  // 6. Repair a disabled part if it can afford to.
  const repairable = ship.parts.find(p => p.disabled && ship.power >= p.repairCost);
  if (repairable) {
    await wait(400);
    await executeRepair('ai', ship, repairable);
    return true;
  }

  return false;
}

/* ---------------------------------------------------------------------- */
/* ACTIVATION LOOP                                                          */
/* ---------------------------------------------------------------------- */
function checkGameOver() {
  if (state.phase === 'gameover') return true;
  const p = state.ships.player, a = state.ships.ai;
  if (p.hull <= 0 || a.hull <= 0) {
    state.phase = 'gameover';
    state.winner = (p.hull <= 0 && a.hull <= 0) ? 'draw' : (p.hull <= 0 ? 'ai' : 'player');
    renderGameOver();
    if (state.winner === 'player') Sound.victory(); else Sound.defeat();
    return true;
  }
  return false;
}

async function runActivation(side) {
  const ship = state.ships[side];
  const other = state.ships[otherSideOf(side)];
  state.active = side;
  state.fastForward = side === 'player' ? false : state.fastForward;
  renderHud(); renderTurnBanner();

  if (!ship.deployed) {
    ship.x = ship.deploy.x; ship.y = ship.deploy.y; ship.facing = ship.deploy.facing; ship.deployed = true;
    log(`${ship.emoji} ${ship.name} deploys!`, 'system');
    Sound.deploy();
    renderArena();
    await wait(500);
  }

  ship.evasion = ship.evasionDefault;
  log(`— ${ship.name}'s activation: Evasion reset to ${ship.evasion}.`, 'system');
  renderHud();
  await wait(300);

  await doVentStep(side, ship);
  if (checkGameOver()) return;

  for (const icon of ship.chassisMovement) {
    if (icon.type === 'rotate') {
      const delta = await promptRotate(side, ship, other, icon.max, false);
      if (delta !== 0) { ship.facing = norm360(ship.facing + delta); log(`${ship.name} rotates ${delta}°.`, ''); Sound.rotate(); renderArena(); }
    } else if (icon.type === 'move') {
      const dest = project(ship.x, ship.y, ship.facing, DIST[icon.dist]);
      log(`${ship.name}'s chassis movement: forward ${icon.dist === 'L' ? 'Long' : 'Short'}.`, '');
      Sound.move();
      await resolveMovement(side, ship, other, dest);
    }
    if (checkGameOver()) return;
    await wait(200);
  }

  let acting = true;
  while (acting) {
    acting = await doPartActionStep(side, ship, other);
    if (checkGameOver()) return;
  }

  await resolveMissileImpacts(side, ship, other);
  if (checkGameOver()) return;

  state.prompt = null;
  renderActionBar();
  await wait(300);
  runActivation(otherSideOf(side));
}

/* ---------------------------------------------------------------------- */
/* RENDERING                                                                */
/* ---------------------------------------------------------------------- */
function $(id) { return document.getElementById(id); }

function render() {
  $('screen-start').classList.toggle('hidden', state.phase !== 'start');
  $('screen-battle').classList.toggle('hidden', state.phase !== 'battle');
  $('screen-gameover').classList.toggle('hidden', state.phase !== 'gameover');
  if (state.phase === 'battle') { renderHud(); renderArena(); renderLog(); renderActionBar(); renderTurnBanner(); renderDiceTray(); }
}

function partChipHtml(part) {
  const cubes = [];
  for (let i = 0; i < part.power; i++) cubes.push('<span class="cube-dot power"></span>');
  for (let i = 0; i < part.heat; i++) cubes.push('<span class="cube-dot heat"></span>');
  const usable = !part.disabled && part.power === 0 && part.heat === 0;
  return `<div class="part-chip ${part.disabled ? 'disabled' : ''} ${usable ? 'usable' : ''}" title="${part.name}">
    <div class="pcubes">${cubes.join('')}</div>
    ${part.emoji}
    <span class="pname">${part.disabled ? '💀' : part.name.split(' ')[0]}</span>
  </div>`;
}

function hudHtml(ship, side) {
  const pips = [];
  for (let i = 0; i < 6; i++) pips.push(`<span class="pip ${i < ship.evasion ? 'filled' : ''}"></span>`);
  return `
    <div class="hname"><span class="hemoji">${ship.emoji}</span> ${ship.name}</div>
    <div class="hp-bar"><div class="hp-fill" style="width:${Math.max(0, (ship.hull / ship.hullMax) * 100)}%"></div></div>
    <div class="hp-text">Hull ${ship.hull}/${ship.hullMax}</div>
    <div class="stat-row">
      <span>🛡️ <span class="evasion-pips">${pips.join('')}</span></span>
      <span class="cube-count"><span class="cube-dot power"></span>${ship.power}</span>
      ${ship.assignedMissiles.length ? `<span>🚀×${ship.assignedMissiles.length}</span>` : ''}
    </div>
    <div class="parts-row">${ship.parts.map(partChipHtml).join('')}</div>
  `;
}

function renderHud() {
  if (!state.ships) return;
  $('hud-player').innerHTML = hudHtml(state.ships.player, 'player');
  $('hud-ai').innerHTML = hudHtml(state.ships.ai, 'ai');
  $('hud-player').classList.toggle('active-turn', state.active === 'player');
  $('hud-ai').classList.toggle('active-turn', state.active === 'ai');
}

function renderTurnBanner() {
  const el = $('turn-banner');
  if (!state.active) { el.innerHTML = ''; return; }
  const ship = state.ships[state.active];
  el.innerHTML = `<b>${ship.emoji} ${ship.name}</b> is activating${state.active === 'ai' ? ' <button id="btn-skip-ai" style="padding:2px 8px;font-size:11px;margin-left:6px;">⏩ Skip</button>' : ''}`;
  const skipBtn = $('btn-skip-ai');
  if (skipBtn) skipBtn.onclick = () => { state.fastForward = true; };
}

function shipTokenSvg(ship, cls) {
  const front = project(ship.x, ship.y, ship.facing, BASE_RADIUS);
  const destroyed = ship.hull <= 0;
  return `<g class="ship-token ${cls} ${destroyed ? 'destroyed' : ''}">
    <circle class="base" cx="${ship.x}" cy="${ship.y}" r="${BASE_RADIUS}"></circle>
    <line class="facing-line" x1="${ship.x}" y1="${ship.y}" x2="${front.x}" y2="${front.y}"></line>
    <text class="semoji" x="${ship.x}" y="${ship.y}" transform="rotate(${ship.facing} ${ship.x} ${ship.y})">${ship.emoji}</text>
    ${ship.assignedMissiles.length ? `<text class="missile-badge" x="${ship.x + BASE_RADIUS}" y="${ship.y - BASE_RADIUS}">🚀${ship.assignedMissiles.length}</text>` : ''}
  </g>`;
}

function renderArena() {
  if (!state.ships) return;
  $('layer-terrain').innerHTML = GameData.terrain.map(t =>
    `<circle class="terrain-tile" cx="${t.x}" cy="${t.y}" r="${t.radius}"></circle><text class="terrain-label" x="${t.x}" y="${t.y}">${t.emoji}</text>`
  ).join('');
  const p = state.ships.player, a = state.ships.ai;
  $('layer-ships').innerHTML = (p.deployed ? shipTokenSvg(p, 'player') : '') + (a.deployed ? shipTokenSvg(a, 'ai') : '');
}

function renderLog() {
  const el = $('combat-log');
  el.innerHTML = state.log.map(l => `<div class="log-line ${l.cls}">${l.text}</div>`).join('');
  el.scrollTop = el.scrollHeight;
}

function renderDiceTray(hitNumber) {
  const el = $('dice-tray');
  if (!state.diceTray || state.diceTray.length === 0) { el.innerHTML = ''; return; }
  el.innerHTML = state.diceTray.map(f => {
    let cls = 'miss';
    if (f === 'CRIT') cls = 'crit';
    else if (hitNumber != null && isHitFace(f, hitNumber)) cls = 'hit';
    return `<div class="die ${cls}">${f === 'BLANK' ? '–' : f === 'CRIT' ? '★' : f}</div>`;
  }).join('');
}

function renderActionBar() {
  const promptEl = $('action-prompt');
  const gridEl = $('action-grid');
  if (!state.prompt) { promptEl.textContent = ''; gridEl.innerHTML = ''; return; }
  promptEl.textContent = state.prompt.text;
  promptEl.classList.toggle('long', !!state.prompt.long);
  const compassOpts = state.prompt.options.filter(o => o.compass);
  if (compassOpts.length === 8) {
    const grid = document.createElement('div');
    grid.className = 'compass';
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (r === 1 && c === 1) { grid.innerHTML += '<div class="center"></div>'; continue; }
        const opt = compassOpts.find(o => o.row === r && o.col === c);
        grid.innerHTML += `<button data-val="${opt.value}">${opt.label}</button>`;
      }
    }
    gridEl.innerHTML = '';
    gridEl.appendChild(grid);
    grid.querySelectorAll('button[data-val]').forEach(btn => {
      btn.onclick = () => { Sound.click(); pickOption(Number(btn.dataset.val)); };
    });
    return;
  }
  gridEl.innerHTML = '';
  state.prompt.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.textContent = opt.label;
    btn.disabled = !!opt.disabled;
    if (opt.cls) btn.classList.add(opt.cls);
    btn.onclick = () => { Sound.click(); pickOption(opt.value); };
    gridEl.appendChild(btn);
  });
}

function renderGameOver() {
  const p = state.ships.player, a = state.ships.ai;
  const title = $('gameover-title');
  if (state.winner === 'player') title.innerHTML = '🏆 Victory!';
  else if (state.winner === 'ai') title.innerHTML = '💀 Defeat';
  else title.innerHTML = '🤝 Mutual Destruction';
  $('gameover-stats').innerHTML =
    `You dealt ${state.stats.player.dealt} damage and took ${state.stats.player.taken}.<br>` +
    `Sabre Hull: ${Math.max(0, p.hull)}/${p.hullMax} — Scarab Hull: ${Math.max(0, a.hull)}/${a.hullMax}`;
  render();
}

/* ---------------------------------------------------------------------- */
/* TUTORIAL                                                                 */
/* ---------------------------------------------------------------------- */
const TUTORIAL_SLIDES = [
  {
    title: '🎯 Welcome, Pilot',
    sub: 'Snap Ships Tactics: Duel — quick tutorial (8 steps)',
    html: `
      <p>You command the <b>🚀 Sabre XF-23 Fighter</b> against an AI-flown <b>👾 Scarab KLAW Interceptor</b>.</p>
      <p>Ships take turns <b>activating</b> — rotate, move, and fire — until one ship's Hull hits 0.</p>
      <div class="tut-diagram">
        <div class="tut-row"><span class="tut-icon">🚀</span><span class="tut-desc">You pilot the Sabre — full manual control.</span></div>
        <div class="tut-row"><span class="tut-icon">👾</span><span class="tut-desc">The Scarab is flown by the AI — watch it play, or tap Skip.</span></div>
        <div class="tut-row"><span class="tut-icon">🏆</span><span class="tut-desc">Reduce the enemy's Hull to 0 to win.</span></div>
      </div>
      <p>Tap <b>Next</b> to continue, or close this anytime — reopen it later with the ❓ button.</p>`,
  },
  {
    title: '🖥️ Reading Your Control Panel',
    html: `
      <p>Each ship's card at the top of the screen shows everything about it:</p>
      <div class="tut-diagram">
        <div class="tut-row"><span class="tut-icon">❤️</span><span><span class="tut-label">Hull bar</span> — <span class="tut-desc">your health. Reaches 0 and you're destroyed.</span></span></div>
        <div class="tut-row"><span class="tut-icon">🛡️</span><span><span class="tut-label">Evasion pips</span> — <span class="tut-desc">how hard you are to hit. Resets every one of your activations, but carries over through the opponent's turn.</span></span></div>
        <div class="tut-row"><span class="tut-icon">⚡</span><span><span class="tut-label">Power</span> — <span class="tut-desc">the fuel you spend to take actions.</span></span></div>
        <div class="tut-row"><span class="tut-icon">🔫</span><span><span class="tut-label">Part chips</span> — <span class="tut-desc">your 6 equipped systems. Green border = ready. Cube dots = locked. Skull/greyed = disabled.</span></span></div>
      </div>`,
  },
  {
    title: '🔄 Your Activation, Step by Step',
    html: `
      <p>Every activation goes through the same 5 steps, in order:</p>
      <div class="tut-flow">
        <div class="tut-flow-step"><b>🛡️</b>Reset Evasion</div>
        <span class="tut-arrow">➜</span>
        <div class="tut-flow-step"><b>💨</b>Vent Step</div>
        <span class="tut-arrow">➜</span>
        <div class="tut-flow-step"><b>🧭</b>Movement</div>
        <span class="tut-arrow">➜</span>
        <div class="tut-flow-step"><b>🎯</b>Part Actions</div>
        <span class="tut-arrow">➜</span>
        <div class="tut-flow-step"><b>🏁</b>End</div>
      </div>
      <p>The game walks you through each step automatically — buttons for whatever you can currently do appear at the bottom of the screen.</p>`,
  },
  {
    title: '💨 The Vent Step (the confusing one!)',
    html: `
      <p>Using a part's action puts <b>cubes</b> on that part card. <b>A part with any cubes on it is locked</b> — it can't act again until those cubes are removed.</p>
      <div class="vent-demo">
        <div class="vent-demo-col">
          <div class="vent-demo-label">🔒 Locked</div>
          <div class="part-chip" style="width:76px;display:inline-block;">
            <div class="pcubes"><span class="cube-dot power"></span><span class="cube-dot power"></span><span class="cube-dot heat"></span></div>
            🔫<span class="pname">Autocannon</span>
          </div>
          <div class="vent-demo-note">2⚡ + 1🔥 sitting on it</div>
        </div>
        <div class="vent-demo-arrow">💨<br>Vent</div>
        <div class="vent-demo-col">
          <div class="vent-demo-label">✅ Unlocked</div>
          <div class="part-chip usable" style="width:76px;display:inline-block;">
            <div class="pcubes"></div>
            🔫<span class="pname">Autocannon</span>
          </div>
          <div class="vent-demo-note">Ready to fire again!</div>
        </div>
      </div>
      <div class="vent-demo-legend">
        <div><span class="cube-dot power"></span> <span><b>Power</b> cubes vent back to your ship's pool — you get to spend them again.</span></div>
        <div><span class="cube-dot heat"></span> <span><b>Heat</b> cubes vent away to the supply and are just gone — that's the price of a big attack.</span></div>
      </div>
      <p>Each activation you may vent a limited number of cubes total, pulled from any parts, any mix of ⚡/🔥. Venting is optional — but it's the only way to unlock a part you want to use again.</p>`,
  },
  {
    title: '🎲 Rolling to Hit',
    html: `
      <p>Attacks roll a handful of 10-sided dice. Each shows a number 1–8, a blank, or a critical star:</p>
      <div class="dice-demo">
        <div class="die hit">5</div><div class="die miss">2</div><div class="die miss">–</div><div class="die crit">★</div>
      </div>
      <div class="tut-diagram">
        <div class="tut-row"><span class="tut-icon">🎯</span><span class="tut-desc"><b>Hit Number</b> = weapon accuracy + target's Evasion. Roll that number or higher to hit.</span></div>
        <div class="tut-row"><span class="tut-icon">–</span><span class="tut-desc"><b>Blank</b> always misses, no matter what.</span></div>
        <div class="tut-row"><span class="tut-icon">★</span><span class="tut-desc"><b>Critical</b> always hits — and disables one of the target's parts!</span></div>
      </div>
      <p>Attacking from a target's rear arc improves your odds and adds bonus damage — watch the log for Flank/Rear callouts.</p>`,
  },
  {
    title: '💥 Critical Hits & Repairs',
    html: `
      <p>Every ★ you roll disables one of the target's parts.</p>
      <div class="tut-diagram">
        <div class="tut-row"><span class="tut-icon">💀</span><span class="tut-desc">A disabled part is greyed out and can't act.</span></div>
        <div class="tut-row"><span class="tut-icon">🔧</span><span class="tut-desc">Spend power any time to <b>Repair</b> it — it comes back locked (cubes on it) until you vent again.</span></div>
        <div class="tut-row"><span class="tut-icon">🔥</span><span class="tut-desc">If the disabled part had heat cubes on it, they explode for extra Hull damage!</span></div>
      </div>
      <p>Your Sabre's Cockpit ability lets <b>you</b> choose which part gets hit — but only until it takes its first critical.</p>`,
  },
  {
    title: '☁️ Terrain & 🚀 Missiles',
    html: `
      <div class="tut-diagram">
        <div class="tut-row"><span class="tut-icon">☁️</span><span class="tut-desc"><b>Debris Cloud</b> — flying into it gives you a free Evade 1.</span></div>
        <div class="tut-row"><span class="tut-icon">❄️</span><span class="tut-desc"><b>Ice Cloud</b> — flying into it vents 1 cube from any part, free.</span></div>
        <div class="tut-row"><span class="tut-icon">🌥️</span><span class="tut-desc">Both tiles give <b>Soft Cover</b>: +2 to a shooter's Hit Number if the shot crosses them.</span></div>
        <div class="tut-row"><span class="tut-icon">🚀</span><span class="tut-desc">Missiles don't hit immediately — they land on the target and detonate at the end of that ship's <i>next</i> activation.</span></div>
        <div class="tut-row"><span class="tut-icon">🛡️</span><span class="tut-desc">Some weapons can also fire in <b>Anti-Missile</b> mode to shoot incoming missiles down first.</span></div>
      </div>`,
  },
  {
    title: '🎮 Playing Your Turn',
    html: `
      <p>Whenever it's your move, buttons appear at the bottom of the screen — just tap the one you want:</p>
      <div class="tut-diagram">
        <div class="tut-row"><span class="tut-icon">👉</span><span class="tut-desc">Each button is one legal choice — a part's ability, a direction, a yes/no.</span></div>
        <div class="tut-row"><span class="tut-icon">⏩</span><span class="tut-desc">When it's the Scarab's turn, watch it play or tap <b>Skip</b> to fast-forward.</span></div>
        <div class="tut-row"><span class="tut-icon">❓</span><span class="tut-desc">Tap the help icon (top-right) anytime to reopen this guide mid-battle.</span></div>
      </div>
      <p>That's everything — good hunting, pilot. 🚀</p>`,
  },
];
let tutorialIndex = 0;

function openTutorial(index) {
  tutorialIndex = index || 0;
  $('tutorial-overlay').classList.remove('hidden');
  renderTutorialSlide();
}
function closeTutorial() { $('tutorial-overlay').classList.add('hidden'); }
function tutorialGo(delta) {
  tutorialIndex = Math.max(0, Math.min(TUTORIAL_SLIDES.length - 1, tutorialIndex + delta));
  renderTutorialSlide();
}
function renderTutorialSlide() {
  const s = TUTORIAL_SLIDES[tutorialIndex];
  $('tutorial-slide-content').innerHTML = `<h2>${s.title}</h2>${s.sub ? `<div class="tut-sub">${s.sub}</div>` : ''}${s.html}`;
  $('tutorial-dots').innerHTML = TUTORIAL_SLIDES.map((_, i) => `<span class="${i === tutorialIndex ? 'active' : ''}"></span>`).join('');
  $('btn-tutorial-prev').disabled = tutorialIndex === 0;
  $('btn-tutorial-next').textContent = tutorialIndex === TUTORIAL_SLIDES.length - 1 ? "🚀 Let's Fly!" : 'Next ▶';
}

/* ---------------------------------------------------------------------- */
/* BOOTSTRAP                                                                */
/* ---------------------------------------------------------------------- */
function startMatch() {
  newMatch();
  state.phase = 'battle';
  render();
  const firstRoll = rollDie();
  const secondRoll = rollDie();
  const firstFace = firstRoll === 'BLANK' ? 0 : firstRoll === 'CRIT' ? 9 : firstRoll;
  const secondFace = secondRoll === 'BLANK' ? 0 : secondRoll === 'CRIT' ? 9 : secondRoll;
  const first = firstFace >= secondFace ? 'player' : 'ai';
  log(`🎲 Initiative roll — You: ${firstRoll}, Scarab: ${secondRoll}. ${first === 'player' ? 'You go' : 'The Scarab goes'} first!`, 'system');
  runActivation(first);
}

document.addEventListener('DOMContentLoaded', () => {
  newMatch();
  render();
  $('btn-deploy').addEventListener('click', () => { Sound.unlock(); Sound.click(); startMatch(); });
  $('btn-play-again').addEventListener('click', () => { Sound.click(); state.phase = 'start'; render(); });
  $('btn-mute').addEventListener('click', () => {
    const muted = Sound.toggleMute();
    $('btn-mute').textContent = muted ? '🔇' : '🔊';
  });

  $('btn-help').addEventListener('click', () => { Sound.click(); openTutorial(0); });
  $('btn-tutorial-open').addEventListener('click', () => { Sound.click(); openTutorial(0); });
  $('btn-tutorial-close').addEventListener('click', () => { Sound.click(); closeTutorial(); });
  $('btn-tutorial-prev').addEventListener('click', () => { Sound.click(); tutorialGo(-1); });
  $('btn-tutorial-next').addEventListener('click', () => {
    Sound.click();
    if (tutorialIndex === TUTORIAL_SLIDES.length - 1) closeTutorial();
    else tutorialGo(1);
  });
  $('tutorial-overlay').addEventListener('click', (e) => { if (e.target.id === 'tutorial-overlay') closeTutorial(); });

  // Open the tutorial automatically the first time the game loads.
  openTutorial(0);
});
