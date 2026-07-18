// Snap Ships Tactics: Duel — static game data (ships, parts, missiles, terrain).
// Generated to match docs/requirements.md §5-6-10 and rules.md's Starter Box reference table.
// Edit via admin/index.html, which Exports back to this exact file shape.
"use strict";

const GameData = {
  arena: { size: 1000 },

  terrain: [
    { key: "debris1", type: "debris", emoji: "☁️", x: 350, y: 650, radius: 70 },
    { key: "ice1", type: "ice", emoji: "❄️", x: 650, y: 350, radius: 70 }
  ],

  terrainTypes: {
    debris: { name: "Debris Cloud", cover: "soft", onEnter: "evade1" },
    ice: { name: "Ice Cloud", cover: "soft", onEnter: "ventOne" }
  },

  missiles: {
    light: { key: "light", name: "Light Missile", emoji: "🚀", quality: 5, hit: 0, dice: 1, damage: 1 }
  },

  ships: {
    sabre: {
      key: "sabre",
      name: "Sabre XF-23 Fighter",
      faction: "forge",
      emoji: "🚀", // 🚀
      hullMax: 15,
      evasionDefault: 2,
      ventPerActivation: 5,
      powerMax: 7,
      size: 4,
      pointCost: 4,
      chassisAbilityKey: "sabreCrit",
      chassisAbilityText: "Before a crit location is rolled on this ship: if you have no disabled parts, you choose which part is disabled.",
      chassisMovement: [
        { type: "rotate", max: 1 },
        { type: "move", dist: "L", dir: "fwd" }
      ],
      deploy: { x: 500, y: 955, facing: 0 },
      parts: [
        {
          key: "xf25cockpit",
          name: "XF-25 Cockpit",
          emoji: "🧑‍🚀",
          slot: "cockpit",
          repairCost: 2,
          abilities: [
            {
              key: "cockpitReroll",
              name: "Reroll",
              kind: "reaction",
              costPower: 1,
              variableCost: true,
              variableMax: 2,
              effect: "rerollReaction",
              text: "When you attack: spend 1-2 power to reroll that many dice."
            }
          ]
        },
        {
          key: "sdu14",
          name: "SDU-14 Jump Engine",
          emoji: "⚙️",
          slot: "thruster",
          repairCost: 2,
          abilities: [
            {
              key: "jumpForward",
              name: "Jump Forward",
              kind: "action",
              costPower: 1,
              effect: "moveForward",
              dist: "L",
              text: "Cost 1 power: Move L straight ahead."
            },
            {
              key: "jumpFree",
              name: "Jump & U-Turn",
              kind: "action",
              costPower: 2,
              effect: "moveFree",
              dist: "L",
              allowUTurn: true,
              text: "Cost 2 power: Move L any direction, then optional U-Turn."
            }
          ]
        },
        {
          key: "xf25wings",
          name: "XF-25 Wings",
          emoji: "✈️",
          slot: "wing",
          repairCost: 2,
          abilities: [
            {
              key: "wingsStrafe",
              name: "Strafe",
              kind: "action",
              costPower: 1,
              effect: "moveLateral",
              dist: "S",
              text: "Cost 1 power: Move S, left or right."
            },
            {
              key: "wingsEvade",
              name: "Bank",
              kind: "action",
              costPower: 1,
              effect: "evade",
              evadeAmount: 1,
              text: "Cost 1 power: Evade 1."
            }
          ]
        },
        {
          key: "xr70",
          name: "XR70 Missile Pod",
          emoji: "📦",
          slot: "system",
          repairCost: 2,
          abilities: [
            {
              key: "xr70launch",
              name: "Launch Missiles",
              kind: "action",
              costPower: 1,
              costHeat: 3,
              effect: "launch",
              missileType: "light",
              missileCount: 4,
              arc: 180,
              rangeMin: 2,
              rangeMax: 3,
              text: "Cost 1 power + 3 heat: Launch 4 Light Missiles, Arc 180°, Range 2-3."
            }
          ]
        },
        {
          key: "mk16",
          name: "MK16 Autocannon",
          emoji: "🔫",
          slot: "system",
          repairCost: 2,
          abilities: [
            {
              key: "mk16attack",
              name: "Fire Autocannon",
              kind: "action",
              costPower: 1,
              effect: "attack",
              hitBase: 2,
              dice: 4,
              damage: 1,
              arc: 90,
              rangeMin: 1,
              rangeMax: 2,
              antiMissile: true,
              text: "Cost 1 power: Hit 2+Evasion, Dice 4, Damage 1, Arc 90°, Range 1-2."
            }
          ]
        },
        {
          key: "fins1",
          name: "Maneuvering Fins",
          emoji: "🔺",
          slot: "system",
          repairCost: 2,
          abilities: [
            {
              key: "finsRotate",
              name: "Rotate",
              kind: "action",
              costPower: 1,
              effect: "rotate",
              rotateMax: 2,
              text: "Cost 1 power: Rotate 2."
            }
          ]
        }
      ]
    },

    scarab: {
      key: "scarab",
      name: "Scarab KLAW Interceptor",
      faction: "komplex",
      emoji: "👾", // 👾
      hullMax: 13,
      evasionDefault: 3,
      ventPerActivation: 5,
      powerMax: 7,
      size: 4,
      pointCost: 4,
      chassisAbilityKey: "scarabCollisionReroll",
      chassisAbilityText: "During a collision or Ram action: may reroll one die.",
      chassisMovement: [
        { type: "move", dist: "S", dir: "fwd" },
        { type: "rotate", max: 1 }
      ],
      deploy: { x: 500, y: 45, facing: 180 },
      parts: [
        {
          key: "scarabCockpit",
          name: "Scarab Cockpit",
          emoji: "👽",
          slot: "cockpit",
          repairCost: 2,
          abilities: [
            {
              key: "cockpitEvade",
              name: "Overcharge Evasion",
              kind: "action",
              costPower: 1,
              effect: "special",
              evasionBonus: 2,
              text: "Cost 1 power: Gain Evasion +2 (self)."
            }
          ]
        },
        {
          key: "fb3",
          name: "FB3 Tri-Thruster",
          emoji: "🔥",
          slot: "thruster",
          repairCost: 2,
          abilities: [
            {
              key: "fb3forward",
              name: "Burn Forward",
              kind: "action",
              costPower: 1,
              effect: "moveForward",
              dist: "L",
              text: "Cost 1 power: Move L straight ahead."
            },
            {
              key: "fb3strafe",
              name: "Strafe",
              kind: "action",
              costPower: 1,
              effect: "moveLateral",
              dist: "S",
              text: "Cost 1 power: Move S, left or right."
            }
          ]
        },
        {
          key: "bladeWings",
          name: "Blade Wings",
          emoji: "🗡️",
          slot: "wing",
          repairCost: 2,
          abilities: [
            {
              key: "ramAttack",
              name: "Ram",
              kind: "action",
              costPower: 2,
              effect: "ram",
              dist: "S",
              hitBase: 2,
              dice: 2,
              damage: 2,
              arc: 90,
              text: "Cost 2 power: Move S forward; if this collides, attack Hit 2+Evasion, Dice 2, Damage 2 instead of normal collision damage."
            }
          ]
        },
        {
          key: "mantis",
          name: "CPL-2 Mantis Laser",
          emoji: "🔮",
          slot: "system",
          repairCost: 2,
          abilities: [
            {
              key: "mantisAttack",
              name: "Fire Mantis Laser",
              kind: "action",
              costPower: 1,
              effect: "attack",
              hitBase: 2,
              dice: 2,
              damage: 2,
              arc: 90,
              rangeMin: 2,
              rangeMax: 2,
              antiMissile: true,
              text: "Cost 1 power: Hit 2+Evasion, Dice 2, Damage 2, Arc 90°, Range 2."
            }
          ]
        },
        {
          key: "gatling",
          name: "C6-3 Gatling Gun",
          emoji: "🔫",
          slot: "system",
          repairCost: 2,
          abilities: [
            {
              key: "gatlingAttack",
              name: "Fire Gatling Gun",
              kind: "action",
              costPower: 2,
              effect: "attack",
              hitBase: 1,
              dice: 6,
              damage: 1,
              arc: 90,
              rangeMin: 1,
              rangeMax: 2,
              antiMissile: true,
              text: "Cost 2 power: Hit 1+Evasion, Dice 6, Damage 1, Arc 90°, Range 1-2."
            }
          ]
        },
        {
          key: "fins2",
          name: "Maneuvering Fins",
          emoji: "🔺",
          slot: "system",
          repairCost: 2,
          abilities: [
            {
              key: "finsRotate2",
              name: "Rotate",
              kind: "action",
              costPower: 1,
              effect: "rotate",
              rotateMax: 2,
              text: "Cost 1 power: Rotate 2."
            }
          ]
        }
      ]
    }
  }
};

if (typeof module !== "undefined" && module.exports) module.exports = GameData;
