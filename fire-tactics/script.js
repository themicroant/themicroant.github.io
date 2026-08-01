// Fire Tactics — engine + game logic. Loaded after game-data.js and sound.js.
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
  mode: null, // null | "move" | "target"
  reachable: null, // Map "x,y" -> move cost
  targets: [], // [{x,y}]
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

function computeReachable(unit) {
  const dist = new Map();
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
      if (occ && occ.id !== unit.id) continue;
      const nCost = cost + terrain.moveCost;
      if (nCost > unit.mov) continue;
      const nk = key(nx, ny);
      if (!dist.has(nk) || dist.get(nk) > nCost) {
        dist.set(nk, nCost);
        queue.push([nx, ny, nCost]);
      }
    }
  }
  return dist;
}

function computeTargets(unit) {
  const targets = [];
  if (unit.heal != null) {
    for (const ally of state.units) {
      if (ally.team !== unit.team || ally.hp <= 0 || ally.id === unit.id) continue;
      if (ally.hp >= ally.hpMax) continue;
      const d = manhattan(unit, ally);
      if (d >= unit.rangeMin && d <= unit.rangeMax) targets.push({ x: ally.x, y: ally.y });
    }
  } else {
    for (const foe of state.units) {
      if (foe.team === unit.team || foe.hp <= 0) continue;
      const d = manhattan(unit, foe);
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

function resolveCombat(attacker, defender) {
  const result = attackRoll(attacker, defender);
  if (result.hits) {
    Sound.hit();
    if (result.crit) Sound.crit();
    addLog(`${attacker.name} hits ${defender.name} for ${result.dmg}${result.crit ? " (crit!)" : ""}.`);
  } else {
    Sound.miss();
    addLog(`${attacker.name} misses ${defender.name}.`);
  }
  if (defender.hp <= 0) {
    addLog(`${defender.name} is defeated!`);
  } else {
    const d = manhattan(attacker, defender);
    if (defender.heal == null && d >= defender.rangeMin && d <= defender.rangeMax) {
      const counter = attackRoll(defender, attacker);
      if (counter.hits) {
        Sound.hit();
        if (counter.crit) Sound.crit();
        addLog(`${defender.name} counters ${attacker.name} for ${counter.dmg}${counter.crit ? " (crit!)" : ""}.`);
      } else {
        Sound.miss();
        addLog(`${defender.name}'s counter misses.`);
      }
      if (attacker.hp <= 0) addLog(`${attacker.name} is defeated!`);
    }
  }
}

function resolveHeal(healer, ally) {
  const amount = Math.min(healer.heal, ally.hpMax - ally.hp);
  ally.hp += amount;
  Sound.heal();
  addLog(`${healer.name} heals ${ally.name} for ${amount}.`);
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
  state.mode = "move";
  state.reachable = computeReachable(unit);
  state.targets = [];
  Sound.select();
  render();
}

function deselect() {
  state.selectedId = null;
  state.mode = null;
  state.reachable = null;
  state.targets = [];
}

function enterTargetMode(unit) {
  state.mode = "target";
  state.targets = computeTargets(unit);
  render();
}

function finishUnitTurn(unit) {
  unit.acted = true;
  deselect();
  render();
  checkVictoryDefeat();
  if (state.screen === "result") return;
  const remaining = state.units.filter((u) => u.team === "player" && u.hp > 0 && !u.acted);
  if (remaining.length === 0) setTimeout(startEnemyPhase, 500);
}

function onBoardClick(x, y) {
  if (state.screen !== "battle" || state.phase !== "player") return;
  const clicked = unitAt(x, y);

  if (state.mode === null) {
    if (clicked && clicked.team === "player" && !clicked.acted) selectUnit(clicked);
    return;
  }

  const sel = getSelected();
  if (!sel) return;

  if (state.mode === "move") {
    const k = key(x, y);
    if (state.reachable.has(k) && (!clicked || clicked.id === sel.id)) {
      sel.x = x;
      sel.y = y;
      Sound.move();
      enterTargetMode(sel);
    } else {
      deselect();
      if (clicked && clicked.team === "player" && !clicked.acted) selectUnit(clicked);
      else render();
    }
    return;
  }

  if (state.mode === "target") {
    const target = state.targets.find((t) => t.x === x && t.y === y);
    if (target) {
      if (sel.heal != null) resolveHeal(sel, unitAt(target.x, target.y));
      else resolveCombat(sel, unitAt(target.x, target.y));
      finishUnitTurn(sel);
    } else if (clicked && clicked.id === sel.id) {
      finishUnitTurn(sel);
    }
    return;
  }
}

function waitSelected() {
  const sel = getSelected();
  if (!sel) return;
  finishUnitTurn(sel);
}

function endTurnClicked() {
  if (state.phase !== "player" || state.screen !== "battle") return;
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
  performEnemyAction(unit);
  render();
  checkVictoryDefeat();
  if (state.screen === "result") return;
  setTimeout(() => runEnemyUnit(i + 1, list), 650);
}

function performEnemyAction(unit) {
  const reachable = computeReachable(unit);
  const players = state.units.filter((u) => u.team === "player" && u.hp > 0);

  let best = null; // { x, y, cost, target, score }
  for (const [k, cost] of reachable.entries()) {
    const [x, y] = k.split(",").map(Number);
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

  if (best) {
    unit.x = best.x;
    unit.y = best.y;
    resolveCombat(unit, best.target);
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
      const d = Math.abs(closest.x - x) + Math.abs(closest.y - y);
      if (d < bestD) {
        bestD = d;
        bestTile = { x, y };
      }
    }
    if (bestTile) {
      unit.x = bestTile.x;
      unit.y = bestTile.y;
    }
    addLog(`${unit.name} moves closer.`);
  }
  unit.acted = true;
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

function drawBoard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const t = terrainAt(x, y);
      const img = images[t.icon];
      if (img && img.complete) ctx.drawImage(img, x * TILE, y * TILE, TILE, TILE);
    }
  }

  if (state.mode === "move" && state.reachable) {
    ctx.fillStyle = "rgba(90,156,224,0.38)";
    for (const k of state.reachable.keys()) {
      const [x, y] = k.split(",").map(Number);
      ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
    }
  }

  if (state.mode === "target") {
    const sel = getSelected();
    ctx.fillStyle = sel && sel.heal != null ? "rgba(126,201,143,0.5)" : "rgba(224,85,94,0.5)";
    for (const t of state.targets) {
      ctx.fillRect(t.x * TILE, t.y * TILE, TILE, TILE);
    }
  }

  for (const u of state.units) {
    if (u.hp <= 0) continue;
    const img = images[u.icon];
    if (img && img.complete) ctx.drawImage(img, u.x * TILE + 4, u.y * TILE + 4, TILE - 8, TILE - 8);
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

  if (state.selectedId) {
    const u = getSelected();
    ctx.strokeStyle = "#f0c674";
    ctx.lineWidth = 3;
    ctx.strokeRect(u.x * TILE + 2, u.y * TILE + 2, TILE - 4, TILE - 4);
  }

  if (state.screen === "battle" && state.phase === "player") {
    ctx.strokeStyle = "#e8f0ea";
    ctx.lineWidth = 2;
    ctx.strokeRect(state.cursor.x * TILE + 1, state.cursor.y * TILE + 1, TILE - 2, TILE - 2);
  }
}

function renderHud() {
  document.getElementById("phase-label").textContent =
    state.phase === "player" ? "🧭 Player Phase" : "👹 Enemy Phase";
  document.getElementById("turn-label").textContent = `Turn ${state.turnCount}`;

  const infoEl = document.getElementById("unit-info");
  const sel = getSelected();
  if (sel) {
    const kind = sel.heal != null ? "Heal" : sel.magic ? "Magic" : "Physical";
    infoEl.innerHTML = `
      <strong>${sel.name}</strong> — HP ${sel.hp}/${sel.hpMax}
      <span class="stat-row">ATK ${sel.atk} · DEF ${sel.def} · SPD ${sel.spd} · MOV ${sel.mov} · ${kind}${sel.heal != null ? "" : ` · Rng ${sel.rangeMin}-${sel.rangeMax} · Crit ${sel.crit}%`}</span>
      <span class="hint">${state.mode === "move" ? "Choose a tile to move to." : state.mode === "target" ? "Choose a target, or Wait." : ""}</span>
    `;
  } else if (state.phase === "player") {
    infoEl.innerHTML = `<span class="hint">Select one of your units to move and act.</span>`;
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

  document.getElementById("wait-btn").disabled = !(state.phase === "player" && state.selectedId);
  document.getElementById("end-turn-btn").disabled = state.phase !== "player";
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
  if (state.screen !== "battle" || state.phase !== "player") return;
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
