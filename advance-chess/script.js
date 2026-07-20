// Advance Chess: Wars of the Roses — engine + game logic. Loaded after game-data.js and sound.js.
"use strict";

const SAVE_KEY = "advancechess_save";

const PIECE_GLYPH = { k: "♔", q: "♕", r: "♖", b: "♗", n: "♘", p: "♙" };
const PIECE_LETTER = { p: "", n: "N", b: "B", r: "R", q: "Q", k: "K" };
const KNIGHT_OFFSETS = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
const DIRS_DIAG = [[-1,-1],[-1,1],[1,-1],[1,1]];
const DIRS_STRAIGHT = [[-1,0],[1,0],[0,-1],[0,1]];
const DIRS_8 = DIRS_DIAG.concat(DIRS_STRAIGHT);

// ---------- board helpers ----------

function inBounds(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }

function createInitialBoard() {
  const back = ["r", "n", "b", "q", "k", "b", "n", "r"];
  const board = Array.from({ length: 8 }, () => Array(8).fill(null));
  for (let c = 0; c < 8; c++) {
    board[0][c] = { type: back[c], color: "b", hasMoved: false, upgraded: false, upgradeUsed: false };
    board[1][c] = { type: "p", color: "b", hasMoved: false, upgraded: false, upgradeUsed: false };
    board[6][c] = { type: "p", color: "w", hasMoved: false, upgraded: false, upgradeUsed: false };
    board[7][c] = { type: back[c], color: "w", hasMoved: false, upgraded: false, upgradeUsed: false };
  }
  return board;
}

function cloneBoard(board) {
  return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

function opponent(color) { return color === "w" ? "b" : "w"; }

function algebraic(r, c) { return "abcdefgh"[c] + (8 - r); }

function findKing(board, color) {
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const p = board[r][c];
    if (p && p.type === "k" && p.color === color) return { r, c };
  }
  return null;
}

// ---------- attack detection ----------

function rayClear(board, r, c, tr, tc) {
  const dr = Math.sign(tr - r), dc = Math.sign(tc - c);
  let cr = r + dr, cc = c + dc;
  while (cr !== tr || cc !== tc) {
    if (board[cr][cc]) return false;
    cr += dr; cc += dc;
  }
  return true;
}

function raySiegeTarget(board, r, c, tr, tc) {
  if (r !== tr && c !== tc) return false;
  if (r === tr && c === tc) return false;
  const dr = Math.sign(tr - r), dc = Math.sign(tc - c);
  let cr = r + dr, cc = c + dc;
  let blocker = null;
  while (cr !== tr || cc !== tc) {
    if (board[cr][cc]) { blocker = { r: cr, c: cc }; break; }
    cr += dr; cc += dc;
  }
  if (!blocker) return false;
  return blocker.r + dr === tr && blocker.c + dc === tc;
}

function pieceAttacksSquare(board, p, r, c, tr, tc) {
  const dr = tr - r, dc = tc - c;
  switch (p.type) {
    case "p": {
      const dir = p.color === "w" ? -1 : 1;
      if (dr === dir && Math.abs(dc) === 1) return true;
      if (p.upgraded && dr === 2 * dir && dc === 0) {
        if (!board[r + dir][c]) return true;
      }
      return false;
    }
    case "n":
      return KNIGHT_OFFSETS.some(([odr, odc]) => odr === dr && odc === dc);
    case "b": {
      if (Math.abs(dr) === Math.abs(dc) && dr !== 0 && rayClear(board, r, c, tr, tc)) return true;
      if (p.upgraded && !p.upgradeUsed && KNIGHT_OFFSETS.some(([odr, odc]) => odr === dr && odc === dc)) return true;
      return false;
    }
    case "r": {
      if ((r === tr || c === tc) && !(r === tr && c === tc) && rayClear(board, r, c, tr, tc)) return true;
      if (p.upgraded && raySiegeTarget(board, r, c, tr, tc)) return true;
      return false;
    }
    case "q": {
      const straight = (r === tr || c === tc) && !(r === tr && c === tc);
      const diag = Math.abs(dr) === Math.abs(dc) && dr !== 0;
      if ((straight || diag) && rayClear(board, r, c, tr, tc)) return true;
      return false;
    }
    case "k":
      return Math.abs(dr) <= 1 && Math.abs(dc) <= 1 && !(dr === 0 && dc === 0);
  }
  return false;
}

function isSquareAttacked(board, tr, tc, byColor) {
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const p = board[r][c];
    if (!p || p.color !== byColor) continue;
    if (pieceAttacksSquare(board, p, r, c, tr, tc)) return true;
  }
  return false;
}

function isKingInCheck(board, color) {
  const k = findKing(board, color);
  if (!k) return false;
  return isSquareAttacked(board, k.r, k.c, opponent(color));
}

// ---------- move generation ----------

function slideMoves(board, r, c, color, dirs) {
  const moves = [];
  for (const [dr, dc] of dirs) {
    let tr = r + dr, tc = c + dc;
    while (inBounds(tr, tc)) {
      const target = board[tr][tc];
      if (!target) {
        moves.push({ from: { r, c }, to: { r: tr, c: tc }, captureSquare: null, special: "normal" });
      } else {
        if (target.color !== color) {
          moves.push({ from: { r, c }, to: { r: tr, c: tc }, captureSquare: { r: tr, c: tc }, special: "normal" });
        }
        break;
      }
      tr += dr; tc += dc;
    }
  }
  return moves;
}

function siegeMoves(board, r, c, color, dirs) {
  const moves = [];
  for (const [dr, dc] of dirs) {
    let tr = r + dr, tc = c + dc;
    let blocker = null;
    while (inBounds(tr, tc)) {
      if (board[tr][tc]) { blocker = { r: tr, c: tc }; break; }
      tr += dr; tc += dc;
    }
    if (!blocker) continue;
    const br = blocker.r + dr, bc = blocker.c + dc;
    if (!inBounds(br, bc)) continue;
    const beyond = board[br][bc];
    if (beyond && beyond.color !== color) {
      moves.push({ from: { r, c }, to: { r: br, c: bc }, captureSquare: { r: br, c: bc }, special: "siege" });
    }
  }
  return moves;
}

function knightPatternMoves(board, r, c, color, special) {
  const moves = [];
  for (const [dr, dc] of KNIGHT_OFFSETS) {
    const tr = r + dr, tc = c + dc;
    if (!inBounds(tr, tc)) continue;
    const target = board[tr][tc];
    if (!target) moves.push({ from: { r, c }, to: { r: tr, c: tc }, captureSquare: null, special });
    else if (target.color !== color) moves.push({ from: { r, c }, to: { r: tr, c: tc }, captureSquare: { r: tr, c: tc }, special });
  }
  return moves;
}

function generatePseudoMoves(ctx, r, c) {
  const board = ctx.board;
  const piece = board[r][c];
  if (!piece) return [];
  const color = piece.color, enemy = opponent(color);
  const moves = [];

  if (piece.type === "p") {
    const dir = color === "w" ? -1 : 1;
    const startRow = color === "w" ? 6 : 1;
    const promoRow = color === "w" ? 0 : 7;
    const f1r = r + dir;
    if (inBounds(f1r, c) && !board[f1r][c]) {
      moves.push({ from: { r, c }, to: { r: f1r, c }, captureSquare: null, special: "normal", promotion: f1r === promoRow });
      const f2r = r + 2 * dir;
      if (r === startRow && !board[f2r][c]) {
        moves.push({ from: { r, c }, to: { r: f2r, c }, captureSquare: null, special: "double" });
      }
    }
    for (const dc of [-1, 1]) {
      const tr = r + dir, tc = c + dc;
      if (!inBounds(tr, tc)) continue;
      const target = board[tr][tc];
      if (target && target.color === enemy) {
        moves.push({ from: { r, c }, to: { r: tr, c: tc }, captureSquare: { r: tr, c: tc }, special: "normal", promotion: tr === promoRow });
      } else if (!target && ctx.enPassant && ctx.enPassant.r === tr && ctx.enPassant.c === tc) {
        moves.push({ from: { r, c }, to: { r: tr, c: tc }, captureSquare: { r, c: tc }, special: "enpassant" });
      }
    }
    if (piece.upgraded) {
      const tr = r + 2 * dir, tc = c;
      const midR = r + dir;
      if (inBounds(tr, tc) && !board[midR][tc]) {
        const target = board[tr][tc];
        if (target && target.color === enemy) {
          moves.push({ from: { r, c }, to: { r, c }, captureSquare: { r: tr, c: tc }, special: "longbow" });
        }
      }
    }
  } else if (piece.type === "n") {
    moves.push(...knightPatternMoves(board, r, c, color, "normal"));
  } else if (piece.type === "b") {
    moves.push(...slideMoves(board, r, c, color, DIRS_DIAG));
    if (piece.upgraded && !piece.upgradeUsed) moves.push(...knightPatternMoves(board, r, c, color, "blessing"));
  } else if (piece.type === "r") {
    moves.push(...slideMoves(board, r, c, color, DIRS_STRAIGHT));
    if (piece.upgraded) moves.push(...siegeMoves(board, r, c, color, DIRS_STRAIGHT));
  } else if (piece.type === "q") {
    moves.push(...slideMoves(board, r, c, color, DIRS_DIAG.concat(DIRS_STRAIGHT)));
  } else if (piece.type === "k") {
    for (const [dr, dc] of DIRS_8) {
      const tr = r + dr, tc = c + dc;
      if (!inBounds(tr, tc)) continue;
      const target = board[tr][tc];
      if (!target) moves.push({ from: { r, c }, to: { r: tr, c: tc }, captureSquare: null, special: "normal" });
      else if (target.color !== color) moves.push({ from: { r, c }, to: { r: tr, c: tc }, captureSquare: { r: tr, c: tc }, special: "normal" });
    }
    if (!isSquareAttacked(board, r, c, enemy)) {
      const backRow = r;
      if (ctx.castling[color + "K"]) {
        const rook = board[backRow][7];
        if (!board[backRow][5] && !board[backRow][6] && rook && rook.type === "r" && rook.color === color &&
            !isSquareAttacked(board, backRow, 5, enemy) && !isSquareAttacked(board, backRow, 6, enemy)) {
          moves.push({ from: { r, c }, to: { r: backRow, c: 6 }, captureSquare: null, special: "castleK" });
        }
      }
      if (ctx.castling[color + "Q"]) {
        const rook = board[backRow][0];
        if (!board[backRow][1] && !board[backRow][2] && !board[backRow][3] && rook && rook.type === "r" && rook.color === color &&
            !isSquareAttacked(board, backRow, 3, enemy) && !isSquareAttacked(board, backRow, 2, enemy)) {
          moves.push({ from: { r, c }, to: { r: backRow, c: 2 }, captureSquare: null, special: "castleQ" });
        }
      }
    }
    if (piece.upgraded && !piece.upgradeUsed) {
      for (const [dr, dc] of DIRS_8) {
        const mr = r + dr, mc = c + dc;
        const tr = r + 2 * dr, tc = c + 2 * dc;
        if (!inBounds(tr, tc)) continue;
        if (board[mr][mc] || board[tr][tc]) continue;
        if (isSquareAttacked(board, mr, mc, enemy)) continue;
        moves.push({ from: { r, c }, to: { r: tr, c: tc }, captureSquare: null, special: "royalguard" });
      }
    }
  }
  return moves;
}

function applyMoveToBoard(board, move, opts = {}) {
  const { r: fr, c: fc } = move.from;
  const { r: tr, c: tc } = move.to;
  const piece = board[fr][fc];
  let capturedPiece = null;
  if (move.captureSquare) {
    const { r: cr, c: cc } = move.captureSquare;
    capturedPiece = board[cr][cc];
    board[cr][cc] = null;
  }
  if (move.special !== "longbow") {
    board[tr][tc] = piece;
    board[fr][fc] = null;
    if (piece) piece.hasMoved = true;
  }
  if (move.special === "castleK") {
    const rook = board[fr][7];
    board[fr][5] = rook; board[fr][7] = null;
    if (rook) rook.hasMoved = true;
  } else if (move.special === "castleQ") {
    const rook = board[fr][0];
    board[fr][3] = rook; board[fr][0] = null;
    if (rook) rook.hasMoved = true;
  }
  if (move.special === "blessing" && piece) piece.upgradeUsed = true;
  if (move.promotion) {
    const promoType = opts.promoType || "q";
    board[tr][tc] = { type: promoType, color: piece.color, hasMoved: true, upgraded: false, upgradeUsed: false };
  }
  return capturedPiece;
}

function generateLegalMoves(ctx, r, c) {
  const piece = ctx.board[r][c];
  if (!piece || piece.color !== ctx.turn) return [];
  const pseudo = generatePseudoMoves(ctx, r, c);
  const legal = [];
  for (const m of pseudo) {
    const clone = cloneBoard(ctx.board);
    applyMoveToBoard(clone, m, { promoType: "q" });
    if (!isKingInCheck(clone, piece.color)) legal.push(m);
  }
  return legal;
}

function sideHasAnyLegalMove(ctx, color) {
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const p = ctx.board[r][c];
    if (p && p.color === color && generateLegalMoves({ ...ctx, turn: color }, r, c).length > 0) return true;
  }
  return false;
}

function isInsufficientMaterial(board) {
  const pieces = [];
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const p = board[r][c];
    if (p && p.type !== "k") pieces.push({ ...p, r, c });
  }
  if (pieces.length === 0) return true;
  if (pieces.length === 1 && (pieces[0].type === "n" || pieces[0].type === "b")) return true;
  if (pieces.length === 2 && pieces[0].type === "b" && pieces[1].type === "b" && pieces[0].color !== pieces[1].color) {
    const sq1 = (pieces[0].r + pieces[0].c) % 2, sq2 = (pieces[1].r + pieces[1].c) % 2;
    if (sq1 === sq2) return true;
  }
  return false;
}

function pruneCastlingRights(state) {
  const b = state.board;
  for (const color of ["w", "b"]) {
    const backRow = color === "w" ? 7 : 0;
    const king = b[backRow][4];
    if (!king || king.type !== "k" || king.color !== color || king.hasMoved) {
      state.castling[color + "K"] = false;
      state.castling[color + "Q"] = false;
    }
    const rookK = b[backRow][7];
    if (!rookK || rookK.type !== "r" || rookK.color !== color || rookK.hasMoved) state.castling[color + "K"] = false;
    const rookQ = b[backRow][0];
    if (!rookQ || rookQ.type !== "r" || rookQ.color !== color || rookQ.hasMoved) state.castling[color + "Q"] = false;
  }
}

// ---------- game state ----------

function createInitialState() {
  return {
    screen: "start",
    board: createInitialBoard(),
    turn: "w",
    ply: 0,
    castling: { wK: true, wQ: true, bK: true, bQ: true },
    enPassant: null,
    moveLog: [],
    upgradePoints: { w: 0, b: 0 },
    upgradeInstalledThisTurn: false,
    nextReinforcementPly: null,
    lastMove: null,
    result: null,
    selected: null,
    legalTargets: [],
    cursor: { r: 6, c: 4 },
    extraMove: null,
    pendingPromotion: null,
    upgradeInstallPicking: false,
    upgradeConfirm: null,
    clashSquare: null,
  };
}

let state = createInitialState();

function moveCtx(s, turnOverride) {
  return { board: s.board, turn: turnOverride || s.turn, enPassant: s.enPassant, castling: s.castling };
}

function currentPhase() {
  const { phase2StartPly, phase3StartPly } = GameData.PHASES;
  if (state.ply >= phase3StartPly) return 3;
  if (state.ply >= phase2StartPly) return 2;
  return 1;
}

function phaseAtLeast(n) { return currentPhase() >= n; }

function sideLabel(color) {
  if (phaseAtLeast(2)) return GameData.HOUSES[color].name;
  return color === "w" ? "White" : "Black";
}

// ---------- persistence ----------

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function save() {
  const persisted = {
    board: state.board, turn: state.turn, ply: state.ply, castling: state.castling,
    enPassant: state.enPassant, moveLog: state.moveLog, upgradePoints: state.upgradePoints,
    upgradeInstalledThisTurn: state.upgradeInstalledThisTurn,
    nextReinforcementPly: state.nextReinforcementPly, lastMove: state.lastMove, result: state.result,
    muted: Sound.isMuted(),
  };
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(persisted)); } catch {}
}

function newGame() {
  state = createInitialState();
  state.screen = "playing";
  save();
  render();
}

function resumeGame() {
  const saved = loadSave();
  if (!saved) { newGame(); return; }
  state = createInitialState();
  Object.assign(state, saved);
  state.screen = "playing";
  Sound.setMuted(!!saved.muted);
  render();
}

// ---------- move flow ----------

function uiTargetFor(move) {
  if (move.special === "longbow") return { r: move.captureSquare.r, c: move.captureSquare.c, move };
  return { r: move.to.r, c: move.to.c, move };
}

function selectSquare(r, c) {
  const legal = generateLegalMoves(moveCtx(state), r, c);
  if (legal.length === 0) { Sound.illegal(); return; }
  state.selected = { r, c };
  state.legalTargets = legal.map(uiTargetFor);
  render();
}

function deselect() {
  state.selected = null;
  state.legalTargets = [];
  render();
}

function performMove(move, isExtra) {
  const color = isExtra ? state.extraMove.color : state.turn;
  if (move.promotion) {
    state.pendingPromotion = { move, color, isExtra };
    state.selected = null;
    state.legalTargets = [];
    render();
    return;
  }
  finalizeMoveApplication(move, color, isExtra, "q");
}

function maybeFlavor(capturedPiece) {
  const p = currentPhase();
  if (p < 2) return null;
  const pool = GameData.FLAVOR_QUOTES[p >= 3 ? "phase3" : "phase2"];
  const chance = capturedPiece ? 1 : 0.3;
  if (Math.random() < chance) return pool[Math.floor(Math.random() * pool.length)];
  return null;
}

function addLogEntry(text, flavor) {
  state.moveLog.push({ text, flavor: flavor || null });
}

function describeMove(move, movedPiece, color, capturedPiece) {
  const side = sideLabel(color);
  let txt;
  if (move.special === "castleK") txt = "O-O";
  else if (move.special === "castleQ") txt = "O-O-O";
  else if (move.special === "longbow") {
    txt = `🏹 ${algebraic(move.from.r, move.from.c)} snipes ${algebraic(move.captureSquare.r, move.captureSquare.c)}`;
  } else {
    const pl = move.promotion ? "" : (PIECE_LETTER[movedPiece.type] || "");
    const capStr = capturedPiece ? "x" : "-";
    txt = `${pl}${algebraic(move.from.r, move.from.c)}${capStr}${algebraic(move.to.r, move.to.c)}`;
    if (move.special === "siege") txt += " (siege)";
    else if (move.special === "blessing") txt += " (blessing)";
    else if (move.special === "royalguard") txt += " (guard)";
    else if (move.special === "enpassant") txt += " e.p.";
    if (move.promotion) txt += "=Q";
  }
  if (isKingInCheck(state.board, opponent(color))) txt += "+";
  return `${side}: ${txt}`;
}

function handlePhaseTransition() {
  const { phase2StartPly, phase3StartPly, reinforcementInterval } = GameData.PHASES;
  if (state.ply === phase2StartPly) {
    showBanner(GameData.PHASES.banners.phase2.title, GameData.PHASES.banners.phase2.subtitle);
    Sound.phase();
  }
  if (state.ply === phase3StartPly) {
    showBanner(GameData.PHASES.banners.phase3.title, GameData.PHASES.banners.phase3.subtitle);
    Sound.phase();
    state.upgradePoints.w += 1;
    state.upgradePoints.b += 1;
    state.nextReinforcementPly = phase3StartPly + reinforcementInterval;
    addLogEntry("Levies arrive — both sides +1 UP.", null);
  }
  if (state.nextReinforcementPly && state.ply >= state.nextReinforcementPly) {
    state.upgradePoints.w += 1;
    state.upgradePoints.b += 1;
    addLogEntry("Reinforcements arrive — both sides +1 UP.", null);
    state.nextReinforcementPly += reinforcementInterval;
  }
}

function finalizeMoveApplication(move, color, isExtra, promoType) {
  const capturedPiece = applyMoveToBoard(state.board, move, { promoType });
  const movedPiece = move.special === "longbow" ? state.board[move.from.r][move.from.c] : state.board[move.to.r][move.to.c];

  if (capturedPiece) { Sound.capture(); state.clashSquare = { ...move.captureSquare }; }
  else Sound.move();

  state.lastMove = { from: move.from, to: move.to };
  state.selected = null;
  state.legalTargets = [];

  if (!isExtra) {
    state.ply += 1;
    state.enPassant = move.special === "double" ? { r: (move.from.r + move.to.r) / 2, c: move.from.c } : null;
  }
  pruneCastlingRights(state);
  if (capturedPiece && state.ply >= GameData.PHASES.phase3StartPly) {
    state.upgradePoints[color] += 1;
  }

  if (!isExtra) handlePhaseTransition();

  const flavor = maybeFlavor(capturedPiece);
  addLogEntry(describeMove(move, movedPiece, color, capturedPiece), flavor);

  if (isExtra && state.extraMove && state.extraMove.kind === "kingmaker" && movedPiece) {
    movedPiece.upgradeUsed = true;
  }

  if (!isExtra) {
    if (movedPiece && movedPiece.type === "n" && movedPiece.upgraded && capturedPiece) {
      state.extraMove = { color, kind: "cavalry" };
      startExtraMove(move.to.r, move.to.c);
      return;
    }
    if (movedPiece && movedPiece.type === "q" && movedPiece.upgraded && !movedPiece.upgradeUsed) {
      state.extraMove = { color, kind: "kingmaker" };
      startExtraMove(move.to.r, move.to.c);
      return;
    }
  }

  state.extraMove = null;
  endTurn(color);
}

function startExtraMove(r, c) {
  const legal = generateLegalMoves(moveCtx(state, state.extraMove.color), r, c);
  if (legal.length === 0) {
    state.extraMove = null;
    endTurn(state.turn);
    return;
  }
  state.selected = { r, c };
  state.legalTargets = legal.map(uiTargetFor);
  save();
  render();
}

function skipExtraMove() {
  const color = state.extraMove.color;
  state.extraMove = null;
  state.selected = null;
  state.legalTargets = [];
  endTurn(color);
}

function endTurn(colorThatMoved) {
  state.turn = opponent(colorThatMoved);
  state.upgradeInstalledThisTurn = false;
  const inCheck = isKingInCheck(state.board, state.turn);
  const hasMoves = sideHasAnyLegalMove(state, state.turn);
  if (!hasMoves) {
    state.result = inCheck ? { winner: colorThatMoved, reason: "checkmate" } : { winner: "draw", reason: "stalemate" };
  } else if (isInsufficientMaterial(state.board)) {
    state.result = { winner: "draw", reason: "insufficient material" };
  } else if (inCheck) {
    Sound.check();
  }
  if (state.result) {
    Sound.gameOver();
    if (state.result.reason === "checkmate") {
      const last = state.moveLog[state.moveLog.length - 1];
      if (last) last.text = last.text.replace(/\+$/, "") + "#";
    }
  }
  save();
  render();
}

// ---------- upgrades ----------

function hasEligiblePiece(color) {
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const p = state.board[r][c];
    if (p && p.color === color && !p.upgraded && GameData.UPGRADES[p.type].cost <= state.upgradePoints[color]) return true;
  }
  return false;
}

function handleUpgradePieceClick(r, c) {
  const p = state.board[r][c];
  if (!p || p.color !== state.turn || p.upgraded) { Sound.illegal(); return; }
  const upg = GameData.UPGRADES[p.type];
  if (state.upgradePoints[state.turn] < upg.cost) { Sound.illegal(); return; }
  state.upgradeInstallPicking = false;
  state.upgradeConfirm = { r, c, type: p.type };
  render();
}

function confirmUpgrade() {
  const { r, c, type } = state.upgradeConfirm;
  const p = state.board[r][c];
  const upg = GameData.UPGRADES[type];
  p.upgraded = true;
  state.upgradePoints[state.turn] -= upg.cost;
  state.upgradeInstalledThisTurn = true;
  state.upgradeConfirm = null;
  Sound.upgrade();
  addLogEntry(`${sideLabel(state.turn)} installs ${upg.emoji} ${upg.name} on ${algebraic(r, c)}.`, null);
  save();
  render();
}

// ---------- input ----------

function onSquareClick(r, c) {
  if (state.result || state.pendingPromotion || state.upgradeConfirm) return;
  if (state.upgradeInstallPicking) { handleUpgradePieceClick(r, c); return; }
  if (state.extraMove) {
    const target = state.legalTargets.find((t) => t.r === r && t.c === c);
    if (target) performMove(target.move, true);
    else Sound.illegal();
    return;
  }
  if (state.selected) {
    if (state.selected.r === r && state.selected.c === c) { deselect(); return; }
    const target = state.legalTargets.find((t) => t.r === r && t.c === c);
    if (target) { performMove(target.move, false); return; }
    const p = state.board[r][c];
    if (p && p.color === state.turn) { selectSquare(r, c); return; }
    Sound.illegal();
    return;
  }
  const p = state.board[r][c];
  if (p && p.color === state.turn) selectSquare(r, c);
}

function bindEvents() {
  document.getElementById("banner").addEventListener("click", () => {
    document.getElementById("banner").classList.remove("show");
  });

  document.addEventListener("click", (e) => {
    const sqEl = e.target.closest("[data-sq]");
    if (sqEl) {
      const [r, c] = sqEl.getAttribute("data-sq").split(",").map(Number);
      onSquareClick(r, c);
      return;
    }
    const actionEl = e.target.closest("[data-action]");
    if (!actionEl) return;
    const action = actionEl.getAttribute("data-action");
    handleAction(action, actionEl);
  });

  document.addEventListener("keydown", (e) => {
    if (state.screen !== "playing") return;
    if (state.pendingPromotion || state.upgradeConfirm) return;
    const cur = state.cursor || { r: 6, c: 4 };
    let { r, c } = cur;
    if (e.key === "ArrowUp") r = Math.max(0, r - 1);
    else if (e.key === "ArrowDown") r = Math.min(7, r + 1);
    else if (e.key === "ArrowLeft") c = Math.max(0, c - 1);
    else if (e.key === "ArrowRight") c = Math.min(7, c + 1);
    else if (e.key === "Enter" || e.key === " ") { onSquareClick(r, c); e.preventDefault(); return; }
    else if (e.key === "Escape") { if (state.selected) deselect(); return; }
    else return;
    e.preventDefault();
    state.cursor = { r, c };
    render();
  });
}

function handleAction(action, el) {
  switch (action) {
    case "new-game":
      if (state.screen !== "playing" || window.confirm("Start a new game? Current progress will be lost.")) newGame();
      break;
    case "resume-game":
      resumeGame();
      break;
    case "go-start":
      state.screen = "start";
      render();
      break;
    case "toggle-mute": {
      Sound.setMuted(!Sound.isMuted());
      save();
      render();
      break;
    }
    case "open-rules":
      state.showRules = true;
      render();
      break;
    case "close-rules":
      state.showRules = false;
      render();
      break;
    case "open-upgrade":
      state.upgradeInstallPicking = true;
      render();
      break;
    case "cancel-upgrade-pick":
      state.upgradeInstallPicking = false;
      render();
      break;
    case "confirm-upgrade":
      confirmUpgrade();
      break;
    case "cancel-upgrade":
      state.upgradeConfirm = null;
      render();
      break;
    case "skip-extra":
      skipExtraMove();
      break;
    case "promote": {
      const type = el.getAttribute("data-type");
      const { move, color, isExtra } = state.pendingPromotion;
      state.pendingPromotion = null;
      finalizeMoveApplication(move, color, isExtra, type);
      break;
    }
    case "rematch":
      newGame();
      break;
  }
}

// ---------- rendering ----------

function showBanner(title, subtitle) {
  const el = document.getElementById("banner");
  el.innerHTML = `<div class="title">${title}</div><div class="subtitle">${subtitle}</div>`;
  el.classList.add("show");
  clearTimeout(showBanner._t);
  showBanner._t = setTimeout(() => el.classList.remove("show"), 2600);
}

function squareClass(r, c) {
  const classes = ["sq", (r + c) % 2 === 0 ? "light" : "dark"];
  if (state.selected && state.selected.r === r && state.selected.c === c) classes.push("selected");
  if (state.cursor && state.cursor.r === r && state.cursor.c === c) classes.push("cursor");
  if (state.lastMove && ((state.lastMove.from.r === r && state.lastMove.from.c === c) || (state.lastMove.to.r === r && state.lastMove.to.c === c))) classes.push("last-to");
  if (state.clashSquare && state.clashSquare.r === r && state.clashSquare.c === c) classes.push("clash");
  const p = state.board[r][c];
  if (p && p.upgraded) classes.push("upgraded");
  if (!state.result && isKingInCheck(state.board, state.turn)) {
    const k = findKing(state.board, state.turn);
    if (k && k.r === r && k.c === c) classes.push("in-check");
  }
  if (state.upgradeInstallPicking) {
    if (p && p.color === state.turn && !p.upgraded && GameData.UPGRADES[p.type].cost <= state.upgradePoints[state.turn]) classes.push("upgrade-eligible");
  }
  return classes.join(" ");
}

function renderSquareContent(r, c) {
  const p = state.board[r][c];
  let inner = "";
  if (p) {
    const badge = p.upgraded ? `<span class="badge" style="opacity:${p.upgradeUsed ? 0.4 : 1}">${GameData.UPGRADES[p.type].emoji}</span>` : "";
    inner += `<span class="piece ${p.color}">${PIECE_GLYPH[p.type]}</span>${badge}`;
  }
  const isTarget = state.legalTargets.some((t) => t.r === r && t.c === c);
  if (isTarget) {
    const target = state.legalTargets.find((t) => t.r === r && t.c === c);
    inner += target.move.captureSquare ? `<span class="ring"></span>` : `<span class="dot"></span>`;
  }
  return inner;
}

function renderBoard() {
  let html = "";
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      html += `<div class="${squareClass(r, c)}" data-sq="${r},${c}">${renderSquareContent(r, c)}</div>`;
    }
  }
  return html;
}

function renderHud() {
  const w = GameData.HOUSES.w, b = GameData.HOUSES.b;
  const phase = currentPhase();
  const wActive = state.turn === "w" && !state.result;
  const bActive = state.turn === "b" && !state.result;
  const wHouse = phaseAtLeast(2) ? ` house-w` : "";
  const bHouse = phaseAtLeast(2) ? ` house-b` : "";
  return `
    <div class="hud">
      <div class="side-card${wHouse}${wActive ? " active" : ""}">
        <div class="name">${phaseAtLeast(2) ? w.rose : "⬜"} ${sideLabel("w")}</div>
        ${phase >= 3 ? `<div class="up">⚡ ${state.upgradePoints.w} UP</div>` : ""}
      </div>
      <div class="side-card${bHouse}${bActive ? " active" : ""}">
        <div class="name">${phaseAtLeast(2) ? b.rose : "⬛"} ${sideLabel("b")}</div>
        ${phase >= 3 ? `<div class="up">⚡ ${state.upgradePoints.b} UP</div>` : ""}
      </div>
    </div>
    <div class="phase-badge">${phaseLabel(phase)}${!state.result ? ` — ${sideLabel(state.turn)} to move` : ""}</div>
  `;
}

function phaseLabel(phase) {
  if (phase === 1) return "♟️ Classic Chess";
  if (phase === 2) return "⚔️ Wars of the Roses";
  return "🏹 The Crown in Play";
}

function renderToolbar() {
  const phase = currentPhase();
  const canUpgrade = phase >= 3 && !state.upgradeInstalledThisTurn && !state.extraMove && !state.result &&
    state.upgradePoints[state.turn] > 0 && hasEligiblePiece(state.turn);
  return `
    <div class="toolbar">
      <button data-action="new-game">🔄 New Game</button>
      <button data-action="open-rules">📜 Rules</button>
      <button data-action="toggle-mute">${Sound.isMuted() ? "🔇" : "🔊"}</button>
      ${phase >= 3 ? `<button data-action="open-upgrade" ${canUpgrade ? "" : "disabled"}>⚡ Upgrade</button>` : ""}
    </div>
  `;
}

function renderLog() {
  const entries = state.moveLog.slice(-40).reverse().map((e) => `
    <div class="entry"><span class="mv">${e.text}</span>${e.flavor ? `<span class="flavor">${e.flavor}</span>` : ""}</div>
  `).join("");
  return `<div id="log-panel">${entries || '<div class="entry">Game begins.</div>'}</div>`;
}

function renderExtraMoveBar() {
  if (!state.extraMove) return "";
  const label = state.extraMove.kind === "cavalry" ? "🐎 Border Reiver Cavalry: bonus move available!" : "👑 Kingmaker's Gambit: move the queen again?";
  return `<div class="phase-badge">${label} <button data-action="skip-extra">End Turn</button></div>`;
}

function renderUpgradePickBar() {
  if (!state.upgradeInstallPicking) return "";
  return `<div class="phase-badge">⚡ Tap one of your highlighted pieces to upgrade it. <button data-action="cancel-upgrade-pick">Cancel</button></div>`;
}

function renderModals() {
  let html = "";
  if (state.pendingPromotion) {
    html += `
      <div class="overlay">
        <div class="modal">
          <h2>Promotion</h2>
          <p>Choose a piece for your pawn.</p>
          <div class="choice-row">
            <button data-action="promote" data-type="q">♕</button>
            <button data-action="promote" data-type="r">♖</button>
            <button data-action="promote" data-type="b">♗</button>
            <button data-action="promote" data-type="n">♘</button>
          </div>
        </div>
      </div>`;
  } else if (state.upgradeConfirm) {
    const { type } = state.upgradeConfirm;
    const upg = GameData.UPGRADES[type];
    html += `
      <div class="overlay">
        <div class="modal">
          <h2>${upg.emoji} ${upg.name}</h2>
          <p>${upg.description}</p>
          <p>Cost: ${upg.cost} UP — ${upg.kind === "onetime" ? "one-time use" : "permanent ability"}</p>
          <div class="choice-row">
            <button data-action="confirm-upgrade">Install</button>
            <button data-action="cancel-upgrade">Cancel</button>
          </div>
        </div>
      </div>`;
  } else if (state.showRules) {
    html += `
      <div class="overlay">
        <div class="modal">
          <h2>📜 How This Works</h2>
          <ul>
            <li><b>Plies 0–${GameData.PHASES.phase2StartPly - 1}:</b> normal chess.</li>
            <li><b>Ply ${GameData.PHASES.phase2StartPly}+:</b> the Wars of the Roses begin — cosmetic only.</li>
            <li><b>Ply ${GameData.PHASES.phase3StartPly}+:</b> Upgrade Points unlock. Earn 1 UP per capture, plus reinforcements every ${GameData.PHASES.reinforcementInterval} plies.</li>
          </ul>
          <ul class="upgrade-list">
            ${Object.entries(GameData.UPGRADES).map(([type, u]) => `<li>${u.emoji} <b>${u.name}</b> (${PIECE_LETTER[type] || "Pawn"}, ${u.cost} UP): ${u.description}</li>`).join("")}
          </ul>
          <div class="choice-row"><button data-action="close-rules">Close</button></div>
        </div>
      </div>`;
  } else if (state.result) {
    const { winner, reason } = state.result;
    const flavor = winner === "draw" ? GameData.GAME_OVER_FLAVOR.draw : GameData.GAME_OVER_FLAVOR[winner];
    const title = winner === "draw" ? "🕊️ Draw" : `🏆 ${sideLabel(winner)} Wins`;
    html += `
      <div class="overlay">
        <div class="modal">
          <h2>${title}</h2>
          <p>${reason === "checkmate" ? "Checkmate." : reason === "stalemate" ? "Stalemate." : "Insufficient material."}</p>
          <p>${flavor}</p>
          <div class="choice-row"><button data-action="rematch">🔄 Rematch</button></div>
        </div>
      </div>`;
  }
  return html;
}

function renderStartScreen() {
  const saved = loadSave();
  const canResume = !!(saved && !saved.result);
  return `
    <div class="panel">
      <h1>♞ Advance Chess: Wars of the Roses</h1>
      <p>It starts like ordinary chess. A few moves in, the board erupts into the Wars of the
      Roses — York against Lancaster. A few moves after that, commanders start earning
      battlefield upgrades: longbow pawns, cavalry knights, siege rooks. Two players, one
      board, pass and play.</p>
      <button data-action="new-game">⚔️ New Game</button>
      ${canResume ? `<button data-action="resume-game">▶️ Resume</button>` : ""}
      <button data-action="open-rules">📜 How This Works</button>
    </div>
  `;
}

function renderGameScreen() {
  return `
    <div id="game-wrap">
      ${renderHud()}
      ${renderExtraMoveBar()}
      ${renderUpgradePickBar()}
      <div id="board-frame"><div id="board">${renderBoard()}</div></div>
      ${renderToolbar()}
      ${renderLog()}
    </div>
  `;
}

function render() {
  document.body.className = state.screen === "playing" ? `phase-${currentPhase()}` : "";
  const app = document.getElementById("app");
  app.innerHTML = state.screen === "start" ? renderStartScreen() : renderGameScreen();
  app.insertAdjacentHTML("beforeend", renderModals());
  if (state.clashSquare) {
    clearTimeout(render._clashT);
    render._clashT = setTimeout(() => { state.clashSquare = null; }, 400);
  }
}

// ---------- init ----------

function init() {
  const saved = loadSave();
  if (saved) Sound.setMuted(!!saved.muted);
  render();
  bindEvents();
}

init();
