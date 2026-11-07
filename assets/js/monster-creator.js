
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const form = $("monster-form");
  const roleSelect = $("monster-role");
  const methodSelect = $("allocation-method");
  const abilityGrid = $("ability-grid");
  const results = $("monster-results");
  const status = $("form-status");

  let engine = null;
  let options = null;

  function node(tag, className, text) {
    const item = document.createElement(tag);

    if (className) item.className = className;
    if (text !== undefined && text !== null) {
      item.textContent = String(text);
    }

    return item;
  }

  function fillSelect(id, items, getValue, getLabel) {
    const select = $(id);
    select.replaceChildren();

    items.forEach((item) => {
      const value = getValue(item);
      const option = node("option", "", getLabel(item));

      option.value = value;
      select.append(option);
    });
  }

  function currentBaseScores() {
    return options.base_scores_by_role[roleSelect.value];
  }

  function buildAbilityInputs() {
    abilityGrid.replaceChildren();

    options.abilities.forEach((ability) => {
      const card = node("div", "monster-ability");
      const label = node("label");
      const title = node("strong", "", ability);
      const input = node("input");

      input.type = "number";
      input.id = `bonus-${ability}`;
      input.name = ability;
      input.min = "0";
      input.max = String(options.allocation.max_bonus);
      input.step = "1";
      input.value = "0";
      input.inputMode = "numeric";
      input.setAttribute("aria-label", `${ability} bonus points`);

      const base = node("small");

      label.append(title, input, base);
      card.append(label);
      abilityGrid.append(card);

      input.addEventListener("input", updateAllocation);
    });

    updateAllocation();
  }

  function updateAllocation() {
    if (!options) return;

    const base = currentBaseScores();
    let spent = 0;

    options.abilities.forEach((ability) => {
      const input = $(`bonus-${ability}`);
      if (!input) return;

      const maxByScore = Math.min(
        options.allocation.max_bonus,
        options.allocation.max_score - base[ability]
      );

      input.max = String(Math.max(0, maxByScore));

      let value = Number.parseInt(input.value, 10);
      if (!Number.isFinite(value)) value = 0;

      value = Math.max(0, Math.min(value, maxByScore));
      input.value = String(value);
      spent += value;

      input.closest(".monster-ability").querySelector("small").textContent =
        `Base ${base[ability]} · Final ${base[ability] + value}`;
    });

    // Keep the total within the configured pool by reducing the most recently
    // edited value if necessary.
    if (spent > options.allocation.point_pool) {
      const inputs = options.abilities.map((ability) => $(`bonus-${ability}`));

      for (
        let i = inputs.length - 1;
        i >= 0 && spent > options.allocation.point_pool;
        i--
      ) {
        const input = inputs[i];
        const reduction = Math.min(
          Number(input.value),
          spent - options.allocation.point_pool
        );

        input.value = String(Number(input.value) - reduction);
        spent -= reduction;
      }
    }

    $("points-spent").textContent = String(spent);
    $("point-pool").textContent = String(options.allocation.point_pool);
  }

  function updateAllocationMode() {
    $("allocation-panel").hidden = methodSelect.value !== "manual";
  }

  function addStat(label, value) {
    const card = node("div", "monster-stat");

    card.append(
      node("span", "", label),
      node("strong", "", value ?? "—")
    );

    $("monster-stat-grid").append(card);
  }

  function renderMonster(monster) {
    results.hidden = false;

    $("result-name").textContent = monster.name;

    $("result-subtitle").textContent =
      `CR ${monster.cr} · ${monster.size} ${monster.creature_type} · ` +
      `${monster.alignment} · ${monster.role_label}`;

    $("monster-stat-grid").replaceChildren();

    addStat("Armor Class", monster.armor_class);
    addStat("Hit Points", monster.hit_points);
    addStat("Speed", `${monster.speed_ft} ft.`);
    addStat(
      "Attack Bonus",
      monster.attack.attack_bonus == null
        ? "—"
        : `+${monster.attack.attack_bonus}`
    );

    const abilityScores = monster.ability_scores.final_scores;

    $("result-abilities").replaceChildren();

    options.abilities.forEach((ability) => {
      const score = abilityScores[ability];
      const card = node("div", "monster-result-ability");
      const modifier = Math.floor((score - 10) / 2);

      card.append(
        node("strong", "", ability),
        node("div", "", score),
        node("span", "", `${modifier >= 0 ? "+" : ""}${modifier}`)
      );

      $("result-abilities").append(card);
    });

    $("result-allocation").textContent =
      `${monster.ability_scores.points_spent} points spent; ` +
      `${monster.ability_scores.points_remaining} remaining.`;

    $("attack-name").textContent = monster.attack.name;

    $("attack-details").textContent =
      `Attack bonus ${monster.attack.attack_bonus >= 0 ? "+" : ""}` +
      `${monster.attack.attack_bonus} · ${monster.attack.range} · ` +
      `${monster.attack.damage_type}`;

    $("attack-damage").textContent =
      `${monster.attack.damage_expression || "Damage unavailable"} ` +
      `(average ${monster.attack.average_damage ?? "—"})`;

    const rows = $("damage-rows");
    rows.replaceChildren();

    monster.attack.expected_damage_by_ac.forEach((item) => {
      const row = node("tr");

      row.append(
        node("td", "", item.target_ac),
        node(
          "td",
          "",
          item.hit_chance == null
            ? "—"
            : `${Math.round(item.hit_chance * 100)}%`
        ),
        node("td", "", item.expected_damage ?? "—")
      );

      rows.append(row);
    });

    const notes = $("design-notes");
    notes.replaceChildren();

    monster.design_notes.forEach((note) => {
      notes.append(node("li", "", note));
    });

    results.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  function generate(request) {
    status.dataset.error = "false";
    status.textContent = "Generating monster.";
    $("generate-button").disabled = true;

    try {
      const monster = engine.generateMonster(request);

      renderMonster(monster);
      status.textContent = "Monster generated.";
    } catch (error) {
      status.dataset.error = "true";
      status.textContent = `Couldn't generate monster: ${error.message}`;
    } finally {
      $("generate-button").disabled = false;
    }
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!engine || !options) return;

    const method = methodSelect.value;

    const request = {
      name: $("monster-name").value.trim() || "Unnamed Monster",
      cr: $("monster-cr").value,
      role: roleSelect.value,
      size: $("monster-size").value,
      creature_type: $("monster-type").value,
      alignment: $("monster-alignment").value,
      allocation_method: method
    };

    if (method === "manual") {
      request.allocation = {};

      options.abilities.forEach((ability) => {
        request.allocation[ability] =
          Number($(`bonus-${ability}`).value || 0);
      });
    }

    generate(request);
  });

  roleSelect.addEventListener("change", updateAllocation);
  methodSelect.addEventListener("change", updateAllocationMode);

  async function init() {
    try {
      const engineScript = document.querySelector(
        "script[data-benchmarks]"
      );

      const benchmarkUrl = engineScript?.dataset.benchmarks;

      if (!benchmarkUrl) {
        throw new Error(
          "Benchmark data URL is missing from the monster engine script."
        );
      }

      engine = await MonsterEngine.load(benchmarkUrl);
      options = engine.availableOptions();

      fillSelect(
        "monster-cr",
        options.challenge_ratings,
        String,
        String
      );

      $("monster-cr").value =
        options.challenge_ratings.includes("1")
          ? "1"
          : options.challenge_ratings[0];

      fillSelect(
        "monster-role",
        options.roles,
        (item) => item.value,
        (item) => item.label
      );

      fillSelect("monster-size", options.sizes, String, String);
      fillSelect("monster-type", options.creature_types, String, String);
      fillSelect("monster-alignment", options.alignments, String, String);

      $("role-description").textContent =
        options.roles.find(
          (item) => item.value === roleSelect.value
        )?.description || "";

      roleSelect.addEventListener("change", () => {
        $("role-description").textContent =
          options.roles.find(
            (item) => item.value === roleSelect.value
          )?.description || "";
      });

      buildAbilityInputs();
      updateAllocationMode();

      status.dataset.error = "false";
      status.textContent = "Monster engine ready.";
    } catch (error) {
      status.dataset.error = "true";
      status.textContent =
        `Couldn't load the monster engine: ${error.message}`;

      $("generate-button").disabled = true;
    }
  }

  init();
})();
