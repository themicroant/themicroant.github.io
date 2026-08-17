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

// Get the image path for a card. Cards with CARD_IMAGES entries use those; otherwise fall back
// to the shared CARD_ART pool hashed by card id.
function cardImagePath(card) {
  const img = GameData.CARD_IMAGES[card.id];
  return img ? img : cardArtUrl(card);
}

// A card's face art: use the individual card image if it exists, otherwise the shared CARD_ART pool.
function cardArtStyle(card) {
  const imagePath = cardImagePath(card);
  return `background-image:url('${imagePath}');`;
}

// A standalone illustration from GameData.SCENES.
function sceneThumb(sceneKey, label) {
  const imagePath = GameData.SCENES[sceneKey];
  return imagePath ? `<span class="scene-thumb" role="img" aria-label="${escapeHtml(label)}" style="background-image:url('${imagePath}');"></span>` : "";
}

// The single most important stat to surface as a glanceable badge on a grid tile, by card type
// — everything else (full cost breakdown, effect text, chain info) lives in the selected-card
// detail panel instead, not on every tile at once.
// Note: all cards show their primary stat only in the header band (repeated icons for multiple production, etc).
function primaryValueBadge(card) {
  if (card.type === "scientific" && card.science) return sciIcon(card.science);
  return null;
}

// Card band shown for all card types — colored bar at top with the primary stat/resource
function cardBandHtml(card, game, playerIdx) {
  let content = "";

  if (card.type === "basic" || card.type === "manufactured") {
    // Production icons for resource cards — show icon repeated for produceCount
    if (card.produces && card.produces.length) {
      const icons = card.produces.map((r) => {
        const icon = resIcon(r);
        const count = card.produceCount || 1;
        return Array(count).fill(`<span class="band-icon"><span>${icon}</span></span>`).join("");
      }).join(card.producesChoice ? '<span class="band-separator">•</span>' : "");
      content = icons;
    }
  } else if (card.type === "civilian") {
    // VP for civilian cards
    if (card.vp) {
      content = `<span class="band-icon"><span>${iconImg(GameData.ICONS.vp, "VP")}</span> ${card.vp}</span>`;
    }
  } else if (card.type === "guild") {
    // Guild cards show calculated VP value based on game state
    if (game && playerIdx !== undefined && card.guildRule) {
      const vp = GameEngine.guildScoreForRule(game, playerIdx, card.guildRule);
      content = `<span class="band-icon"><span>${iconImg(GameData.ICONS.vp, "VP")}</span> ${vp}</span>`;
    } else {
      // Fallback if game state not available
      content = `<span class="band-icon"><span>${iconImg(GameData.ICONS.vp, "VP")}</span> —</span>`;
    }
  } else if (card.type === "scientific") {
    // Science symbol for scientific cards
    if (card.science) {
      content = `<span class="band-icon"><span>${sciIcon(card.science)}</span></span>`;
    }
  } else if (card.type === "commercial") {
    // Coins for commercial cards
    if (card.coinsOnPlay) {
      content = `<span class="band-icon"><span>${iconImg(GameData.ICONS.coins, "Coins")}</span> +${card.coinsOnPlay}</span>`;
    } else {
      // Passive commercial card - show a subtle indicator
      content = `<span class="band-icon" style="opacity: 0.6;">🏪</span>`;
    }
  } else if (card.type === "military") {
    // Shields for military cards — show one icon per shield
    if (card.shields) {
      const shieldIcons = Array(card.shields).fill(iconImg(GameData.ICONS.shields, "Shield")).join("");
      content = `<span class="band-icon">${shieldIcons}</span>`;
    }
  }

  return `<div class="card-band">${content}</div>`;
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
      : "";

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
      ${cardBandHtml(card, game, 0)}
      <div class="card-art" style="${cardArtStyle(card)}">
        ${!GameData.CARD_IMAGES[card.id] ? `<div class="card-emoji-badge">${card.emoji}</div>` : ""}
        ${!actions.canBuild ? '<div class="card-lock-badge" title="Cannot currently afford">🔒</div>' : ""}
        ${costLabel ? `<div class="card-cost-pill">${costLabel}</div>` : ""}
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
      return `<button type="button" class="rival-chip${isNeighbor ? " neighbor" : ""}" data-rival-id="${idx}" title="Click to view their city">
        <span class="rival-emoji">${p.wonder.emoji}</span>
        <span>${tag ? `<span class="rival-tag">${tag}</span> ` : ""}${escapeHtml(p.name)} · ${iconImg(GameData.ICONS.coins, "Coins")}${p.coins} · ${iconImg(GameData.ICONS.shields, "Shields")}${shields} · 🃏${p.built.length}</span>
      </button>`;
    })
    .join("");
  return `<div class="rivals-strip">${chips}</div>`;
}

function renderRivalCityModal(game, rivalIdx) {
  const rival = game.players[rivalIdx];
  const cards = rival.built.map((id) => {
    const c = GameEngine.CARD_BY_ID[id];
    const type = GameData.CARD_TYPES[c.type];
    return `<span class="city-chip" style="border-left: 3px solid ${type.color}">${c.emoji} ${escapeHtml(c.name)}</span>`;
  }).join("");

  // Get rival's resource production
  const prod = GameEngine.computeProduction(game, rivalIdx);
  const fixedResources = Object.entries(prod.fixed)
    .map(([res, count]) => `<span class="icon-badge">${resIcon(res)}×${count}</span>`)
    .join("");
  const choiceResources = prod.choices.length > 0
    ? prod.choices.map(opts => `<span class="icon-badge" title="Choose one">${opts.map(r => resIcon(r, "0.85em")).join(" or ")}</span>`).join("")
    : "";
  const resourceDisplay = fixedResources || choiceResources
    ? `<div class="card-row"><span class="label">Resources:</span>${fixedResources}${choiceResources}</div>`
    : "";

  return `
    <div class="modal-overlay" id="rival-modal">
      <div class="modal-panel">
        <h3>${rival.wonder.emoji} ${escapeHtml(rival.name)}'s City</h3>
        <div class="card-row">
          <span class="label">Wonder:</span> ${rival.wonder.name} (Stage ${rival.wonderStagesBuilt}/${rival.wonder.stages.length})
        </div>
        <div class="card-row">
          <span class="label">Treasury:</span> ${iconImg(GameData.ICONS.coins, "Coins")}${rival.coins} · ${iconImg(GameData.ICONS.shields, "Shields")}${GameEngine.computeMilitaryStrength(game, rivalIdx)}
        </div>
        ${resourceDisplay}
        <h4 style="margin-top: 12px;">Built Structures (${rival.built.length})</h4>
        <div class="city-chips">${cards || "<span class='city-chip'>No structures built yet</span>"}</div>
        <button type="button" class="primary" id="close-rival-modal" style="margin-top: 12px; width: 100%;">Close</button>
      </div>
    </div>
  `;
}

function renderCityPanel(game) {
  const me = game.players[0];
  const chips = me.built.length
    ? me.built.map((id) => { const c = GameEngine.CARD_BY_ID[id]; return `<span class="city-chip">${c.emoji} ${escapeHtml(c.name)}</span>`; }).join("")
    : `<span class="city-chip">Nothing built yet</span>`;

  // Show current resources
  const prod = GameEngine.computeProduction(game, 0);
  const fixedResources = Object.entries(prod.fixed)
    .map(([res, count]) => `<span class="icon-badge">${resIcon(res)}${count}</span>`)
    .join("");
  const choiceResources = prod.choices.length > 0
    ? prod.choices.map(opts => `<span class="icon-badge" title="Choose one">${opts.map(r => resIcon(r, "0.85em")).join(" or ")}</span>`).join("")
    : "";
  const resourceDisplay = fixedResources || choiceResources
    ? `<div class="card-row"><span class="label">Resources</span>${fixedResources}${choiceResources}</div>`
    : "";

  // Show next wonder stage cost if available
  const nextStageIndex = me.wonderStagesBuilt;
  const nextStage = nextStageIndex < me.wonder.stages.length ? me.wonder.stages[nextStageIndex] : null;
  const nextStageCost = nextStage
    ? Object.entries(nextStage.cost).map(([res, count]) => `${costIcon(res)}${count > 1 ? count : ""}`).join(" ")
    : "Complete";

  return `
    <div class="city-panel">
      <div class="panel-head">
        ${sceneThumb("wonderBuild", `${me.wonder.name} under construction`)}
        <h3>🏙️ Your City — ${me.built.length} structures</h3>
      </div>
      ${resourceDisplay}
      <div class="city-chips">${chips}</div>
      <div class="card-row">
        <span class="label">${me.wonder.name}</span>
        <span class="wonder-progress">
          ${me.wonder.stages.map((_, i) => `<span class="wonder-stage-dot${i < me.wonderStagesBuilt ? " built" : ""}" title="Stage ${i + 1}"></span>`).join("")}
        </span>
      </div>
      ${nextStage ? `<div class="card-row"><span class="label">Next stage needs</span>${nextStageCost}</div>` : ""}
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
        <div class="panel-head">
          ${sceneThumb("discardPile", "The discard pile")}
          <h3>🗑️ Reclaim a card, built for free</h3>
        </div>
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
  const wonderImage = GameData.WONDER_IMAGES[w.id];
  return `
    <button type="button" class="wonder-card${selected ? " selected" : ""}" data-wonder="${w.id}" title="Click to view stages">
      ${wonderImage
        ? `<span class="wonder-art" role="img" aria-label="${escapeHtml(w.name)}" style="background-image:url('${wonderImage}');"></span>`
        : `<div class="wonder-emoji">${w.emoji}</div>`}
      <div class="wonder-name">${escapeHtml(w.name)}</div>
      <div class="wonder-resource">Produces ${resIcon(w.resource)} ${GameData.RESOURCES[w.resource].label}</div>
    </button>
  `;
}

function renderWonderDetailModal(wonderId) {
  const wonder = GameData.WONDERS.find(w => w.id === wonderId);
  if (!wonder) return "";

  const stagesHtml = wonder.stages.map((stage, idx) => {
    const costHtml = Object.entries(stage.cost)
      .map(([res, count]) => `<span class="icon-badge">${costIcon(res)}${count > 1 ? count : ""}</span>`)
      .join("");
    const effectHtml = Object.entries(stage.effect)
      .filter(([key, val]) => val > 0)
      .map(([key, val]) => {
        if (key === "vp") return `${val} VP`;
        if (key === "coins") return `${iconImg(GameData.ICONS.coins, "Coins")} +${val}`;
        if (key === "shields") return `${val} ${iconImg(GameData.ICONS.shields, "Shields")}`;
        if (key === "power") return `Special power: ${val}`;
        return `${key}: ${val}`;
      })
      .join(" • ");

    return `
      <div style="background: var(--bg-2); border: 1px solid var(--border); border-radius: 8px; padding: 10px; margin-bottom: 8px;">
        <div style="font-weight: 700; margin-bottom: 6px;">Stage ${idx + 1}</div>
        <div class="card-row" style="margin-bottom: 6px;">
          <span class="label">Cost:</span> ${costHtml || '<span class="label">Free</span>'}
        </div>
        <div class="card-row">
          <span class="label">Effect:</span> ${effectHtml}
        </div>
      </div>
    `;
  }).join("");

  return `
    <div class="modal-overlay" id="wonder-detail-modal">
      <div class="modal-panel">
        <h3>${wonder.emoji} ${escapeHtml(wonder.name)}</h3>
        <div class="card-row" style="margin-bottom: 12px;">
          <span class="label">Starting Resource:</span> ${resIcon(wonder.resource)} ${GameData.RESOURCES[wonder.resource].label}
        </div>
        <h4 style="margin-bottom: 8px;">Construction Stages</h4>
        ${stagesHtml}
        <button type="button" class="primary" id="close-wonder-modal" style="margin-top: 12px; width: 100%;">Close</button>
      </div>
    </div>
  `;
}

function renderSetup(app) {
  app.innerHTML = `
    <div class="status-bar"><h1>🏛️ 7 Wonders</h1></div>
    <div class="setup-panel">
      <div class="setup-hero" role="img" aria-label="An ancient harbour city at golden hour" style="background-image:url('${GameData.SCENES.title}');"></div>
      <h2>Players</h2>
      <div class="count-row" id="count-row">
        ${GameData.SUPPORTED_PLAYER_COUNTS.map((n) => `<button type="button" class="count-btn${state.setup.numPlayers === n ? " selected" : ""}" data-count="${n}">${n}</button>`).join("")}
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
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      // Show detail modal
      const app = document.getElementById("app");
      const detailHtml = renderWonderDetailModal(btn.dataset.wonder);
      const detailEl = new DOMParser().parseFromString(detailHtml, "text/html").body.firstChild;
      app.appendChild(detailEl);

      // Setup select and close handlers
      document.getElementById("close-wonder-modal").addEventListener("click", () => {
        detailEl.remove();
      });

      // Also select when detail opens (optional - can remove if you prefer to select separately)
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
    ${state.freeBuildArmed ? '<div class="hand-prompt">✨ Tap a card to build it for free.</div>' : ""}
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
  document.querySelectorAll(".rival-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const rivalIdx = parseInt(chip.dataset.rivalId, 10);
      app.appendChild(new DOMParser().parseFromString(renderRivalCityModal(game, rivalIdx), "text/html").body.firstChild);
      document.getElementById("close-rival-modal").addEventListener("click", () => {
        document.getElementById("rival-modal").remove();
      });
    });
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
      <div class="panel-head">
        ${sceneThumb("battlefield", "Battlefield at dusk")}
        <h2>${iconImg(GameData.ICONS.conflict, "Conflict", "1.3em")} Age ${info.age} Military Results</h2>
      </div>
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
      <div class="panel-head">
        ${sceneThumb("finalTriumph", "The completed city")}
        <h2>🏁 Final Results</h2>
      </div>
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
