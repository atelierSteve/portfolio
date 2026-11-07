
(() => {
  "use strict";

  const ABILITIES = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];

  const SIZES = [
    "Tiny", "Small", "Medium", "Large", "Huge", "Gargantuan"
  ];

  const CREATURE_TYPES = [
    "Aberration", "Beast", "Celestial", "Construct", "Dragon",
    "Elemental", "Fey", "Fiend", "Giant", "Humanoid",
    "Monstrosity", "Ooze", "Plant", "Undead"
  ];

  const ALIGNMENTS = [
    "Lawful Good", "Neutral Good", "Chaotic Good",
    "Lawful Neutral", "Neutral", "Chaotic Neutral",
    "Lawful Evil", "Neutral Evil", "Chaotic Evil", "Unaligned"
  ];

  const TARGET_ACS = [10, 15, 20, 25];

  const POINT_POOL = 12;
  const MAX_BONUS = 4;
  const MAX_SCORE = 20;
  const MIN_SCORE = 3;

  const ROLES = {
    bruiser: {
      hp: 1.25,
      ac: 1.0,
      walk_speed_ft: 1.0,
      max_attack_bonus: 1.0,
      max_action_damage: 1.15,
      description: "Durable, forceful melee combatant"
    },
    skirmisher: {
      hp: 0.85,
      ac: 1.0,
      walk_speed_ft: 1.33,
      max_attack_bonus: 1.0,
      max_action_damage: 1.0,
      description: "Mobile attacker that relies on positioning"
    },
    defender: {
      hp: 1.15,
      ac: 1.10,
      walk_speed_ft: 1.0,
      max_attack_bonus: 1.0,
      max_action_damage: 0.85,
      description: "Durable protector with strong defenses"
    },
    glass_cannon: {
      hp: 0.70,
      ac: 0.95,
      walk_speed_ft: 1.0,
      max_attack_bonus: 1.0,
      max_action_damage: 1.30,
      description: "Fragile creature with dangerous attacks"
    }
  };

  const ABILITY_PROFILES = {
    bruiser: [18, 12, 16, 8, 10, 10],
    skirmisher: [12, 18, 14, 10, 12, 10],
    defender: [16, 10, 18, 10, 12, 12],
    glass_cannon: [10, 16, 12, 16, 10, 18]
  };

  const ATTACK_ABILITIES = {
    bruiser: "STR",
    skirmisher: "DEX",
    defender: "STR",
    glass_cannon: "CHA"
  };

  const ROLE_ATTACK_BONUS = {
    bruiser: 1,
    skirmisher: 1,
    defender: 1,
    glass_cannon: 1
  };

  const ROLE_DAMAGE_BONUS = {
    bruiser: 1,
    skirmisher: 1,
    defender: 1,
    glass_cannon: 0
  };

  const ATTACK_PROFILES = {
    bruiser: {
      name: "Heavy Slam",
      damage_type: "bludgeoning",
      range_text: "reach 5 ft."
    },
    skirmisher: {
      name: "Quick Strike",
      damage_type: "piercing",
      range_text: "reach 5 ft."
    },
    defender: {
      name: "Shield Bash",
      damage_type: "bludgeoning",
      range_text: "reach 5 ft."
    },
    glass_cannon: {
      name: "Arcane Bolt",
      damage_type: "force",
      range_text: "range 60/120 ft."
    }
  };

  // Match Python's round() behavior using the exact binary
  // floating-point value and round-half-to-even.
  function pythonRound(value, digits = 0) {
    if (!Number.isFinite(value) || value === 0) return value;

    const factor = 10n ** BigInt(digits);
    const view = new DataView(new ArrayBuffer(8));

    view.setFloat64(0, Math.abs(value), false);
    const bits = view.getBigUint64(0, false);

    const exponent = Number((bits >> 52n) & 0x7ffn);
    const fraction = bits & ((1n << 52n) - 1n);

    const significand = exponent === 0
      ? fraction
      : (1n << 52n) | fraction;

    const binaryExponent = exponent === 0
      ? -1074
      : exponent - 1075;

    let numerator = significand * factor;
    let denominator = 1n;

    if (binaryExponent >= 0) {
      numerator <<= BigInt(binaryExponent);
    } else {
      denominator <<= BigInt(-binaryExponent);
    }

    let quotient = numerator / denominator;
    const remainder = numerator % denominator;
    const comparison = remainder * 2n - denominator;

    if (
      comparison > 0n ||
      (comparison === 0n && quotient % 2n !== 0n)
    ) {
      quotient += 1n;
    }

    const result = Number(quotient) / (10 ** digits);
    return value < 0 ? -result : result;
  }

  function gcd(a, b) {
    while (b !== 0) {
      [a, b] = [b, a % b];
    }
    return Math.abs(a);
  }

  function normalizeCR(value) {
    const text = String(value).trim();

    const fraction = text.match(/^(-?\d+)\s*\/\s*(-?\d+)$/);

    if (fraction) {
      let numerator = Number(fraction[1]);
      let denominator = Number(fraction[2]);

      if (denominator === 0) {
        throw new Error("Invalid challenge rating.");
      }

      if (denominator < 0) {
        numerator *= -1;
        denominator *= -1;
      }

      const divisor = gcd(Math.abs(numerator), denominator);

      numerator /= divisor;
      denominator /= divisor;

      return denominator === 1
        ? String(numerator)
        : `${numerator}/${denominator}`;
    }

    if (!/^-?\d+(?:\.\d+)?$/.test(text)) {
      throw new Error(`Invalid challenge rating: ${text}`);
    }

    const parts = text.split(".");
    const decimals = parts[1] || "";
    const denominator = 10 ** decimals.length;
    const numerator = Number(parts.join(""));

    const divisor = gcd(Math.abs(numerator), denominator);
    const reducedNumerator = numerator / divisor;
    const reducedDenominator = denominator / divisor;

    return reducedDenominator === 1
      ? String(reducedNumerator)
      : `${reducedNumerator}/${reducedDenominator}`;
  }

  function abilityModifier(score) {
    return Math.floor((Number(score) - 10) / 2);
  }

  function modifierChange(baseScore, finalScore) {
    return abilityModifier(finalScore) - abilityModifier(baseScore);
  }

  function benchmarkNumber(benchmark, key) {
    const value = benchmark[`${key}_median`];

    if (value === null || value === undefined || value === "") {
      return null;
    }

    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function suggestedStat(benchmark, profile, key) {
    const value = benchmarkNumber(benchmark, key);

    if (value === null) return null;

    return pythonRound(value * (profile[key] ?? 1.0));
  }

  function makeDamageExpression(targetAverage) {
    if (targetAverage === null || targetAverage <= 0) {
      return null;
    }

    let best = null;
    const maxModifier = Math.max(5, Math.trunc(targetAverage + 5));

    for (let count = 1; count <= 6; count++) {
      for (const sides of [4, 6, 8, 10, 12]) {
        const diceAverage = count * (sides + 1) / 2;

        for (let modifier = 0; modifier <= maxModifier; modifier++) {
          const calculatedAverage = diceAverage + modifier;
          const difference = Math.abs(calculatedAverage - targetAverage);

          const score = [difference, modifier, -count, sides];

          const isBetter = !best || score.some((value, index) => {
            for (let previous = 0; previous < index; previous++) {
              if (score[previous] !== best.score[previous]) return false;
            }
            return value < best.score[index];
          });

          if (isBetter) {
            best = { score, count, sides, modifier };
          }
        }
      }
    }

    if (!best) return null;

    const dice = `${best.count}d${best.sides}`;

    return best.modifier
      ? `${dice} + ${best.modifier}`
      : dice;
  }

  function adjustDamageExpression(expression, adjustment) {
    if (expression === null || adjustment === 0) {
      return expression;
    }

    const match = String(expression).match(
      /^\s*(\d+d\d+)\s*(?:([+-])\s*(\d+))?\s*$/i
    );

    if (!match) {
      throw new Error(`Unsupported damage expression: ${expression}`);
    }

    const dice = match[1];
    let existing = Number(match[3] || 0);

    if (match[2] === "-") {
      existing *= -1;
    }

    const total = existing + adjustment;

    if (total > 0) return `${dice} + ${total}`;
    if (total < 0) return `${dice} - ${Math.abs(total)}`;

    return dice;
  }

  function averageDamage(expression) {
    if (typeof expression !== "string" || !expression.trim()) {
      return null;
    }

    const text = expression.trim().toLowerCase().replace(/,/g, "");
    const tokens = [...text.matchAll(/([+-]?)\s*(\d*d\d+|\d+(?:\.\d+)?)/g)];

    if (!tokens.length) return null;

    const reconstructed = tokens
      .map((match) => match[1] + match[2])
      .join("");

    const compact = text.replace(/\s+/g, "");

    if (
      reconstructed !== compact &&
      reconstructed !== `+${compact}` &&
      reconstructed.replace("+-", "-") !== compact
    ) {
      return null;
    }

    let total = 0;

    for (const match of tokens) {
      const sign = match[1] === "-" ? -1 : 1;
      const term = match[2];

      if (term.includes("d")) {
        const [countText, sidesText] = term.split("d");
        const count = countText ? Number(countText) : 1;
        const sides = Number(sidesText);

        if (count < 1 || sides < 1) return null;

        total += sign * count * (sides + 1) / 2;
      } else {
        total += sign * Number(term);
      }
    }

    return pythonRound(total, 3);
  }

  function hitProbability(attackBonus, targetAC) {
    let successfulRolls = 21 + attackBonus - targetAC;
    successfulRolls = Math.max(1, Math.min(20, successfulRolls));

    return successfulRolls / 20;
  }

  function validateBaseScores(baseScores) {
    if (!baseScores || typeof baseScores !== "object" || Array.isArray(baseScores)) {
      throw new Error("Base scores must be an object.");
    }

    const scores = {};

    for (const ability of ABILITIES) {
      const value = baseScores[ability];

      if (!Number.isInteger(value)) {
        throw new Error(`${ability} must be an integer.`);
      }

      if (value < MIN_SCORE) {
        throw new Error(`${ability} cannot be below ${MIN_SCORE}.`);
      }

      scores[ability] = value;
    }

    return scores;
  }

  function validateAllocation(baseScores, allocation) {
    if (!allocation || typeof allocation !== "object" || Array.isArray(allocation)) {
      throw new Error("Allocation must be an object.");
    }

    const unknown = Object.keys(allocation).filter(
      (key) => !ABILITIES.includes(key)
    );

    if (unknown.length) {
      throw new Error(`Unknown abilities: ${unknown.sort().join(", ")}`);
    }

    let spent = 0;

    for (const ability of ABILITIES) {
      const bonus = allocation[ability] ?? 0;

      if (!Number.isInteger(bonus)) {
        throw new Error(`${ability} bonus must be an integer.`);
      }

      if (bonus < 0) {
        throw new Error(`${ability} bonus cannot be negative.`);
      }

      if (bonus > MAX_BONUS) {
        throw new Error(`${ability} bonus cannot exceed +${MAX_BONUS}.`);
      }

      if (baseScores[ability] + bonus > MAX_SCORE) {
        throw new Error(
          `${ability} cannot exceed ${MAX_SCORE}; its base score is ${baseScores[ability]}.`
        );
      }

      spent += bonus;
    }

    if (spent > POINT_POOL) {
      throw new Error(
        `Allocation spends ${spent} points, but only ${POINT_POOL} are available.`
      );
    }

    return spent;
  }

  function allocationSummary(baseScores, allocation) {
    const spent = validateAllocation(baseScores, allocation);

    const bonuses = Object.fromEntries(
      ABILITIES.map((ability) => [ability, allocation[ability] ?? 0])
    );

    const finalScores = Object.fromEntries(
      ABILITIES.map((ability) => [
        ability,
        baseScores[ability] + bonuses[ability]
      ])
    );

    return {
      base_scores: { ...baseScores },
      allocation: bonuses,
      final_scores: finalScores,
      points_spent: spent,
      points_remaining: POINT_POOL - spent
    };
  }

  function randomAllocation(baseScores) {
    const allocation = Object.fromEntries(
      ABILITIES.map((ability) => [ability, 0])
    );

    for (let i = 0; i < POINT_POOL; i++) {
      const eligible = ABILITIES.filter((ability) =>
        allocation[ability] < MAX_BONUS &&
        baseScores[ability] + allocation[ability] < MAX_SCORE
      );

      if (!eligible.length) break;

      const ability = eligible[Math.floor(Math.random() * eligible.length)];
      allocation[ability]++;
    }

    validateAllocation(baseScores, allocation);
    return allocation;
  }

  function createEngine(benchmarkRows) {
    if (!Array.isArray(benchmarkRows)) {
      throw new Error("Benchmark data must be an array.");
    }

    const benchmarks = new Map(
      benchmarkRows.map((row) => [normalizeCR(row.cr), row])
    );

    function availableOptions() {
      return {
        challenge_ratings: benchmarkRows.map((row) => row.cr),
        roles: Object.entries(ROLES).map(([key, value]) => ({
          value: key,
          label: key.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
          description: value.description
        })),
        sizes: [...SIZES],
        creature_types: [...CREATURE_TYPES],
        alignments: [...ALIGNMENTS],
        abilities: [...ABILITIES],
        base_scores_by_role: Object.fromEntries(
          Object.entries(ABILITY_PROFILES).map(([role, scores]) => [
            role,
            Object.fromEntries(ABILITIES.map((ability, index) => [
              ability, scores[index]
            ]))
          ])
        ),
        allocation: {
          point_pool: POINT_POOL,
          max_bonus: MAX_BONUS,
          max_score: MAX_SCORE
        },
        target_acs: [...TARGET_ACS]
      };
    }

    function generateMonster({
      name = "Unnamed Monster",
      cr,
      role,
      size = "Medium",
      creature_type = "Monstrosity",
      alignment = "Unaligned",
      allocation = null,
      allocation_method = "manual"
    } = {}) {
      role = String(role ?? "").trim().toLowerCase()
        .replace(/[- ]/g, "_");

      if (!Object.hasOwn(ROLES, role)) {
        throw new Error(`Unknown role: ${role}`);
      }

      cr = normalizeCR(cr);
      const benchmark = benchmarks.get(cr);

      if (!benchmark) {
        throw new Error(`No benchmark data for CR ${cr}.`);
      }

      if (!SIZES.includes(size)) {
        throw new Error(`Invalid size: ${size}`);
      }

      if (!CREATURE_TYPES.includes(creature_type)) {
        throw new Error(`Invalid creature type: ${creature_type}`);
      }

      if (!ALIGNMENTS.includes(alignment)) {
        throw new Error(`Invalid alignment: ${alignment}`);
      }

      name = String(name ?? "").trim() || "Unnamed Monster";

      if (name.length > 100) {
        throw new Error("Monster name must be 100 characters or fewer.");
      }

      const baseScores = Object.fromEntries(
        ABILITIES.map((ability, index) => [
          ability, ABILITY_PROFILES[role][index]
        ])
      );

      if (allocation_method === "random") {
        if (allocation !== null && allocation !== undefined &&
            Object.keys(allocation).length !== 0) {
          throw new Error("Random allocation cannot include manual points.");
        }
        allocation = randomAllocation(baseScores);
      } else if (allocation_method === "none") {
        if (allocation !== null && allocation !== undefined &&
            Object.keys(allocation).length !== 0) {
          throw new Error("No-allocation mode cannot include bonus points.");
        }
        allocation = Object.fromEntries(ABILITIES.map((ability) => [ability, 0]));
      } else if (allocation_method === "manual") {
        allocation ??= {};
        validateAllocation(baseScores, allocation);
      } else {
        throw new Error("Allocation method must be manual, random, or none.");
      }

      const summary = allocationSummary(baseScores, allocation);
      const scores = summary.final_scores;

      const profile = ROLES[role];
      const attackProfile = ATTACK_PROFILES[role];

      const ac = suggestedStat(benchmark, profile, "ac");
      const hp = suggestedStat(benchmark, profile, "hp");
      const speed = suggestedStat(benchmark, profile, "walk_speed_ft");
      const benchmarkAttackBonus = suggestedStat(
        benchmark, profile, "max_attack_bonus"
      );

      const attackAbility = ATTACK_ABILITIES[role];
      const abilityDelta = modifierChange(
        baseScores[attackAbility],
        scores[attackAbility]
      );

      const attackBonus = benchmarkAttackBonus !== null
        ? benchmarkAttackBonus + abilityDelta + ROLE_ATTACK_BONUS[role]
        : null;

      const rawDamage = benchmarkNumber(benchmark, "max_action_damage");
      const targetDamage = rawDamage !== null
        ? rawDamage * profile.max_action_damage
        : null;

      const baseDamage = makeDamageExpression(targetDamage);

      const damageAbilityDelta = role !== "glass_cannon"
        ? abilityDelta
        : 0;

      const damageExpression = baseDamage !== null
        ? adjustDamageExpression(
            baseDamage,
            damageAbilityDelta + ROLE_DAMAGE_BONUS[role]
          )
        : null;

      const average = damageExpression !== null
        ? averageDamage(damageExpression)
        : null;

      const expectedDamage = TARGET_ACS.map((targetAC) => {
        const chance = attackBonus !== null
          ? hitProbability(attackBonus, targetAC)
          : null;

        return {
          target_ac: targetAC,
          hit_chance: chance,
          expected_damage: average !== null && chance !== null
            ? pythonRound(average * chance, 2)
            : null
        };
      });

      return {
        name,
        size,
        creature_type,
        alignment,
        cr,
        role,
        role_label: role.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
        role_description: profile.description,
        reference_monster_count: Number(benchmark.monster_count),
        armor_class: ac,
        hit_points: hp,
        speed_ft: speed,
        ability_scores: summary,
        attack: {
          name: attackProfile.name,
          attack_ability: attackAbility,
          attack_bonus: attackBonus,
          range: attackProfile.range_text,
          damage_type: attackProfile.damage_type,
          damage_expression: damageExpression,
          average_damage: average !== null ? pythonRound(average, 2) : null,
          expected_damage_by_ac: expectedDamage
        },
        design_notes: [
          "Benchmark-derived values and role adjustments are design heuristics.",
          "Expected damage is per attack, not damage per round.",
          "Expected damage excludes critical-hit bonus damage.",
          "Saving throws, resistances, special abilities, and action economy are not modeled.",
          "This is a draft template, not a validated final stat block."
        ]
      };
    }

    return { availableOptions, generateMonster };
  }

  async function load(benchmarkUrl) {
    const response = await fetch(benchmarkUrl);

    if (!response.ok) {
      throw new Error(`Couldn't load benchmark data (${response.status}).`);
    }

    const rows = await response.json();
    return createEngine(rows);
  }

  const api = { createEngine, load };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  if (typeof globalThis !== "undefined") {
    globalThis.MonsterEngine = api;
  }
})();
