// Thief's Plotting Pad — engine + app logic. Loaded after game-data.js.
"use strict";

const SAVE_KEY = "thief_plan_save";

// ---------------------------------------------------------------------------
// Grid construction — builds the 11x11 cell matrix from game-data.js's room
// rectangles. See docs/requirements.md §3.
// ---------------------------------------------------------------------------

function keyOf(row, col) {
  return `${row},${col}`;
}

function buildGrid() {
  const grid = [];
  for (let r = 0; r < GameData.GRID_ROWS; r++) {
    const row = [];
    for (let c = 0; c < GameData.GRID_COLS; c++) row.push({ type: "void" });
    grid.push(row);
  }
  const fill = (rows, cols, cell) => {
    for (let r = rows[0]; r <= rows[1]; r++) {
      for (let c = cols[0]; c <= cols[1]; c++) grid[r][c] = { ...cell };
    }
  };
  GameData.ROOMS.forEach((room) => {
    fill(room.rows, room.cols, { type: "room", roomId: room.id, name: room.name });
  });
  fill(GameData.POWER_ROOM.rows, GameData.POWER_ROOM.cols, {
    type: "power",
    roomId: GameData.POWER_ROOM.id,
    name: GameData.POWER_ROOM.name,
  });
  GameData.CORRIDOR_RECTS.forEach((rect) => {
    fill(rect.rows, rect.cols, { type: "corridor", name: "Corridor" });
  });
  return grid;
}

const GRID = buildGrid();
const DOOR_KEYS = new Set(GameData.DOOR_POINTS.map((d) => keyOf(d.row, d.col)));

function cellAt(row, col) {
  if (row < 0 || col < 0 || row >= GameData.GRID_ROWS || col >= GameData.GRID_COLS) return null;
  return GRID[row][col];
}

function isPlayable(row, col) {
  const cell = cellAt(row, col);
  return !!cell && cell.type !== "void";
}

function isAdjacent(a, b) {
  const dr = Math.abs(a.row - b.row);
  const dc = Math.abs(a.col - b.col);
  return dr + dc === 1;
}

// The pad is plain graph paper — every playable cell gets a thin line, but a THICK wall is drawn
// wherever a cell borders the outside or a different room/corridor/power area, matching the
// reference pad's convention of walling off distinct rooms from each other and the corridors.
function groupOf(cell) {
  if (!cell || cell.type === "void") return null;
  return cell.type === "room" ? `room:${cell.roomId}` : cell.type;
}

function wallSides(row, col) {
  const here = groupOf(cellAt(row, col));
  const dirs = { top: [-1, 0], right: [0, 1], bottom: [1, 0], left: [0, -1] };
  const walls = {};
  for (const side in dirs) {
    const [dr, dc] = dirs[side];
    const neighbor = groupOf(cellAt(row + dr, col + dc));
    walls[side] = neighbor !== here;
  }
  return walls;
}

function doorPointAt(row, col) {
  return GameData.DOOR_POINTS.find((d) => d.row === row && d.col === col) || null;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

function freshSetup() {
  return { step: "paintings", paintings: [], cameras: [], entrance: null };
}

function freshState() {
  return { screen: "setup", setup: freshSetup(), round: null, moveDraft: [] };
}

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function save() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable — ignore, session still works in-memory */
  }
}

let state = loadSave() || freshState();
// moveDraft never persists across reloads (an in-progress, unconfirmed move) — always resume clean.
state.moveDraft = [];

// ---------------------------------------------------------------------------
// Round helpers
// ---------------------------------------------------------------------------

function log(message) {
  state.round.log.push(message);
}

function startRound() {
  const entrance = state.setup.entrance;
  const paintings = {};
  state.setup.paintings.forEach((p) => (paintings[keyOf(p.row, p.col)] = "present"));
  const cameras = {};
  state.setup.cameras.forEach((c) => (cameras[keyOf(c.row, c.col)] = { number: c.number, disconnected: false }));

  state.round = {
    position: { row: entrance.row, col: entrance.col },
    trail: [{ row: entrance.row, col: entrance.col }],
    turn: 0,
    paintings,
    cameras,
    pendingRemoval: null,
    paintingsStolen: 0,
    motionDetectorUses: 0,
    powerOff: false,
    seen: false,
    outcome: null,
    exitPoint: null,
    log: [],
  };
  const entranceCell = cellAt(entrance.row, entrance.col);
  log(`Entered the museum through ${entranceCell.name}.`);
  state.screen = "playing";
  save();
  render();
}

function resolvePendingRemoval() {
  const round = state.round;
  if (!round.pendingRemoval) return;
  const key = keyOf(round.pendingRemoval.row, round.pendingRemoval.col);
  round.paintings[key] = "collected";
  round.paintingsStolen++;
  const cell = cellAt(round.pendingRemoval.row, round.pendingRemoval.col);
  log(`Removed the painting from ${cell.name} — safely stolen.`);
  round.pendingRemoval = null;
}

function confirmMove() {
  const round = state.round;
  const steps = state.moveDraft;
  if (!steps.length) return;
  resolvePendingRemoval();
  steps.forEach((c) => round.trail.push(c));
  round.position = steps[steps.length - 1];
  round.turn++;
  const destCell = cellAt(round.position.row, round.position.col);
  log(`Turn ${round.turn}: moved ${steps.length} space${steps.length > 1 ? "s" : ""} to ${destCell.name}.`);
  state.moveDraft = [];
  save();
  render();
}

function cancelMoveDraft() {
  state.moveDraft = [];
  render();
}

function handlePlayCellTap(row, col) {
  const round = state.round;
  if (round.outcome) return;
  const draft = state.moveDraft;
  const last = draft.length ? draft[draft.length - 1] : round.position;

  // Tapping the last drafted step undoes it.
  if (draft.length && draft[draft.length - 1].row === row && draft[draft.length - 1].col === col) {
    draft.pop();
    render();
    return;
  }
  if (draft.length >= 3) return;
  if (!isPlayable(row, col)) return;
  if (row === round.position.row && col === round.position.col) return; // can't land back on start
  if (draft.some((c) => c.row === row && c.col === col)) return; // no re-visiting this turn
  if (!isAdjacent(last, { row, col })) return;
  draft.push({ row, col });
  render();
}

function snatchPainting() {
  const round = state.round;
  const key = keyOf(round.position.row, round.position.col);
  if (round.paintings[key] !== "present") return;
  round.paintings[key] = "circled";
  round.pendingRemoval = { row: round.position.row, col: round.position.col };
  const cell = cellAt(round.position.row, round.position.col);
  log(`Turn ${round.turn}: snatched the painting in ${cell.name} (circled — removed after next move).`);
  save();
  render();
}

function disconnectCamera() {
  const round = state.round;
  const key = keyOf(round.position.row, round.position.col);
  const cam = round.cameras[key];
  if (!cam || cam.disconnected) return;
  cam.disconnected = true;
  log(`Turn ${round.turn}: disconnected Camera ${cam.number}.`);
  save();
  render();
}

function togglePower() {
  const round = state.round;
  round.powerOff = !round.powerOff;
  log(round.powerOff ? `Turn ${round.turn}: turned off all Cameras & Motion Detectors.` : `Turn ${round.turn}: power's back on.`);
  save();
  render();
}

function disconnectMotionDetector() {
  const round = state.round;
  if (round.motionDetectorUses >= GameData.MOTION_DETECTOR_USES) return;
  round.motionDetectorUses++;
  log(`Turn ${round.turn}: disconnected the Motion Detectors (${round.motionDetectorUses}/${GameData.MOTION_DETECTOR_USES} used).`);
  save();
  render();
}

function markSeen() {
  const round = state.round;
  if (round.seen) return;
  round.seen = true;
  log(`Turn ${round.turn}: spotted! Pawn placed on the board.`);
  save();
  render();
}

function markCaught() {
  if (!confirm("Mark yourself as caught? This ends the round.")) return;
  const round = state.round;
  round.outcome = "caught";
  log(`Turn ${round.turn}: caught! The Characters win the round.`);
  state.screen = "summary";
  save();
  render();
}

function markEscaped(doorPoint) {
  const round = state.round;
  round.outcome = "escaped";
  round.exitPoint = doorPoint;
  const cell = cellAt(doorPoint.row, doorPoint.col);
  log(`Turn ${round.turn}: escaped through ${cell.name}! Round won.`);
  state.screen = "summary";
  save();
  render();
}

function newRound() {
  state = freshState();
  save();
  render();
}

// ---------------------------------------------------------------------------
// Setup interactions
// ---------------------------------------------------------------------------

function handleSetupCellTap(row, col) {
  const setup = state.setup;
  const key = keyOf(row, col);

  if (setup.step === "paintings") {
    const cell = cellAt(row, col);
    if (!cell || cell.type !== "room") return;
    const idx = setup.paintings.findIndex((p) => p.row === row && p.col === col);
    if (idx >= 0) setup.paintings.splice(idx, 1);
    else if (setup.paintings.length < GameData.PAINTING_COUNT) setup.paintings.push({ row, col });
  } else if (setup.step === "cameras") {
    if (!isPlayable(row, col)) return;
    const idx = setup.cameras.findIndex((c) => c.row === row && c.col === col);
    if (idx >= 0) {
      setup.cameras.splice(idx, 1);
      setup.cameras.forEach((c, i) => (c.number = i + 1));
    } else if (setup.cameras.length < GameData.CAMERA_COUNT) {
      setup.cameras.push({ row, col, number: setup.cameras.length + 1 });
    }
  } else if (setup.step === "entrance") {
    if (!DOOR_KEYS.has(key)) return;
    setup.entrance = { row, col };
  }
  save();
  render();
}

function setupStepReady() {
  const setup = state.setup;
  if (setup.step === "paintings") return setup.paintings.length === GameData.PAINTING_COUNT;
  if (setup.step === "cameras") return setup.cameras.length === GameData.CAMERA_COUNT;
  if (setup.step === "entrance") return !!setup.entrance;
  return true;
}

const SETUP_STEPS = ["paintings", "cameras", "entrance", "review"];

function setupStepNext() {
  const i = SETUP_STEPS.indexOf(state.setup.step);
  if (i < SETUP_STEPS.length - 1) state.setup.step = SETUP_STEPS[i + 1];
  save();
  render();
}

function setupStepBack() {
  const i = SETUP_STEPS.indexOf(state.setup.step);
  if (i > 0) state.setup.step = SETUP_STEPS[i - 1];
  save();
  render();
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}

// Renders the grid as a CSS grid of <button> cells, styled as plain graph paper — thin lines
// between cells in the same room/corridor/power area, a thick wall wherever a cell borders the
// outside or a different area, matching the reference pad. `decorate(row, col, cell)` returns
// {cls, content, disabled} for a playable cell, or null to render it as a plain empty/void cell.
function renderGridHTML(decorate) {
  const gridStyle = `grid-template-columns:repeat(${GameData.GRID_COLS},1fr);grid-template-rows:repeat(${GameData.GRID_ROWS},1fr);aspect-ratio:${GameData.GRID_COLS}/${GameData.GRID_ROWS};`;
  let html = `<div class="museum-grid" id="museum-grid" style="${gridStyle}">`;
  for (let r = 0; r < GameData.GRID_ROWS; r++) {
    for (let c = 0; c < GameData.GRID_COLS; c++) {
      const cell = cellAt(r, c);
      if (cell.type === "void") {
        html += '<div class="cell void"></div>';
        continue;
      }
      const info = decorate(r, c, cell) || {};
      const walls = wallSides(r, c);
      const borderStyle = ["top", "right", "bottom", "left"]
        .map((side) => `border-${side}:${walls[side] ? "2.5px solid var(--wall)" : "1px solid var(--grid-line)"}`)
        .join(";");
      const isDoor = DOOR_KEYS.has(keyOf(r, c));
      const cls = ["cell", isDoor ? "doorpoint" : "", info.cls || ""].join(" ");
      html += `<button type="button" class="${cls}" style="${borderStyle}" data-row="${r}" data-col="${c}" ${
        info.disabled ? "disabled" : ""
      } aria-label="${escapeHtml(cell.name || "corridor")} ${r},${c}">${info.content || ""}</button>`;
    }
  }
  html += "</div>";
  return html;
}

function attachGridHandler(onTap) {
  const grid = document.getElementById("museum-grid");
  if (!grid) return;
  grid.addEventListener("click", (e) => {
    const btn = e.target.closest("button.cell");
    if (!btn || btn.disabled) return;
    onTap(Number(btn.dataset.row), Number(btn.dataset.col));
  });
}

function render() {
  const app = document.getElementById("app");
  if (state.screen === "setup") app.innerHTML = setupHTML();
  else if (state.screen === "playing") app.innerHTML = playHTML();
  else app.innerHTML = summaryHTML();

  if (state.screen === "setup") {
    attachGridHandler(handleSetupCellTap);
    bindSetupControls();
  } else if (state.screen === "playing") {
    attachGridHandler(handlePlayCellTap);
    bindPlayControls();
    drawTrail();
  } else {
    bindSummaryControls();
  }
}

// --- Setup screen ---------------------------------------------------------

function setupHTML() {
  const setup = state.setup;
  const step = setup.step;

  const decorate = (r, c, cell) => {
    const key = keyOf(r, c);
    if (step === "paintings") {
      if (cell.type !== "room") return { cls: "dim", disabled: true };
      const placed = setup.paintings.some((p) => p.row === r && p.col === c);
      return { cls: placed ? "mark-x" : "", content: placed ? "✕" : "" };
    }
    if (step === "cameras") {
      const cam = setup.cameras.find((cm) => cm.row === r && cm.col === c);
      return { cls: cam ? "mark-cam" : "", content: cam ? `<span class="cam-badge">${cam.number}</span>` : "" };
    }
    if (step === "entrance") {
      const isDoor = DOOR_KEYS.has(key);
      const chosen = setup.entrance && setup.entrance.row === r && setup.entrance.col === c;
      return { cls: chosen ? "mark-entrance" : isDoor ? "" : "dim", disabled: !isDoor, content: chosen ? "E" : "" };
    }
    // review
    const painting = setup.paintings.some((p) => p.row === r && p.col === c);
    const cam = setup.cameras.find((cm) => cm.row === r && cm.col === c);
    const isEntrance = setup.entrance && setup.entrance.row === r && setup.entrance.col === c;
    if (painting) return { cls: "mark-x", disabled: true, content: "✕" };
    if (cam) return { cls: "mark-cam", disabled: true, content: `<span class="cam-badge">${cam.number}</span>` };
    if (isEntrance) return { cls: "mark-entrance", disabled: true, content: "E" };
    return { disabled: true, content: "" };
  };

  const stepLabel = {
    paintings: `🖼️ Mark the 9 paintings — tap the room each was placed in (${setup.paintings.length}/${GameData.PAINTING_COUNT})`,
    cameras: `📷 Mark the 6 cameras — tap where each was placed (${setup.cameras.length}/${GameData.CAMERA_COUNT})`,
    entrance: `🚪 Pick your entrance — tap the door/window you'll sneak in through`,
    review: `✅ Ready to begin`,
  }[step];

  const reviewList = step === "review" ? `
    <ul class="review-list">
      <li>🖼️ ${setup.paintings.length} paintings marked</li>
      <li>📷 ${setup.cameras.length} cameras marked</li>
      <li>🚪 Entrance: ${cellAt(setup.entrance.row, setup.entrance.col).name}</li>
    </ul>
    <button id="begin-btn" class="primary">Begin Heist 🕵️</button>
  ` : "";

  const nextDisabled = step !== "review" && !setupStepReady();

  return `
    <header class="topbar">
      <h1>🕵️ Thief's Plotting Pad</h1>
      <div class="status">Setup</div>
    </header>
    <main class="setup-screen">
      <p class="step-label">${stepLabel}</p>
      <div class="pad">${renderGridHTML(decorate)}</div>
      ${reviewList}
      <div class="nav-row">
        <button id="setup-back" ${SETUP_STEPS.indexOf(step) === 0 ? "disabled" : ""}>⬅ Back</button>
        ${step !== "review" ? `<button id="setup-next" class="primary" ${nextDisabled ? "disabled" : ""}>Next ➡</button>` : ""}
      </div>
    </main>
  `;
}

function bindSetupControls() {
  const back = document.getElementById("setup-back");
  if (back) back.addEventListener("click", setupStepBack);
  const next = document.getElementById("setup-next");
  if (next) next.addEventListener("click", setupStepNext);
  const begin = document.getElementById("begin-btn");
  if (begin) begin.addEventListener("click", startRound);
}

// --- Play screen -----------------------------------------------------------

function playHTML() {
  const round = state.round;
  const draft = state.moveDraft;
  const trailKeys = new Set(round.trail.map((c) => keyOf(c.row, c.col)));
  const draftKeys = new Set(draft.map((c) => keyOf(c.row, c.col)));
  const posKey = keyOf(round.position.row, round.position.col);

  const decorate = (r, c, cell) => {
    const key = keyOf(r, c);
    let content = "";
    let cls = "";
    const paintingState = round.paintings[key];
    const cam = round.cameras[key];
    if (paintingState === "present") {
      content = "✕";
      cls += " mark-x";
    } else if (paintingState === "circled") {
      content = '<span class="circle-mark">✕</span>';
      cls += " mark-x";
    }
    if (cam) {
      content = `<span class="cam-badge${cam.disconnected ? " cam-off" : ""}">${cam.number}</span>`;
      cls += " mark-cam";
    }

    if (trailKeys.has(key)) cls += " visited";
    if (draftKeys.has(key)) cls += " drafted";
    if (key === posKey) cls += " current";
    return { cls, content };
  };

  const camAtPos = round.cameras[posKey];
  const paintingAtPos = round.paintings[posKey];
  const atPower = cellAt(round.position.row, round.position.col).type === "power";

  const actions = [];
  if (paintingAtPos === "present") actions.push(`<button id="snatch-btn">⭕ Snatch painting</button>`);
  if (camAtPos && !camAtPos.disconnected) actions.push(`<button id="camera-btn">🚫 Disconnect Camera ${camAtPos.number}</button>`);
  if (atPower) actions.push(`<button id="power-btn">⚡ ${round.powerOff ? "Power's off (tap to restore)" : "Turn off Cameras &amp; Motion Detectors"}</button>`);

  const mdUsed = round.motionDetectorUses;
  const mdLeft = GameData.MOTION_DETECTOR_USES - mdUsed;

  const doorButtons = GameData.DOOR_POINTS.map(
    (d) => `<button class="door-choice" data-row="${d.row}" data-col="${d.col}">${cellAt(d.row, d.col).name}</button>`
  ).join("");

  // Bottom legend strip, styled after the reference pad's own: crossed-off "M M" + pliers, and a
  // row of camera number badges crossed off once disconnected.
  const motionLegend = Array.from({ length: GameData.MOTION_DETECTOR_USES })
    .map((_, i) => `<span class="legend-m${i < mdUsed ? " off" : ""}">M</span>`)
    .join("");
  const cameraLegend = Array.from({ length: GameData.CAMERA_COUNT })
    .map((_, i) => {
      const n = i + 1;
      const disconnected = Object.values(round.cameras).some((c) => c.number === n && c.disconnected);
      return `<span class="legend-cam${disconnected ? " off" : ""}">${n}</span>`;
    })
    .join("");

  return `
    <header class="topbar">
      <h1>🕵️ Thief's Plotting Pad</h1>
      <div class="status">Turn ${round.turn}${round.seen ? " · 👁️ Spotted!" : ""}${round.powerOff ? " · ⚡ Power off" : ""}</div>
    </header>
    <main class="play-screen">
      <div class="pad">
        ${renderGridHTML(decorate)}
        <div class="pad-legend">
          <div class="legend-group">${motionLegend}<span class="legend-tool">✂️</span></div>
          <div class="legend-group">${cameraLegend}</div>
        </div>
      </div>

      <section class="panel">
        <div class="counters">
          <span>🖼️ Paintings ${round.paintingsStolen}/${GameData.PAINTING_COUNT}</span>
          <span>📷 Cameras ${Object.values(round.cameras).filter((c) => c.disconnected).length}/${GameData.CAMERA_COUNT}</span>
        </div>

        <div class="move-controls">
          <p class="hint">${draft.length ? `Move drafted: ${draft.length} space${draft.length > 1 ? "s" : ""} — tap an adjacent cell to extend, tap the last cell to undo.` : "Tap up to 3 adjacent cells to plot your move."}</p>
          <button id="confirm-move" class="primary" ${draft.length ? "" : "disabled"}>✅ Confirm Move</button>
          <button id="cancel-move" ${draft.length ? "" : "disabled"}>✖ Clear</button>
        </div>

        ${actions.length ? `<div class="context-actions">${actions.join("")}</div>` : ""}

        <div class="always-actions">
          <button id="motion-btn" ${mdLeft > 0 ? "" : "disabled"}>✂️ Disconnect Motion Detectors (${mdLeft} left)</button>
          <button id="seen-btn" ${round.seen ? "disabled" : ""}>👁️ I've been seen!</button>
          <button id="caught-btn" class="danger">🚨 I'm caught!</button>
          <button id="escape-btn" class="success">🏃 I've escaped!</button>
        </div>

        <div id="escape-picker" class="escape-picker hidden">
          <p>Which door/window did you escape through?</p>
          ${doorButtons}
        </div>

        <div class="log">
          <h2>Move log</h2>
          <ol>${round.log.map((l) => `<li>${escapeHtml(l)}</li>`).join("")}</ol>
        </div>
      </section>
    </main>
  `;
}

function bindPlayControls() {
  const on = (id, fn) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("click", fn);
  };
  on("confirm-move", confirmMove);
  on("cancel-move", cancelMoveDraft);
  on("snatch-btn", snatchPainting);
  on("camera-btn", disconnectCamera);
  on("power-btn", togglePower);
  on("motion-btn", disconnectMotionDetector);
  on("seen-btn", markSeen);
  on("caught-btn", markCaught);
  on("escape-btn", () => {
    const picker = document.getElementById("escape-picker");
    if (picker) picker.classList.toggle("hidden");
  });
  document.querySelectorAll(".door-choice").forEach((btn) => {
    btn.addEventListener("click", () => {
      markEscaped({ row: Number(btn.dataset.row), col: Number(btn.dataset.col) });
    });
  });
}

// Draws the line-through-crossed-spaces + dot-on-landed-space trail as an SVG overlay, matching
// the physical pad's own convention.
function drawTrail() {
  const grid = document.getElementById("museum-grid");
  if (!grid) return;
  const round = state.round;
  const points = round.trail.concat(state.moveDraft);
  if (points.length < 1) return;

  const old = grid.querySelector("svg.trail-overlay");
  if (old) old.remove();

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "trail-overlay");
  const rect = grid.getBoundingClientRect();
  svg.setAttribute("width", rect.width);
  svg.setAttribute("height", rect.height);

  const centerOf = (r, c) => {
    const btn = grid.querySelector(`button[data-row="${r}"][data-col="${c}"]`);
    if (!btn) return null;
    const b = btn.getBoundingClientRect();
    return { x: b.left - rect.left + b.width / 2, y: b.top - rect.top + b.height / 2 };
  };

  let pathD = "";
  points.forEach((p, i) => {
    const pt = centerOf(p.row, p.col);
    if (!pt) return;
    pathD += `${i === 0 ? "M" : "L"} ${pt.x} ${pt.y} `;
  });
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", pathD.trim());
  path.setAttribute("class", "trail-line");
  svg.appendChild(path);

  points.forEach((p) => {
    const pt = centerOf(p.row, p.col);
    if (!pt) return;
    const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    dot.setAttribute("cx", pt.x);
    dot.setAttribute("cy", pt.y);
    dot.setAttribute("r", 4);
    dot.setAttribute("class", "trail-dot");
    svg.appendChild(dot);
  });

  grid.appendChild(svg);
}

// --- Summary screen ----------------------------------------------------------

function summaryHTML() {
  const round = state.round;
  const won = round.outcome === "escaped";
  return `
    <header class="topbar">
      <h1>🕵️ Thief's Plotting Pad</h1>
      <div class="status">Round Over</div>
    </header>
    <main class="summary-screen">
      <h2 class="${won ? "success" : "danger"}">${won ? "🏆 You escaped!" : "🚨 Caught!"}</h2>
      <ul class="review-list">
        <li>🖼️ Paintings stolen: ${round.paintingsStolen}/${GameData.PAINTING_COUNT}</li>
        <li>📷 Cameras disconnected: ${Object.values(round.cameras).filter((c) => c.disconnected).length}/${GameData.CAMERA_COUNT}</li>
        <li>✂️ Motion Detectors disconnected: ${round.motionDetectorUses}/${GameData.MOTION_DETECTOR_USES}</li>
        <li>👣 Turns taken: ${round.turn}</li>
      </ul>
      <button id="new-round-btn" class="primary">🔁 New Round</button>
      <div class="log">
        <h2>Full move log</h2>
        <ol>${round.log.map((l) => `<li>${escapeHtml(l)}</li>`).join("")}</ol>
      </div>
    </main>
  `;
}

function bindSummaryControls() {
  const btn = document.getElementById("new-round-btn");
  if (btn) btn.addEventListener("click", newRound);
}

// ---------------------------------------------------------------------------

render();
window.addEventListener("resize", () => {
  if (state.screen === "playing") drawTrail();
});
