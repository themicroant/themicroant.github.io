// Emojimon — game engine. Whole-state re-render on every change (same approach as the
// sibling "Slay the Tower" project): `state` is the single source of truth, `render()`
// rebuilds the DOM from it, and a delegated click handler + keydown listener mutate state
// and call `render()` again. No frameworks.
"use strict";

const D = EmojimonData;
const Snd = EmojimonSound;
const SAVE_KEY = "emojimon_save";

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function choice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
function stageMult(stage) {
  return 1 + clamp(stage, -2, 2) * 0.25;
}

// ---------------------------------------------------------------------------
// Emojimon instances
// ---------------------------------------------------------------------------

function movesKnownAtLevel(species, level) {
  const learned = [];
  for (const entry of species.movepool) {
    if (entry.level <= level && !learned.includes(entry.move)) learned.push(entry.move);
  }
  return learned.slice(-4);
}

function maxHpOf(inst) {
  const species = D.SPECIES[inst.speciesId];
  return D.statsAtLevel(species.base, inst.level).hp;
}
function statOf(inst, stat) {
  const species = D.SPECIES[inst.speciesId];
  const base = D.statsAtLevel(species.base, inst.level)[stat];
  if (stat === "atk" || stat === "def") return Math.round(base * stageMult(inst.statBuffs[stat] || 0));
  return base;
}

function createInstance(speciesId, level) {
  const species = D.SPECIES[speciesId];
  const stats = D.statsAtLevel(species.base, level);
  return {
    uid: uid(),
    speciesId,
    level,
    xp: 0,
    hp: stats.hp,
    status: null,
    statBuffs: { atk: 0, def: 0 },
    moves: movesKnownAtLevel(species, level),
    fainted: false,
  };
}

function healFull(inst) {
  inst.hp = maxHpOf(inst);
  inst.status = null;
  inst.fainted = false;
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

function defaultState() {
  return {
    screen: "intro",
    player: { mapId: "town", x: 7, y: 7, facing: "down" },
    party: [],
    box: [],
    inventory: { emojiball: 5, greatball: 0, ultraball: 0, potion: 2, fullheal: 0 },
    coins: 100,
    flags: { starterReceived: false, defeatedTrainers: {} },
    muted: false,
    battle: null,
    dialogue: null,
    learnQueue: [],
    menuTab: null,
    shopMsg: null,
    toast: null,
  };
}

let state = loadSave() || defaultState();
Snd.setMuted(state.muted);

function saveGame() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch (e) {
    /* storage unavailable — ignore, run stays in-memory only */
  }
}
function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed.player) return null;
    parsed.battle = null;
    parsed.dialogue = null;
    if (parsed.screen === "battle" || parsed.screen === "learnmove") parsed.screen = "overworld";
    if (!parsed.learnQueue) parsed.learnQueue = [];
    return parsed;
  } catch (e) {
    return null;
  }
}
function newGame() {
  localStorage.removeItem(SAVE_KEY);
  state = defaultState();
  render();
}

// ---------------------------------------------------------------------------
// Battle: damage / effects
// ---------------------------------------------------------------------------

function computeDamage(atkInst, defInst, move) {
  const atkSpecies = D.SPECIES[atkInst.speciesId];
  const defSpecies = D.SPECIES[defInst.speciesId];
  const atkStat = statOf(atkInst, "atk") * (atkInst.status === "burn" ? D.STATUS_INFO.burn.atkMult : 1);
  const defStat = statOf(defInst, "def");
  const typeMult = D.typeEffectiveness(move.type, defSpecies.type);
  const stab = move.type === atkSpecies.type ? 1.5 : 1;
  const rand = 0.85 + Math.random() * 0.15;
  const raw = ((2 * atkInst.level) / 5 + 2) * move.power * (atkStat / defStat) / 50 + 2;
  return { dmg: Math.max(1, Math.floor(raw * typeMult * stab * rand)), typeMult };
}

function catchChance(ball, target) {
  const hpPercent = target.hp / maxHpOf(target);
  const statusBonus = target.status ? 0.15 : 0;
  return clamp(ball.catchPower * (1 - hpPercent * 0.65) + statusBonus, 0.05, 0.95);
}

// ---------------------------------------------------------------------------
// Battle: queue-driven turn processor
// ---------------------------------------------------------------------------
// Each queued step is {text, apply?, sfx?, sfxArg?, fx?}. `apply` mutates state and runs
// exactly once, at the moment the step is scrolled into view (see advanceQueue), so text
// pacing and visible effects (HP bar drain, shake, flashes) stay in sync.

function qpush(battle, text, opts = {}) {
  battle.queue.push({ text, ...opts });
}

function activePlayer() {
  return state.party[state.battle.playerIndex];
}
function activeEnemy() {
  return state.battle.enemyTeam[state.battle.enemyIndex];
}

function startQueue(battle, onDone) {
  battle.onQueueDone = onDone || null;
  battle.qIndex = -1;
  advanceQueue();
}

function advanceQueue() {
  const battle = state.battle;
  if (!battle) return;
  battle.qIndex++;
  if (battle.qIndex < battle.queue.length) {
    const step = battle.queue[battle.qIndex];
    if (step.apply) step.apply();
    if (step.sfx) Snd.play(step.sfx, step.sfxArg);
    render();
    if (step.fx) requestAnimationFrame(() => applyFx(step.fx));
  } else {
    battle.queue = [];
    battle.qIndex = 0;
    const cb = battle.onQueueDone;
    battle.onQueueDone = null;
    render();
    if (cb) cb();
  }
}

function battleQueueActive() {
  return state.battle && state.battle.queue.length > 0 && state.battle.qIndex < state.battle.queue.length;
}

// `apply` callbacks run lazily (only once the player has scrolled the message into view — see
// advanceQueue), so this whole synchronous turn-building pass must never make decisions by
// reading `inst.hp`/`inst.fainted`/`inst.status` directly: those fields are still the *old*
// values until their queued apply() eventually fires. Instead every combatant gets a `snap`
// (hp/fainted/status) that is read and updated synchronously here, in lockstep with what the
// queued apply() will later do to the real instance — that's what `mkSnap`/the snap params below
// are for.
function mkSnap(inst) {
  return { hp: inst.hp, fainted: inst.fainted, status: inst.status };
}

// Executes one combatant's Fight move against the other. Mutates `defSnap` (and `atkSnap` for
// self-heals) so callers can make correct same-turn decisions. Returns true if the defender faints.
function runMove(battle, attacker, attackerSide, defender, move, atkSnap, defSnap) {
  qpush(battle, `${nameOf(attacker)} used ${move.emoji} ${move.name}!`);

  if (Math.random() * 100 > move.accuracy) {
    qpush(battle, "But it missed!", { sfx: "miss" });
    return false;
  }

  if (move.kind === "attack") {
    const { dmg, typeMult } = computeDamage(attacker, defender, move);
    const fxTarget = attackerSide === "player" ? "enemy" : "player";
    const newHp = clamp(defSnap.hp - dmg, 0, maxHpOf(defender));
    qpush(battle, `It hit for ${dmg} damage!`, {
      apply: () => {
        defender.hp = clamp(defender.hp - dmg, 0, maxHpOf(defender));
      },
      sfx: "hit",
      sfxArg: move.type,
      fx: { shake: fxTarget, flash: fxTarget },
    });
    defSnap.hp = newHp;
    if (typeMult > 1) qpush(battle, "It's super effective!");
    else if (typeMult < 1) qpush(battle, "It's not very effective...");
    if (move.status && !defSnap.status && newHp > 0 && Math.random() < move.statusChance) {
      const info = D.STATUS_INFO[move.status];
      qpush(battle, `${nameOf(defender)} was afflicted with ${info.name} ${info.emoji}!`, {
        apply: () => {
          defender.status = move.status;
        },
        sfx: "statusApplied",
      });
      defSnap.status = move.status;
    }
    if (newHp <= 0) {
      qpush(battle, `${nameOf(defender)} fainted!`, {
        apply: () => {
          defender.fainted = true;
        },
        sfx: "faint",
      });
      defSnap.fainted = true;
      return true;
    }
  } else if (move.kind === "buff") {
    qpush(battle, `${nameOf(attacker)}'s ${move.stat.toUpperCase()} rose!`, {
      apply: () => {
        attacker.statBuffs[move.stat] = clamp((attacker.statBuffs[move.stat] || 0) + move.amount, -2, 2);
      },
    });
  } else if (move.kind === "debuff") {
    qpush(battle, `${nameOf(defender)}'s ${move.stat.toUpperCase()} fell!`, {
      apply: () => {
        defender.statBuffs[move.stat] = clamp((defender.statBuffs[move.stat] || 0) + move.amount, -2, 2);
      },
    });
  } else if (move.kind === "heal") {
    const newHp = clamp(atkSnap.hp + Math.round(maxHpOf(attacker) * move.percent), 0, maxHpOf(attacker));
    qpush(battle, `${nameOf(attacker)} recovered HP!`, {
      apply: () => {
        attacker.hp = clamp(attacker.hp + Math.round(maxHpOf(attacker) * move.percent), 0, maxHpOf(attacker));
      },
      sfx: "heal",
    });
    atkSnap.hp = newHp;
  }
  return false;
}

function nameOf(inst) {
  return D.SPECIES[inst.speciesId].name;
}

// Pre-move status checks. Returns false if the combatant cannot act this turn. Mutates `snap`.
function statusGate(battle, inst, snap) {
  if (snap.status === "freeze") {
    if (Math.random() < D.STATUS_INFO.freeze.thawChance) {
      qpush(battle, `${nameOf(inst)} thawed out!`, { apply: () => (inst.status = null) });
      snap.status = null;
      return true;
    }
    qpush(battle, `${nameOf(inst)} is frozen solid!`);
    return false;
  }
  if (snap.status === "paralyze" && Math.random() < D.STATUS_INFO.paralyze.skipChance) {
    qpush(battle, `${nameOf(inst)} is paralyzed! It can't move!`);
    return false;
  }
  return true;
}

function tickStatus(battle, inst, snap) {
  if (snap.fainted) return false;
  if (snap.status === "burn" || snap.status === "curse") {
    const info = D.STATUS_INFO[snap.status];
    const dmg = Math.max(1, Math.round(maxHpOf(inst) * info.tickPercent));
    const newHp = clamp(snap.hp - dmg, 0, maxHpOf(inst));
    qpush(battle, `${nameOf(inst)} is hurt by ${info.name} ${info.emoji}!`, {
      apply: () => {
        inst.hp = clamp(inst.hp - dmg, 0, maxHpOf(inst));
      },
    });
    snap.hp = newHp;
    if (newHp <= 0) {
      qpush(battle, `${nameOf(inst)} fainted!`, { apply: () => (inst.fainted = true), sfx: "faint" });
      snap.fainted = true;
      return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Battle: starting & resolving
// ---------------------------------------------------------------------------

function startWildBattle(speciesId, level, bg) {
  const enemy = createInstance(speciesId, level);
  state.battle = {
    kind: "wild",
    trainerId: null,
    enemyTeam: [enemy],
    enemyIndex: 0,
    playerIndex: state.party.findIndex((p) => !p.fainted),
    bg,
    queue: [],
    qIndex: 0,
    onQueueDone: null,
    menu: "main",
  };
  state.screen = "battle";
  Snd.play("encounter");
  const battle = state.battle;
  qpush(battle, `A wild ${nameOf(enemy)} ${D.SPECIES[enemy.speciesId].emoji} appeared!`);
  startQueue(battle, () => {
    battle.menu = "main";
    render();
  });
}

function startTrainerBattle(trainerId, bg) {
  const trainer = D.TRAINERS[trainerId];
  const team = trainer.team.map((m) => createInstance(m.species, m.level));
  state.battle = {
    kind: "trainer",
    trainerId,
    enemyTeam: team,
    enemyIndex: 0,
    playerIndex: state.party.findIndex((p) => !p.fainted),
    bg,
    queue: [],
    qIndex: 0,
    onQueueDone: null,
    menu: "main",
  };
  state.screen = "battle";
  const battle = state.battle;
  qpush(battle, `${trainer.emoji} ${trainer.name} wants to battle!`);
  qpush(battle, `"${trainer.line}"`);
  qpush(battle, `${trainer.name} sent out ${nameOf(team[0])}!`);
  startQueue(battle, () => {
    battle.menu = "main";
    render();
  });
}

function endBattle(outcome) {
  // outcome: 'win' | 'run' | 'blackout' | 'capture'
  const battle = state.battle;
  const finish = () => {
    state.battle = null;
    state.screen = "overworld";
    if (state.learnQueue.length) {
      state.screen = "learnmove";
    }
    saveGame();
    render();
  };
  if (outcome === "blackout") {
    qpush(battle, "You are out of usable Emojimon!", {});
    qpush(battle, "You blacked out and scrambled back to town...", {
      apply: () => {
        const lost = Math.floor(state.coins / 2);
        state.coins -= lost;
        state.party.forEach(healFull);
        state.player = { mapId: "town", x: 7, y: 8, facing: "up" };
      },
    });
    startQueue(battle, finish);
  } else {
    finish();
  }
}

function grantXp(inst, amount) {
  const species = D.SPECIES[inst.speciesId];
  inst.xp += amount;
  const battle = state.battle;
  qpush(battle, `${nameOf(inst)} gained ${amount} XP!`);
  while (inst.xp >= D.xpToNext(inst.level)) {
    const need = D.xpToNext(inst.level);
    inst.xp -= need;
    inst.level++;
    const oldMax = D.statsAtLevel(D.SPECIES[inst.speciesId].base, inst.level - 1).hp;
    const newMax = D.statsAtLevel(D.SPECIES[inst.speciesId].base, inst.level).hp;
    qpush(battle, `${nameOf(inst)} grew to level ${inst.level}!`, {
      apply: () => {
        inst.hp += newMax - oldMax;
      },
      sfx: "levelUp",
      fx: { pulse: inst === activePlayer() ? "player" : "enemy" },
    });
    const sp = D.SPECIES[inst.speciesId];
    const newMoveEntry = sp.movepool.find((m) => m.level === inst.level);
    if (newMoveEntry && !inst.moves.includes(newMoveEntry.move)) {
      if (inst.moves.length < 4) {
        qpush(battle, `${nameOf(inst)} learned ${D.MOVES[newMoveEntry.move].name}!`, {
          apply: () => inst.moves.push(newMoveEntry.move),
        });
      } else {
        state.learnQueue.push({ instUid: inst.uid, moveId: newMoveEntry.move });
      }
    }
    if (sp.evolveLevel && inst.level >= sp.evolveLevel && sp.evolvesTo) {
      const targetId = sp.evolvesTo;
      qpush(battle, `What? ${nameOf(inst)} is evolving!`, { sfx: "evolve", fx: { pulse: inst === activePlayer() ? "player" : "enemy" } });
      qpush(battle, `Congratulations! It evolved into ${D.SPECIES[targetId].name} ${D.SPECIES[targetId].emoji}!`, {
        apply: () => {
          const hpDelta = D.statsAtLevel(D.SPECIES[targetId].base, inst.level).hp - D.statsAtLevel(sp.base, inst.level).hp;
          inst.speciesId = targetId;
          inst.hp += hpDelta;
        },
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Battle: player actions
// ---------------------------------------------------------------------------

function battleUseMove(moveId) {
  const battle = state.battle;
  if (!battle || battle.queue.length) return;
  const move = D.MOVES[moveId];
  const player = activePlayer();
  const enemy = activeEnemy();
  battle.menu = null;
  battle.queue = [];

  const playerFirst = statOf(player, "spd") >= statOf(enemy, "spd") ? Math.random() < 0.85 : Math.random() < 0.15;
  const order = playerFirst ? ["player", "enemy"] : ["enemy", "player"];
  const snaps = { player: mkSnap(player), enemy: mkSnap(enemy) };

  const runSide = (side) => {
    const atk = side === "player" ? player : enemy;
    const def = side === "player" ? enemy : player;
    const atkSnap = snaps[side];
    const defSnap = side === "player" ? snaps.enemy : snaps.player;
    if (atkSnap.fainted || defSnap.fainted) return;
    if (!statusGate(battle, atk, atkSnap)) return;
    const mv = side === "player" ? move : D.MOVES[choice(enemy.moves)];
    runMove(battle, atk, side, def, mv, atkSnap, defSnap);
  };

  order.forEach(runSide);

  // End-of-turn status ticks, in the same order, only for survivors.
  order.forEach((side) => {
    const inst = side === "player" ? player : enemy;
    tickStatus(battle, inst, snaps[side]);
  });

  startQueue(battle, () => resolveAfterTurn());
}

function resolveAfterTurn() {
  const battle = state.battle;
  const player = activePlayer();
  const enemy = activeEnemy();

  if (enemy.fainted) {
    const reward = battle.kind === "trainer" ? Math.round(20 * (1 + enemy.level * 0.15) * 1.5) : Math.round(20 * (1 + enemy.level * 0.15));
    battle.queue = [];
    grantXp(player, reward);
    if (battle.kind === "trainer") {
      const nextIndex = battle.enemyTeam.findIndex((m) => !m.fainted);
      if (nextIndex !== -1) {
        battle.enemyIndex = nextIndex;
        const trainer = D.TRAINERS[battle.trainerId];
        qpush(battle, `${trainer.name} sent out ${nameOf(battle.enemyTeam[nextIndex])}!`);
        startQueue(battle, () => {
          battle.menu = "main";
          render();
        });
        return;
      } else {
        const trainer = D.TRAINERS[battle.trainerId];
        qpush(battle, `"${trainer.winLine}"`);
        qpush(battle, `You defeated ${trainer.name}! You got ${trainer.reward} coins!`, {
          apply: () => {
            state.coins += trainer.reward;
            state.flags.defeatedTrainers[battle.trainerId] = true;
          },
          sfx: "coin",
        });
        startQueue(battle, () => endBattle("win"));
        return;
      }
    } else {
      startQueue(battle, () => endBattle("win"));
      return;
    }
  }

  if (player.fainted) {
    const nextIndex = state.party.findIndex((p) => !p.fainted);
    battle.queue = [];
    if (nextIndex === -1) {
      startQueue(battle, () => endBattle("blackout"));
    } else {
      battle.menu = "forceswitch";
      render();
    }
    return;
  }

  battle.queue = [];
  battle.menu = "main";
  render();
}

// The enemy's free attack after the player spends a turn switching, using an item, or failing
// to run/capture. Builds fresh snapshots (see mkSnap) so fainting is detected correctly.
function enemySoloAttack(battle) {
  const enemy = activeEnemy();
  const player = activePlayer();
  battle.queue = [];
  const enemySnap = mkSnap(enemy);
  const playerSnap = mkSnap(player);
  if (statusGate(battle, enemy, enemySnap)) {
    runMove(battle, enemy, "enemy", player, D.MOVES[choice(enemy.moves)], enemySnap, playerSnap);
  }
  if (!enemySnap.fainted) tickStatus(battle, enemy, enemySnap);
  if (!playerSnap.fainted) tickStatus(battle, player, playerSnap);
  startQueue(battle, () => resolveAfterTurn());
}

function battleSwitchTo(partyIndex) {
  const battle = state.battle;
  if (!battle || state.party[partyIndex].fainted) return;
  const wasForced = battle.menu === "forceswitch";
  battle.playerIndex = partyIndex;
  battle.menu = null;
  battle.queue = [];
  qpush(battle, `Go, ${nameOf(activePlayer())}!`);
  if (wasForced) {
    startQueue(battle, () => {
      battle.menu = "main";
      render();
    });
  } else {
    // Switching mid-battle (not forced) consumes the turn: enemy still attacks.
    startQueue(battle, () => enemySoloAttack(battle));
  }
}

function battleUseItem(itemId) {
  const battle = state.battle;
  if (!battle || battle.queue.length) return;
  const item = D.ITEMS[itemId];
  const player = activePlayer();
  battle.menu = null;
  battle.queue = [];

  if (item.kind === "ball") {
    if (battle.kind === "trainer") return;
    if (state.inventory[itemId] <= 0) return;
    const enemy = activeEnemy();
    state.inventory[itemId]--;
    qpush(battle, `You threw a ${item.emoji} ${item.name}!`, { sfx: "ballThrow" });
    const chance = catchChance(item, enemy);
    const shakes = chance > 0.66 ? 3 : chance > 0.33 ? 2 : chance > 0.05 ? 1 : 0;
    for (let i = 0; i < shakes; i++) qpush(battle, "...", { sfx: "ballShake" });
    const success = Math.random() < chance;
    if (success) {
      qpush(battle, `Gotcha! ${nameOf(enemy)} was caught!`, {
        apply: () => {
          const caught = { ...enemy };
          if (state.party.length < 6) state.party.push(caught);
          else state.box.push(caught);
        },
        sfx: "captureSuccess",
      });
      const reward = Math.round(15 * (1 + enemy.level * 0.15));
      grantXp(player, reward);
      startQueue(battle, () => endBattle("capture"));
    } else {
      qpush(battle, `Oh no! ${nameOf(enemy)} broke free!`, { sfx: "captureFail" });
      startQueue(battle, () => enemySoloAttack(battle));
    }
  } else if (item.kind === "heal" || item.kind === "cure") {
    applyItemToInstance(itemId, player);
    qpush(battle, `You used a ${item.emoji} ${item.name}!`, { sfx: "heal" });
    startQueue(battle, () => enemySoloAttack(battle));
  }
}

function applyItemToInstance(itemId, inst) {
  const item = D.ITEMS[itemId];
  if (state.inventory[itemId] <= 0) return false;
  if (item.kind === "heal") {
    if (inst.hp >= maxHpOf(inst)) return false;
    inst.hp = clamp(inst.hp + item.healAmount, 0, maxHpOf(inst));
  } else if (item.kind === "cure") {
    if (!inst.status) return false;
    inst.status = null;
  } else {
    return false;
  }
  state.inventory[itemId]--;
  return true;
}

function battleRun() {
  const battle = state.battle;
  if (!battle || battle.queue.length) return;
  battle.menu = null;
  battle.queue = [];
  if (battle.kind === "trainer") {
    qpush(battle, "You can't run from a trainer battle!");
    startQueue(battle, () => {
      battle.menu = "main";
      render();
    });
    return;
  }
  const player = activePlayer();
  const enemy = activeEnemy();
  const chance = clamp(0.5 + (statOf(player, "spd") - statOf(enemy, "spd")) * 0.02, 0.1, 0.95);
  if (Math.random() < chance) {
    qpush(battle, "Got away safely!");
    startQueue(battle, () => endBattle("run"));
  } else {
    qpush(battle, "Couldn't get away!");
    startQueue(battle, () => enemySoloAttack(battle));
  }
}

// ---------------------------------------------------------------------------
// Overworld
// ---------------------------------------------------------------------------

function currentMap() {
  return D.MAPS[state.player.mapId];
}
function tileAt(map, x, y) {
  if (y < 0 || y >= map.tiles.length) return null;
  const row = [...map.tiles[y]];
  if (x < 0 || x >= row.length) return null;
  return row[x];
}
function entityAt(map, x, y) {
  return map.entities.find((e) => e.x === x && e.y === y) || null;
}

function movePlayer(dx, dy) {
  if (state.screen !== "overworld" || state.dialogue) return;
  const facing = dy === 1 ? "down" : dy === -1 ? "up" : dx === 1 ? "right" : "left";
  state.player.facing = facing;
  const map = currentMap();
  const tx = state.player.x + dx;
  const ty = state.player.y + dy;
  const ent = entityAt(map, tx, ty);

  if (ent && ent.kind === "trainer") {
    render();
    if (!state.flags.defeatedTrainers[ent.id]) {
      const trainer = D.TRAINERS[ent.id];
      showDialogue([`${trainer.emoji} ${trainer.name} blocks the way!`], () => startTrainerBattle(ent.id, "town"));
    } else {
      showDialogue([`${D.TRAINERS[ent.id].name}: "${D.TRAINERS[ent.id].winLine}"`]);
    }
    return;
  }

  const ch = tileAt(map, tx, ty);
  const legend = ch && D.TILE_LEGEND[ch];
  if (!legend || !legend.walkable) {
    render();
    return;
  }

  state.player.x = tx;
  state.player.y = ty;
  Snd.play("footstep");

  if (ent && ent.kind === "warp") {
    render();
    setTimeout(() => {
      Snd.play("warp");
      state.player.mapId = ent.toMap;
      state.player.x = ent.toX;
      state.player.y = ent.toY;
      saveGame();
      render();
    }, 120);
    return;
  }

  if (ent && ent.kind === "building") {
    render();
    setTimeout(() => enterBuilding(ent.id), 120);
    return;
  }

  if (legend.encounter && Math.random() < D.ENCOUNTER_RATE[legend.encounter]) {
    const pool = D.ENCOUNTER_POOLS[legend.encounter];
    const type = choice(pool);
    const speciesId = D.WILD_BASE_SPECIES_BY_TYPE[type];
    const [lo, hi] = map.levelRange || [2, 5];
    if (state.party.some((p) => !p.fainted)) {
      startWildBattle(speciesId, randInt(lo, hi), legend.encounter);
      return;
    }
  }
  render();
}

function enterBuilding(id) {
  if (id === "lab") {
    if (!state.flags.starterReceived) {
      showDialogue(
        [
          "Professor: Welcome to the world of Emojimon!",
          "Professor: Every creature here is powered by an element, straight from the emoji it's drawn from.",
          "Professor: Here — this Sparkit has chosen you as its partner!",
        ],
        () => {
          state.party.push(createInstance(D.STARTER_SPECIES, 5));
          state.flags.starterReceived = true;
          saveGame();
        }
      );
    } else {
      showDialogue(["Professor: Take care of your Emojimon, and explore Emberbrook!"]);
    }
  } else if (id === "healhut") {
    if (state.party.length === 0) {
      showDialogue(["Nurse: You'll need an Emojimon first — visit the Lab!"]);
      return;
    }
    state.party.forEach(healFull);
    saveGame();
    showDialogue(["Nurse: Your Emojimon are fighting fit! 💗"], null, "heal");
  } else if (id === "shop") {
    state.screen = "shop";
    state.shopMsg = null;
    render();
  }
}

function showDialogue(lines, onDone, sfx) {
  state.dialogue = { lines, index: 0, onDone: onDone || null };
  if (sfx) Snd.play(sfx);
  render();
}
function advanceDialogue() {
  if (!state.dialogue) return;
  Snd.play("menuConfirm");
  state.dialogue.index++;
  if (state.dialogue.index >= state.dialogue.lines.length) {
    const cb = state.dialogue.onDone;
    state.dialogue = null;
    if (cb) cb();
    render();
  } else {
    render();
  }
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

const app = document.getElementById("app");

function hpBarClass(pct) {
  return pct > 0.5 ? "hp-good" : pct > 0.2 ? "hp-warn" : "hp-bad";
}
function hpBar(inst) {
  const max = maxHpOf(inst);
  const pct = clamp(inst.hp / max, 0, 1);
  return `<div class="hpbar-track"><div class="hpbar-fill ${hpBarClass(pct)}" style="width:${pct * 100}%"></div></div>
    <div class="hpnum">${inst.hp}/${max}</div>`;
}
function statusTag(inst) {
  if (!inst.status) return "";
  const info = D.STATUS_INFO[inst.status];
  return `<span class="status-tag">${info.emoji} ${info.name}</span>`;
}

function render() {
  document.body.classList.toggle("muted", state.muted);
  app.innerHTML = topbarHtml() + screenHtml();
  const mapEl = document.getElementById("map-grid");
  if (mapEl) mapEl.style.setProperty("--cols", currentMap().width);
}

function topbarHtml() {
  if (state.screen === "intro") return "";
  return `<div class="topbar">
    <div class="tb-item">💰 ${state.coins}</div>
    <div class="tb-party">${state.party
      .map((p) => `<span class="tb-mon" title="${nameOf(p)}">${D.SPECIES[p.speciesId].emoji}${p.fainted ? "💤" : ""}</span>`)
      .join("")}</div>
    <button class="tb-btn" data-action="mute">${state.muted ? "🔇" : "🔊"}</button>
    ${state.screen === "overworld" ? `<button class="tb-btn" data-action="open-pause">☰</button>` : ""}
  </div>`;
}

function screenHtml() {
  switch (state.screen) {
    case "intro":
      return introHtml();
    case "overworld":
      return overworldHtml();
    case "battle":
      return battleHtml();
    case "party":
      return partyHtml();
    case "bag":
      return bagHtml();
    case "box":
      return boxHtml();
    case "shop":
      return shopHtml();
    case "pause":
      return pauseHtml();
    case "learnmove":
      return learnMoveHtml();
    default:
      return "";
  }
}

function introHtml() {
  return `<div class="screen intro-screen">
    <div class="intro-title">🐹⚡ Emojimon</div>
    <div class="intro-sub">A tiny Pokémon-Yellow-style adventure, made entirely of emoji.</div>
    <button class="big-btn" data-action="start-game">${state.flags.starterReceived || state.party.length ? "▶️ Continue" : "▶️ New Game"}</button>
    ${localStorage.getItem(SAVE_KEY) ? `<button class="small-btn" data-action="confirm-new-game">🔁 New Game</button>` : ""}
  </div>`;
}

function overworldHtml() {
  const map = currentMap();
  const rows = map.tiles.length;
  let tiles = "";
  for (let y = 0; y < rows; y++) {
    const row = [...map.tiles[y]];
    for (let x = 0; x < row.length; x++) {
      const legend = D.TILE_LEGEND[row[x]];
      tiles += `<div class="tile">${legend.emoji}</div>`;
    }
  }
  let entities = "";
  for (const e of map.entities) {
    if (e.kind === "building") entities += entityDiv(e.x, e.y, e.emoji, "ent-building");
    if (e.kind === "trainer" && !state.flags.defeatedTrainers[e.id]) entities += entityDiv(e.x, e.y, D.TRAINERS[e.id].emoji, "ent-trainer");
  }
  const playerEmoji = "🧑";
  const facingArrow = { up: "⬆️", down: "⬇️", left: "⬅️", right: "➡️" }[state.player.facing];
  return `<div class="screen overworld-screen">
    <div class="map-name">${map.name}</div>
    <div class="map-viewport">
      <div id="map-grid" class="map-grid">${tiles}</div>
      <div class="entities-layer">${entities}${entityDiv(state.player.x, state.player.y, playerEmoji, "ent-player")}</div>
    </div>
    ${state.dialogue ? dialogueHtml() : ""}
    <div class="dpad" data-nodialogue="${!!state.dialogue}">
      <div class="dpad-row"><button class="dpad-btn" data-action="move" data-dx="0" data-dy="-1">⬆️</button></div>
      <div class="dpad-row">
        <button class="dpad-btn" data-action="move" data-dx="-1" data-dy="0">⬅️</button>
        <button class="dpad-btn dpad-face">${facingArrow}</button>
        <button class="dpad-btn" data-action="move" data-dx="1" data-dy="0">➡️</button>
      </div>
      <div class="dpad-row"><button class="dpad-btn" data-action="move" data-dx="0" data-dy="1">⬇️</button></div>
    </div>
    <div class="ow-menu-row">
      <button class="small-btn" data-action="open-party">🎒 Emojimon</button>
      <button class="small-btn" data-action="open-bag">🧰 Bag</button>
    </div>
  </div>`;
}

function entityDiv(x, y, emoji, cls) {
  return `<div class="${cls} entity" style="transform:translate(calc(${x} * var(--tile)), calc(${y} * var(--tile)))">${emoji}</div>`;
}

function dialogueHtml() {
  const d = state.dialogue;
  return `<div class="dialogue-box" data-action="advance-dialogue">
    <div class="dialogue-text">${d.lines[d.index]}</div>
    <div class="dialogue-next">▶</div>
  </div>`;
}

function battleHtml() {
  const battle = state.battle;
  if (!battle) return "";
  const enemy = activeEnemy();
  const player = activePlayer();
  const showingText = battle.queue.length > 0;
  const currentText = showingText ? battle.queue[battle.qIndex] && battle.queue[battle.qIndex].text : "";

  let menuHtml = "";
  if (!showingText) {
    if (battle.menu === "main") {
      menuHtml = `<div class="battle-menu">
        <button class="battle-btn" data-action="battle-open" data-tab="fight">⚔️ Fight</button>
        <button class="battle-btn" data-action="battle-open" data-tab="bag">🧰 Bag</button>
        <button class="battle-btn" data-action="battle-open" data-tab="party">🎒 Emojimon</button>
        <button class="battle-btn" data-action="battle-run">🏃 Run</button>
      </div>`;
    } else if (battle.menu === "fight") {
      menuHtml = `<div class="battle-menu moves-menu">
        ${player.moves
          .map((mid) => {
            const m = D.MOVES[mid];
            return `<button class="battle-btn move-btn" data-action="battle-move" data-move="${mid}">${m.emoji} ${m.name}</button>`;
          })
          .join("")}
        <button class="battle-btn back-btn" data-action="battle-open" data-tab="main">↩️ Back</button>
      </div>`;
    } else if (battle.menu === "bag") {
      const list = ["potion", "fullheal"].concat(battle.kind === "wild" ? ["emojiball", "greatball", "ultraball"] : []);
      menuHtml = `<div class="battle-menu">
        ${list
          .map((iid) => {
            const it = D.ITEMS[iid];
            return `<button class="battle-btn" data-action="battle-item" data-item="${iid}" ${state.inventory[iid] <= 0 ? "disabled" : ""}>${it.emoji} ${it.name} ×${state.inventory[iid]}</button>`;
          })
          .join("")}
        <button class="battle-btn back-btn" data-action="battle-open" data-tab="main">↩️ Back</button>
      </div>`;
    } else if (battle.menu === "party" || battle.menu === "forceswitch") {
      menuHtml = `<div class="battle-menu party-menu">
        ${state.party
          .map(
            (p, i) => `<button class="battle-btn party-pick" data-action="battle-switch" data-idx="${i}" ${p.fainted || i === battle.playerIndex ? "disabled" : ""}>
            ${D.SPECIES[p.speciesId].emoji} ${nameOf(p)} Lv${p.level} ${p.fainted ? "💤" : `${p.hp}/${maxHpOf(p)}HP`}
          </button>`
          )
          .join("")}
        ${battle.menu === "party" ? `<button class="battle-btn back-btn" data-action="battle-open" data-tab="main">↩️ Back</button>` : ""}
      </div>`;
    }
  }

  return `<div class="screen battle-screen bg-${battle.bg || "town"}">
    <div class="battle-field">
      <div class="combatant enemy-side">
        <div class="combatant-card">
          <div class="combatant-name">${nameOf(enemy)} Lv${enemy.level} ${statusTag(enemy)}</div>
          ${hpBar(enemy)}
        </div>
        <div id="enemy-sprite" class="sprite enemy-sprite">${D.SPECIES[enemy.speciesId].emoji}</div>
      </div>
      <div class="combatant player-side">
        <div id="player-sprite" class="sprite player-sprite">${D.SPECIES[player.speciesId].emoji}</div>
        <div class="combatant-card">
          <div class="combatant-name">${nameOf(player)} Lv${player.level} ${statusTag(player)}</div>
          ${hpBar(player)}
        </div>
      </div>
    </div>
    <div class="battle-bottom">
      ${showingText ? `<div class="battle-textbox" data-action="battle-advance"><div class="dialogue-text">${currentText}</div><div class="dialogue-next">▶</div></div>` : menuHtml}
    </div>
  </div>`;
}

function partyHtml(pickMode) {
  return `<div class="screen list-screen">
    <div class="list-title">🎒 Your Emojimon</div>
    <div class="party-list">
      ${state.party
        .map(
          (p, i) => `<div class="party-row ${p.fainted ? "fainted" : ""}">
        <span class="party-emoji">${D.SPECIES[p.speciesId].emoji}</span>
        <div class="party-info">
          <div>${nameOf(p)} Lv${p.level} ${statusTag(p)}</div>
          ${hpBar(p)}
          <div class="moves-list">${p.moves.map((m) => `<span class="mini-move">${D.MOVES[m].emoji}${D.MOVES[m].name}</span>`).join(" ")}</div>
        </div>
      </div>`
        )
        .join("") || "<div class='empty-msg'>No Emojimon yet — visit the Lab!</div>"}
    </div>
    ${state.box.length ? `<button class="small-btn" data-action="open-box">📦 Box (${state.box.length})</button>` : ""}
    <button class="small-btn" data-action="close-menu">↩️ Close</button>
  </div>`;
}

function boxHtml() {
  return `<div class="screen list-screen">
    <div class="list-title">📦 Box</div>
    <div class="party-list">
      ${state.box
        .map(
          (p, i) => `<div class="party-row">
        <span class="party-emoji">${D.SPECIES[p.speciesId].emoji}</span>
        <div class="party-info"><div>${nameOf(p)} Lv${p.level}</div>${hpBar(p)}</div>
        <button class="small-btn" data-action="box-to-party" data-idx="${i}" ${state.party.length >= 6 ? "disabled" : ""}>➡️ Party</button>
      </div>`
        )
        .join("") || "<div class='empty-msg'>Box is empty.</div>"}
    </div>
    <button class="small-btn" data-action="open-party">↩️ Back</button>
  </div>`;
}

function bagHtml() {
  return `<div class="screen list-screen">
    <div class="list-title">🧰 Bag</div>
    <div class="party-list">
      ${Object.values(D.ITEMS)
        .map(
          (it) => `<div class="bag-row">
        <span>${it.emoji} ${it.name}</span><span>×${state.inventory[it.id] || 0}</span>
        ${it.kind === "heal" || it.kind === "cure" ? `<button class="small-btn" data-action="use-item-field" data-item="${it.id}" ${state.inventory[it.id] > 0 && state.party.length ? "" : "disabled"}>Use</button>` : ""}
      </div>`
        )
        .join("")}
    </div>
    <button class="small-btn" data-action="close-menu">↩️ Close</button>
  </div>`;
}

function shopHtml() {
  return `<div class="screen list-screen">
    <div class="list-title">🏪 Emberbrook Shop</div>
    <div class="tb-item" style="margin-bottom:8px">💰 ${state.coins}</div>
    ${state.shopMsg ? `<div class="shop-msg">${state.shopMsg}</div>` : ""}
    <div class="party-list">
      ${D.SHOP_STOCK.map((iid) => {
        const it = D.ITEMS[iid];
        return `<div class="bag-row">
          <span>${it.emoji} ${it.name} (${it.price}💰)</span><span>You have: ${state.inventory[iid] || 0}</span>
          <button class="small-btn" data-action="shop-buy" data-item="${iid}" ${state.coins >= it.price ? "" : "disabled"}>Buy</button>
        </div>`;
      }).join("")}
    </div>
    <button class="small-btn" data-action="close-menu">↩️ Leave Shop</button>
  </div>`;
}

function pauseHtml() {
  return `<div class="screen list-screen">
    <div class="list-title">☰ Menu</div>
    <button class="big-btn" data-action="do-save">💾 Save</button>
    <button class="big-btn" data-action="close-menu">▶️ Resume</button>
    <button class="small-btn" data-action="confirm-new-game">🔁 New Game</button>
  </div>`;
}

function learnMoveHtml() {
  const entry = state.learnQueue[0];
  const inst = findInstanceByUid(entry.instUid);
  if (!inst) {
    state.learnQueue.shift();
    if (!state.learnQueue.length) {
      state.screen = "overworld";
      saveGame();
    }
    return screenHtml();
  }
  const newMove = D.MOVES[entry.moveId];
  return `<div class="screen list-screen">
    <div class="list-title">${nameOf(inst)} wants to learn ${newMove.emoji} ${newMove.name}!</div>
    <div class="party-list">
      ${inst.moves
        .map((m, i) => `<button class="battle-btn move-btn" data-action="learn-swap" data-idx="${i}">Replace ${D.MOVES[m].emoji} ${D.MOVES[m].name}</button>`)
        .join("")}
      <button class="battle-btn back-btn" data-action="learn-skip">Don't learn ${newMove.name}</button>
    </div>
  </div>`;
}

function findInstanceByUid(u) {
  return state.party.find((p) => p.uid === u) || state.box.find((p) => p.uid === u);
}

// ---------------------------------------------------------------------------
// FX (Web Animations API — no CSS-class juggling needed)
// ---------------------------------------------------------------------------

function applyFx(fx) {
  if (fx.shake) {
    const el = document.getElementById(fx.shake === "enemy" ? "enemy-sprite" : "player-sprite");
    if (el) el.animate([{ transform: "translateX(0)" }, { transform: "translateX(-8px)" }, { transform: "translateX(8px)" }, { transform: "translateX(0)" }], { duration: 300 });
  }
  if (fx.flash) {
    const el = document.getElementById(fx.flash === "enemy" ? "enemy-sprite" : "player-sprite");
    if (el) el.animate([{ filter: "brightness(1)" }, { filter: "brightness(3) saturate(0)" }, { filter: "brightness(1)" }], { duration: 300 });
  }
  if (fx.pulse) {
    const el = document.getElementById(fx.pulse === "enemy" ? "enemy-sprite" : "player-sprite");
    if (el) el.animate([{ transform: "scale(1)", filter: "brightness(1)" }, { transform: "scale(1.4)", filter: "brightness(2)" }, { transform: "scale(1)", filter: "brightness(1)" }], { duration: 500 });
  }
}

// ---------------------------------------------------------------------------
// Input handling (delegated click + keyboard)
// ---------------------------------------------------------------------------

app.addEventListener("click", (e) => {
  const el = e.target.closest("[data-action]");
  if (!el) return;
  const action = el.dataset.action;
  Snd.play("menuMove");
  switch (action) {
    case "start-game":
      state.screen = "overworld";
      render();
      break;
    case "mute":
      state.muted = !state.muted;
      Snd.setMuted(state.muted);
      saveGame();
      render();
      break;
    case "move":
      movePlayer(Number(el.dataset.dx), Number(el.dataset.dy));
      break;
    case "advance-dialogue":
      advanceDialogue();
      break;
    case "open-party":
      state.screen = "party";
      render();
      break;
    case "open-box":
      state.screen = "box";
      render();
      break;
    case "box-to-party": {
      const idx = Number(el.dataset.idx);
      if (state.party.length < 6) {
        const [mon] = state.box.splice(idx, 1);
        state.party.push(mon);
        saveGame();
      }
      render();
      break;
    }
    case "open-bag":
      state.screen = "bag";
      render();
      break;
    case "use-item-field": {
      const iid = el.dataset.item;
      const target = state.party.find((p) => (D.ITEMS[iid].kind === "cure" ? p.status : p.hp < maxHpOf(p))) || state.party[0];
      if (target && applyItemToInstance(iid, target)) {
        Snd.play("heal");
        saveGame();
      }
      render();
      break;
    }
    case "open-pause":
      state.screen = "pause";
      render();
      break;
    case "close-menu":
      state.screen = "overworld";
      render();
      break;
    case "do-save":
      saveGame();
      Snd.play("save");
      state.toast = "Saved!";
      render();
      setTimeout(() => {
        state.toast = null;
        render();
      }, 1200);
      break;
    case "confirm-new-game":
      if (confirm("Erase your save and start a brand new game?")) newGame();
      break;
    case "shop-buy": {
      const iid = el.dataset.item;
      const it = D.ITEMS[iid];
      if (state.coins >= it.price) {
        state.coins -= it.price;
        state.inventory[iid] = (state.inventory[iid] || 0) + 1;
        state.shopMsg = `Bought a ${it.name}!`;
        Snd.play("coin");
        saveGame();
      }
      render();
      break;
    }
    case "battle-advance":
      advanceQueue();
      break;
    case "battle-open":
      if (state.battle) {
        state.battle.menu = el.dataset.tab;
        render();
      }
      break;
    case "battle-move":
      battleUseMove(el.dataset.move);
      break;
    case "battle-item":
      if (!el.hasAttribute("disabled")) battleUseItem(el.dataset.item);
      break;
    case "battle-switch":
      if (!el.hasAttribute("disabled")) battleSwitchTo(Number(el.dataset.idx));
      break;
    case "battle-run":
      battleRun();
      break;
    case "learn-swap": {
      const entry = state.learnQueue.shift();
      const inst = findInstanceByUid(entry.instUid);
      if (inst) inst.moves[Number(el.dataset.idx)] = entry.moveId;
      Snd.play("levelUp");
      if (!state.learnQueue.length) {
        state.screen = "overworld";
        saveGame();
      }
      render();
      break;
    }
    case "learn-skip": {
      state.learnQueue.shift();
      if (!state.learnQueue.length) {
        state.screen = "overworld";
        saveGame();
      }
      render();
      break;
    }
  }
});

const KEY_DIRS = {
  ArrowUp: [0, -1], w: [0, -1], W: [0, -1],
  ArrowDown: [0, 1], s: [0, 1], S: [0, 1],
  ArrowLeft: [-1, 0], a: [-1, 0], A: [-1, 0],
  ArrowRight: [1, 0], d: [1, 0], D: [1, 0],
};

window.addEventListener("keydown", (e) => {
  if (state.screen === "overworld" && !state.dialogue && KEY_DIRS[e.key]) {
    e.preventDefault();
    const [dx, dy] = KEY_DIRS[e.key];
    movePlayer(dx, dy);
    return;
  }
  if ((e.key === "Enter" || e.key === " ") && state.dialogue) {
    e.preventDefault();
    advanceDialogue();
    return;
  }
  if ((e.key === "Enter" || e.key === " ") && state.screen === "battle" && battleQueueActive()) {
    e.preventDefault();
    advanceQueue();
    return;
  }
  if (e.key === "Escape" && state.screen === "overworld") {
    state.screen = "pause";
    render();
  }
});

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

render();
