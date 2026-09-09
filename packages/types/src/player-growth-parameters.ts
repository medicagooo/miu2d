/** Player-only V2 curves. Provenance and migration contract:
 * .branch-records/0909-player-growth-functions/implementation.md.
 * Parameters fitted offline; runtime never fits or reads editable player level rows.
 */
export const PLAYER_GROWTH_PARAMETERS = {
  "sword1-easy": {
    game: "sword1",
    difficulty: "easy",
    originalMaxLevel: 80,
    attributes: {
      lifeMax: {
        a: 180.0,
        b: 348.671756,
        p: 1.5,
      },
      thewMax: {
        a: 300.0,
        b: 47.224515,
        p: 1.402068,
      },
      manaMax: {
        a: 100.0,
        b: 121.566902,
        p: 1.063319,
      },
      attack: {
        a: 110.0,
        b: 189.827617,
        p: 1.39664,
      },
      defend: {
        a: 70.0,
        b: 175.803517,
        p: 1.5,
      },
      evade: {
        a: 8.0,
        b: 21.625053,
        p: 1.437297,
      },
    },
    experience: {
      k: 21.488942,
      q: 1.15,
      r: 3.543858,
    },
  },
  "sword1-hard": {
    game: "sword1",
    difficulty: "hard",
    originalMaxLevel: 80,
    attributes: {
      lifeMax: {
        a: 90.0,
        b: 174.355447,
        p: 1.5,
      },
      thewMax: {
        a: 160.0,
        b: 52.487919,
        p: 1.415074,
      },
      manaMax: {
        a: 50.0,
        b: 45.829457,
        p: 1.5,
      },
      attack: {
        a: 100.0,
        b: 200.170789,
        p: 1.374679,
      },
      defend: {
        a: 50.0,
        b: 184.102436,
        p: 1.302624,
      },
      evade: {
        a: 1.0,
        b: 36.818963,
        p: 1.111152,
      },
    },
    experience: {
      k: 21.488942,
      q: 1.15,
      r: 3.543858,
    },
  },
  "demo-easy": {
    game: "demo",
    difficulty: "easy",
    originalMaxLevel: 80,
    attributes: {
      lifeMax: {
        a: 135.0,
        b: 311.554294,
        p: 1.362422,
      },
      thewMax: {
        a: 80.0,
        b: 46.377375,
        p: 1.5,
      },
      manaMax: {
        a: 50.0,
        b: 45.829457,
        p: 1.5,
      },
      attack: {
        a: 100.0,
        b: 200.170789,
        p: 1.374679,
      },
      defend: {
        a: 75.0,
        b: 276.4236,
        p: 1.302251,
      },
      evade: {
        a: 1.0,
        b: 36.818963,
        p: 1.111152,
      },
    },
    experience: {
      k: 23.544711,
      q: 1.53248,
      r: 1.291261,
    },
  },
  "demo-hard": {
    game: "demo",
    difficulty: "hard",
    originalMaxLevel: 80,
    attributes: {
      lifeMax: {
        a: 90.0,
        b: 207.553322,
        p: 1.36266,
      },
      thewMax: {
        a: 80.0,
        b: 46.377375,
        p: 1.5,
      },
      manaMax: {
        a: 50.0,
        b: 45.829457,
        p: 1.5,
      },
      attack: {
        a: 100.0,
        b: 200.170789,
        p: 1.374679,
      },
      defend: {
        a: 50.0,
        b: 184.102436,
        p: 1.302624,
      },
      evade: {
        a: 1.0,
        b: 36.818963,
        p: 1.111152,
      },
    },
    experience: {
      k: 23.544711,
      q: 1.53248,
      r: 1.291261,
    },
  },
  "sword2-easy": {
    game: "sword2",
    difficulty: "easy",
    originalMaxLevel: 60,
    attributes: {
      lifeMax: {
        a: 750.0,
        b: 1080.922296,
        p: 1.052661,
      },
      thewMax: {
        a: 52.0,
        b: 174.775588,
        p: 1.5,
      },
      manaMax: {
        a: 47.0,
        b: 218.393295,
        p: 1.479735,
      },
      attack: {
        a: 133.0,
        b: 347.764701,
        p: 1.213275,
      },
      defend: {
        a: 55.0,
        b: 167.619811,
        p: 1.38344,
      },
      evade: {
        a: 1.0,
        b: 4.887662,
        p: 1.495891,
      },
    },
    experience: {
      k: 21.40292,
      q: 1.15,
      r: 3.089956,
    },
  },
  "sword2-hard": {
    game: "sword2",
    difficulty: "hard",
    originalMaxLevel: 60,
    attributes: {
      lifeMax: {
        a: 750.0,
        b: 522.050373,
        p: 1.175538,
      },
      thewMax: {
        a: 52.0,
        b: 115.504883,
        p: 1.5,
      },
      manaMax: {
        a: 47.0,
        b: 165.866349,
        p: 1.41312,
      },
      attack: {
        a: 33.0,
        b: 236.748518,
        p: 1.144803,
      },
      defend: {
        a: 55.0,
        b: 117.390387,
        p: 1.353852,
      },
      evade: {
        a: 1.0,
        b: 8.894442,
        p: 1.074679,
      },
    },
    experience: {
      k: 25.554351,
      q: 1.15,
      r: 5.704444,
    },
  },
} as const;
