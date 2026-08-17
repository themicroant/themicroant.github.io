// 7 Wonders — game engine: pure game-state logic, no DOM access. Loaded after game-data.js and
// before script.js (which is the DOM/rendering layer). Exported via module.exports (like
// game-data.js) so it can be `require()`d and simulated/tested directly in Node, with no browser
// needed — see scripts/simulate.js.
//
// Scope: the base game for 3 or 4 players (docs/requirements.md §1). Not implemented: the
// Leaders expansion and the 2-player "Free City" variant (docs/rules.md). Several rules corners
// are deliberately simplified for a single-player-vs-AI implementation — see the "Simplifications"
// note in docs/requirements.md §3b, and the inline notes below near each one.
"use strict";

// In the browser, `GameData` is already a top-level identifier from game-data.js's own
// `const GameData` — classic <script> tags share one top-level scope, so it's directly readable
// here with no import. In Node that binding doesn't exist, so this pulls it in via require().
// Deliberately named `GD` (not `GameData`) throughout this file: `const GameData = require(...)`
// here would be a static redeclaration of the browser's `const GameData` in the shared script
// scope — a SyntaxError at parse time regardless of which branch runs — so this uses a distinct
// local name instead.
const GD = (typeof module !== "undefined" && module.exports) ? require("./game-data.js") : GameData;

const CARD_BY_ID = {};
GD.CARDS.forEach((c) => { CARD_BY_ID[c.id] = c; });
const WONDER_BY_ID = {};
GD.WONDERS.forEach((w) => { WONDER_BY_ID[w.id] = w; });

const MANUFACTURED_RESOURCES = ["glass", "loom", "papyrus"];
const MILITARY_TOKEN_BY_AGE = { 1: 1, 2: 3, 3: 5 };

// ---- small utilities ----

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function neighborsOf(game, playerIdx) {
  const n = game.numPlayers;
  return { left: (playerIdx + 1) % n, right: (playerIdx - 1 + n) % n };
}

function playersInScope(game, playerIdx, scope) {
  const { left, right } = neighborsOf(game, playerIdx);
  if (scope === "neighbors") return [left, right];
  if (scope === "neighborsAndSelf" || scope === "selfAndNeighbors") return [playerIdx, left, right];
  return [playerIdx]; // 'self' or unspecified
}

function hasPower(player, powerName) {
  return player.wonder.stages
    .slice(0, player.wonderStagesBuilt)
    .some((s) => s.effect.power === powerName);
}

// ---- setup / dealing ----

// Deck composition per Age: a fixed pool sized for up to 4 players, reused regardless of actual
// player count (a documented content simplification — see game-data.js's CARDS comment). Age III
// follows the real rule of keeping `numPlayers + 2` random Guilds and shuffling them back in
// among the non-Guild Age III cards (docs/rules.md §Setup).
function buildDeckPools(numPlayers) {
  const handTotal = 7 * numPlayers;

  // Filter cards by minimum player count: only include cards where playerCount <= numPlayers
  const isCardValid = (c) => c.playerCount <= numPlayers;

  const age1 = shuffle(GD.CARDS.filter((c) => c.age === 1 && isCardValid(c))).slice(0, handTotal).map((c) => c.id);
  const age2 = shuffle(GD.CARDS.filter((c) => c.age === 2 && isCardValid(c))).slice(0, handTotal).map((c) => c.id);

  const age3NonGuild = shuffle(GD.CARDS.filter((c) => c.age === 3 && c.type !== "guild" && isCardValid(c)));
  const guildsToKeep = shuffle(GD.CARDS.filter((c) => c.age === 3 && c.type === "guild" && isCardValid(c))).slice(0, numPlayers + 2);
  const age3NeedNonGuild = handTotal - guildsToKeep.length;
  const age3 = shuffle([...age3NonGuild.slice(0, age3NeedNonGuild), ...guildsToKeep]).map((c) => c.id);

  return { 1: age1, 2: age2, 3: age3 };
}

function createGame(numPlayers, options = {}) {
  if (!GD.SUPPORTED_PLAYER_COUNTS.includes(numPlayers)) {
    throw new Error(`Unsupported player count: ${numPlayers} (supported: ${GD.SUPPORTED_PLAYER_COUNTS.join(", ")})`);
  }
  const wonderPool = shuffle(GD.WONDERS);
  let wonders = wonderPool;
  if (options.humanWonderId) {
    const chosen = WONDER_BY_ID[options.humanWonderId];
    const rest = shuffle(wonderPool.filter((w) => w.id !== options.humanWonderId));
    wonders = [chosen, ...rest];
  }

  const players = [];
  for (let i = 0; i < numPlayers; i++) {
    players.push({
      id: i,
      isHuman: i === 0,
      name: i === 0 ? (options.humanName || "You") : `AI ${i}`,
      wonder: wonders[i],
      wonderStagesBuilt: 0,
      coins: 3, // starting treasury per docs/rules.md §Setup
      built: [],
      hand: [],
      militaryTokens: [],
      freeBuildUsedThisAge: false,
      discardPileBuildUsedThisAge: false,
      // Trading-post-style discount cards apply "starting on the turn following" construction
      // (docs/rules.md), tracked as the first game.globalTurn the discount is active from.
      tradeDiscountReadyTurn: { basic: null, manufactured: null },
    });
  }

  const game = {
    numPlayers,
    players,
    deckPools: buildDeckPools(numPlayers),
    discardPile: [],
    age: 0,
    turn: 0,
    globalTurn: 1,
    phase: "setup",
    log: [],
    finalScores: null,
  };
  startAge(game, 1);
  return game;
}

function startAge(game, age) {
  game.age = age;
  game.turn = 1;
  game.phase = "draft";
  const pool = game.deckPools[age];
  game.players.forEach((p, idx) => {
    p.hand = pool.slice(idx * 7, idx * 7 + 7);
    p.freeBuildUsedThisAge = false;
    p.discardPileBuildUsedThisAge = false;
  });
  game.log.push(`Age ${age} begins.`);
}

// Hand-passing direction per Age, per docs/rules.md: Age I left, Age II right, Age III left.
function passDirectionForAge(age) {
  return age === 2 ? "right" : "left";
}

function passHands(game, direction) {
  const hands = game.players.map((p) => p.hand);
  const n = game.numPlayers;
  game.players.forEach((p, idx) => {
    const fromIdx = direction === "left" ? (idx - 1 + n) % n : (idx + 1) % n;
    p.hand = hands[fromIdx];
  });
}

// ---- production & cost solving ----

function computeProduction(game, playerIdx) {
  const p = game.players[playerIdx];
  const fixed = {};
  fixed[p.wonder.resource] = (fixed[p.wonder.resource] || 0) + 1;
  const choices = [];
  p.built.forEach((id) => {
    const c = CARD_BY_ID[id];
    if (!c.produces || !c.produces.length) return;
    if (c.producesChoice) {
      choices.push(c.produces);
    } else {
      c.produces.forEach((r) => { fixed[r] = (fixed[r] || 0) + (c.produceCount || 1); });
    }
  });
  return { fixed, choices };
}

// Finds the assignment of each choice-resource card (e.g. "1 of clay/ore/stone/wood") to a
// specific resource that minimizes the shortfall against `cost`. Choice counts are always small
// (a handful of cards at most), so a brute-force search over all combinations is plenty fast.
function solveCost(production, cost) {
  const resourceKeys = Object.keys(cost || {}).filter((k) => k !== "coins");
  const choices = production.choices;
  let best = null;

  function tryAssignment(idx, chosen) {
    if (idx === choices.length) {
      const avail = { ...production.fixed };
      chosen.forEach((r) => { avail[r] = (avail[r] || 0) + 1; });
      const shortfall = {};
      let total = 0;
      resourceKeys.forEach((k) => {
        const need = (cost[k] || 0) - (avail[k] || 0);
        if (need > 0) { shortfall[k] = need; total += need; }
      });
      if (!best || total < best.total) best = { shortfall, total };
      return;
    }
    for (const option of choices[idx]) {
      chosen.push(option);
      tryAssignment(idx + 1, chosen);
      chosen.pop();
    }
  }

  tryAssignment(0, []);
  return best || { shortfall: {}, total: 0 };
}

function tradeUnitCost(game, playerIdx, resource) {
  const p = game.players[playerIdx];
  const category = MANUFACTURED_RESOURCES.includes(resource) ? "manufactured" : "basic";
  const readyTurn = p.tradeDiscountReadyTurn[category];
  return readyTurn != null && game.globalTurn >= readyTurn ? 1 : 2;
}

// Whole-cost affordability, including buying any shortfall from neighbors. Simplifications vs.
// the physical game (documented in docs/requirements.md §3b): a neighbor can sell an unlimited
// quantity of a resource they produce in one turn (no per-card "only 1 unit" contention modeled);
// when both neighbors can supply the same resource, this always buys from the left one (no UI
// choice); resources reserved for a card owner's exclusive use aren't modeled — all of a
// neighbor's production is treated as purchasable.
function canAffordWithCommerce(game, playerIdx, cost) {
  const p = game.players[playerIdx];
  const production = computeProduction(game, playerIdx);
  const { shortfall } = solveCost(production, cost);
  if (Object.keys(shortfall).length === 0) return { ok: true, coinsNeeded: 0, purchases: [] };

  const { left, right } = neighborsOf(game, playerIdx);
  const leftProd = computeProduction(game, left);
  const rightProd = computeProduction(game, right);
  const canSupply = (prod, resource) =>
    (prod.fixed[resource] || 0) > 0 || prod.choices.some((opts) => opts.includes(resource));

  let coinsNeeded = 0;
  const purchases = [];
  for (const [resource, count] of Object.entries(shortfall)) {
    const leftOk = canSupply(leftProd, resource);
    const rightOk = canSupply(rightProd, resource);
    if (!leftOk && !rightOk) return { ok: false };
    const from = leftOk ? "left" : "right";
    const unitCost = tradeUnitCost(game, playerIdx, resource);
    coinsNeeded += unitCost * count;
    purchases.push({ resource, count, from, unitCost });
  }
  if (p.coins < coinsNeeded) return { ok: false };
  return { ok: true, coinsNeeded, purchases };
}

function applyPurchases(game, playerIdx, purchases) {
  const { left, right } = neighborsOf(game, playerIdx);
  purchases.forEach(({ resource, count, from, unitCost }) => {
    const sellerIdx = from === "left" ? left : right;
    const total = count * unitCost;
    game.players[playerIdx].coins -= total;
    game.players[sellerIdx].coins += total;
    game.log.push(
      `${game.players[playerIdx].name} buys ${count} ${resource} from ${game.players[sellerIdx].name} for ${total} coins.`
    );
  });
}

function effectiveCost(game, playerIdx, card) {
  const p = game.players[playerIdx];
  const freeViaChain = (card.chainFrom || []).some((f) => p.built.includes(f));
  return freeViaChain ? {} : (card.cost || {});
}

// ---- turn actions ----

function applyBuild(game, playerIdx, cardId) {
  const p = game.players[playerIdx];
  const card = CARD_BY_ID[cardId];
  if (!p.hand.includes(cardId)) return { success: false, reason: "not-in-hand" };
  const cost = effectiveCost(game, playerIdx, card);
  const afford = canAffordWithCommerce(game, playerIdx, cost);
  if (!afford.ok) return { success: false, reason: "cannot-afford" };

  applyPurchases(game, playerIdx, afford.purchases);
  p.built.push(cardId);
  p.hand = p.hand.filter((id) => id !== cardId);
  p.coins += card.coinsOnPlay || 0;
  if (card.coinsPerCardType) p.coins += countCardType(game, playerIdx, card.coinsPerCardType) * card.coinsPerCardType.per;
  if (card.coinsPerWonderStage) p.coins += countWonderStages(game, playerIdx, card.coinsPerWonderStage.scope) * card.coinsPerWonderStage.per;
  if (card.tradeDiscount) p.tradeDiscountReadyTurn[card.tradeDiscount.category] = game.globalTurn + 1;

  game.log.push(`${p.name} builds ${card.name}.`);
  return { success: true };
}

function applyWonderStage(game, playerIdx, cardId) {
  const p = game.players[playerIdx];
  if (!p.hand.includes(cardId)) return { success: false, reason: "not-in-hand" };
  if (p.wonderStagesBuilt >= p.wonder.stages.length) return { success: false, reason: "wonder-complete" };
  const stage = p.wonder.stages[p.wonderStagesBuilt];
  const afford = canAffordWithCommerce(game, playerIdx, stage.cost);
  if (!afford.ok) return { success: false, reason: "cannot-afford" };

  applyPurchases(game, playerIdx, afford.purchases);
  p.hand = p.hand.filter((id) => id !== cardId);
  p.wonderStagesBuilt += 1;
  p.coins += stage.effect.coins || 0;

  game.log.push(`${p.name} builds Wonder stage ${p.wonderStagesBuilt} of ${p.wonder.name}.`);
  return { success: true };
}

function applyDiscard(game, playerIdx, cardId) {
  const p = game.players[playerIdx];
  if (!p.hand.includes(cardId)) return { success: false, reason: "not-in-hand" };
  p.hand = p.hand.filter((id) => id !== cardId);
  game.discardPile.push(cardId);
  p.coins += 3;
  game.log.push(`${p.name} discards ${CARD_BY_ID[cardId].name} for 3 coins.`);
  return { success: true };
}

// Olympia-style power (docs/requirements.md §3b power assignment): once per Age, build a hand
// card for free. A bonus on top of the player's normal turn action, not a replacement for it.
function applyFreeBuildFromHand(game, playerIdx, cardId) {
  const p = game.players[playerIdx];
  if (!hasPower(p, "freeBuildPerAge") || p.freeBuildUsedThisAge) return { success: false, reason: "power-unavailable" };
  if (!p.hand.includes(cardId)) return { success: false, reason: "not-in-hand" };
  const card = CARD_BY_ID[cardId];

  p.built.push(cardId);
  p.hand = p.hand.filter((id) => id !== cardId);
  p.freeBuildUsedThisAge = true;
  p.coins += card.coinsOnPlay || 0;
  if (card.coinsPerCardType) p.coins += countCardType(game, playerIdx, card.coinsPerCardType) * card.coinsPerCardType.per;
  if (card.coinsPerWonderStage) p.coins += countWonderStages(game, playerIdx, card.coinsPerWonderStage.scope) * card.coinsPerWonderStage.per;
  if (card.tradeDiscount) p.tradeDiscountReadyTurn[card.tradeDiscount.category] = game.globalTurn + 1;

  game.log.push(`${p.name} uses their free build to construct ${card.name}.`);
  return { success: true };
}

// Halikarnassos-style power: once per Age, reclaim any card from the shared discard pile and
// build it for free. Also a bonus action, independent of the hand-card turn action.
function applyDiscardPileBuild(game, playerIdx, cardId) {
  const p = game.players[playerIdx];
  if (!hasPower(p, "discardPileBuild") || p.discardPileBuildUsedThisAge) return { success: false, reason: "power-unavailable" };
  if (!game.discardPile.includes(cardId)) return { success: false, reason: "not-in-discard" };
  const card = CARD_BY_ID[cardId];

  game.discardPile = game.discardPile.filter((id) => id !== cardId);
  p.built.push(cardId);
  p.discardPileBuildUsedThisAge = true;
  p.coins += card.coinsOnPlay || 0;

  game.log.push(`${p.name} reclaims ${card.name} from the discard pile.`);
  return { success: true };
}

function applyAction(game, playerIdx, action, cardId) {
  if (action === "build") return applyBuild(game, playerIdx, cardId);
  if (action === "wonder") return applyWonderStage(game, playerIdx, cardId);
  if (action === "discard") return applyDiscard(game, playerIdx, cardId);
  if (action === "freeBuild") return applyFreeBuildFromHand(game, playerIdx, cardId);
  if (action === "discardPileBuild") return applyDiscardPileBuild(game, playerIdx, cardId);
  return { success: false, reason: "unknown-action" };
}

function getAvailableActionsForCard(game, playerIdx, cardId) {
  const p = game.players[playerIdx];
  const card = CARD_BY_ID[cardId];
  const cost = effectiveCost(game, playerIdx, card);
  const buildAfford = canAffordWithCommerce(game, playerIdx, cost);
  const wonderNextStage = p.wonderStagesBuilt < p.wonder.stages.length ? p.wonder.stages[p.wonderStagesBuilt] : null;
  const wonderAfford = wonderNextStage ? canAffordWithCommerce(game, playerIdx, wonderNextStage.cost) : { ok: false };
  return {
    canBuild: buildAfford.ok,
    buildCoinsNeeded: buildAfford.coinsNeeded || 0,
    isFreeViaChain: Object.keys(cost).length === 0 && Object.keys(card.cost || {}).length > 0,
    canWonder: !!wonderNextStage && wonderAfford.ok,
    wonderCoinsNeeded: wonderAfford.coinsNeeded || 0,
    wonderStageIndex: p.wonderStagesBuilt,
    canDiscard: true,
  };
}

// ---- AI ----

function cardHeuristicValue(card) {
  let v = (card.vp || 0) * 2 + (card.shields || 0) * 3 + (card.coinsOnPlay || 0) * 0.5;
  if (card.science) v += 4;
  if (card.chainTo && card.chainTo.length) v += 2;
  if (card.type === "guild") v += 6;
  if (card.produces && card.produces.length) v += card.producesChoice ? 2.5 : 1.5;
  if (card.tradeDiscount) v += 2;
  if (card.coinsPerCardType || card.vpPerCardType || card.coinsPerWonderStage || card.vpPerWonderStage) v += 3;
  return v;
}

// Simple greedy heuristic (not a lookahead/minimax AI): prefers the highest-value affordable
// build, falls back to a Wonder stage, then discards its least useful card. Good enough to fill
// out a playable single-player game; not intended to play optimally.
function aiChooseAction(game, playerIdx) {
  const p = game.players[playerIdx];
  if (!p.hand.length) return null;
  let best = null;
  const consider = (candidate) => { if (!best || candidate.value > best.value) best = candidate; };

  p.hand.forEach((cardId) => {
    const card = CARD_BY_ID[cardId];
    const cost = effectiveCost(game, playerIdx, card);
    const afford = canAffordWithCommerce(game, playerIdx, cost);
    if (afford.ok) consider({ action: "build", cardId, value: cardHeuristicValue(card) - (afford.coinsNeeded || 0) * 0.5 });
  });

  if (p.wonderStagesBuilt < p.wonder.stages.length) {
    const stage = p.wonder.stages[p.wonderStagesBuilt];
    const afford = canAffordWithCommerce(game, playerIdx, stage.cost);
    if (afford.ok) {
      const markerCardId = p.hand.slice().sort((a, b) => cardHeuristicValue(CARD_BY_ID[a]) - cardHeuristicValue(CARD_BY_ID[b]))[0];
      const stageValue = 8 + (stage.effect.vp || 0) + (stage.effect.power ? 6 : 0) - (afford.coinsNeeded || 0) * 0.5;
      consider({ action: "wonder", cardId: markerCardId, value: stageValue });
    }
  }

  if (!best) {
    const worst = p.hand.slice().sort((a, b) => cardHeuristicValue(CARD_BY_ID[a]) - cardHeuristicValue(CARD_BY_ID[b]))[0];
    return { action: "discard", cardId: worst };
  }
  return best;
}

function aiUseBonusPowers(game, playerIdx) {
  const p = game.players[playerIdx];
  if (hasPower(p, "freeBuildPerAge") && !p.freeBuildUsedThisAge && p.hand.length) {
    const buildable = p.hand.filter((id) => !getAvailableActionsForCard(game, playerIdx, id).canBuild);
    if (buildable.length) {
      const best = buildable.slice().sort((a, b) => cardHeuristicValue(CARD_BY_ID[b]) - cardHeuristicValue(CARD_BY_ID[a]))[0];
      applyFreeBuildFromHand(game, playerIdx, best);
    }
  }
  if (hasPower(p, "discardPileBuild") && !p.discardPileBuildUsedThisAge && game.discardPile.length) {
    const best = game.discardPile.slice().sort((a, b) => cardHeuristicValue(CARD_BY_ID[b]) - cardHeuristicValue(CARD_BY_ID[a]))[0];
    if (cardHeuristicValue(CARD_BY_ID[best]) > 3) applyDiscardPileBuild(game, playerIdx, best);
  }
}

function runAiTurns(game) {
  for (let i = 1; i < game.numPlayers; i++) {
    aiUseBonusPowers(game, i);
    if (!game.players[i].hand.length) continue;
    const choice = aiChooseAction(game, i);
    if (choice) applyAction(game, i, choice.action, choice.cardId);
  }
}

// ---- military ----

function computeMilitaryStrength(game, playerIdx) {
  const p = game.players[playerIdx];
  let shields = 0;
  p.built.forEach((id) => { shields += CARD_BY_ID[id].shields || 0; });
  p.wonder.stages.slice(0, p.wonderStagesBuilt).forEach((s) => { shields += s.effect.shields || 0; });
  return shields;
}

function resolveMilitary(game) {
  const tokenValue = MILITARY_TOKEN_BY_AGE[game.age];
  const strengths = game.players.map((_, idx) => computeMilitaryStrength(game, idx));
  game.players.forEach((p, idx) => {
    const { left, right } = neighborsOf(game, idx);
    [left, right].forEach((nIdx) => {
      if (strengths[idx] > strengths[nIdx]) p.militaryTokens.push(tokenValue);
      else if (strengths[idx] < strengths[nIdx]) p.militaryTokens.push(-1);
    });
  });
  game.log.push(`Age ${game.age} military conflicts resolved.`);
}

// ---- turn/age flow ----

// A power that lets the player choose what happens to the Age's automatically-discarded last
// card (docs/rules.md "BOARDS"), instead of it being silently discarded for no coins. Resolved
// automatically (best available action) for both AI and the human — no dedicated UI for this
// rare corner (documented simplification, docs/requirements.md §3b).
function resolveLeftoverCard(game, playerIdx) {
  const p = game.players[playerIdx];
  if (!p.hand.length) return;
  const cardId = p.hand[0];
  if (hasPower(p, "lastCardAlternative")) {
    const wonderTry = applyWonderStage(game, playerIdx, cardId);
    if (!wonderTry.success) applyDiscard(game, playerIdx, cardId);
  } else {
    game.discardPile.push(cardId);
    p.hand = [];
    game.log.push(`${p.name} discards their last card of the Age (no bonus).`);
  }
}

function finishTurn(game) {
  game.globalTurn += 1;
  if (game.turn === 6) {
    game.players.forEach((_, idx) => resolveLeftoverCard(game, idx));

    const completedAge = game.age;
    const prevTokenCounts = game.players.map((p) => p.militaryTokens.length);
    const strengths = game.players.map((_, idx) => computeMilitaryStrength(game, idx));
    resolveMilitary(game);
    const militarySummary = game.players.map((p, idx) => ({
      playerIdx: idx, name: p.name, strength: strengths[idx],
      tokensGained: p.militaryTokens.slice(prevTokenCounts[idx]),
    }));

    if (game.age < 3) {
      startAge(game, game.age + 1);
      return { event: "ageEnd", age: completedAge, militarySummary };
    }
    game.phase = "gameEnd";
    game.finalScores = computeFinalScores(game);
    return { event: "gameEnd", age: completedAge, militarySummary };
  }
  passHands(game, passDirectionForAge(game.age));
  game.turn += 1;
  return { event: "nextTurn" };
}

function advanceAfterHuman(game) {
  runAiTurns(game);
  return finishTurn(game);
}

function playHumanTurn(game, action, cardId) {
  const result = applyAction(game, 0, action, cardId);
  if (!result.success) return { success: false, reason: result.reason };
  const turnResult = advanceAfterHuman(game);
  return { success: true, ...turnResult };
}

// ---- scoring ----

function countCardType(game, playerIdx, { cardType, scope }) {
  return playersInScope(game, playerIdx, scope).reduce(
    (count, idx) => count + game.players[idx].built.filter((id) => CARD_BY_ID[id].type === cardType).length,
    0
  );
}

function countCardTypes(game, playerIdx, { cardTypes, scope }) {
  return playersInScope(game, playerIdx, scope).reduce(
    (count, idx) => count + game.players[idx].built.filter((id) => cardTypes.includes(CARD_BY_ID[id].type)).length,
    0
  );
}

function countWonderStages(game, playerIdx, scope) {
  return playersInScope(game, playerIdx, scope).reduce((sum, idx) => sum + game.players[idx].wonderStagesBuilt, 0);
}

function countDefeatTokens(game, playerIdx, scope) {
  return playersInScope(game, playerIdx, scope).reduce(
    (sum, idx) => sum + game.players[idx].militaryTokens.filter((t) => t < 0).length,
    0
  );
}

function computeCardEndGameVP(game, playerIdx, card) {
  let vp = card.vp || 0;
  if (card.vpPerCardType) vp += countCardType(game, playerIdx, card.vpPerCardType) * card.vpPerCardType.per;
  if (card.vpPerWonderStage) vp += countWonderStages(game, playerIdx, card.vpPerWonderStage.scope) * card.vpPerWonderStage.per;
  return vp;
}

function scienceCounts(game, playerIdx) {
  const tally = { tablet: 0, compass: 0, gear: 0 };
  game.players[playerIdx].built.forEach((id) => {
    const c = CARD_BY_ID[id];
    if (c.science) tally[c.science]++;
  });
  return tally;
}

// The formula transcribed in docs/rules.md: identical-symbol sets score count^2 each, plus 7 VP
// per complete set of 3 different symbols — both cumulative from the same totals.
function scienceScoreFromCounts(t) {
  return t.tablet ** 2 + t.compass ** 2 + t.gear ** 2 + 7 * Math.min(t.tablet, t.compass, t.gear);
}

// Scientists Guild grants "an extra scientific symbol of your choice" — greedily assigns each
// such bonus to whichever symbol currently maximizes the resulting score.
function computeScienceScore(game, playerIdx) {
  let tally = scienceCounts(game, playerIdx);
  const specials = game.players[playerIdx].built.filter((id) => CARD_BY_ID[id].special === "extraScienceSymbol").length;
  for (let i = 0; i < specials; i++) {
    let bestKey = null;
    let bestScore = -Infinity;
    for (const key of ["tablet", "compass", "gear"]) {
      const score = scienceScoreFromCounts({ ...tally, [key]: tally[key] + 1 });
      if (score > bestScore) { bestScore = score; bestKey = key; }
    }
    tally = { ...tally, [bestKey]: tally[bestKey] + 1 };
  }
  return scienceScoreFromCounts(tally);
}

function guildScoreForRule(game, evalPlayerIdx, rule) {
  if (!rule) return 0;
  switch (rule.kind) {
    case "countCardType": return countCardType(game, evalPlayerIdx, rule) * rule.per;
    case "countCardTypes": return countCardTypes(game, evalPlayerIdx, rule) * rule.per;
    case "countWonderStages": return countWonderStages(game, evalPlayerIdx, rule.scope) * rule.per;
    case "countDefeatTokens": return countDefeatTokens(game, evalPlayerIdx, rule.scope) * rule.per;
    default: return 0;
  }
}

// Babylon-style power: at game end, "copy" the higher-scoring neighboring Guild as if it were
// this player's own (evaluated against this player's own neighbors), auto-picking the best one.
function computeGuildScore(game, playerIdx) {
  const p = game.players[playerIdx];
  let total = 0;
  const details = [];
  p.built.forEach((id) => {
    const card = CARD_BY_ID[id];
    if (card.type !== "guild" || !card.guildRule) return;
    const s = guildScoreForRule(game, playerIdx, card.guildRule);
    total += s;
    details.push({ card: card.name, vp: s });
  });
  if (hasPower(p, "copyNeighborGuild")) {
    const { left, right } = neighborsOf(game, playerIdx);
    let best = 0;
    let bestName = null;
    [left, right].forEach((nIdx) => {
      game.players[nIdx].built.forEach((id) => {
        const card = CARD_BY_ID[id];
        if (card.type !== "guild" || !card.guildRule) return;
        const s = guildScoreForRule(game, playerIdx, card.guildRule);
        if (s > best) { best = s; bestName = card.name; }
      });
    });
    if (bestName) { total += best; details.push({ card: `${bestName} (copied)`, vp: best }); }
  }
  return { total, details };
}

function computeFinalScores(game) {
  return game.players
    .map((p, idx) => {
      const military = p.militaryTokens.reduce((a, b) => a + b, 0);
      const treasury = Math.floor(p.coins / 3);
      const wonder = p.wonder.stages.slice(0, p.wonderStagesBuilt).reduce((sum, s) => sum + (s.effect.vp || 0), 0);
      const civilian = p.built
        .filter((id) => CARD_BY_ID[id].type === "civilian")
        .reduce((sum, id) => sum + computeCardEndGameVP(game, idx, CARD_BY_ID[id]), 0);
      const scientific = computeScienceScore(game, idx);
      const commercial = p.built
        .filter((id) => CARD_BY_ID[id].type === "commercial")
        .reduce((sum, id) => sum + computeCardEndGameVP(game, idx, CARD_BY_ID[id]), 0);
      const guildResult = computeGuildScore(game, idx);
      const total = military + treasury + wonder + civilian + scientific + commercial + guildResult.total;
      return {
        playerIdx: idx, name: p.name, coins: p.coins, wonderName: p.wonder.name,
        military, treasury, wonder, civilian, scientific, commercial,
        guilds: guildResult.total, guildDetails: guildResult.details, total,
      };
    })
    .sort((a, b) => b.total - a.total || b.coins - a.coins);
}

// A single namespace object (like `GameData` from game-data.js) rather than ~40 bare top-level
// identifiers sharing script scope with script.js — same access pattern in both the browser
// (`GameEngine.createGame(...)`, classic <script> shared top-level scope, no bundler) and Node
// (`require("./engine.js").createGame(...)`).
const GameEngine = {
  CARD_BY_ID, WONDER_BY_ID,
  createGame, startAge, passHands, buildDeckPools, shuffle,
  computeProduction, solveCost, canAffordWithCommerce, effectiveCost,
  applyBuild, applyWonderStage, applyDiscard, applyFreeBuildFromHand, applyDiscardPileBuild,
  applyAction, getAvailableActionsForCard,
  aiChooseAction, aiUseBonusPowers, runAiTurns,
  computeMilitaryStrength, resolveMilitary,
  playHumanTurn, advanceAfterHuman, finishTurn,
  hasPower, neighborsOf,
  computeFinalScores, computeScienceScore, computeGuildScore, guildScoreForRule,
};

if (typeof module !== "undefined" && module.exports) module.exports = GameEngine;
