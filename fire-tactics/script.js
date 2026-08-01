// Fire Tactics — engine + game logic. Loaded after game-data.js and sound.js.
//
// Interaction model follows the click-select/click-confirm pattern documented in the
// codex-tactics reference project (docs/game/design.md, docs/game/requirements.md):
// a first click on a reachable tile previews the move (ghost sprite + path line), a second
// click on that same tile confirms it; attack targets follow the same select-then-confirm
// pattern, except clicking a highlighted enemy while a move is still previewed resolves the
// move and the attack together in one click. See docs/requirements.md §4.4 for the full spec.
"use strict";

const TILE = 64;
const COLS = GameData.cols;
const ROWS = GameData.rows;
const TERRAIN = GameData.terrainTypes;
const MAP = GameData.map;

const state = {
  screen: "title", // "title" | "battle" | "result"
  units: [],
  phase: "player", // "player" | "enemy"
  turnCount: 1,
  selectedId: null,
  mode: null, // null | "acting" (a unit is mid-activation)
  reachable: null, // Map "x,y" -> move cost, from the unit's position at selection time
  prevMap: null, // Map "x,y" -> parent "x,y", for path reconstruction
  originPos: null, // {x,y} unit's position when selected, before any tentative move
  previewPos: null, // {x,y} tentative move destination, not yet confirmed
  moved: false, // whether this activation's move step has been resolved (moved or skip-moved)
  attackTargets: [], // [{x,y}] valid attack/heal targets from the current-or-previewed position
  pendingTarget: null, // {x,y} attack/heal target awaiting a confirming second click
  inspectId: null, // unit id shown read-only in the info panel (no activation)
  flashTile: null, // {x,y,color,until} brief tile flash on a resolved attack/heal
  unitAnim: {}, // unitId -> {type, start, until} transient per-sprite animation (lunge/hurt/dodge/cast/heal-glow)
  floatingTexts: [], // [{x,y,text,color,start,until}] damage/heal/miss numbers drifting up off a tile
  projectile: null, // {x1,y1,x2,y2,color,start,until} traveling dot for ranged attacks
  actionLocked: false, // true while an attack/heal animation sequence is resolving
  cursor: { x: 0, y: 0 },
  log: [],
  outcome: null, // "victory" | "defeat"
};

// ---------------------------------------------------------------------------
// Grid / stat helpers
// ---------------------------------------------------------------------------

function key(x, y) {
  return `${x},${y}`;
}

function inBounds(x, y) {
  return x >= 0 && x < COLS && y >= 0 && y < ROWS;
}

function terrainAt(x, y) {
  return TERRAIN[MAP[y][x]];
}

function unitAt(x, y) {
  return state.units.find((u) => u.hp > 0 && u.x === x && u.y === y);
}

function getSelected() {
  return state.units.find((u) => u.id === state.selectedId) || null;
}

function manhattan(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

// ---------------------------------------------------------------------------
// Animation system: transient per-sprite animations (unitAnim), floating combat text,
// a ranged-attack projectile, and a continuous redraw loop that runs only while any of
// those are active. Combat/heal resolution schedules these and sequences its own timing
// off setTimeout; this loop's only job is to keep the canvas repainting in between so the
// motion is visible (see drawBoard for how each animation type is actually rendered).
// ---------------------------------------------------------------------------

function setUnitAnim(unitId, type, duration, extra) {
  state.unitAnim[unitId] = { type, start: Date.now(), until: Date.now() + duration, ...extra };
  ensureAnimLoop();
}

function addFloatingText(x, y, text, color, duration = 700) {
  state.floatingTexts.push({ x, y, text, color, start: Date.now(), until: Date.now() + duration });
  ensureAnimLoop();
}

function setProjectile(x1, y1, x2, y2, color, duration) {
  state.projectile = { x1, y1, x2, y2, color, start: Date.now(), until: Date.now() + duration };
  ensureAnimLoop();
}

function pruneAnimations() {
  const t = Date.now();
  for (const id of Object.keys(state.unitAnim)) {
    if (t >= state.unitAnim[id].until) delete state.unitAnim[id];
  }
  state.floatingTexts = state.floatingTexts.filter((f) => t < f.until);
  if (state.projectile && t >= state.projectile.until) state.projectile = null;
  if (state.flashTile && t >= state.flashTile.until) state.flashTile = null;
}

function hasActiveAnimations() {
  return (
    Object.keys(state.unitAnim).length > 0 ||
    state.floatingTexts.length > 0 ||
    state.projectile != null ||
    state.flashTile != null
  );
}

let animLoopRunning = false;

function ensureAnimLoop() {
  if (animLoopRunning) return;
  animLoopRunning = true;
  const tick = () => {
    pruneAnimations();
    if (state.screen === "battle") drawBoard();
    if (hasActiveAnimations()) {
      requestAnimationFrame(tick);
    } else {
      animLoopRunning = false;
    }
  };
  requestAnimationFrame(tick);
}

// Dijkstra over terrain cost. Allies are passable (you can path through a teammate) but never
// a valid tile to end movement on; enemies block pathing entirely. Returns both the cost map
// and a parent-pointer map so a path can be reconstructed for the move-preview line.
function computeReachable(unit) {
  const dist = new Map();
  const prev = new Map();
  dist.set(key(unit.x, unit.y), 0);
  const queue = [[unit.x, unit.y, 0]];
  while (queue.length) {
    queue.sort((a, b) => a[2] - b[2]);
    const [x, y, cost] = queue.shift();
    if (dist.get(key(x, y)) < cost) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (!inBounds(nx, ny)) continue;
      const terrain = terrainAt(nx, ny);
      if (!terrain.passable) continue;
      const occ = unitAt(nx, ny);
      if (occ && occ.team !== unit.team) continue; // enemies block pathing
      const nCost = cost + terrain.moveCost;
      if (nCost > unit.mov) continue;
      const nk = key(nx, ny);
      if (!dist.has(nk) || dist.get(nk) > nCost) {
        dist.set(nk, nCost);
        prev.set(nk, key(x, y));
        queue.push([nx, ny, nCost]);
      }
    }
  }
  return { dist, prev };
}

// A reachable tile is only a legal place to *end* movement if nothing else occupies it.
function isValidEndTile(x, y, unit) {
  const occ = unitAt(x, y);
  return !occ || occ.id === unit.id;
}

function reconstructPath(prev, origin, destKey) {
  const path = [];
  let curKey = destKey;
  const originKey = key(origin.x, origin.y);
  let guard = 0;
  while (curKey && curKey !== originKey && guard < 200) {
    const [x, y] = curKey.split(",").map(Number);
    path.unshift({ x, y });
    curKey = prev.get(curKey);
    guard++;
  }
  path.unshift({ x: origin.x, y: origin.y });
  return path;
}

function computeTargetsFrom(unit, pos) {
  const targets = [];
  if (unit.heal != null) {
    for (const ally of state.units) {
      if (ally.team !== unit.team || ally.hp <= 0 || ally.id === unit.id) continue;
      if (ally.hp >= ally.hpMax) continue;
      const d = Math.abs(pos.x - ally.x) + Math.abs(pos.y - ally.y);
      if (d >= unit.rangeMin && d <= unit.rangeMax) targets.push({ x: ally.x, y: ally.y });
    }
  } else {
    for (const foe of state.units) {
      if (foe.team === unit.team || foe.hp <= 0) continue;
      const d = Math.abs(pos.x - foe.x) + Math.abs(pos.y - foe.y);
      if (d >= unit.rangeMin && d <= unit.rangeMax) targets.push({ x: foe.x, y: foe.y });
    }
  }
  return targets;
}

// ---------------------------------------------------------------------------
// Combat
// ---------------------------------------------------------------------------

function computeHitChance(attacker, defender) {
  const defTerrain = terrainAt(defender.x, defender.y);
  return clamp(70 + (attacker.spd - defender.spd) * 3 - defTerrain.avoid, 10, 100);
}

function computeDamage(attacker, defender) {
  const defTerrain = terrainAt(defender.x, defender.y);
  const effDef = defender.def + defTerrain.def;
  if (attacker.magic) return Math.max(1, attacker.atk - Math.floor(effDef / 2));
  return Math.max(1, attacker.atk - effDef);
}

function attackRoll(attacker, defender) {
  const hitPct = computeHitChance(attacker, defender);
  const hits = Math.random() * 100 < hitPct;
  let dmg = 0;
  let crit = false;
  if (hits) {
    dmg = computeDamage(attacker, defender);
    crit = Math.random() * 100 < attacker.crit;
    if (crit) dmg *= 2;
    defender.hp = Math.max(0, defender.hp - dmg);
  }
  return { hits, dmg, crit };
}

function triggerFlash(x, y, color, duration = 220) {
  state.flashTile = { x, y, color, until: Date.now() + duration };
  ensureAnimLoop();
}

const MELEE_NUDGE = 15; // px an attacker's sprite lunges toward an adjacent target
const WINDUP_MS = 170; // time from a strike starting to it landing (impact)
const RECOVER_MS = 170; // time from impact back to rest
const COUNTER_GAP_MS = 160; // pause between an attack landing and a counter beginning

// Plays one strike: the attacker lunges (melee) or fires a projectile (ranged) toward the
// defender, calls onImpact() at the moment it lands (apply damage/rolls here), then eases
// back to rest before calling onFinished(). Both directions of a counterattack reuse this.
function playStrike(attacker, defender, onImpact, onFinished) {
  const dist = manhattan(attacker, defender);
  if (dist <= 1) {
    const sx = Math.sign(defender.x - attacker.x);
    const sy = Math.sign(defender.y - attacker.y);
    setUnitAnim(attacker.id, "lunge", WINDUP_MS + RECOVER_MS, { dx: sx * MELEE_NUDGE, dy: sy * MELEE_NUDGE, windup: WINDUP_MS });
  } else {
    const color = attacker.magic ? "rgba(180,120,220,0.9)" : "rgba(240,198,116,0.9)";
    setProjectile(
      attacker.x * TILE + TILE / 2,
      attacker.y * TILE + TILE / 2,
      defender.x * TILE + TILE / 2,
      defender.y * TILE + TILE / 2,
      color,
      WINDUP_MS
    );
  }
  setTimeout(() => {
    onImpact();
  }, WINDUP_MS);
  setTimeout(() => {
    onFinished();
  }, WINDUP_MS + RECOVER_MS);
}

function resolveCombat(attacker, defender, onDone) {
  playStrike(
    attacker,
    defender,
    () => {
      const result = attackRoll(attacker, defender);
      if (result.hits) {
        Sound.hit();
        if (result.crit) Sound.crit();
        addLog(`${attacker.name} hits ${defender.name} for ${result.dmg}${result.crit ? " (crit!)" : ""}.`);
        triggerFlash(defender.x, defender.y, result.crit ? "rgba(240,198,116,0.65)" : "rgba(255,255,255,0.55)");
        addFloatingText(defender.x, defender.y, `-${result.dmg}`, result.crit ? "#f0c674" : "#e8f0ea");
        setUnitAnim(defender.id, "hurt", 260);
      } else {
        Sound.miss();
        addLog(`${attacker.name} misses ${defender.name}.`);
        addFloatingText(defender.x, defender.y, "MISS", "#9fc4ac");
        setUnitAnim(defender.id, "dodge", 260);
      }
      if (defender.hp <= 0) addLog(`${defender.name} is defeated!`);
    },
    () => {
      if (defender.hp <= 0) {
        onDone();
        return;
      }
      const d = manhattan(attacker, defender);
      if (defender.heal != null || d < defender.rangeMin || d > defender.rangeMax) {
        onDone();
        return;
      }
      setTimeout(() => {
        playStrike(
          defender,
          attacker,
          () => {
            const counter = attackRoll(defender, attacker);
            if (counter.hits) {
              Sound.hit();
              if (counter.crit) Sound.crit();
              addLog(`${defender.name} counters ${attacker.name} for ${counter.dmg}${counter.crit ? " (crit!)" : ""}.`);
              triggerFlash(attacker.x, attacker.y, counter.crit ? "rgba(240,198,116,0.65)" : "rgba(255,255,255,0.55)");
              addFloatingText(attacker.x, attacker.y, `-${counter.dmg}`, counter.crit ? "#f0c674" : "#e8f0ea");
              setUnitAnim(attacker.id, "hurt", 260);
            } else {
              Sound.miss();
              addLog(`${defender.name}'s counter misses.`);
              addFloatingText(attacker.x, attacker.y, "MISS", "#9fc4ac");
              setUnitAnim(attacker.id, "dodge", 260);
            }
            if (attacker.hp <= 0) addLog(`${attacker.name} is defeated!`);
          },
          onDone
        );
      }, COUNTER_GAP_MS);
    }
  );
}

function resolveHeal(healer, ally, onDone) {
  setUnitAnim(healer.id, "cast", 300);
  setTimeout(() => {
    const amount = Math.min(healer.heal, ally.hpMax - ally.hp);
    ally.hp += amount;
    Sound.heal();
    addLog(`${healer.name} heals ${ally.name} for ${amount}.`);
    triggerFlash(ally.x, ally.y, "rgba(126,201,143,0.6)");
    addFloatingText(ally.x, ally.y, `+${amount}`, "#7ec98f");
    setUnitAnim(ally.id, "heal-glow", 450);
  }, 220);
  setTimeout(onDone, 480);
}

function applyAction(sel, targetUnit) {
  state.actionLocked = true;
  render();
  const onDone = () => finishUnitTurn(sel);
  if (sel.heal != null) resolveHeal(sel, targetUnit, onDone);
  else resolveCombat(sel, targetUnit, onDone);
}

// ---------------------------------------------------------------------------
// Turn flow
// ---------------------------------------------------------------------------

function addLog(msg) {
  state.log.push(msg);
  if (state.log.length > 40) state.log.shift();
}

function selectUnit(unit) {
  state.selectedId = unit.id;
  state.mode = "acting";
  state.originPos = { x: unit.x, y: unit.y };
  const { dist, prev } = computeReachable(unit);
  state.reachable = dist;
  state.prevMap = prev;
  state.previewPos = null;
  state.moved = false;
  state.pendingTarget = null;
  state.attackTargets = computeTargetsFrom(unit, state.originPos);
  state.inspectId = null;
  Sound.select();
  render();
}

function deselect() {
  state.selectedId = null;
  state.mode = null;
  state.reachable = null;
  state.prevMap = null;
  state.originPos = null;
  state.previewPos = null;
  state.moved = false;
  state.attackTargets = [];
  state.pendingTarget = null;
}

function finishUnitTurn(unit) {
  state.actionLocked = false;
  unit.acted = true;
  deselect();
  render();
  checkVictoryDefeat();
  if (state.screen === "result") return;
  const remaining = state.units.filter((u) => u.team === "player" && u.hp > 0 && !u.acted);
  if (remaining.length === 0) setTimeout(startEnemyPhase, 500);
}

function onBoardClick(x, y) {
  if (state.screen !== "battle" || state.phase !== "player" || state.actionLocked) return;
  const clicked = unitAt(x, y);

  // Nothing is mid-activation: select an available unit, inspect anything else read-only,
  // or clear a previous inspection by clicking empty ground.
  if (state.mode === null) {
    if (clicked && clicked.team === "player" && clicked.hp > 0 && !clicked.acted) {
      selectUnit(clicked);
    } else {
      state.inspectId = clicked ? clicked.id : null;
      render();
    }
    return;
  }

  const sel = getSelected();
  if (!sel) return;
  const k = key(x, y);
  const targetHit = state.attackTargets.find((t) => t.x === x && t.y === y);

  if (targetHit) {
    const targetUnit = unitAt(x, y);
    if (state.previewPos) {
      // Combo: a target click while a move is still previewed confirms the move AND the
      // attack/heal together in this one click.
      sel.x = state.previewPos.x;
      sel.y = state.previewPos.y;
      state.previewPos = null;
      state.moved = true;
      Sound.move();
      applyAction(sel, targetUnit);
      return;
    }
    if (state.pendingTarget && state.pendingTarget.x === x && state.pendingTarget.y === y) {
      // Second click on the same target: confirm.
      applyAction(sel, targetUnit);
      return;
    }
    // First click on a target with no move previewed: skip-move (stay put) and await the
    // confirming second click.
    state.moved = true;
    state.previewPos = null;
    state.pendingTarget = { x, y };
    render();
    return;
  }

  if (!state.moved && state.reachable.has(k) && isValidEndTile(x, y, sel)) {
    if (state.previewPos && state.previewPos.x === x && state.previewPos.y === y) {
      // Second click on the same previewed tile: confirm the move.
      sel.x = x;
      sel.y = y;
      state.moved = true;
      state.previewPos = null;
      Sound.move();
      state.attackTargets = computeTargetsFrom(sel, { x, y });
      render();
      return;
    }
    // First click (or a different reachable tile): (re)preview this destination.
    state.previewPos = { x, y };
    state.pendingTarget = null;
    state.attackTargets = computeTargetsFrom(sel, { x, y });
    render();
    return;
  }

  if (!state.previewPos && !state.pendingTarget && !state.moved) {
    // Still in the initial choosing state (nothing committed yet) — a stray click here is
    // treated as switching selection or deselecting, same as the top-level click handling.
    deselect();
    if (clicked && clicked.team === "player" && clicked.hp > 0 && !clicked.acted) {
      selectUnit(clicked);
    } else {
      state.inspectId = clicked ? clicked.id : null;
      render();
    }
    return;
  }
  // Once a move or target is mid-confirmation, invalid clicks are ignored rather than
  // discarding the in-progress choice.
}

function waitSelected() {
  if (state.actionLocked) return;
  const sel = getSelected();
  if (!sel) return;
  finishUnitTurn(sel);
}

function endTurnClicked() {
  if (state.phase !== "player" || state.screen !== "battle" || state.actionLocked) return;
  deselect();
  startEnemyPhase();
}

function startPlayerPhase() {
  state.phase = "player";
  state.units.forEach((u) => {
    if (u.team === "player") u.acted = false;
  });
  addLog(`— Turn ${state.turnCount}: Player Phase —`);
  render();
}

function startEnemyPhase() {
  deselect();
  state.phase = "enemy";
  addLog(`— Turn ${state.turnCount}: Enemy Phase —`);
  render();
  const enemyUnits = state.units.filter((u) => u.team === "enemy" && u.hp > 0);
  runEnemyUnit(0, enemyUnits);
}

function runEnemyUnit(i, list) {
  if (state.screen === "result") return;
  if (i >= list.length) {
    endEnemyPhase();
    return;
  }
  const unit = list[i];
  if (unit.hp <= 0) {
    runEnemyUnit(i + 1, list);
    return;
  }
  performEnemyAction(unit, () => {
    checkVictoryDefeat();
    if (state.screen === "result") return;
    setTimeout(() => runEnemyUnit(i + 1, list), 350);
  });
}

// Picks a target/destination, then animates the unit stepping along the path tile-by-tile
// before resolving combat, so enemy movement reads as motion rather than a teleport.
function performEnemyAction(unit, onDone) {
  const { dist: reachable, prev } = computeReachable(unit);
  const players = state.units.filter((u) => u.team === "player" && u.hp > 0);

  let best = null; // { x, y, cost, target, score }
  for (const [k, cost] of reachable.entries()) {
    const [x, y] = k.split(",").map(Number);
    if (!isValidEndTile(x, y, unit)) continue;
    for (const p of players) {
      const d = Math.abs(p.x - x) + Math.abs(p.y - y);
      if (d < unit.rangeMin || d > unit.rangeMax) continue;
      const hitPct = computeHitChance(unit, p);
      const dmg = computeDamage(unit, p);
      const score = (hitPct / 100) * dmg;
      if (!best || score > best.score || (score === best.score && cost < best.cost)) {
        best = { x, y, cost, target: p, score };
      }
    }
  }

  let destX = unit.x;
  let destY = unit.y;
  let willAttack = null;
  if (best) {
    destX = best.x;
    destY = best.y;
    willAttack = best.target;
  } else if (players.length > 0) {
    let closest = players[0];
    let bestDist = Infinity;
    for (const p of players) {
      const d = Math.abs(p.x - unit.x) + Math.abs(p.y - unit.y);
      if (d < bestDist) {
        bestDist = d;
        closest = p;
      }
    }
    let bestTile = null;
    let bestD = Infinity;
    for (const k of reachable.keys()) {
      const [x, y] = k.split(",").map(Number);
      if (!isValidEndTile(x, y, unit)) continue;
      const d = Math.abs(closest.x - x) + Math.abs(closest.y - y);
      if (d < bestD) {
        bestD = d;
        bestTile = { x, y };
      }
    }
    if (bestTile) {
      destX = bestTile.x;
      destY = bestTile.y;
    }
  }

  const path = reconstructPath(prev, { x: unit.x, y: unit.y }, key(destX, destY));
  animateAlongPath(unit, path, 0, () => {
    if (willAttack) {
      resolveCombat(unit, willAttack, () => {
        unit.acted = true;
        render();
        onDone();
      });
    } else {
      addLog(`${unit.name} moves closer.`);
      unit.acted = true;
      render();
      onDone();
    }
  });
}

function animateAlongPath(unit, path, i, done) {
  if (path.length <= 1 || i >= path.length) {
    done();
    return;
  }
  unit.x = path[i].x;
  unit.y = path[i].y;
  render();
  if (i === path.length - 1) {
    done();
    return;
  }
  setTimeout(() => animateAlongPath(unit, path, i + 1, done), 140);
}

function endEnemyPhase() {
  if (state.screen === "result") return;
  state.turnCount++;
  startPlayerPhase();
}

function checkVictoryDefeat() {
  const playersAlive = state.units.some((u) => u.team === "player" && u.hp > 0);
  const enemiesAlive = state.units.some((u) => u.team === "enemy" && u.hp > 0);
  if (!enemiesAlive) {
    state.outcome = "victory";
    state.screen = "result";
    Sound.victory();
    render();
  } else if (!playersAlive) {
    state.outcome = "defeat";
    state.screen = "result";
    Sound.defeat();
    render();
  }
}

// ---------------------------------------------------------------------------
// Setup / reset
// ---------------------------------------------------------------------------

function resetBattle() {
  state.units = GameData.battle.units.map((u) => ({ ...u, acted: false }));
  state.phase = "player";
  state.turnCount = 1;
  state.outcome = null;
  state.log = [];
  state.inspectId = null;
  state.flashTile = null;
  state.unitAnim = {};
  state.floatingTexts = [];
  state.projectile = null;
  state.actionLocked = false;
  deselect();
  state.cursor = { x: 0, y: 0 };
}

// ---------------------------------------------------------------------------
// Image loading
// ---------------------------------------------------------------------------

const images = {};

function loadImages(cb) {
  const paths = {};
  Object.values(TERRAIN).forEach((t) => {
    paths[t.icon] = `assets/terrain/${t.icon}.png`;
  });
  GameData.battle.units.forEach((u) => {
    paths[u.icon] = `assets/units/${u.icon}.png`;
  });
  const keys = Object.keys(paths);
  let remaining = keys.length;
  keys.forEach((k) => {
    const img = new Image();
    img.onload = img.onerror = () => {
      remaining--;
      if (remaining <= 0) cb();
    };
    img.src = paths[k];
    images[k] = img;
  });
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

let canvas, ctx;

// Translates a unit's active animation (if any) into a per-frame sprite offset/glow, based on
// elapsed time since it was scheduled. See setUnitAnim call sites for what schedules each type.
function getUnitAnimOffset(u) {
  const anim = state.unitAnim[u.id];
  if (!anim) return { dx: 0, dy: 0, glow: null };
  const t = Date.now() - anim.start;
  const total = anim.until - anim.start;
  const progress = clamp(t / total, 0, 1);
  if (anim.type === "lunge") {
    const windup = anim.windup || total / 2;
    const p = clamp(t <= windup ? t / windup : 1 - (t - windup) / Math.max(1, total - windup), 0, 1);
    return { dx: anim.dx * p, dy: anim.dy * p, glow: null };
  }
  if (anim.type === "hurt") {
    const shake = Math.sin(t / 22) * 5 * (1 - progress);
    return { dx: shake, dy: 0, glow: null };
  }
  if (anim.type === "dodge") {
    return { dx: 0, dy: -Math.sin(progress * Math.PI) * 10, glow: null };
  }
  if (anim.type === "cast") {
    return { dx: 0, dy: -Math.sin(progress * Math.PI) * 6, glow: "rgba(150,220,240,0.35)" };
  }
  if (anim.type === "heal-glow") {
    return { dx: 0, dy: 0, glow: "rgba(126,201,143,0.4)" };
  }
  return { dx: 0, dy: 0, glow: null };
}

function drawBoard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const t = terrainAt(x, y);
      const img = images[t.icon];
      if (img && img.complete) ctx.drawImage(img, x * TILE, y * TILE, TILE, TILE);
    }
  }

  const sel = getSelected();

  // Movement (blue) and attack/heal (red/green) highlights render together while the move
  // step hasn't been resolved yet; attack tiles are drawn after (and so visually override)
  // movement tiles on any overlap. Once movement is resolved, only attack tiles remain.
  if (sel && !state.moved && state.reachable) {
    ctx.fillStyle = "rgba(90,156,224,0.38)";
    for (const k of state.reachable.keys()) {
      const [x, y] = k.split(",").map(Number);
      if (!isValidEndTile(x, y, sel)) continue;
      ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
    }
  }
  if (sel && state.attackTargets.length) {
    ctx.fillStyle = sel.heal != null ? "rgba(126,201,143,0.5)" : "rgba(224,85,94,0.5)";
    for (const t of state.attackTargets) {
      ctx.fillRect(t.x * TILE, t.y * TILE, TILE, TILE);
    }
  }

  // Move-preview path line from the unit's original tile to the previewed destination.
  if (sel && state.previewPos) {
    const path = reconstructPath(state.prevMap, state.originPos, key(state.previewPos.x, state.previewPos.y));
    if (path.length > 1) {
      ctx.strokeStyle = "#f0c674";
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      path.forEach((p, i) => {
        const cx = p.x * TILE + TILE / 2;
        const cy = p.y * TILE + TILE / 2;
        if (i === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  for (const u of state.units) {
    if (u.hp <= 0) continue;
    const anim = getUnitAnimOffset(u);
    if (anim.glow) {
      ctx.fillStyle = anim.glow;
      ctx.beginPath();
      ctx.arc(u.x * TILE + TILE / 2, u.y * TILE + TILE / 2, TILE * 0.42, 0, Math.PI * 2);
      ctx.fill();
    }
    const img = images[u.icon];
    if (img && img.complete) {
      ctx.drawImage(img, u.x * TILE + anim.dx + 4, u.y * TILE + anim.dy + 4, TILE - 8, TILE - 8);
    }
    if (u.acted) {
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(u.x * TILE, u.y * TILE, TILE, TILE);
    }
    const pct = u.hp / u.hpMax;
    const barW = TILE - 12;
    ctx.fillStyle = "#1a1e1c";
    ctx.fillRect(u.x * TILE + 6, u.y * TILE + TILE - 10, barW, 6);
    ctx.fillStyle = pct > 0.5 ? "#7ec98f" : pct > 0.25 ? "#f0c674" : "#e0555e";
    ctx.fillRect(u.x * TILE + 6, u.y * TILE + TILE - 10, barW * pct, 6);
  }

  // Ghost sprite of the selected unit at its previewed (unconfirmed) destination.
  if (sel && state.previewPos) {
    const img = images[sel.icon];
    if (img && img.complete) {
      ctx.globalAlpha = 0.55;
      ctx.drawImage(img, state.previewPos.x * TILE + 4, state.previewPos.y * TILE + 4, TILE - 8, TILE - 8);
      ctx.globalAlpha = 1;
    }
  }

  if (state.flashTile && Date.now() < state.flashTile.until) {
    ctx.fillStyle = state.flashTile.color;
    ctx.fillRect(state.flashTile.x * TILE, state.flashTile.y * TILE, TILE, TILE);
  }

  if (sel) {
    ctx.strokeStyle = "#f0c674";
    ctx.lineWidth = 3;
    ctx.strokeRect(sel.x * TILE + 2, sel.y * TILE + 2, TILE - 4, TILE - 4);
  }

  // Pending attack/heal target awaiting its confirming second click.
  if (state.pendingTarget) {
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.strokeRect(state.pendingTarget.x * TILE + 3, state.pendingTarget.y * TILE + 3, TILE - 6, TILE - 6);
  }

  // Ranged-attack projectile, traveling from attacker to defender across the windup.
  if (state.projectile) {
    const p = state.projectile;
    const t = clamp((Date.now() - p.start) / Math.max(1, p.until - p.start), 0, 1);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x1 + (p.x2 - p.x1) * t, p.y1 + (p.y2 - p.y1) * t, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Floating damage/heal/miss text drifting up and fading over a resolved action's tile.
  if (state.floatingTexts.length) {
    ctx.textAlign = "center";
    ctx.font = "bold 15px 'Trebuchet MS', sans-serif";
    for (const f of state.floatingTexts) {
      const t = clamp((Date.now() - f.start) / Math.max(1, f.until - f.start), 0, 1);
      ctx.globalAlpha = 1 - t;
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x * TILE + TILE / 2, f.y * TILE + TILE / 2 - 18 * t);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = "left";
  }

  // Read-only inspection highlight (no active selection).
  if (!sel && state.inspectId) {
    const u = state.units.find((x) => x.id === state.inspectId && x.hp > 0);
    if (u) {
      ctx.strokeStyle = "#9fc4ac";
      ctx.lineWidth = 2;
      ctx.strokeRect(u.x * TILE + 2, u.y * TILE + 2, TILE - 4, TILE - 4);
    }
  }

  if (state.screen === "battle" && state.phase === "player") {
    ctx.strokeStyle = "#e8f0ea";
    ctx.lineWidth = 2;
    ctx.strokeRect(state.cursor.x * TILE + 1, state.cursor.y * TILE + 1, TILE - 2, TILE - 2);
  }
}

function unitStatsHtml(u) {
  const kind = u.heal != null ? "Heal" : u.magic ? "Magic" : "Physical";
  return `
    <strong>${u.name}</strong> — HP ${u.hp}/${u.hpMax}
    <span class="stat-row">ATK ${u.atk} · DEF ${u.def} · SPD ${u.spd} · MOV ${u.mov} · ${kind}${u.heal != null ? "" : ` · Rng ${u.rangeMin}-${u.rangeMax} · Crit ${u.crit}%`}</span>
  `;
}

function renderHud() {
  document.getElementById("phase-label").textContent =
    state.phase === "player" ? "🧭 Player Phase" : "👹 Enemy Phase";
  document.getElementById("turn-label").textContent = `Turn ${state.turnCount}`;

  const infoEl = document.getElementById("unit-info");
  const sel = getSelected();
  if (sel) {
    let hint;
    if (state.actionLocked) hint = "Resolving…";
    else if (state.pendingTarget) hint = "Click the target again to confirm, or Wait.";
    else if (state.previewPos) hint = "Click again to move, or click a target to move + act.";
    else if (state.moved) hint = "Choose a target, or Wait.";
    else hint = "Move to a tile, or click a red target to act in place.";
    infoEl.innerHTML = `${unitStatsHtml(sel)}<span class="hint">${hint}</span>`;
  } else if (state.inspectId) {
    const u = state.units.find((x) => x.id === state.inspectId && x.hp > 0);
    if (u) {
      const note = u.team === "player" ? "(already acted this turn)" : "(enemy)";
      infoEl.innerHTML = `${unitStatsHtml(u)}<span class="hint">${note} — inspecting only.</span>`;
    } else {
      infoEl.innerHTML = `<span class="hint">Select one of your units to move and act.</span>`;
    }
  } else if (state.phase === "player") {
    infoEl.innerHTML = `<span class="hint">Select one of your units to move and act. Click any unit to inspect it.</span>`;
  } else {
    infoEl.innerHTML = `<span class="hint">Enemy units are acting…</span>`;
  }

  const strip = document.getElementById("squad-strip");
  strip.innerHTML = "";
  state.units
    .filter((u) => u.team === "player")
    .forEach((u) => {
      const card = document.createElement("div");
      card.className = "portrait" + (u.hp <= 0 ? " dead" : u.acted ? " acted" : "") + (u.id === state.selectedId ? " active" : "");
      const pct = Math.max(0, u.hp / u.hpMax) * 100;
      card.innerHTML = `
        <img src="assets/units/${u.icon}.png" alt="${u.name}">
        <div class="pname">${u.name}</div>
        <div class="pbar"><div class="pbar-fill" style="width:${pct}%"></div></div>
      `;
      strip.appendChild(card);
    });

  const logEl = document.getElementById("battle-log");
  logEl.innerHTML = state.log.slice(-5).map((l) => `<div>${l}</div>`).join("");
  logEl.scrollTop = logEl.scrollHeight;

  document.getElementById("wait-btn").disabled = state.actionLocked || !(state.phase === "player" && state.selectedId);
  document.getElementById("end-turn-btn").disabled = state.actionLocked || state.phase !== "player";
}

function renderResult() {
  const alive = state.units.filter((u) => u.team === "player" && u.hp > 0).length;
  const el = document.getElementById("result-screen");
  const win = state.outcome === "victory";
  el.querySelector("#result-banner").textContent = win ? "🏆 Victory!" : "💀 Defeat";
  el.querySelector("#result-banner").className = win ? "win" : "lose";
  el.querySelector("#result-recap").textContent = win
    ? `The enemy squad is routed after ${state.turnCount} turn(s) — ${alive}/4 of your units still standing.`
    : `Your squad was wiped out on turn ${state.turnCount}.`;
}

function render() {
  document.getElementById("title-screen").classList.toggle("hidden", state.screen !== "title");
  document.getElementById("battle-screen").classList.toggle("hidden", state.screen !== "battle");
  document.getElementById("result-screen").classList.toggle("hidden", state.screen !== "result");

  if (state.screen === "battle") {
    drawBoard();
    renderHud();
  } else if (state.screen === "result") {
    renderResult();
  }
}

// ---------------------------------------------------------------------------
// Input wiring
// ---------------------------------------------------------------------------

function canvasToTile(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const px = (clientX - rect.left) * scaleX;
  const py = (clientY - rect.top) * scaleY;
  return { x: Math.floor(px / TILE), y: Math.floor(py / TILE) };
}

function handleKey(e) {
  if (state.screen !== "battle" || state.phase !== "player" || state.actionLocked) return;
  const c = state.cursor;
  switch (e.key) {
    case "ArrowUp":
      c.y = Math.max(0, c.y - 1);
      render();
      break;
    case "ArrowDown":
      c.y = Math.min(ROWS - 1, c.y + 1);
      render();
      break;
    case "ArrowLeft":
      c.x = Math.max(0, c.x - 1);
      render();
      break;
    case "ArrowRight":
      c.x = Math.min(COLS - 1, c.x + 1);
      render();
      break;
    case "Enter":
    case " ":
      e.preventDefault();
      onBoardClick(c.x, c.y);
      break;
    case "Escape":
      deselect();
      state.inspectId = null;
      render();
      break;
    default:
      break;
  }
}

function init() {
  canvas = document.getElementById("board");
  ctx = canvas.getContext("2d");

  canvas.addEventListener("click", (e) => {
    const { x, y } = canvasToTile(e.clientX, e.clientY);
    if (inBounds(x, y)) onBoardClick(x, y);
  });

  document.getElementById("begin-btn").addEventListener("click", () => {
    resetBattle();
    state.screen = "battle";
    startPlayerPhase();
  });

  document.getElementById("wait-btn").addEventListener("click", waitSelected);
  document.getElementById("end-turn-btn").addEventListener("click", endTurnClicked);
  document.getElementById("play-again-btn").addEventListener("click", () => {
    state.screen = "title";
    render();
  });

  document.getElementById("mute-btn").addEventListener("click", (e) => {
    const muted = e.target.dataset.muted === "true";
    Sound.setMuted(!muted);
    e.target.dataset.muted = (!muted).toString();
    e.target.textContent = !muted ? "🔇" : "🔊";
  });

  window.addEventListener("keydown", handleKey);

  loadImages(() => render());
  render();
}

init();
