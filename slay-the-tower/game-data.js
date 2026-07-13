// AUTO-GENERATED from data/game-data.json by scripts/gen-data.mjs — do not edit by hand.
window.GAME_DATA = {
  "cards": {
    "strike": {
      "name": "Strike",
      "emoji": "⚔️",
      "type": "attack",
      "rarity": "starter",
      "cls": "warrior",
      "base": {
        "cost": 1,
        "dmg": 6
      },
      "upgraded": {
        "dmg": 9
      },
      "desc": "Deal {dmg} damage."
    },
    "defend": {
      "name": "Defend",
      "emoji": "🛡️",
      "type": "skill",
      "rarity": "starter",
      "cls": "warrior",
      "base": {
        "cost": 1,
        "block": 5
      },
      "upgraded": {
        "block": 8
      },
      "desc": "Gain {block} Block."
    },
    "bash": {
      "name": "Bash",
      "emoji": "💥",
      "type": "attack",
      "rarity": "starter",
      "cls": "warrior",
      "base": {
        "cost": 2,
        "dmg": 8,
        "vulnerable": 2
      },
      "upgraded": {
        "dmg": 11,
        "vulnerable": 3
      },
      "desc": "Deal {dmg} damage. Apply {vulnerable} Vulnerable."
    },
    "cleave": {
      "name": "Cleave",
      "emoji": "🌀",
      "type": "attack",
      "rarity": "common",
      "cls": "warrior",
      "base": {
        "cost": 1,
        "dmg": 8,
        "aoe": true
      },
      "upgraded": {
        "dmg": 11
      },
      "desc": "Deal {dmg} damage to ALL enemies."
    },
    "twinStrike": {
      "name": "Twin Strike",
      "emoji": "🗡️",
      "type": "attack",
      "rarity": "common",
      "cls": "warrior",
      "base": {
        "cost": 1,
        "dmg": 5,
        "hits": 2
      },
      "upgraded": {
        "dmg": 7
      },
      "desc": "Deal {dmg} damage twice."
    },
    "ironWave": {
      "name": "Iron Wave",
      "emoji": "🌊",
      "type": "attack",
      "rarity": "common",
      "cls": "warrior",
      "base": {
        "cost": 1,
        "dmg": 5,
        "block": 5
      },
      "upgraded": {
        "dmg": 7,
        "block": 7
      },
      "desc": "Deal {dmg} damage. Gain {block} Block."
    },
    "pommelStrike": {
      "name": "Pommel Strike",
      "emoji": "🔨",
      "type": "attack",
      "rarity": "common",
      "cls": "warrior",
      "base": {
        "cost": 1,
        "dmg": 9,
        "draw": 1
      },
      "upgraded": {
        "dmg": 12
      },
      "desc": "Deal {dmg} damage. Draw {draw} card."
    },
    "shrugItOff": {
      "name": "Shrug It Off",
      "emoji": "🙆",
      "type": "skill",
      "rarity": "common",
      "cls": "warrior",
      "base": {
        "cost": 1,
        "block": 8,
        "draw": 1
      },
      "upgraded": {
        "block": 11
      },
      "desc": "Gain {block} Block. Draw {draw} card."
    },
    "trueGrit": {
      "name": "True Grit",
      "emoji": "🦾",
      "type": "skill",
      "rarity": "common",
      "cls": "warrior",
      "base": {
        "cost": 1,
        "block": 7,
        "exhaust": true
      },
      "upgraded": {
        "block": 10
      },
      "desc": "Gain {block} Block. Exhaust."
    },
    "warcry": {
      "name": "Warcry",
      "emoji": "📣",
      "type": "skill",
      "rarity": "common",
      "cls": "warrior",
      "base": {
        "cost": 0,
        "strength": 2
      },
      "upgraded": {
        "strength": 3
      },
      "desc": "Gain {strength} Strength for this combat."
    },
    "clothesline": {
      "name": "Clothesline",
      "emoji": "🩸",
      "type": "attack",
      "rarity": "uncommon",
      "cls": "warrior",
      "base": {
        "cost": 2,
        "dmg": 12,
        "weak": 2
      },
      "upgraded": {
        "dmg": 16,
        "weak": 3
      },
      "desc": "Deal {dmg} damage. Apply {weak} Weak."
    },
    "heavyStrike": {
      "name": "Heavy Strike",
      "emoji": "💪",
      "type": "attack",
      "rarity": "uncommon",
      "cls": "warrior",
      "base": {
        "cost": 2,
        "dmg": 16
      },
      "upgraded": {
        "dmg": 21
      },
      "desc": "Deal {dmg} damage."
    },
    "inflame": {
      "name": "Inflame",
      "emoji": "🔥",
      "type": "power",
      "rarity": "uncommon",
      "cls": "warrior",
      "base": {
        "cost": 1,
        "strength": 3,
        "exhaust": true
      },
      "upgraded": {
        "strength": 4
      },
      "desc": "Gain {strength} Strength permanently this fight. Exhaust."
    },
    "battleTrance": {
      "name": "Battle Trance",
      "emoji": "🌟",
      "type": "skill",
      "rarity": "uncommon",
      "cls": "warrior",
      "base": {
        "cost": 0,
        "draw": 3,
        "exhaust": true
      },
      "upgraded": {
        "draw": 4
      },
      "desc": "Draw {draw} cards. Exhaust."
    },
    "offering": {
      "name": "Offering",
      "emoji": "🕯️",
      "type": "skill",
      "rarity": "rare",
      "cls": "warrior",
      "base": {
        "cost": 0,
        "loseHp": 3,
        "energy": 2,
        "draw": 3,
        "exhaust": true
      },
      "upgraded": {
        "loseHp": 2,
        "draw": 4
      },
      "desc": "Lose {loseHp} HP. Gain {energy} Energy. Draw {draw} cards. Exhaust."
    },
    "bludgeon": {
      "name": "Bludgeon",
      "emoji": "🪓",
      "type": "attack",
      "rarity": "rare",
      "cls": "warrior",
      "base": {
        "cost": 3,
        "dmg": 28
      },
      "upgraded": {
        "dmg": 36
      },
      "desc": "Deal {dmg} damage."
    },
    "immolate": {
      "name": "Immolate",
      "emoji": "☄️",
      "type": "attack",
      "rarity": "rare",
      "cls": "warrior",
      "base": {
        "cost": 2,
        "dmg": 12,
        "aoe": true,
        "exhaust": true
      },
      "upgraded": {
        "dmg": 16
      },
      "desc": "Deal {dmg} damage to ALL enemies. Exhaust."
    },
    "frostbolt": {
      "name": "Frostbolt",
      "emoji": "❄️",
      "type": "attack",
      "rarity": "starter",
      "cls": "mage",
      "base": {
        "cost": 1,
        "dmg": 5
      },
      "upgraded": {
        "dmg": 8
      },
      "desc": "Deal {dmg} damage."
    },
    "frostWard": {
      "name": "Frost Ward",
      "emoji": "🧊",
      "type": "skill",
      "rarity": "starter",
      "cls": "mage",
      "base": {
        "cost": 1,
        "block": 5
      },
      "upgraded": {
        "block": 8
      },
      "desc": "Gain {block} Block."
    },
    "fireball": {
      "name": "Fireball",
      "emoji": "🔥",
      "type": "attack",
      "rarity": "starter",
      "cls": "mage",
      "base": {
        "cost": 2,
        "dmg": 9
      },
      "upgraded": {
        "dmg": 13
      },
      "desc": "Deal {dmg} damage."
    },
    "arcaneMissiles": {
      "name": "Arcane Missiles",
      "emoji": "✨",
      "type": "attack",
      "rarity": "common",
      "cls": "mage",
      "base": {
        "cost": 1,
        "dmg": 3,
        "hits": 3
      },
      "upgraded": {
        "dmg": 4
      },
      "desc": "Deal {dmg} damage {hits} times."
    },
    "iceLance": {
      "name": "Ice Lance",
      "emoji": "🔹",
      "type": "attack",
      "rarity": "common",
      "cls": "mage",
      "base": {
        "cost": 1,
        "dmg": 5,
        "weak": 1
      },
      "upgraded": {
        "dmg": 7,
        "weak": 1
      },
      "desc": "Deal {dmg} damage. Apply {weak} Weak."
    },
    "scorch": {
      "name": "Scorch",
      "emoji": "♨️",
      "type": "attack",
      "rarity": "common",
      "cls": "mage",
      "base": {
        "cost": 1,
        "dmg": 8
      },
      "upgraded": {
        "dmg": 11
      },
      "desc": "Deal {dmg} damage."
    },
    "manaShield": {
      "name": "Mana Shield",
      "emoji": "🧿",
      "type": "skill",
      "rarity": "common",
      "cls": "mage",
      "base": {
        "cost": 1,
        "block": 8,
        "draw": 1
      },
      "upgraded": {
        "block": 11
      },
      "desc": "Gain {block} Block. Draw {draw} card."
    },
    "arcaneIntellect": {
      "name": "Arcane Intellect",
      "emoji": "📘",
      "type": "skill",
      "rarity": "common",
      "cls": "mage",
      "base": {
        "cost": 1,
        "draw": 2
      },
      "upgraded": {
        "draw": 3
      },
      "desc": "Draw {draw} cards."
    },
    "frostNova": {
      "name": "Frost Nova",
      "emoji": "🌨️",
      "type": "attack",
      "rarity": "common",
      "cls": "mage",
      "base": {
        "cost": 1,
        "dmg": 6,
        "aoe": true
      },
      "upgraded": {
        "dmg": 9
      },
      "desc": "Deal {dmg} damage to ALL enemies."
    },
    "flamestrike": {
      "name": "Flamestrike",
      "emoji": "🌋",
      "type": "attack",
      "rarity": "uncommon",
      "cls": "mage",
      "base": {
        "cost": 2,
        "dmg": 11,
        "aoe": true
      },
      "upgraded": {
        "dmg": 15
      },
      "desc": "Deal {dmg} damage to ALL enemies."
    },
    "frostbite": {
      "name": "Frostbite",
      "emoji": "🥶",
      "type": "attack",
      "rarity": "uncommon",
      "cls": "mage",
      "base": {
        "cost": 2,
        "dmg": 12,
        "weak": 2
      },
      "upgraded": {
        "dmg": 16,
        "weak": 3
      },
      "desc": "Deal {dmg} damage. Apply {weak} Weak."
    },
    "arcanePower": {
      "name": "Arcane Power",
      "emoji": "🔮",
      "type": "power",
      "rarity": "uncommon",
      "cls": "mage",
      "base": {
        "cost": 1,
        "strength": 3,
        "exhaust": true
      },
      "upgraded": {
        "strength": 4
      },
      "desc": "Gain {strength} Strength this fight. Exhaust."
    },
    "evocation": {
      "name": "Evocation",
      "emoji": "🔷",
      "type": "skill",
      "rarity": "uncommon",
      "cls": "mage",
      "base": {
        "cost": 0,
        "energy": 2,
        "draw": 1,
        "exhaust": true
      },
      "upgraded": {
        "draw": 2
      },
      "desc": "Gain {energy} Energy. Draw {draw} card. Exhaust."
    },
    "pyroblast": {
      "name": "Pyroblast",
      "emoji": "☄️",
      "type": "attack",
      "rarity": "rare",
      "cls": "mage",
      "base": {
        "cost": 2,
        "dmg": 22
      },
      "upgraded": {
        "dmg": 28
      },
      "desc": "Deal {dmg} damage."
    },
    "meteor": {
      "name": "Meteor",
      "emoji": "🌠",
      "type": "attack",
      "rarity": "rare",
      "cls": "mage",
      "base": {
        "cost": 2,
        "dmg": 13,
        "aoe": true,
        "exhaust": true
      },
      "upgraded": {
        "dmg": 17
      },
      "desc": "Deal {dmg} damage to ALL enemies. Exhaust."
    },
    "iceBlock": {
      "name": "Ice Block",
      "emoji": "🧱",
      "type": "skill",
      "rarity": "rare",
      "cls": "mage",
      "base": {
        "cost": 1,
        "block": 20,
        "exhaust": true
      },
      "upgraded": {
        "block": 26
      },
      "desc": "Gain {block} Block. Exhaust."
    }
  },
  "relics": {
    "burningBlood": {
      "name": "Burning Blood",
      "emoji": "🩸",
      "desc": "Heal 6 HP after every combat."
    },
    "vajra": {
      "name": "Vajra Stone",
      "emoji": "💎",
      "desc": "Start each combat with 1 Strength."
    },
    "anchor": {
      "name": "Anchor",
      "emoji": "⚓",
      "desc": "Start each combat with 10 Block."
    },
    "energyCore": {
      "name": "Energy Core",
      "emoji": "🔋",
      "desc": "Gain 1 additional Energy each turn."
    },
    "regenCharm": {
      "name": "Regen Charm",
      "emoji": "❤️‍🩹",
      "desc": "Heal 2 HP at the start of each of your turns."
    },
    "goldenIdol": {
      "name": "Golden Idol",
      "emoji": "🗿",
      "desc": "Gain 25% more gold from battles."
    },
    "ringSnake": {
      "name": "Ring of the Snake",
      "emoji": "🐍",
      "desc": "Draw 1 additional card each turn."
    },
    "bronzeScales": {
      "name": "Bronze Scales",
      "emoji": "🐚",
      "desc": "Attackers take 3 damage when they hit you."
    },
    "oldCoin": {
      "name": "Old Coin",
      "emoji": "🪙",
      "desc": "A pouch of ancient gold. (Already spent: +100g on pickup.)"
    },
    "manaCrystal": {
      "name": "Mana Crystal",
      "emoji": "🔮",
      "desc": "Gain 1 extra Energy on your first turn of each combat."
    }
  },
  "potions": {
    "firePotion": {
      "name": "Fire Potion",
      "emoji": "🧨",
      "desc": "Deal 20 damage to one enemy.",
      "target": true
    },
    "healPotion": {
      "name": "Heal Potion",
      "emoji": "💗",
      "desc": "Heal 20 HP.",
      "target": false
    },
    "blockPotion": {
      "name": "Block Potion",
      "emoji": "🧪",
      "desc": "Gain 12 Block.",
      "target": false
    },
    "energyPotion": {
      "name": "Energy Potion",
      "emoji": "⚡",
      "desc": "Gain 2 Energy.",
      "target": false
    }
  },
  "enemies": {
    "slime": {
      "name": "Acid Slime",
      "emoji": "🟢",
      "hp": [
        38,
        46
      ],
      "pattern": [
        "attack",
        "attack",
        "defend"
      ],
      "moves": {
        "attack": {
          "kind": "attack",
          "dmg": [
            7,
            10
          ]
        },
        "defend": {
          "kind": "defend",
          "block": [
            8,
            11
          ]
        }
      }
    },
    "goblin": {
      "name": "Goblin Grunt",
      "emoji": "👺",
      "hp": [
        35,
        42
      ],
      "pattern": [
        "attack",
        "attack",
        "weaken"
      ],
      "moves": {
        "attack": {
          "kind": "attack",
          "dmg": [
            8,
            12
          ]
        },
        "weaken": {
          "kind": "debuff",
          "weak": 2,
          "dmg": [
            4,
            6
          ]
        }
      }
    },
    "bat": {
      "name": "Cave Bat",
      "emoji": "🦇",
      "hp": [
        30,
        36
      ],
      "pattern": [
        "attack",
        "attack",
        "attack",
        "defend"
      ],
      "moves": {
        "attack": {
          "kind": "attack",
          "dmg": [
            6,
            9
          ]
        },
        "defend": {
          "kind": "defend",
          "block": [
            6,
            8
          ]
        }
      }
    },
    "cultist": {
      "name": "Cultist",
      "emoji": "🧙",
      "hp": [
        40,
        48
      ],
      "pattern": [
        "ritual",
        "attack",
        "attack"
      ],
      "moves": {
        "ritual": {
          "kind": "buff",
          "strength": 3
        },
        "attack": {
          "kind": "attack",
          "dmg": [
            9,
            13
          ]
        }
      }
    },
    "hound": {
      "name": "Shadow Hound",
      "emoji": "🐺",
      "hp": [
        32,
        38
      ],
      "pattern": [
        "attack",
        "attack",
        "vulnerable"
      ],
      "moves": {
        "attack": {
          "kind": "attack",
          "dmg": [
            7,
            10
          ]
        },
        "vulnerable": {
          "kind": "debuff",
          "vulnerable": 2,
          "dmg": [
            5,
            7
          ]
        }
      }
    },
    "skeleton": {
      "name": "Bone Warrior",
      "emoji": "💀",
      "hp": [
        36,
        44
      ],
      "pattern": [
        "defend",
        "attack",
        "attack"
      ],
      "moves": {
        "attack": {
          "kind": "attack",
          "dmg": [
            8,
            11
          ]
        },
        "defend": {
          "kind": "defend",
          "block": [
            7,
            9
          ]
        }
      }
    }
  },
  "elites": {
    "ogre": {
      "name": "Rock Ogre",
      "emoji": "👹",
      "hp": [
        70,
        80
      ],
      "pattern": [
        "smash",
        "smash",
        "defend"
      ],
      "moves": {
        "smash": {
          "kind": "attack",
          "dmg": [
            16,
            20
          ]
        },
        "defend": {
          "kind": "defend",
          "block": [
            15,
            18
          ]
        }
      }
    },
    "sentinel": {
      "name": "Stone Sentinel",
      "emoji": "🗿",
      "hp": [
        75,
        85
      ],
      "pattern": [
        "charge",
        "attack",
        "attack"
      ],
      "moves": {
        "charge": {
          "kind": "buff",
          "strength": 4
        },
        "attack": {
          "kind": "attack",
          "dmg": [
            13,
            17
          ]
        }
      }
    }
  },
  "boss": {
    "guardian": {
      "name": "Tower Guardian",
      "emoji": "🐉",
      "hp": [
        180,
        200
      ],
      "pattern": [
        "slam",
        "slam",
        "roar",
        "attack",
        "attack"
      ],
      "moves": {
        "slam": {
          "kind": "attack",
          "dmg": [
            22,
            26
          ]
        },
        "roar": {
          "kind": "debuff",
          "weak": 3,
          "vulnerable": 2,
          "dmg": [
            0,
            0
          ]
        },
        "attack": {
          "kind": "attack",
          "dmg": [
            14,
            18
          ]
        }
      }
    }
  },
  "characters": {
    "warrior": {
      "name": "Warrior",
      "emoji": "⚔️",
      "maxHp": 70,
      "relics": [
        "burningBlood"
      ],
      "blurb": "Sturdy bruiser — high HP, dependable Block and heavy strikes.",
      "deck": [
        [
          5,
          "strike"
        ],
        [
          4,
          "defend"
        ],
        [
          1,
          "bash"
        ]
      ]
    },
    "mage": {
      "name": "Frost Mage",
      "emoji": "🧙",
      "maxHp": 60,
      "relics": [
        "manaCrystal"
      ],
      "blurb": "Glass cannon — less HP, but chilling frost and burning burst spells.",
      "deck": [
        [
          4,
          "frostbolt"
        ],
        [
          4,
          "frostWard"
        ],
        [
          1,
          "fireball"
        ],
        [
          1,
          "arcaneIntellect"
        ]
      ]
    }
  }
};
