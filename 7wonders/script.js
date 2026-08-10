// 7 Wonders — engine + game logic. Loaded after game-data.js.
// Implements the hand/card-selection screen (docs/requirements.md §4). Action resolution
// (build / Wonder / discard), commerce, and scoring are not yet implemented.
"use strict";

const SAVE_KEY = "sevenwonders_save"; // not yet wired up — no persistence implemented yet.

const state = {
  age: 1,
  turn: 1,
  coins: 3,                         // starting treasury per docs/rules.md §Setup
  playerResources: { wood: 1 },     // resources this city currently produces (sample baseline)
  hand: GameData.CARDS.slice(),     // sample 7-card hand (see game-data.js content-status note)
  selectedId: null,
  confirmed: false,
};

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function save() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

// ---- helpers ----

function costEntries(cost) {
  return Object.entries(cost || {}).map(([key, count]) => {
    const icon = key === "coins" ? "🪙" : (GameData.RESOURCES[key]?.emoji || "?");
    return { key, count, icon };
  });
}

function canAfford(card) {
  const cost = card.cost || {};
  for (const [key, count] of Object.entries(cost)) {
    if (key === "coins") {
      if (state.coins < count) return false;
    } else if ((state.playerResources[key] || 0) < count) {
      return false;
    }
  }
  return true;
}

function formatChainList(ids) {
  return ids
    .map((id) => id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()))
    .join(", ");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// The hand is a responsive CSS grid (column count varies by viewport width), so Up/Down arrow
// navigation reads the live column count from computed style rather than assuming a fixed value.
function gridColumnCount(gridEl) {
  return getComputedStyle(gridEl).gridTemplateColumns.split(" ").filter(Boolean).length || 1;
}

// ---- rendering ----

function renderCard(card, isSelected, isTabbable) {
  const type = GameData.CARD_TYPES[card.type];
  const affordable = canAfford(card);
  const cost = costEntries(card.cost);

  const produceBadges = card.produces.length
    ? `<div class="card-row"><span class="label">Produces</span>${card.produces
        .map((r) => `<span class="icon-badge">${GameData.RESOURCES[r].emoji}</span>`)
        .join(card.producesChoice ? '<span class="label">or</span>' : "")}</div>`
    : "";

  const scienceBadge = card.science
    ? `<div class="card-row"><span class="label">Science</span><span class="icon-badge">${GameData.SCIENCE_SYMBOLS[card.science].emoji}</span></div>`
    : "";

  const vpBadge = card.vp
    ? `<div class="card-row"><span class="label">VP</span><span class="icon-badge">🏆 ${card.vp}</span></div>`
    : "";

  const shieldBadge = card.shields
    ? `<div class="card-row"><span class="label">Military</span><span class="icon-badge">🛡️ ${card.shields}</span></div>`
    : "";

  const coinBadge = card.coinsOnPlay
    ? `<div class="card-row"><span class="label">On build</span><span class="icon-badge">🪙 +${card.coinsOnPlay}</span></div>`
    : "";

  const costRow = `<div class="card-row"><span class="label">Cost</span>${
    cost.length
      ? cost.map((c) => `<span class="icon-badge">${c.icon} ${c.count}</span>`).join("")
      : `<span class="icon-badge">Free</span>`
  }${!affordable ? '<span class="lock-badge" title="Cannot currently afford">🔒</span>' : ""}</div>`;

  const chainRow = card.chainTo.length
    ? `<div class="card-chain">⛓️ Unlocks free: ${escapeHtml(formatChainList(card.chainTo))}</div>`
    : card.chainFrom.length
      ? `<div class="card-chain">⛓️ Free via: ${escapeHtml(formatChainList(card.chainFrom))}</div>`
      : "";

  return `
    <button
      type="button"
      class="card${!affordable ? " unaffordable" : ""}"
      role="option"
      data-id="${card.id}"
      aria-selected="${isSelected}"
      tabindex="${isTabbable ? "0" : "-1"}"
    >
      <div class="card-head" style="background:${type.colorDim}; color:${type.color};">
        <div class="card-emoji">${card.emoji}</div>
        <div class="card-name">${escapeHtml(card.name)}</div>
        <div class="card-type-label">${type.label}</div>
      </div>
      <div class="card-body">
        ${costRow}
        ${produceBadges}
        ${scienceBadge}
        ${vpBadge}
        ${shieldBadge}
        ${coinBadge}
        <div class="card-effect">${escapeHtml(card.effect)}</div>
        ${chainRow}
      </div>
    </button>
  `;
}

function render(opts = {}) {
  const app = document.getElementById("app");

  if (state.confirmed) {
    const card = state.hand.find((c) => c.id === state.selectedId);
    app.innerHTML = `
      <div class="status-bar">
        <h1>🏛️ 7 Wonders</h1>
        <div class="status-chips">
          <span class="chip">Age <strong>${state.age}</strong></span>
          <span class="chip">Turn <strong>${state.turn}</strong> / 6</span>
          <span class="chip">🪙 <strong>${state.coins}</strong></span>
        </div>
      </div>
      <div class="confirmed-panel">
        <div class="big-emoji">${card.emoji}</div>
        <h2>Card locked in</h2>
        <p>You'll play <strong>${escapeHtml(card.name)}</strong> this turn. Build / Wonder / discard resolution isn't wired up yet.</p>
        <button id="change-btn">↩️ Change selection</button>
      </div>
    `;
    const changeBtn = document.getElementById("change-btn");
    changeBtn.addEventListener("click", () => {
      state.confirmed = false;
      render({ focusHand: true });
    });
    if (opts.focusConfirmed) changeBtn.focus({ preventScroll: true });
    return;
  }

  const selectedCard = state.hand.find((c) => c.id === state.selectedId);
  // Roving tabindex: the selected card is tabbable if one is chosen, otherwise the first card.
  const tabbableId = state.selectedId || state.hand[0]?.id;

  app.innerHTML = `
    <div class="status-bar">
      <h1>🏛️ 7 Wonders</h1>
      <div class="status-chips">
        <span class="chip">Age <strong>${state.age}</strong></span>
        <span class="chip">Turn <strong>${state.turn}</strong> / 6</span>
        <span class="chip">🪙 <strong>${state.coins}</strong></span>
        <span class="chip">Producing <strong>${Object.entries(state.playerResources)
          .map(([k, n]) => `${GameData.RESOURCES[k].emoji}${n > 1 ? `×${n}` : ""}`)
          .join(" ")}</strong></span>
      </div>
    </div>
    <div class="hand-prompt">Choose <strong>1 card</strong> to play this turn.</div>
    <div class="hand" role="listbox" aria-label="Your hand" id="hand">
      ${state.hand
        .map((card) => renderCard(card, card.id === state.selectedId, card.id === tabbableId))
        .join("")}
    </div>
    <div class="confirm-bar">
      <div class="confirm-info">${
        selectedCard
          ? `Selected: <strong>${escapeHtml(selectedCard.name)}</strong>`
          : "No card selected yet."
      }</div>
      <button id="confirm-btn" class="primary" ${selectedCard ? "" : "disabled"}>✅ Confirm</button>
    </div>
  `;

  const hand = document.getElementById("hand");
  const cards = Array.from(hand.querySelectorAll(".card"));

  cards.forEach((el) => {
    el.addEventListener("click", () => selectCard(el.dataset.id));
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
      if (currentIndex >= 0) {
        e.preventDefault();
        selectCard(cards[currentIndex].dataset.id);
      }
      return;
    }
    if (nextIndex !== null) {
      e.preventDefault();
      cards[nextIndex].focus();
      cards[nextIndex].scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    }
  });

  const confirmBtn = document.getElementById("confirm-btn");
  confirmBtn.addEventListener("click", () => {
    if (!state.selectedId) return;
    state.confirmed = true;
    render({ focusConfirmed: true });
  });

  if (opts.focusHand) {
    const tabbable = cards.find((el) => el.tabIndex === 0) || cards[0];
    tabbable?.focus({ preventScroll: true });
  }
}

// Toggles a card's selection without a full re-render, so DOM focus (and therefore keyboard
// navigation) survives the click/keypress that triggered it. Falls back to a full render() if
// the hand isn't currently on screen (e.g. state was changed programmatically elsewhere).
function selectCard(id) {
  state.selectedId = state.selectedId === id ? null : id;

  const hand = document.getElementById("hand");
  if (!hand) {
    render();
    return;
  }

  const cards = Array.from(hand.querySelectorAll(".card"));
  const tabbableId = state.selectedId || state.hand[0]?.id;
  cards.forEach((el) => {
    const isSelected = el.dataset.id === state.selectedId;
    el.setAttribute("aria-selected", String(isSelected));
    el.tabIndex = el.dataset.id === tabbableId ? 0 : -1;
  });

  const selectedCard = state.hand.find((c) => c.id === state.selectedId);
  document.querySelector(".confirm-info").innerHTML = selectedCard
    ? `Selected: <strong>${escapeHtml(selectedCard.name)}</strong>`
    : "No card selected yet.";
  document.getElementById("confirm-btn").disabled = !selectedCard;
}

render();
