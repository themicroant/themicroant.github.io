// 7 Wonders — UI / rendering layer. Loaded after game-data.js and engine.js (game/engine.js
// holds all game-state logic; this file only reads that state and renders it / wires up DOM
// events). See docs/requirements.md §2 for the screen inventory.
"use strict";

const SAVE_KEY = "sevenwonders_save"; // not yet wired up — no persistence implemented yet.

const state = {
  screen: "setup", // 'setup' | 'hand' | 'ageEnd' | 'gameEnd'
  game: null,
  setup: { numPlayers: 4, wonderId: null },
  selectedCardId: null,
  freeBuildArmed: false,
  showCity: false,
  showDiscardPicker: false,
  ageEndInfo: null,
};

// ---- helpers ----

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function formatChainList(ids) {
  return ids
    .map((id) => id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()))
    .join(", ");
}

function costEntries(cost) {
  return Object.entries(cost || {}).map(([key, count]) => ({ key, count }));
}

// Renders one of the illustrated icons (GameData.ICONS / RESOURCES[x].icon / SCIENCE_SYMBOLS[x].icon)
// inline. `size` is a CSS length (default matches surrounding text height); alt text comes from
// the resource/symbol label so the icon isn't silent to screen readers.
function iconImg(src, alt, size) {
  return `<img class="icon-img" src="${src}" alt="${escapeHtml(alt || "")}" style="${size ? `--icon-size:${size};` : ""}">`;
}

function resIcon(key, size) {
  const r = GameData.RESOURCES[key];
  return r ? iconImg(r.icon, r.label, size) : "";
}

function sciIcon(key, size) {
  const s = GameData.SCIENCE_SYMBOLS[key];
  return s ? iconImg(s.icon, s.label, size) : "";
}

// A resource-or-coins icon, for cost entries where the special "coins" pseudo-resource can appear
// alongside real resources (see costEntries/effectiveCost in engine.js).
function costIcon(key, size) {
  return key === "coins" ? iconImg(GameData.ICONS.coins, "Coins", size) : resIcon(key, size);
}

// The hand is a responsive CSS grid (column count varies by viewport width), so Up/Down arrow
// navigation reads the live column count from computed style rather than assuming a fixed value.
function gridColumnCount(gridEl) {
  return getComputedStyle(gridEl).gridTemplateColumns.split(" ").filter(Boolean).length || 1;
}

// Picks a card-art image (GameData.CARD_ART.pool) for this card. Only 3 images exist for 88
// cards, so this deterministically hashes the card's own id into the shared pool — the same
// card always shows the same art on every render (not random/flickering), spread evenly across
// all cards rather than grouped by type (see game-data.js's CARD_ART comment for why).
function cardArtUrl(card) {
  const pool = GameData.CARD_ART.pool;
  let hash = 0;
  for (let i = 0; i < card.id.length; i++) hash = (hash * 31 + card.id.charCodeAt(i)) >>> 0;
  return pool[hash % pool.length];
}

// The single most important stat to surface as a glanceable badge on a grid tile, by card type
// — everything else (full cost breakdown, effect text, chain info) lives in the selected-card
// detail panel instead, not on every tile at once.
function primaryValueBadge(card) {
  if ((card.type === "civilian" || card.type === "guild") && card.vp) return `${iconImg(GameData.ICONS.vp, "VP")} ${card.vp}`;
  if (card.type === "commercial" && card.coinsOnPlay) return `${iconImg(GameData.ICONS.coins, "Coins")}+${card.coinsOnPlay}`;
  if (card.type === "scientific" && card.science) return sciIcon(card.science);
  if (card.type === "military" && card.shields) return `${iconImg(GameData.ICONS.shields, "Shields")}${card.shields}`;
  if ((card.type === "raw" || card.type === "manufactured") && card.produceCount > 1) return `×${card.produceCount}`;
  return null;
}

// ---- card rendering (hand screen) ----

function renderCard(game, card, isSelected, isTabbable) {
  const type = GameData.CARD_TYPES[card.type];
  const actions = GameEngine.getAvailableActionsForCard(game, 0, card.id);
  const cost = costEntries(card.cost);
  const value = primaryValueBadge(card);

  const costLabel = actions.isFreeViaChain
    ? `${iconImg(GameData.ICONS.chain, "Chain")} Free`
    : cost.length
      ? cost.map((c) => `${costIcon(c.key)}${c.count > 1 ? c.count : ""}`).join(" ")
      : "Free";

  return `
    <button
      type="button"
      class="card${!actions.canBuild ? " unaffordable" : ""}"
      role="option"
      data-id="${card.id}"
      aria-selected="${isSelected}"
      tabindex="${isTabbable ? "0" : "-1"}"
      style="--card-type-color: ${type.color};"
    >
      <div class="card-name-bar">${escapeHtml(card.name)}</div>
      <div class="card-art" style="background-image: url('${cardArtUrl(card)}');">
        <div class="card-emoji-badge">${card.emoji}</div>
        ${!actions.canBuild ? '<div class="card-lock-badge" title="Cannot currently afford">🔒</div>' : ""}
        <div class="card-cost-pill">${costLabel}</div>
        ${value ? `<div class="card-value-badge">${value}</div>` : ""}
      </div>
    </button>
  `;
}

// Full detail for the currently-selected card — cost breakdown, produce/VP/shields/science/coin
// badges, effect text, chain hints — shown once, in the action bar, rather than crammed onto
// every tile in the hand at once (see renderCard above).
function cardDetailHtml(game, card) {
  const type = GameData.CARD_TYPES[card.type];
  const actions = GameEngine.getAvailableActionsForCard(game, 0, card.id);
  const cost = costEntries(card.cost);

  const produceBadges = card.produces.length
    ? `<div class="card-row"><span class="label">Produces</span>${card.produces
        .map((r) => `<span class="icon-badge">${resIcon(r)}${card.produceCount > 1 ? `×${card.produceCount}` : ""}</span>`)
        .join(card.producesChoice ? '<span class="label">or</span>' : "")}</div>`
    : "";

  const scienceBadge = card.science
    ? `<div class="card-row"><span class="label">Science</span><span class="icon-badge">${sciIcon(card.science)}</span></div>`
    : "";

  const vpBadge = card.vp
    ? `<div class="card-row"><span class="label">VP</span><span class="icon-badge">${iconImg(GameData.ICONS.vp, "VP")} ${card.vp}</span></div>`
    : "";

  const shieldBadge = card.shields
    ? `<div class="card-row"><span class="label">Military</span><span class="icon-badge">${iconImg(GameData.ICONS.shields, "Shields")} ${card.shields}</span></div>`
    : "";

  const coinBadge = card.coinsOnPlay
    ? `<div class="card-row"><span class="label">On build</span><span class="icon-badge">${iconImg(GameData.ICONS.coins, "Coins")} +${card.coinsOnPlay}</span></div>`
    : "";

  const costRow = actions.isFreeViaChain
    ? `<div class="card-row"><span class="label">Cost</span><span class="icon-badge">${iconImg(GameData.ICONS.chain, "Chain")} Free</span></div>`
    : `<div class="card-row"><span class="label">Cost</span>${
        cost.length
          ? cost.map((c) => `<span class="icon-badge">${costIcon(c.key)} ${c.count}</span>`).join("")
          : `<span class="icon-badge">Free</span>`
      }${!actions.canBuild ? '<span class="lock-badge" title="Cannot currently afford">🔒</span>' : ""}</div>`;

  const chainRow = card.chainTo.length
    ? `<div class="card-chain">${iconImg(GameData.ICONS.chain, "Chain")} Unlocks free: ${escapeHtml(formatChainList(card.chainTo))}</div>`
    : card.chainFrom.length
      ? `<div class="card-chain">${iconImg(GameData.ICONS.chain, "Chain")} Free via: ${escapeHtml(formatChainList(card.chainFrom))}</div>`
      : "";

  return `
    <div class="selected-detail">
      <div class="selected-title">${card.emoji} <strong>${escapeHtml(card.name)}</strong> <span class="selected-type">${type.label}</span></div>
      ${costRow}
      ${produceBadges}
      ${scienceBadge}
      ${vpBadge}
      ${shieldBadge}
      ${coinBadge}
      <div class="card-effect">${escapeHtml(card.effect)}</div>
      ${chainRow}
    </div>
  `;
}

// ---- hand-screen sub-panels ----

function renderStatusBar(game) {
  const me = game.players[0];
  const stageDots = me.wonder.stages
    .map((_, i) => `<span class="wonder-stage-dot${i < me.wonderStagesBuilt ? " built" : ""}" title="Wonder stage ${i + 1}"></span>`)
    .join("");
  return `
    <div class="status-bar">
      <h1>🏛️ 7 Wonders</h1>
      <div class="status-chips">
        <span class="chip">Age <strong>${game.age}</strong></span>
        <span class="chip">Turn <strong>${game.turn}</strong> / 6</span>
        <span class="chip">${iconImg(GameData.ICONS.coins, "Coins")} <strong>${me.coins}</strong></span>
        <span class="chip">${me.wonder.emoji} ${stageDots}</span>
        <button type="button" class="city-toggle" id="city-toggle">${state.showCity ? "▲" : "▼"} City</button>
      </div>
    </div>
  `;
}

function renderRivalsStrip(game) {
  const { left, right } = GameEngine.neighborsOf(game, 0);
  const chips = game.players
    .map((p, idx) => {
      if (idx === 0) return "";
      const isNeighbor = idx === left || idx === right;
      const tag = idx === left ? "Left" : idx === right ? "Right" : "";
      const shields = GameEngine.computeMilitaryStrength(game, idx);
      return `<div class="rival-chip${isNeighbor ? " neighbor" : ""}">
        <span class="rival-emoji">${p.wonder.emoji}</span>
        <span>${tag ? `<span class="rival-tag">${tag}</span> ` : ""}${escapeHtml(p.name)} · ${iconImg(GameData.ICONS.coins, "Coins")}${p.coins} · ${iconImg(GameData.ICONS.shields, "Shields")}${shields} · 🃏${p.built.length}</span>
      </div>`;
    })
    .join("");
  return `<div class="rivals-strip">${chips}</div>`;
}

function renderCityPanel(game) {
  const me = game.players[0];
  const chips = me.built.length
    ? me.built.map((id) => { const c = GameEngine.CARD_BY_ID[id]; return `<span class="city-chip">${c.emoji} ${escapeHtml(c.name)}</span>`; }).join("")
    : `<span class="city-chip">Nothing built yet</span>`;
  return `
    <div class="city-panel">
      <h3>🏙️ Your City — ${me.built.length} structures, ${me.wonder.name} stage ${me.wonderStagesBuilt}/${me.wonder.stages.length}</h3>
      <div class="city-chips">${chips}</div>
    </div>
  `;
}

function renderPowerRow(game) {
  const me = game.players[0];
  const parts = [];
  if (GameEngine.hasPower(me, "freeBuildPerAge") && !me.freeBuildUsedThisAge) {
    parts.push(`<button type="button" class="power-btn" id="power-freebuild">✨ ${state.freeBuildArmed ? "Tap a card…" : "Free Build (once/Age)"}</button>`);
  }
  if (GameEngine.hasPower(me, "discardPileBuild") && !me.discardPileBuildUsedThisAge && game.discardPile.length) {
    parts.push(`<button type="button" class="power-btn" id="power-reclaim">🗑️ Reclaim from Discard</button>`);
  }
  return parts.length ? `<div class="power-row">${parts.join("")}</div>` : "";
}

function renderDiscardModal(game) {
  const cards = game.discardPile
    .map((id) => {
      const c = GameEngine.CARD_BY_ID[id];
      return `<button type="button" class="discard-card-btn" data-id="${id}"><span class="discard-emoji">${c.emoji}</span><span>${escapeHtml(c.name)}</span></button>`;
    })
    .join("");
  return `
    <div class="modal-overlay" id="discard-modal-overlay">
      <div class="modal-panel">
        <h3>🗑️ Reclaim a card, built for free</h3>
        <div class="discard-pile-grid">${cards}</div>
        <button type="button" id="discard-modal-close" style="margin-top:10px;">Cancel</button>
      </div>
    </div>
  `;
}

function renderActionBar(game, card) {
  const actions = GameEngine.getAvailableActionsForCard(game, 0, card.id);
  const buildSub = actions.isFreeViaChain
    ? "Free (chain unlock)"
    : actions.canBuild
      ? (actions.buildCoinsNeeded ? `Own + buy for ${actions.buildCoinsNeeded}${iconImg(GameData.ICONS.coins, "coins", "0.95em")}` : "From own production")
      : "Cannot afford";
  const wonderSub = game.players[0].wonderStagesBuilt >= game.players[0].wonder.stages.length
    ? "Wonder complete"
    : actions.canWonder
      ? `Stage ${actions.wonderStageIndex + 1}${actions.wonderCoinsNeeded ? ` (+${actions.wonderCoinsNeeded}${iconImg(GameData.ICONS.coins, "coins", "0.95em")} buy)` : ""}`
      : "Cannot afford";
  return `
    <div class="action-bar" id="action-bar-slot">
      ${cardDetailHtml(game, card)}
      <div class="action-buttons">
        <button type="button" class="action-btn build" id="act-build" ${actions.canBuild ? "" : "disabled"}>
          <span class="action-title">🔨 Build</span><span class="action-sub">${buildSub}</span>
        </button>
        <button type="button" class="action-btn wonder" id="act-wonder" ${actions.canWonder ? "" : "disabled"}>
          <span class="action-title">🏛️ Wonder</span><span class="action-sub">${wonderSub}</span>
        </button>
        <button type="button" class="action-btn discard" id="act-discard">
          <span class="action-title">💰 Discard</span><span class="action-sub">+3 coins</span>
        </button>
      </div>
    </div>
  `;
}

function renderActionBarSlot(game) {
  if (!state.selectedCardId) {
    return `<div class="action-bar" id="action-bar-slot"><div class="selected-label">Select a card above to build it, use it for your Wonder, or discard it for coins.</div></div>`;
  }
  return renderActionBar(game, GameEngine.CARD_BY_ID[state.selectedCardId]);
}

// ---- screens ----

function renderWonderCard(w, selected) {
  return `
    <button type="button" class="wonder-card${selected ? " selected" : ""}" data-wonder="${w.id}">
      <div class="wonder-emoji">${w.emoji}</div>
      <div class="wonder-name">${escapeHtml(w.name)}</div>
      <div class="wonder-resource">Produces ${resIcon(w.resource)} ${GameData.RESOURCES[w.resource].label}</div>
    </button>
  `;
}

function renderSetup(app) {
  app.innerHTML = `
    <div class="status-bar"><h1>🏛️ 7 Wonders</h1></div>
    <div class="setup-panel">
      <h2>Players</h2>
      <div class="count-row" id="count-row">
        ${GameData.SUPPORTED_PLAYER_COUNTS.map((n) => `<button type="button" class="count-btn${state.setup.numPlayers === n ? " selected" : ""}" data-count="${n}">${n} Players</button>`).join("")}
      </div>
      <h2>Choose your Wonder</h2>
      <div class="wonder-grid" id="wonder-grid">
        ${GameData.WONDERS.map((w) => renderWonderCard(w, w.id === state.setup.wonderId)).join("")}
      </div>
      <button type="button" id="start-btn" class="primary" ${state.setup.wonderId ? "" : "disabled"}>▶️ Start Game</button>
    </div>
  `;

  document.getElementById("count-row").querySelectorAll(".count-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.setup.numPlayers = parseInt(btn.dataset.count, 10);
      render();
    });
  });
  document.getElementById("wonder-grid").querySelectorAll(".wonder-card").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.setup.wonderId = btn.dataset.wonder;
      render();
    });
  });
  document.getElementById("start-btn").addEventListener("click", () => {
    if (!state.setup.wonderId) return;
    state.game = GameEngine.createGame(state.setup.numPlayers, { humanWonderId: state.setup.wonderId });
    state.screen = "hand";
    state.selectedCardId = null;
    render();
  });
}

function wireActionBar(game) {
  document.getElementById("act-build")?.addEventListener("click", () => chooseAction("build"));
  document.getElementById("act-wonder")?.addEventListener("click", () => chooseAction("wonder"));
  document.getElementById("act-discard")?.addEventListener("click", () => chooseAction("discard"));
}

function renderHand(app, opts = {}) {
  const game = state.game;
  const me = game.players[0];
  const tabbableId = state.selectedCardId || me.hand[0];

  app.innerHTML = `
    ${renderStatusBar(game)}
    ${renderRivalsStrip(game)}
    ${state.showCity ? renderCityPanel(game) : ""}
    ${renderPowerRow(game)}
    <div class="hand-prompt">${state.freeBuildArmed ? "✨ Tap a card to build it for free." : "Choose <strong>1 card</strong> to play this turn."}</div>
    <div class="hand" role="listbox" aria-label="Your hand" id="hand">
      ${me.hand.map((id) => renderCard(game, GameEngine.CARD_BY_ID[id], id === state.selectedCardId, id === tabbableId)).join("")}
    </div>
    ${renderActionBarSlot(game)}
    ${state.showDiscardPicker ? renderDiscardModal(game) : ""}
  `;

  const hand = document.getElementById("hand");
  const cards = Array.from(hand.querySelectorAll(".card"));

  cards.forEach((el) => {
    el.addEventListener("click", () => {
      if (state.freeBuildArmed) {
        const result = GameEngine.applyFreeBuildFromHand(game, 0, el.dataset.id);
        state.freeBuildArmed = false;
        if (result.success) state.selectedCardId = null;
        render();
      } else {
        selectCard(el.dataset.id);
      }
    });
  });

  hand.addEventListener("keydown", (e) => {
    const currentIndex = cards.findIndex((el) => el === document.activeElement);
    const cols = gridColumnCount(hand);
    let nextIndex = null;
    if (e.key === "ArrowRight") nextIndex = Math.min(cards.length - 1, Math.max(0, currentIndex) + 1);
    else if (e.key === "ArrowLeft") nextIndex = Math.max(0, currentIndex - 1);
    else if (e.key === "ArrowDown") nextIndex = Math.min(cards.length - 1, Math.max(0, currentIndex) + cols);
    else if (e.key === "ArrowUp") nextIndex = Math.max(0, currentIndex - cols);
    else if (e.key === "Home") nextIndex = 0;
    else if (e.key === "End") nextIndex = cards.length - 1;
    else if (e.key === "Enter" || e.key === " ") {
      if (currentIndex >= 0) { e.preventDefault(); cards[currentIndex].click(); }
      return;
    }
    if (nextIndex !== null) {
      e.preventDefault();
      cards[nextIndex].focus();
      cards[nextIndex].scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    }
  });

  document.getElementById("city-toggle").addEventListener("click", () => {
    state.showCity = !state.showCity;
    render();
  });
  document.getElementById("power-freebuild")?.addEventListener("click", () => {
    state.freeBuildArmed = !state.freeBuildArmed;
    render();
  });
  document.getElementById("power-reclaim")?.addEventListener("click", () => {
    state.showDiscardPicker = true;
    render();
  });
  wireActionBar(game);
  wireDiscardModal(game);

  if (opts.focusHand) {
    const tabbable = cards.find((el) => el.tabIndex === 0) || cards[0];
    tabbable?.focus({ preventScroll: true });
  }
}

function wireDiscardModal(game) {
  const overlay = document.getElementById("discard-modal-overlay");
  if (!overlay) return;
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) { state.showDiscardPicker = false; render(); }
  });
  document.getElementById("discard-modal-close").addEventListener("click", () => {
    state.showDiscardPicker = false;
    render();
  });
  overlay.querySelectorAll(".discard-card-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      GameEngine.applyDiscardPileBuild(game, 0, btn.dataset.id);
      state.showDiscardPicker = false;
      render();
    });
  });
}

// Toggles card selection without a full re-render (preserves DOM focus, so keyboard nav survives
// the keypress that triggered the selection change) — same pattern as the earlier
// selection-only screen, extended to also patch the action bar's content.
function selectCard(id) {
  state.selectedCardId = state.selectedCardId === id ? null : id;
  const game = state.game;
  const hand = document.getElementById("hand");
  if (!hand) { render(); return; }

  const me = game.players[0];
  const cards = Array.from(hand.querySelectorAll(".card"));
  const tabbableId = state.selectedCardId || me.hand[0];
  cards.forEach((el) => {
    const isSelected = el.dataset.id === state.selectedCardId;
    el.setAttribute("aria-selected", String(isSelected));
    el.tabIndex = el.dataset.id === tabbableId ? 0 : -1;
  });

  const slot = document.getElementById("action-bar-slot");
  if (slot) {
    slot.outerHTML = renderActionBarSlot(game);
    wireActionBar(game);
  }
}

function chooseAction(action) {
  if (!state.selectedCardId) return;
  const result = GameEngine.playHumanTurn(state.game, action, state.selectedCardId);
  if (!result.success) return; // action buttons are disabled when unavailable; this is a safety no-op
  state.selectedCardId = null;
  state.freeBuildArmed = false;
  if (result.militarySummary) {
    state.ageEndInfo = result;
    state.screen = "ageEnd";
  } else {
    state.screen = "hand";
  }
  render();
}

function renderAgeEnd(app) {
  const info = state.ageEndInfo;
  const isFinal = info.event === "gameEnd";
  const rows = info.militarySummary
    .map((m) => {
      const isSelf = m.playerIdx === 0;
      const tokens = m.tokensGained.length
        ? m.tokensGained.map((t) => `<span class="token-badge ${t > 0 ? "pos" : "neg"}">${t > 0 ? "+" : ""}${t}</span>`).join("")
        : `<span class="token-badge">—</span>`;
      return `<div class="ageend-row${isSelf ? " self" : ""}"><span>${escapeHtml(m.name)} · ${iconImg(GameData.ICONS.shields, "Shields")} ${m.strength}</span><div class="token-badges">${tokens}</div></div>`;
    })
    .join("");

  app.innerHTML = `
    <div class="status-bar"><h1>🏛️ 7 Wonders</h1></div>
    <div class="ageend-panel">
      <h2>${iconImg(GameData.ICONS.conflict, "Conflict", "1.3em")} Age ${info.age} Military Results</h2>
      ${rows}
      <button type="button" id="ageend-continue" class="primary">${isFinal ? `${iconImg(GameData.ICONS.vp, "Trophy", "1em")} See Final Score` : `▶️ Continue to Age ${info.age + 1}`}</button>
    </div>
  `;
  document.getElementById("ageend-continue").addEventListener("click", () => {
    state.screen = isFinal ? "gameEnd" : "hand";
    state.selectedCardId = null;
    render({ focusHand: true });
  });
}

function renderGameEnd(app) {
  const game = state.game;
  const scores = game.finalScores;
  const winner = scores[0];
  const rows = scores
    .map((s, rank) => `
      <tr class="${rank === 0 ? "winner" : ""}">
        <td>${rank === 0 ? iconImg(GameData.ICONS.vp, "Winner") + " " : ""}${escapeHtml(s.name)}</td>
        <td>${s.military}</td><td>${s.treasury}</td><td>${s.wonder}</td><td>${s.civilian}</td>
        <td>${s.scientific}</td><td>${s.commercial}</td><td>${s.guilds}</td>
        <td class="total-col">${s.total}</td>
      </tr>
    `)
    .join("");

  app.innerHTML = `
    <div class="status-bar"><h1>🏛️ 7 Wonders</h1></div>
    <div class="gameend-panel">
      <h2>🏁 Final Results</h2>
      <div class="winner-banner">${winner.playerIdx === 0 ? "🎉 You win!" : `${escapeHtml(winner.name)} wins!`}</div>
      <div class="score-scroll">
        <table class="score-table">
          <thead><tr><th>Player</th><th>${iconImg(GameData.ICONS.shields, "Military")}</th><th>${iconImg(GameData.ICONS.coins, "Treasury")}</th><th>🏛️</th><th>🏙️</th><th>🔬</th><th>💰</th><th>🤝</th><th>Total</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <button type="button" id="new-game-btn" class="primary">🔁 New Game</button>
    </div>
  `;
  document.getElementById("new-game-btn").addEventListener("click", () => {
    state.screen = "setup";
    state.game = null;
    state.selectedCardId = null;
    state.setup = { numPlayers: 4, wonderId: null };
    render();
  });
}

// ---- top-level dispatcher ----

function render(opts = {}) {
  const app = document.getElementById("app");
  if (state.screen === "setup") return renderSetup(app);
  if (state.screen === "hand") return renderHand(app, opts);
  if (state.screen === "ageEnd") return renderAgeEnd(app);
  if (state.screen === "gameEnd") return renderGameEnd(app);
}

render();
