// Arcanum Tactics — engine + game logic. Loaded after game-data.js and sound.js.
"use strict";

const SAVE_KEY = "arcanum_tactics_save";

const state = {
  screen: "title",
  campaign: null,
  battle: null,
  lastResult: null,
};

let floatIdSeq = 1;

// ---------------------------------------------------------------------------------------------
// Save / campaign
// ---------------------------------------------------------------------------------------------

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveGame() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state.campaign));
}

function newCampaign() {
  return {
    battleIndex: 0,
    recruits: RECRUITS.map((r) => ({ id: r.id, job: "squire", level: 1, jp: 0, unlockedJobs: ["squire"] })),
  };
}

// ---------------------------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------------------------

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function findAbilityById(id) {
  for (const key of JOB_ORDER) {
    const found = JOBS[key].abilities.find((a) => a.id === id);
    if (found) return found;
  }
  return null;
}

function unitAbilities(unit) {
  const job = JOBS[unit.jobId];
  const list = [WEAPON_ATTACK, ...job.abilities];
  if (unit.extraAbility) {
    const extra = findAbilityById(unit.extraAbility);
    if (extra) list.push(extra);
  }
  return list;
}

function abilitySide(ability) {
  switch (ability.kind) {
    case "buffSelf": case "healSelf": case "chakra": return "self";
    case "heal": case "buffAllies": case "revive": return "ally";
    default: return "enemy";
  }
}

function effAtk(u) { let v = u.atk; if (u.statuses.atkUp) v *= 1.3; if (u.statuses.cheer) v *= 1.2; return v; }
function effMag(u) { let v = u.mag; if (u.statuses.atkUp) v *= 1.3; if (u.statuses.cheer) v *= 1.2; return v; }
function effDef(u) { let v = u.def; if (u.statuses.defDown) v *= 0.75; if (u.statuses.brace) v *= 1.25; return v; }
function effRes(u) { let v = u.res; if (u.statuses.brace) v *= 1.25; return v; }
function effSpd(u) { let v = u.spd; if (u.statuses.haste) v *= 1.5; if (u.statuses.slow) v *= 0.5; return v; }

function applyStatus(unit, key) {
  unit.statuses[key] = { turns: STATUS_DEFS[key].turns };
}

function tileIn(list, x, y) { return list.some(([tx, ty]) => tx === x && ty === y); }

function getUnit(battle, uid) { return battle.units.find((u) => u.uid === uid); }

// KO'd units remain on the grid without blocking movement, so a living unit can end up sharing
// a tile with a corpse — prefer the living occupant so targeting/movement logic sees it.
function unitAt(battle, x, y) {
  return battle.units.find((u) => u.x === x && u.y === y && u.alive) || battle.units.find((u) => u.x === x && u.y === y);
}

function terrainEvasionAt(battle, x, y) { return battle.terrain[y][x] === "r" ? 10 : 0; }

// ---------------------------------------------------------------------------------------------
// Battle setup
// ---------------------------------------------------------------------------------------------

function startBattle(battleIndex) {
  const data = BATTLES[battleIndex];
  const terrain = data.terrain.map((row) => row.split(""));
  const units = [];

  state.campaign.recruits.forEach((rec, i) => {
    const recruitDef = RECRUITS.find((r) => r.id === rec.id);
    const job = JOBS[rec.job];
    const spawn = data.playerSpawns[i];
    units.push({
      uid: "p" + i, side: "player", recruitId: rec.id, name: recruitDef.name, jobId: rec.job, level: rec.level,
      hp: jobStat(rec.job, rec.level, "hp"), maxHp: jobStat(rec.job, rec.level, "hp"),
      mp: jobStat(rec.job, rec.level, "mp"), maxMp: jobStat(rec.job, rec.level, "mp"),
      atk: jobStat(rec.job, rec.level, "atk"), mag: jobStat(rec.job, rec.level, "mag"),
      def: jobStat(rec.job, rec.level, "def"), res: jobStat(rec.job, rec.level, "res"),
      spd: jobStat(rec.job, rec.level, "spd"), mov: job.mov,
      x: spawn[0], y: spawn[1], ct: Math.floor(Math.random() * 60), statuses: {}, alive: true,
      kills: 0, bonusJP: 0, weakTo: [], resist: [], skin: recruitDef.skin,
      movedThisTurn: false, actedThisTurn: false,
    });
  });

  data.enemies.forEach((spawn, i) => {
    const tmpl = ENEMY_TEMPLATES[spawn.template];
    const job = JOBS[tmpl.job];
    const level = data.level;
    const mult = tmpl.mult;
    units.push({
      uid: "e" + i, side: "enemy", name: spawn.name || tmpl.name, jobId: tmpl.job, level,
      hp: Math.round(jobStat(tmpl.job, level, "hp") * mult), maxHp: Math.round(jobStat(tmpl.job, level, "hp") * mult),
      mp: Math.round(jobStat(tmpl.job, level, "mp") * mult), maxMp: Math.round(jobStat(tmpl.job, level, "mp") * mult),
      atk: Math.round(jobStat(tmpl.job, level, "atk") * mult), mag: Math.round(jobStat(tmpl.job, level, "mag") * mult),
      def: Math.round(jobStat(tmpl.job, level, "def") * mult), res: Math.round(jobStat(tmpl.job, level, "res") * mult),
      spd: Math.round(jobStat(tmpl.job, level, "spd") * mult), mov: job.mov,
      x: spawn.pos[0], y: spawn.pos[1], ct: Math.floor(Math.random() * 60), statuses: {}, alive: true,
      kills: 0, bonusJP: 0, weakTo: tmpl.weakTo || [], resist: tmpl.resist || [],
      ai: tmpl.ai, extraAbility: tmpl.extraAbility,
      movedThisTurn: false, actedThisTurn: false,
    });
  });

  state.battle = {
    data, width: data.width, height: data.height, terrain, units,
    currentUnitId: null, phase: "idle", pendingAbility: null,
    moveTiles: [], targetTiles: [], cursor: null, floatNums: [], log: [`Battle begins: ${data.name}!`],
    tickCount: 0,
  };
  state.screen = "battle";
  render();
  beginBattleUnitTurn(state.battle);
}

// ---------------------------------------------------------------------------------------------
// Turn order (Charge Time)
// ---------------------------------------------------------------------------------------------

function advanceToNextActor(battle) {
  while (true) {
    let ready = battle.units.filter((u) => u.alive && u.ct >= 100);
    if (ready.length) {
      ready.sort((a, b) => b.ct - a.ct || effSpd(b) - effSpd(a) || (a.side === "player" ? -1 : 1) - (b.side === "player" ? -1 : 1));
      return ready[0];
    }
    battle.units.forEach((u) => { if (u.alive) u.ct += effSpd(u); });
    battle.tickCount++;
    if (battle.tickCount > 100000) return battle.units.find((u) => u.alive); // safety valve
  }
}

function previewQueue(battle, count) {
  const clones = battle.units.filter((u) => u.alive).map((u) => ({ uid: u.uid, name: u.name, side: u.side, ct: u.ct, spd: effSpd(u) }));
  const seq = [];
  let guard = 0;
  while (seq.length < count && guard < 5000) {
    guard++;
    let ready = clones.filter((c) => c.ct >= 100);
    if (!ready.length) { clones.forEach((c) => c.ct += c.spd); continue; }
    ready.sort((a, b) => b.ct - a.ct || b.spd - a.spd || (a.side === "player" ? -1 : 1) - (b.side === "player" ? -1 : 1));
    const next = ready[0];
    seq.push(next);
    next.ct -= 100;
  }
  return seq;
}

function checkBattleOutcome(battle) {
  const enemiesAlive = battle.units.some((u) => u.side === "enemy" && u.alive);
  const playersAlive = battle.units.some((u) => u.side === "player" && u.alive);
  if (!enemiesAlive) return "win";
  if (!playersAlive) return "lose";
  return null;
}

function beginBattleUnitTurn(battle) {
  const outcomeBefore = checkBattleOutcome(battle);
  if (outcomeBefore) { finishBattle(battle, outcomeBefore); return; }

  const unit = advanceToNextActor(battle);
  battle.currentUnitId = unit.uid;
  unit.movedThisTurn = false;
  unit.actedThisTurn = false;

  const hadPoison = !!unit.statuses.poison;
  const skip = !!(unit.statuses.stun || unit.statuses.stop);
  for (const key of Object.keys(unit.statuses)) {
    unit.statuses[key].turns -= 1;
    if (unit.statuses[key].turns <= 0) {
      delete unit.statuses[key];
      battle.log.push(`${unit.name}'s ${STATUS_DEFS[key].name} wore off.`);
    }
  }
  if (hadPoison && unit.alive) {
    const dmg = Math.max(1, Math.round(unit.maxHp * 0.1));
    unit.hp = Math.max(0, unit.hp - dmg);
    battle.log.push(`${unit.name} takes ${dmg} poison damage.`);
    addFloatNum(battle, unit, dmg, "dmg");
    if (unit.hp <= 0) { unit.alive = false; battle.log.push(`${unit.name} is KO'd!`); }
  }
  render();

  if (!unit.alive) { setTimeout(() => endUnitTurn(battle), 300); return; }
  if (skip) {
    battle.log.push(`${unit.name} is unable to act!`);
    render();
    setTimeout(() => endUnitTurn(battle), 500);
    return;
  }
  battle.log.push(`${unit.name}'s turn.`);
  ArcanumSound.play("turnStart");
  if (unit.side === "player") {
    battle.phase = "idle";
    render();
  } else {
    battle.phase = "enemyTurn";
    render();
    setTimeout(() => runEnemyTurn(battle, unit), 500);
  }
}

function endUnitTurn(battle) {
  const unit = getUnit(battle, battle.currentUnitId);
  if (unit) unit.ct -= 100;
  battle.currentUnitId = null;
  battle.phase = "idle";
  battle.moveTiles = []; battle.targetTiles = []; battle.pendingAbility = null; battle.cursor = null;
  const outcome = checkBattleOutcome(battle);
  if (outcome) { finishBattle(battle, outcome); return; }
  beginBattleUnitTurn(battle);
}

function endCurrentTurn() {
  const battle = state.battle;
  if (!battle || battle.phase === "enemyTurn") return;
  endUnitTurn(battle);
}

// ---------------------------------------------------------------------------------------------
// Movement
// ---------------------------------------------------------------------------------------------

function computeReachable(battle, unit) {
  const cost = Array.from({ length: battle.height }, () => Array(battle.width).fill(Infinity));
  cost[unit.y][unit.x] = 0;
  const frontier = [[unit.x, unit.y]];
  while (frontier.length) {
    const [x, y] = frontier.shift();
    const c = cost[y][x];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= battle.width || ny >= battle.height) continue;
      const t = battle.terrain[ny][nx];
      if (t === "w" || t === "#") continue;
      const occ = unitAt(battle, nx, ny);
      if (occ && occ.alive && occ.uid !== unit.uid) continue;
      const moveCost = t === "r" ? 2 : 1;
      const nc = c + moveCost;
      if (nc <= unit.mov && nc < cost[ny][nx]) { cost[ny][nx] = nc; frontier.push([nx, ny]); }
    }
  }
  const tiles = [];
  for (let y = 0; y < battle.height; y++) for (let x = 0; x < battle.width; x++) {
    if (cost[y][x] <= unit.mov && !(x === unit.x && y === unit.y)) tiles.push([x, y]);
  }
  return tiles;
}

function moveUnitTo(battle, unit, x, y) {
  unit.x = x; unit.y = y;
  ArcanumSound.play("move");
}

function beginMoveSelection() {
  const battle = state.battle;
  const unit = getUnit(battle, battle.currentUnitId);
  if (!unit || unit.side !== "player" || unit.movedThisTurn) return;
  battle.phase = "selectingMove";
  battle.moveTiles = computeReachable(battle, unit);
  battle.cursor = null;
  render();
}

// ---------------------------------------------------------------------------------------------
// Ability targeting
// ---------------------------------------------------------------------------------------------

function matchesSide(u, caster, side, ability) {
  if (side === "enemy") return u.side !== caster.side && u.alive;
  if (side === "ally") {
    if (ability.kind === "revive") return u.side === caster.side && !u.alive;
    return u.side === caster.side && u.alive;
  }
  return false;
}

function computeAbilityTargetTiles(battle, caster, ability) {
  const side = abilitySide(ability);
  if (side === "self") return [[caster.x, caster.y]];
  const tiles = [];
  for (let y = 0; y < battle.height; y++) for (let x = 0; x < battle.width; x++) {
    if (Math.max(Math.abs(x - caster.x), Math.abs(y - caster.y)) > ability.range) continue;
    if (battle.terrain[y][x] === "#") continue;
    if (ability.aoe > 0) { tiles.push([x, y]); continue; }
    const occ = unitAt(battle, x, y);
    if (occ && matchesSide(occ, caster, side, ability)) tiles.push([x, y]);
  }
  return tiles;
}

function unitsAffected(battle, caster, ability, tx, ty) {
  const side = abilitySide(ability);
  if (side === "self") return [caster];
  if (ability.aoe > 0) {
    return battle.units.filter((u) => Math.max(Math.abs(u.x - tx), Math.abs(u.y - ty)) <= ability.aoe && matchesSide(u, caster, side, ability));
  }
  const occ = unitAt(battle, tx, ty);
  return occ && matchesSide(occ, caster, side, ability) ? [occ] : [];
}

function beginAbilitySelection() {
  const battle = state.battle;
  const unit = getUnit(battle, battle.currentUnitId);
  if (!unit || unit.side !== "player" || unit.actedThisTurn) return;
  battle.phase = "choosingAbility";
  render();
}

function chooseAbility(abilityId) {
  const battle = state.battle;
  const unit = getUnit(battle, battle.currentUnitId);
  if (!unit) return;
  const ability = unitAbilities(unit).find((a) => a.id === abilityId);
  if (!ability || ability.mp > unit.mp || unit.actedThisTurn) return;
  if (abilitySide(ability) === "self") {
    resolveAbility(battle, unit, ability, unit.x, unit.y);
    battle.phase = "idle";
    const outcome = checkBattleOutcome(battle);
    if (outcome) { finishBattle(battle, outcome); return; }
    render();
  } else {
    const tiles = computeAbilityTargetTiles(battle, unit, ability);
    if (!tiles.length) return;
    battle.pendingAbility = ability;
    battle.phase = "selectingTarget";
    battle.targetTiles = tiles;
    battle.cursor = null;
    render();
  }
}

function cancelAction() {
  const battle = state.battle;
  if (!battle) return;
  battle.phase = "idle"; battle.moveTiles = []; battle.targetTiles = []; battle.pendingAbility = null; battle.cursor = null;
  render();
}

function handleTileClick(x, y) {
  const battle = state.battle;
  if (!battle) return;
  if (battle.phase === "selectingMove" && tileIn(battle.moveTiles, x, y)) {
    const unit = getUnit(battle, battle.currentUnitId);
    moveUnitTo(battle, unit, x, y);
    unit.movedThisTurn = true;
    battle.phase = "idle"; battle.moveTiles = []; battle.cursor = null;
    render();
  } else if (battle.phase === "selectingTarget" && tileIn(battle.targetTiles, x, y)) {
    const unit = getUnit(battle, battle.currentUnitId);
    const ability = battle.pendingAbility;
    resolveAbility(battle, unit, ability, x, y);
    battle.pendingAbility = null; battle.phase = "idle"; battle.targetTiles = []; battle.cursor = null;
    const outcome = checkBattleOutcome(battle);
    if (outcome) { finishBattle(battle, outcome); return; }
    render();
  }
}

// ---------------------------------------------------------------------------------------------
// Combat resolution
// ---------------------------------------------------------------------------------------------

function addFloatNum(battle, unit, text, cls) {
  const entry = { x: unit.x, y: unit.y, text, cls, id: floatIdSeq++, createdAt: Date.now() };
  battle.floatNums.push(entry);
  setTimeout(() => {
    battle.floatNums = battle.floatNums.filter((f) => f.id !== entry.id);
    if (state.screen === "battle" && state.battle === battle) render();
  }, 950);
}

function hitChance(attacker, target, battle) {
  const evasion = terrainEvasionAt(battle, target.x, target.y);
  const chance = 85 + (effSpd(attacker) - effSpd(target)) * 0.5 - evasion;
  return Math.max(15, Math.min(99, chance));
}
function rollHit(attacker, target, battle) { return Math.random() * 100 < hitChance(attacker, target, battle); }
function rollCrit() { return Math.random() < 0.10; }

function trySteal(battle, caster, target, standalone) {
  if (Math.random() < 0.5) {
    caster.bonusJP = (caster.bonusJP || 0) + 5;
    if (standalone) {
      const loss = Math.max(1, Math.round(target.maxHp * 0.1));
      const hpBefore = target.hp;
      target.hp = Math.max(0, target.hp - loss);
      addFloatNum(battle, target, loss, "dmg");
      if (hpBefore > 0 && target.hp <= 0) { target.alive = false; if (caster.side === "player") caster.kills += 1; battle.log.push(`${target.name} is KO'd!`); }
      battle.log.push(`${caster.name} steals from ${target.name}! (+5 JP)`);
    } else {
      battle.log.push(`${caster.name} pockets some JP! (+5 JP)`);
    }
  } else {
    battle.log.push(`${caster.name}'s theft attempt failed.`);
  }
}

function doDamage(battle, caster, ability, target) {
  const isPhysical = ability.element === "physical";
  if (!rollHit(caster, target, battle)) {
    addFloatNum(battle, target, "MISS", "miss");
    ArcanumSound.play("miss");
    battle.log.push(`${caster.name}'s ${ability.name} missed ${target.name}.`);
    return { hit: false, dmg: 0 };
  }
  let power = ability.power;
  if (ability.sneakBonus && caster.movedThisTurn) power *= (1 + ability.sneakBonus);
  let mult = 1;
  if (!isPhysical) {
    if (target.weakTo.includes(ability.element)) mult = 1.5;
    else if (target.resist.includes(ability.element)) mult = 0.5;
  } else if (target.resist.includes("physical")) {
    mult = 0.5;
  }
  const atkStat = isPhysical ? effAtk(caster) : effMag(caster);
  const defStat = isPhysical ? effDef(target) : effRes(target);
  let dmg = Math.max(1, atkStat * power - defStat * 0.5);
  const crit = rollCrit();
  if (crit) dmg *= 2;
  const variance = 0.9 + Math.random() * 0.2;
  dmg = Math.round(dmg * variance * mult);
  if (isPhysical && target.statuses.protect) dmg = Math.round(dmg * 0.7);
  if (!isPhysical && target.statuses.shell) dmg = Math.round(dmg * 0.7);
  dmg = Math.max(1, dmg);

  const hpBefore = target.hp;
  target.hp = Math.max(0, target.hp - dmg);
  addFloatNum(battle, target, dmg, crit ? "crit" : "dmg");
  const soundEl = ["fire", "ice", "lightning"].includes(ability.element) ? ability.element : "physical";
  ArcanumSound.play(crit ? "crit" : "hit" + capitalize(soundEl));
  battle.log.push(`${caster.name}'s ${ability.name} hits ${target.name} for ${dmg}${crit ? " (CRIT)" : ""}.`);

  if (hpBefore > 0 && target.hp <= 0) {
    target.alive = false;
    if (caster.side === "player") caster.kills += 1;
    battle.log.push(`${target.name} is KO'd!`);
    ArcanumSound.play("ko");
  }
  if (isPhysical && target.statuses.counter && target.alive) {
    delete target.statuses.counter;
    caster.hp = Math.max(0, caster.hp - dmg);
    addFloatNum(battle, caster, dmg, "dmg");
    battle.log.push(`${target.name} counters for ${dmg}!`);
    if (caster.hp <= 0) { caster.alive = false; battle.log.push(`${caster.name} is KO'd!`); }
  }
  if (ability.status && target.alive) {
    applyStatus(target, ability.status);
    battle.log.push(`${target.name} is afflicted with ${STATUS_DEFS[ability.status].name}.`);
  }
  if (ability.steal && target.alive) trySteal(battle, caster, target, false);
  return { hit: true, dmg };
}

function doHeal(battle, caster, ability, target) {
  const amount = Math.round(effMag(caster) * ability.power);
  const before = target.hp;
  target.hp = Math.min(target.maxHp, target.hp + amount);
  const healed = target.hp - before;
  addFloatNum(battle, target, healed, "heal");
  ArcanumSound.play("heal");
  battle.log.push(`${caster.name}'s ${ability.name} heals ${target.name} for ${healed}.`);
}

function doHealSelf(battle, caster, ability) {
  const amount = Math.round(caster.maxHp * ability.pct);
  const before = caster.hp;
  caster.hp = Math.min(caster.maxHp, caster.hp + amount);
  addFloatNum(battle, caster, caster.hp - before, "heal");
  ArcanumSound.play("heal");
  battle.log.push(`${caster.name} uses ${ability.name} and recovers ${caster.hp - before} HP.`);
}

function doChakra(battle, caster, ability) {
  const hpAmt = Math.round(caster.maxHp * ability.pct);
  const mpAmt = Math.round(caster.maxMp * ability.pct);
  caster.hp = Math.min(caster.maxHp, caster.hp + hpAmt);
  caster.mp = Math.min(caster.maxMp, caster.mp + mpAmt);
  addFloatNum(battle, caster, hpAmt, "heal");
  ArcanumSound.play("heal");
  battle.log.push(`${caster.name} uses Chakra, restoring HP and MP.`);
}

function doRevive(battle, caster, ability, target) {
  target.hp = Math.round(target.maxHp * ability.pct);
  target.alive = true;
  addFloatNum(battle, target, "REVIVE", "heal");
  ArcanumSound.play("revive");
  battle.log.push(`${caster.name} revives ${target.name}!`);
}

function doBuff(battle, caster, ability, target) {
  applyStatus(target, ability.status);
  if (ability.status2) applyStatus(target, ability.status2);
  ArcanumSound.play("buff");
  battle.log.push(`${target.name} gains ${STATUS_DEFS[ability.status].name}.`);
}

function doDebuff(battle, caster, ability, target) {
  applyStatus(target, ability.status);
  ArcanumSound.play("debuff");
  battle.log.push(`${target.name} is afflicted with ${STATUS_DEFS[ability.status].name}.`);
}

function retreatCaster(battle, caster, tx, ty) {
  const dx = Math.sign(caster.x - tx) || 0, dy = Math.sign(caster.y - ty) || 0;
  const candidates = [[caster.x + dx, caster.y + dy], [caster.x + dx, caster.y], [caster.x, caster.y + dy]];
  for (const [nx, ny] of candidates) {
    if (nx < 0 || ny < 0 || nx >= battle.width || ny >= battle.height) continue;
    const t = battle.terrain[ny][nx];
    if (t === "w" || t === "#") continue;
    if (unitAt(battle, nx, ny)) continue;
    caster.x = nx; caster.y = ny;
    return;
  }
}

function applyAbilityToTarget(battle, caster, ability, target) {
  switch (ability.kind) {
    case "damage": doDamage(battle, caster, ability, target); break;
    case "drain": {
      const res = doDamage(battle, caster, ability, target);
      if (res.hit) {
        const before = caster.hp;
        caster.hp = Math.min(caster.maxHp, caster.hp + res.dmg);
        addFloatNum(battle, caster, caster.hp - before, "heal");
      }
      break;
    }
    case "heal": doHeal(battle, caster, ability, target); break;
    case "healSelf": doHealSelf(battle, caster, ability); break;
    case "chakra": doChakra(battle, caster, ability); break;
    case "revive": doRevive(battle, caster, ability, target); break;
    case "buffSelf": case "buffAllies": doBuff(battle, caster, ability, target); break;
    case "debuffEnemies": doDebuff(battle, caster, ability, target); break;
    case "steal": trySteal(battle, caster, target, true); break;
  }
}

function resolveAbility(battle, caster, ability, tx, ty) {
  const targets = unitsAffected(battle, caster, ability, tx, ty);
  caster.mp = Math.max(0, caster.mp - ability.mp);
  targets.forEach((target) => applyAbilityToTarget(battle, caster, ability, target));
  if (ability.retreat && targets.length) retreatCaster(battle, caster, tx, ty);
  caster.actedThisTurn = true;
}

// ---------------------------------------------------------------------------------------------
// Enemy AI
// ---------------------------------------------------------------------------------------------

function planEnemyAction(battle, unit) {
  const abilities = unitAbilities(unit).filter((a) => a.mp <= unit.mp);
  const reachable = computeReachable(battle, unit).concat([[unit.x, unit.y]]);
  const opposing = battle.units.filter((u) => u.alive && u.side !== unit.side);
  const allies = battle.units.filter((u) => u.alive && u.side === unit.side);
  const koAllies = battle.units.filter((u) => !u.alive && u.side === unit.side);
  let best = null;
  function consider(moveTile, ability, target, score) {
    if (!best || score > best.score) best = { score, moveTile, ability, target };
  }

  if (unit.ai === "support") {
    const reviveAbility = abilities.find((a) => a.kind === "revive");
    if (reviveAbility && koAllies.length) {
      for (const [mx, my] of reachable) for (const ko of koAllies) {
        if (Math.max(Math.abs(mx - ko.x), Math.abs(my - ko.y)) <= reviveAbility.range) consider([mx, my], reviveAbility, [ko.x, ko.y], 1000);
      }
    }
    const healAbility = abilities.find((a) => a.kind === "heal");
    const hurt = allies.filter((a) => a.hp / a.maxHp < 0.5);
    if (healAbility && hurt.length) {
      for (const [mx, my] of reachable) for (const h of hurt) {
        if (Math.max(Math.abs(mx - h.x), Math.abs(my - h.y)) <= healAbility.range) consider([mx, my], healAbility, [h.x, h.y], 900 - (h.hp / h.maxHp) * 100);
      }
    }
    if (best) return finalizePlan(unit, best);
  }

  const dmgAbilities = abilities.filter((a) => a.kind === "damage" || a.kind === "drain");
  for (const [mx, my] of reachable) {
    for (const ability of dmgAbilities) {
      for (const enemy of opposing) {
        const dist = Math.max(Math.abs(mx - enemy.x), Math.abs(my - enemy.y));
        if (dist > ability.range) continue;
        let hitCount = 1;
        if (ability.aoe > 0) hitCount = opposing.filter((o) => Math.max(Math.abs(o.x - enemy.x), Math.abs(o.y - enemy.y)) <= ability.aoe).length;
        const casterBonus = (unit.ai === "caster" && hitCount > 1) ? 200 : 0;
        const score = ability.power * 10 * hitCount + casterBonus - dist * 0.1;
        consider([mx, my], ability, [enemy.x, enemy.y], score);
      }
    }
  }
  if (best) return finalizePlan(unit, best);

  let nearest = null, nd = Infinity;
  for (const e of opposing) { const d = Math.abs(unit.x - e.x) + Math.abs(unit.y - e.y); if (d < nd) { nd = d; nearest = e; } }
  if (!nearest) return { moveTo: null, ability: null, target: null };
  let moveTile = null, bestDist = Infinity;
  for (const [mx, my] of reachable) { const d = Math.abs(mx - nearest.x) + Math.abs(my - nearest.y); if (d < bestDist) { bestDist = d; moveTile = [mx, my]; } }
  const moveTo = moveTile && (moveTile[0] !== unit.x || moveTile[1] !== unit.y) ? moveTile : null;
  return { moveTo, ability: null, target: null };
}

function finalizePlan(unit, best) {
  const moveTo = (best.moveTile[0] === unit.x && best.moveTile[1] === unit.y) ? null : best.moveTile;
  return { moveTo, ability: best.ability, target: best.target };
}

function runEnemyTurn(battle, unit) {
  const plan = planEnemyAction(battle, unit);
  const afterMove = () => {
    if (plan.ability && plan.target) {
      resolveAbility(battle, unit, plan.ability, plan.target[0], plan.target[1]);
      render();
      const outcome = checkBattleOutcome(battle);
      if (outcome) { setTimeout(() => finishBattle(battle, outcome), 500); return; }
    }
    setTimeout(() => endUnitTurn(battle), 550);
  };
  if (plan.moveTo) {
    moveUnitTo(battle, unit, plan.moveTo[0], plan.moveTo[1]);
    unit.movedThisTurn = true;
    render();
    setTimeout(afterMove, 450);
  } else {
    afterMove();
  }
}

// ---------------------------------------------------------------------------------------------
// Battle results / progression
// ---------------------------------------------------------------------------------------------

function finishBattle(battle, outcome) {
  battle.phase = "gameover";
  const rewardLines = [];
  if (outcome === "win") {
    battle.units.filter((u) => u.side === "player").forEach((u) => {
      const rec = state.campaign.recruits.find((r) => r.id === u.recruitId);
      let jp = 0;
      if (u.alive) jp += 5;
      jp += (u.kills || 0) * 10;
      jp += (u.bonusJP || 0);
      rec.jp += jp;
      rewardLines.push(`${u.name}: +${jp} JP${u.kills ? ` (${u.kills} kill${u.kills > 1 ? "s" : ""})` : ""}${u.alive ? "" : " — fell in battle"}`);
    });
    state.campaign.battleIndex += 1;
    state.campaign.recruits.forEach((r) => { r.level = Math.min(9, r.level + 1); });
    saveGame();
    ArcanumSound.play("victory");
  } else {
    ArcanumSound.play("defeat");
  }
  state.lastResult = { outcome, battleName: battle.data.name, rewardLines };
  state.screen = "result";
  render();
}

function afterResultContinue() {
  const r = state.lastResult;
  state.battle = null;
  if (r.outcome === "win" && state.campaign.battleIndex >= BATTLES.length) state.screen = "campaignVictory";
  else state.screen = "barracks";
  render();
}

// ---------------------------------------------------------------------------------------------
// Barracks actions
// ---------------------------------------------------------------------------------------------

function changeRecruitJob(recruitId, jobId) {
  const rec = state.campaign.recruits.find((r) => r.id === recruitId);
  if (!rec || !rec.unlockedJobs.includes(jobId)) return;
  rec.job = jobId;
  saveGame();
  render();
}

function unlockJob(recruitId, jobId) {
  const rec = state.campaign.recruits.find((r) => r.id === recruitId);
  const job = JOBS[jobId];
  if (!rec || !job || rec.unlockedJobs.includes(jobId)) return;
  const prereqOk = job.prereq.every((p) => rec.unlockedJobs.includes(p));
  if (!prereqOk || rec.jp < job.cost) return;
  rec.jp -= job.cost;
  rec.unlockedJobs.push(jobId);
  saveGame();
  ArcanumSound.play("unlock");
  render();
}

function toggleMute() {
  ArcanumSound.setMuted(!ArcanumSound.isMuted());
  render();
}

// ---------------------------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------------------------

function muteBtnHtml() {
  return `<button data-action="mute-toggle" title="Toggle sound">${ArcanumSound.isMuted() ? "\u{1F507}" : "\u{1F50A}"}</button>`;
}

function renderTitleHTML() {
  const hasSave = !!loadSave();
  return `
    <div id="title-screen" class="panel">
      <div class="title">⚔️ Arcanum Tactics</div>
      <p class="subtitle">Five recruits. Nine jobs. One campaign.</p>
      ${hasSave ? `<button class="primary" data-action="continue">▶️ Continue</button>` : ""}
      <button data-action="new-campaign">${hasSave ? "🔁 New Campaign" : "⚔️ Begin Campaign"}</button>
      <p style="font-size:12px;color:var(--text-dim);margin-top:16px;">Move + Act on a Charge-Time grid. Spend JP earned in battle to unlock new jobs for your recruits.</p>
      <div style="margin-top:10px;">${muteBtnHtml()}</div>
    </div>
  `;
}

function statRow(jobId, level) {
  const s = (k) => jobStat(jobId, level, k);
  return `<div class="stat-row">
    <span>HP <b>${s("hp")}</b></span><span>MP <b>${s("mp")}</b></span><span>SPD <b>${s("spd")}</b></span>
    <span>ATK <b>${s("atk")}</b></span><span>MAG <b>${s("mag")}</b></span><span>MOV <b>${JOBS[jobId].mov}</b></span>
    <span>DEF <b>${s("def")}</b></span><span>RES <b>${s("res")}</b></span><span></span>
  </div>`;
}

function renderBarracksHTML() {
  const c = state.campaign;
  const track = BATTLES.map((b, i) => {
    const cls = i < c.battleIndex ? "won" : i === c.battleIndex ? "next" : "";
    const label = i < c.battleIndex ? `✅ ${b.name}` : i === c.battleIndex ? `⚔️ ${b.name}` : `🔒 ${b.name}`;
    return `<div class="campaign-node ${cls}">${label}</div>`;
  }).join("");

  const cards = c.recruits.map((rec) => {
    const def = RECRUITS.find((r) => r.id === rec.id);
    const svg = buildUnitSvg(rec.job, { team: "player", skin: def.skin });
    const jobOptions = rec.unlockedJobs.map((j) => `<option value="${j}" ${j === rec.job ? "selected" : ""}>${JOBS[j].name}</option>`).join("");
    const unlocks = JOB_ORDER.filter((j) => !rec.unlockedJobs.includes(j)).map((j) => {
      const job = JOBS[j];
      const prereqOk = job.prereq.every((p) => rec.unlockedJobs.includes(p));
      const affordable = rec.jp >= job.cost;
      const locked = !prereqOk || !affordable;
      const title = !prereqOk ? `Requires ${job.prereq.map((p) => JOBS[p].name).join(" + ")}` : `${job.cost} JP`;
      return `<span class="unlock-chip ${locked ? "locked" : ""}" title="${title}" ${locked ? "" : `data-action="unlock-job" data-recruit="${rec.id}" data-job="${j}"`}>${job.name} (${job.cost} JP)</span>`;
    }).join("");
    return `
      <div class="panel recruit-card">
        <div class="recruit-portrait">${svg}</div>
        <h3>${def.name}</h3>
        <div class="job-name">${JOBS[rec.job].name} · Lv.${rec.level}</div>
        <select class="job-select" data-recruit="${rec.id}">${jobOptions}</select>
        ${statRow(rec.job, rec.level)}
        <div class="jp-line">💠 ${rec.jp} JP</div>
        <div class="unlock-list">${unlocks || "<span style='font-size:11px;color:var(--text-dim);'>All jobs unlocked</span>"}</div>
      </div>
    `;
  }).join("");

  const nextBattle = c.battleIndex < BATTLES.length ? BATTLES[c.battleIndex] : null;

  return `
    <div id="barracks-screen">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <h2 style="color:var(--gold);">🏕️ Barracks</h2>
        ${muteBtnHtml()}
      </div>
      <div class="campaign-track">${track}</div>
      <div class="recruits-grid">${cards}</div>
      ${nextBattle ? `<button class="primary" id="deploy-btn" data-action="deploy">Deploy: ${nextBattle.name} ⚔️</button>` : ""}
    </div>
  `;
}

function terrainClass(code) { return { ".": "t-plain", "r": "t-rough", "w": "t-water", "#": "t-wall" }[code] || "t-plain"; }

function unitTokenHtml(battle, unit, isCurrent) {
  const svg = buildUnitSvg(unit.jobId, { team: unit.side, skin: unit.skin });
  const hpPct = Math.max(0, Math.round((unit.hp / unit.maxHp) * 100));
  const mpPct = unit.maxMp ? Math.max(0, Math.round((unit.mp / unit.maxMp) * 100)) : 0;
  const badges = Object.keys(unit.statuses).map((k) => `<svg viewBox="0 0 28 28" class="status-badge">${ICONS[STATUS_DEFS[k].icon] || ""}</svg>`).join("");
  return `
    <div class="unit-token team-${unit.side}${unit.alive ? "" : " ko"}${isCurrent ? " selected" : ""}">
      <div class="status-badges">${badges}</div>
      ${svg}
      <div class="mini-bars">
        <div class="bar"><div class="bar-fill hp" style="width:${hpPct}%"></div></div>
        ${unit.maxMp ? `<div class="bar"><div class="bar-fill mp" style="width:${mpPct}%"></div></div>` : ""}
      </div>
    </div>
  `;
}

function renderGridHTML(battle) {
  const maxW = Math.min((typeof window !== "undefined" ? window.innerWidth : 800) - 40, 720);
  const maxH = Math.min((typeof window !== "undefined" ? window.innerHeight : 800) * 0.55, 640);
  let ts = Math.floor(Math.min(maxW / battle.width, maxH / battle.height));
  ts = Math.max(28, Math.min(64, ts));

  let cells = "";
  for (let y = 0; y < battle.height; y++) {
    for (let x = 0; x < battle.width; x++) {
      const code = battle.terrain[y][x];
      const unit = unitAt(battle, x, y);
      const classes = ["tile", terrainClass(code)];
      if (battle.phase === "selectingMove" && tileIn(battle.moveTiles, x, y)) classes.push("reachable");
      if (battle.phase === "selectingTarget" && tileIn(battle.targetTiles, x, y)) {
        classes.push(abilitySide(battle.pendingAbility) === "enemy" ? "hostile-range" : "friendly-range");
      }
      if (battle.pendingAbility && battle.pendingAbility.aoe > 0 && battle.cursor && battle.cursor[0] === x && battle.cursor[1] === y) classes.push("aoe-preview");
      if (unit && unit.uid === battle.currentUnitId) classes.push("cur-actor");
      if (battle.cursor && battle.cursor[0] === x && battle.cursor[1] === y) classes.push("cursor-tile");
      const floats = battle.floatNums.filter((f) => f.x === x && f.y === y)
        .map((f) => `<div class="float-num ${f.cls}">${f.text}</div>`).join("");
      cells += `<div class="${classes.join(" ")}" style="width:${ts}px;height:${ts}px;" data-action="tile" data-x="${x}" data-y="${y}">
        ${unit ? unitTokenHtml(battle, unit, unit.uid === battle.currentUnitId) : ""}${floats}
      </div>`;
    }
  }
  return `<div id="battle-grid" style="grid-template-columns:repeat(${battle.width}, ${ts}px);grid-template-rows:repeat(${battle.height}, ${ts}px);">${cells}</div>`;
}

function renderTurnQueueHTML(battle) {
  const seq = previewQueue(battle, 6);
  return seq.map((s) => `<div class="tq-item tq-${s.side}"><span class="tq-dot"></span>${s.name}</div>`).join("");
}

function renderAbilityListHTML(unit) {
  return unitAbilities(unit).map((a) => {
    const affordable = a.mp <= unit.mp;
    return `<button class="ability-btn" ${affordable ? `data-action="ability" data-ability="${a.id}"` : "disabled"} title="${a.desc}">
      <svg viewBox="0 0 28 28" class="ic">${ICONS[a.icon] || ""}</svg>
      <span class="ab-text"><span class="ab-name">${a.name}</span><br><span class="ab-meta">${a.mp} MP · Rng ${a.range}${a.aoe ? ` · AoE ${a.aoe}` : ""}</span></span>
    </button>`;
  }).join("");
}

function renderSidePanelHTML(battle) {
  const unit = getUnit(battle, battle.currentUnitId);
  let controls = "";
  if (unit && unit.side === "player" && battle.phase !== "enemyTurn" && battle.phase !== "gameover") {
    if (battle.phase === "choosingAbility") {
      controls = `<div class="ability-list">${renderAbilityListHTML(unit)}</div><button data-action="cancel-btn">↩️ Back</button>`;
    } else if (battle.phase === "selectingMove" || battle.phase === "selectingTarget") {
      controls = `<p style="font-size:12px;color:var(--text-dim);">${battle.phase === "selectingMove" ? "Choose a tile to move to." : "Choose a target."}</p><button data-action="cancel-btn">↩️ Cancel</button>`;
    } else {
      controls = `
        <div class="action-buttons">
          <button data-action="move-btn" ${unit.movedThisTurn ? "disabled" : ""}>🏃 Move</button>
          <button data-action="act-btn" ${unit.actedThisTurn ? "disabled" : ""}>⚔️ Act</button>
          <button data-action="wait-btn">⏭️ End Turn</button>
        </div>`;
    }
  } else if (battle.phase === "enemyTurn") {
    controls = `<p style="font-size:12px;color:var(--text-dim);">Enemy turn…</p>`;
  }

  const unitInfo = unit ? `
    <div class="selected-unit-info">
      ${buildUnitSvg(unit.jobId, { team: unit.side, skin: unit.skin })}
      <div class="info-text">
        <h3>${unit.name}</h3>
        <div class="job-tag">${JOBS[unit.jobId].name} · Lv.${unit.level}</div>
        <div class="bar"><div class="bar-fill hp" style="width:${Math.round(unit.hp / unit.maxHp * 100)}%"></div></div>
        <div style="font-size:10px;color:var(--text-dim);margin:1px 0 3px;">${unit.hp}/${unit.maxHp} HP</div>
        ${unit.maxMp ? `<div class="bar"><div class="bar-fill mp" style="width:${Math.round(unit.mp / unit.maxMp * 100)}%"></div></div><div style="font-size:10px;color:var(--text-dim);margin-top:1px;">${unit.mp}/${unit.maxMp} MP</div>` : ""}
      </div>
    </div>` : "";

  return `
    <div class="side-panel">
      <div class="panel"><h3 style="font-size:13px;margin-top:0;">⏱️ Turn Order</h3><div class="turn-queue">${renderTurnQueueHTML(battle)}</div></div>
      <div class="panel">${unitInfo}<div style="margin-top:8px;">${controls}</div></div>
      <div class="panel battle-log">${battle.log.slice(-30).map((l) => `<div>${l}</div>`).join("")}</div>
    </div>
  `;
}

function renderBattleHTML(battle) {
  return `
    <div id="battle-screen">
      <div class="battle-top">
        <h2>⚔️ ${battle.data.name}</h2>
        ${muteBtnHtml()}
      </div>
      <div class="battle-layout">
        <div class="grid-wrap">${renderGridHTML(battle)}</div>
        ${renderSidePanelHTML(battle)}
      </div>
    </div>
  `;
}

function renderResultHTML(result) {
  const win = result.outcome === "win";
  return `
    <div id="result-screen">
      <div class="panel">
        <div class="result-title ${win ? "win" : "lose"}">${win ? "🏆 Victory!" : "💀 Defeat"}</div>
        <p>${win ? `${result.battleName} is won.` : `Your squad was overwhelmed at ${result.battleName}.`}</p>
        ${win ? `<div class="reward-list">${result.rewardLines.map((l) => `<div>${l}</div>`).join("")}</div>` : `<p style="color:var(--text-dim);font-size:13px;">No JP lost — regroup and try again.</p>`}
        <button class="primary" data-action="result-continue">${win ? "Return to Barracks ➡️" : "🔁 Retry"}</button>
      </div>
    </div>
  `;
}

function renderCampaignVictoryHTML() {
  const totalJp = state.campaign.recruits.reduce((s, r) => s + r.jp, 0);
  return `
    <div id="campaign-victory-screen">
      <div class="panel">
        <div class="result-title win">👑 The Dark Spire Falls!</div>
        <p>Your five recruits have broken the Dread Lord's hold and ended the campaign.</p>
        <p style="color:var(--gold);">Total JP earned across the campaign: ${totalJp}</p>
        <button class="primary" data-action="new-campaign">🔁 New Campaign</button>
      </div>
    </div>
  `;
}

function render() {
  const app = document.getElementById("app");
  if (state.screen === "title") app.innerHTML = renderTitleHTML();
  else if (state.screen === "barracks") app.innerHTML = renderBarracksHTML();
  else if (state.screen === "battle") app.innerHTML = renderBattleHTML(state.battle);
  else if (state.screen === "result") app.innerHTML = renderResultHTML(state.lastResult);
  else if (state.screen === "campaignVictory") app.innerHTML = renderCampaignVictoryHTML();
}

// ---------------------------------------------------------------------------------------------
// Input wiring
// ---------------------------------------------------------------------------------------------

function onAppClick(e) {
  const el = e.target.closest("[data-action]");
  if (!el) return;
  const action = el.dataset.action;
  switch (action) {
    case "continue": { const saved = loadSave(); state.campaign = saved || newCampaign(); state.screen = "barracks"; render(); break; }
    case "new-campaign": { state.campaign = newCampaign(); saveGame(); state.screen = "barracks"; render(); break; }
    case "deploy": ArcanumSound.play("menuConfirm"); startBattle(state.campaign.battleIndex); break;
    case "unlock-job": unlockJob(el.dataset.recruit, el.dataset.job); break;
    case "move-btn": ArcanumSound.play("select"); beginMoveSelection(); break;
    case "act-btn": ArcanumSound.play("select"); beginAbilitySelection(); break;
    case "wait-btn": endCurrentTurn(); break;
    case "cancel-btn": ArcanumSound.play("menuCancel"); cancelAction(); break;
    case "ability": chooseAbility(el.dataset.ability); break;
    case "tile": handleTileClick(+el.dataset.x, +el.dataset.y); break;
    case "result-continue": ArcanumSound.play("menuConfirm"); afterResultContinue(); break;
    case "mute-toggle": toggleMute(); break;
  }
}

function onAppChange(e) {
  if (e.target.classList.contains("job-select")) changeRecruitJob(e.target.dataset.recruit, e.target.value);
}

function onKeyDown(e) {
  if (state.screen !== "battle" || !state.battle) return;
  const battle = state.battle;
  if (battle.phase !== "selectingMove" && battle.phase !== "selectingTarget") return;
  const list = battle.phase === "selectingMove" ? battle.moveTiles : battle.targetTiles;
  if (!list.length) return;
  if (!battle.cursor) battle.cursor = [...list[0]];
  let [cx, cy] = battle.cursor;
  if (e.key === "ArrowLeft") cx--;
  else if (e.key === "ArrowRight") cx++;
  else if (e.key === "ArrowUp") cy--;
  else if (e.key === "ArrowDown") cy++;
  else if (e.key === "Enter") { if (tileIn(list, cx, cy)) handleTileClick(cx, cy); return; }
  else if (e.key === "Escape") { cancelAction(); return; }
  else return;
  cx = Math.max(0, Math.min(battle.width - 1, cx));
  cy = Math.max(0, Math.min(battle.height - 1, cy));
  battle.cursor = [cx, cy];
  render();
}

function init() {
  document.getElementById("global-svg-defs").innerHTML = SVG_DEFS + allJobGradients();
  document.getElementById("app").addEventListener("click", onAppClick);
  document.getElementById("app").addEventListener("change", onAppChange);
  document.addEventListener("keydown", onKeyDown);
  render();
}

init();
