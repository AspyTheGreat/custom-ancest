// =========================
// ⚙️ CONFIG (EDIT THIS)
// =========================
const campaignBattleCache = {};
const campaignPortraitCache = {};
const DEBUG = true;

function log(...args) {
  if (DEBUG) console.log("[DEBUG]", ...args);
}

async function logGroup(title, fn) {
  if (!DEBUG) return await fn();
  console.group(`[DEBUG] ${title}`);
  try {
    await fn(); // ✅ THIS was missing
  } finally {
    console.groupEnd();
  }
}

function logError(context, err) {
  console.error(`[ERROR] ${context}:`, err);
}


const container = document.getElementById("content");
if (!container) throw new Error("#content not found");

// =========================
// 📁 LOAD CAMPAIGNS
// =========================
async function loadCampaigns() {
  container.innerHTML = "Loading campaigns...";

  logGroup("loadCampaigns()", async () => {

    try {

      const res = await fetch("../battles/index.json");

      if (!res.ok) {
        throw new Error(`Failed to load index.json: ${res.status}`);
      }

      const battles = await res.json();

      // =========================
      // GROUP BY CAMPAIGN
      // =========================

      const campaignMap = {};

      battles.forEach(battle => {

        if (!campaignMap[battle.campaignSlug]) {
          campaignMap[battle.campaignSlug] = {
            name: battle.campaign,
            slug: battle.campaignSlug,
            battles: []
          };
        }

        campaignMap[battle.campaignSlug].battles.push(battle);
      });

      const campaigns = Object.values(campaignMap);

      campaigns.sort((a, b) =>
        a.name.localeCompare(b.name)
      );

      container.innerHTML = `
  <h3>Campaigns</h3>
  <div id="campaignGrid"></div>
`;

const grid = document.getElementById("campaignGrid");

      // =========================
      // RENDER CAMPAIGNS
      // =========================

      campaigns.forEach(campaign => {

        const div = document.createElement("div");

        div.className =
          "world-card-previous-battles clickable";

        div.innerHTML = `<span class="battle-card-text">${campaign.name}</span>`;

        div.onclick = () => {
          loadBattles(campaign.slug);
        };

        grid.appendChild(div);

        // preload cache
        campaignBattleCache[campaign.slug] =
          campaign.battles;
      });

    } catch (err) {

      logError("loadCampaigns", err);

      container.innerHTML =
        "Failed to load campaigns.";
    }
  });
}

// =========================
// 📜 LOAD BATTLES
// =========================

async function loadBattles(campaignSlug) {

  container.innerHTML = "Loading battles...";

  await logGroup(`loadBattles(${campaignSlug})`, async () => {

    try {

      let battles = campaignBattleCache[campaignSlug];

      // fallback if cache missing
      if (!battles) {

        const res = await fetch("../battles/index.json");

        if (!res.ok) {
          throw new Error("Failed to load index");
        }

        const allBattles = await res.json();

        battles = allBattles.filter(
          b => b.campaignSlug === campaignSlug
        );

        campaignBattleCache[campaignSlug] =
          battles;
      }

      // newest first
      battles.sort(
        (a, b) =>
          new Date(b.date).getTime() -
          new Date(a.date).getTime()
      );

    container.innerHTML = `
  <div class="backBtn">← Back</div>
  <h3>${formatName(campaignSlug)}</h3>

  <div style="margin-bottom: 12px;">
    <button id="viewCampaignStats">📊 View Campaign Stats</button>
  </div>

  <div id="battleGrid"></div>
`;

document.getElementById("viewCampaignStats").onclick = () => {
  renderCampaignBreakdown(campaignSlug);
};

const grid = document.getElementById("battleGrid");

      container.querySelector(".backBtn").onclick =
        () => loadCampaigns();

      // =========================
      // RENDER BATTLES
      // =========================

      for (const battle of battles) {

        const div = document.createElement("div");

        div.className =
          "battle-card clickable";

        const battleUrl =
          `../battles/${battle.campaignSlug}/${battle.battleSlug}.json`;

        const battleImage =
          battle.startImage ||
          battle.images?.start ||
          await resolveBattleImage(battle);

        const cleanImage =
          normalizeImageSrc(battleImage);

        div.innerHTML = battleImage
          ? `
            <img
              class="battle-card-bg"
              src="${cleanImage}"
              alt=""
            >

            <div class="battle-card-overlay"></div>

            <div class="battle-card-title">
              ${battle.name}
            </div>
          `
          : `
            <div class="battle-card-title">
              ${battle.name}
            </div>
          `;

        div.onclick = () => {
          openBattle(battleUrl);
        };

        grid.appendChild(div);
      }

      if (!battles.length) {

        const empty =
          document.createElement("div");

        empty.innerText =
          "No battles found.";

        container.appendChild(empty);
      }

    } catch (err) {

      logError("loadBattles", err);

      container.innerHTML =
        "Failed to load battles.";
    }
  });
}
// =========================
// � RESOLVE BATTLE IMAGE
// =========================
async function resolveBattleImage(battle) {
  if (battle.startImage) return battle.startImage;
  if (battle.images?.start) return battle.images.start;

  try {
    const url = `../battles/${battle.campaignSlug}/${battle.battleSlug}.json`;
    const res = await fetch(url);

    if (!res.ok) return null;

    const data = await res.json();

    return data.startImage || data.images?.start || null;
  } catch {
    return null;
  }
}

// =========================
// �🔗 OPEN BATTLE
// =========================
function openBattle(url) {
  loadBattleView(url);
}
// =========================
// 🧼 FORMAT NAMES
// =========================
function normalizeImageSrc(image) {
  if (!image) return "";

  // already a valid data URL
  if (image.startsWith("data:image")) {
    return image;
  }

  // raw base64 fallback
  const isPNG = image.startsWith("iVBOR");
  const type = isPNG ? "image/png" : "image/jpeg";

  return `data:${type};base64,${image}`;
}

function renderImage(image) {
  if (!image) return "";

  return `
    <div class="battle-image">
      <img
        loading="lazy"
        src="${normalizeImageSrc(image)}"
      />
    </div>
  `;

}
function formatName(slug) {
  return slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, l => l.toUpperCase());
}
async function loadBattleView(url) {
    console.log("Fetching battle from:", url);
  container.innerHTML = "Loading battle...";

  try {
    const res = await fetch(url);

const text = await res.text();

console.log("RAW RESPONSE:", text.slice(0, 200)); // 👈 key debug

let data;

try {
  data = JSON.parse(text);
} catch (e) {
  console.error("Not valid JSON. Response was:", text);
  container.innerHTML = "Failed to load battle (invalid JSON).";
  return;
}

    console.log("Battle data:", data);

    await renderBattleUI(data);

  } catch (err) {
    console.error("Failed to load battle:", err);
    
    container.innerHTML = "Failed to load battle.";
  }
}
document.addEventListener("DOMContentLoaded", loadCampaigns);

function getHP(char) {
  // ✅ New system
  if (char.stats?.hp) {
    return {
      current: char.stats.hp.current ?? 0,
      max: char.stats.hp.max ?? 0
    };
  }

  // ✅ Old system fallback
  if (char.finalHP !== undefined || char.maxHP !== undefined) {
    return {
      current: char.finalHP ?? 0,
      max: char.maxHP ?? 0
    };
  }

  // ✅ Absolute fallback (prevents crash)
  return {
    current: 0,
    max: 0
  };
}

async function renderBattleUI(data) {
  const date = new Date(data.timestamp).toLocaleString();
  data.characters.forEach(c => {
  console.log(c.name, c.stats?.hp);
});
 const totalMaxHP = (data.characters || [])
  .reduce((sum, c) => {
    const hp = c.stats?.hp;
    return sum + (hp?.max ?? 0);
  }, 0);

const totalFinalHP = (data.characters || [])
  .reduce((sum, c) => {
    const hp = c.stats?.hp;
    return sum + (hp?.current ?? 0);
  }, 0);

const partyHPPercent = totalMaxHP
  ? Math.round((totalFinalHP / totalMaxHP) * 100)
  : 0;
  console.log("FULL CHARACTERS ARRAY:", data.characters);
console.log("Battle data keys:", Object.keys(data));
console.log("RoundCount:", data.roundCount);

const lastRound =
  (data.roundSummaries || [])
    [data.roundSummaries.length - 1];

const players = lastRound?.players || [];
const finalTurnPlayer = players[players.length - 1];

const finalTurnName =
  finalTurnPlayer?.name || "Unknown";

  container.innerHTML = `
  <div class="backBtn">← Back</div>

  <h2>${data.campaign}</h2>
  <h3>${data.battle}</h3>

  <p class="meta">
    ${date} • ${data.roundCount ?? data.roundcount ?? "?"} rounds
  </p>

  ${renderImage(data.images?.start)}

    

   <div class="box">
  <h3>Rounds</h3>
  <div id="rounds"></div>
</div>


  <div class="box">
  <h3>Party Breakdown</h3>

  <!-- Character rows -->
  <div id="party-breakdown"></div>

  <!-- Totals -->
 <div class="grid-3 party-totals">
  <div class="stat-box">
    <h3>Party HP</h3>
    <span>${totalFinalHP} / ${totalMaxHP}</span>
    <small>${partyHPPercent}% remaining</small>
  </div>

  <div class="stat-box">
    <h3>Damage</h3>
    <span>${data.partyTotals.damage}</span>
  </div>

  <div class="stat-box">
    <h3>Healing</h3>
    <span>${data.partyTotals.healing}</span>
  </div>

  <div class="stat-box">
    <h3>CC</h3>
    <span>${data.partyTotals.cc}</span>
  </div>
  <div class="stat-box">
  <h3>Final Turn</h3>
  <span>${finalTurnName}</span>
</div>
</div>

   <!-- PIE CHARTS -->
  <div id="partyCharts" class="chart-grid">
    <canvas id="chart-damage"></canvas>
    <canvas id="chart-healing"></canvas>
    <canvas id="chart-cc"></canvas>
    <canvas id="chart-targeted"></canvas>
  </div>

  <div class="line-charts">

  <div class="line-chart-wrapper">
    <canvas id="line-damage"></canvas>
  </div>

  <div class="line-chart-wrapper">
    <canvas id="line-healing"></canvas>
  </div>

  <div class="line-chart-wrapper">
    <canvas id="line-cc"></canvas>
  </div>

  <div class="line-chart-wrapper">
    <canvas id="line-targeted"></canvas>
  </div>

</div>

    ${renderImage(data.images?.end)}
  `;

  container.querySelector(".backBtn").onclick = () => {
  const campaign = data.campaignSlug || data.campaign?.toLowerCase().replace(/\s+/g, "-");

  loadBattles(campaign);
};

 await renderRounds(
  data.roundSummaries || [],
  data.characters || []
);
renderPartyBreakdown(data.characters || []);
renderPartyCharts(data.characters || []);
renderPerRoundCharts(data.roundSummaries || [], data.characters || []);
}

const characterColorCache = {};

async function getCharacterColorFromPortrait(character, fallbackIndex = 0) {

  // already cached
  if (characterColorCache[character.name]) {
    return characterColorCache[character.name];
  }

  // fallback if no portrait
  const portrait = character.image || character.portrait;

if (!portrait) {
    const fallback = getCharacterColor(fallbackIndex);

    characterColorCache[character.name] = fallback;

    return fallback;
  }

  return new Promise(resolve => {

    const img = new Image();

    img.crossOrigin = "Anonymous";

    img.onload = () => {

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      canvas.width = 50;
      canvas.height = 50;

      ctx.drawImage(img, 0, 0, 50, 50);

      const data = ctx.getImageData(0, 0, 50, 50).data;

      let r = 0;
      let g = 0;
      let b = 0;
      let count = 0;

      for (let i = 0; i < data.length; i += 4) {

        const alpha = data[i + 3];

        // ignore transparent pixels
        if (alpha < 128) continue;

        r += data[i];
        g += data[i + 1];
        b += data[i + 2];

        count++;
      }

      if (!count) {
        const fallback = getCharacterColor(fallbackIndex);

        characterColorCache[character.name] = fallback;

        resolve(fallback);
        return;
      }

      r = Math.round(r / count);
      g = Math.round(g / count);
      b = Math.round(b / count);

      const color = `rgb(${r}, ${g}, ${b})`;

      characterColorCache[character.name] = color;

      resolve(color);
    };

    img.onerror = () => {

      const fallback = getCharacterColor(fallbackIndex);

      characterColorCache[character.name] = fallback;

      resolve(fallback);
    };

    img.src = normalizeImageSrc(portrait);
  });
}

function sumObj(obj = {}) {
  return Object.values(obj).reduce((a, b) => a + b, 0);
}

async function renderCharacters(characters) {
  const el = document.getElementById("characters");
  el.innerHTML = "";

  for (const char of characters) {
     const stats = char.stats || {};
 
  const defense = stats.defense || {};

  const timesTargeted =
    (defense.attacksTaken || 0) +
    (defense.savesMade || 0);

  const rounds = char.roundCount || 1;
  const dpr = Math.round((stats.damage || 0) / rounds);

  const attacksMade = stats.attacks?.total || 0;

  const savesForced = stats.saves?.forced || 0;
const savesSucceeded = stats.saves?.succeeded || 0;
const savesFailed = Math.max(0, savesForced - savesSucceeded);
// enemy FAILED saves = total - succeeded


  const saveRate = savesForced
    ? Math.round((savesMade / savesTotal) * 100)
    : 0;

  // ✅ HP CALCULATIONS HERE
 const hp = getHP(char);
const current = hp.current;
const max = hp.max;

const hpPercent = max
  ? Math.round((current / max) * 100)
  : 0;

let hpColor = "#8b0000";

// ✅ Ordered from lowest → highest OR use else-if chain
if (hpPercent === 0) {
  hpColor = "#5a0000"; // dark red
} else if (hpPercent <= 25) {
  hpColor = "#ff0000"; // bright red
} else if (hpPercent <= 50) {
  hpColor = "#ff9800"; // orange
} else if (hpPercent <= 75) {
  hpColor = "#ffeb3b"; // yellow
} else if (hpPercent < 100) {
  hpColor = "#4caf50"; // green
} else {
  hpColor = "#2196f3"; // blue (100%)
}

  const row = document.createElement("div");
  row.className = "party-row";

  // ✅ USE IT HERE
  row.innerHTML = `
    <div class="party-left">
      <h4>${char.name} <span>${char.levelClass}</span></h4>

      <div class="hp-block">
        <div class="hp-label">
          <b>HP:</b> ${current} / ${max} (${hpPercent}%)
        </div>

        <div class="hp-bar">
          <div class="hp-fill" style="width: ${hpPercent}%; background: ${hpColor}"></div>
        </div>
      </div>

      <div class="party-grid">
        ...
      </div>
    </div>
  `;

  el.appendChild(row);
}
}

const CHARACTER_COLORS = [
  "#4fc3f7",
  "#ff6384",
  "#ffd54f",
  "#81c784",
  "#ba68c8",
  "#ff8a65",
  "#64b5f6",
  "#f06292",
  "#aed581",
  "#9575cd"
];

function getCharacterColor(index) {
  return CHARACTER_COLORS[index % CHARACTER_COLORS.length];
}

async function renderPerRoundCharts(rounds, characters) {
  if (!rounds.length) return;

  const labels = rounds.map(r => `R${r.round}`);
  const names = characters.map(c => c.name);
const colors = await Promise.all(
  characters.map((c, i) =>
    getCharacterColorFromPortrait(c, i)
  )
);
  function buildDataset(statKey) {
  return names.map(name => {

    let runningTotal = 0;

const color = colors[names.indexOf(name)];

return {
  label: name,
  borderColor: color,
  backgroundColor: color,
  pointBackgroundColor: color,
  pointBorderColor: color,

  data: rounds.map(r => {
        const player = (r.players || []).find(
          p => p.name === name
        );

        if (!player) {
          return runningTotal;
        }

        let value = 0;

        if (statKey === "targeted") {
          const d = player.defense || {};

          value =
            (d.attacksTaken || 0) +
            (d.savesMade || 0);

        } else {
          value = player[statKey] || 0;
        }

        runningTotal += value;

        return runningTotal;
      })
    };
  });
}

  createLine("line-damage", "Damage per Round", labels, buildDataset("damage"));
  createLine("line-healing", "Healing per Round", labels, buildDataset("healing"));
  createLine("line-cc", "CC per Round", labels, buildDataset("cc"));
  createLine("line-targeted", "Tanked per Round", labels, buildDataset("targeted"));
}

function createLine(canvasId, title, labels, datasets) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  new Chart(ctx, {
    type: "line",
    devicePixelRatio: 2,
    data: {
      labels: labels,
      datasets: datasets.map(d => ({
  label: d.label,
  data: d.data,

  borderColor: d.borderColor,
  backgroundColor: d.backgroundColor,
  pointBackgroundColor: d.pointBackgroundColor,
  pointBorderColor: d.pointBorderColor,

  fill: false,
  tension: 0.2
}))
    },
    options: {
  responsive: true,
  maintainAspectRatio: false,

  plugins: {
    title: {
      display: true,
      text: title,
      color: "#fff",
      font: {
        size: 24,
        weight: "bold"
      }
    },

    legend: {
      labels: {
        color: "#ddd",
        font: {
          size: 18
        },
        padding: 18
      }
    }
  },

  scales: {
    x: {
      ticks: {
        color: "#ccc",
        font: {
          size: 16
        }
      }
    },

    y: {
      ticks: {
        color: "#ccc",
        font: {
          size: 16
        }
      }
    }
  }
}
  });
}

async function renderRounds(rounds, characters = []) {

  const el = document.getElementById("rounds");

  if (!el) return;

  el.innerHTML = "";

  // =========================
  // CHARACTER LOOKUP
  // =========================

  const characterMap = {};

  characters.forEach(c => {
    characterMap[c.name] = c;
  });

  // =========================
  // LOOP ROUNDS
  // =========================

  for (const r of rounds) {

    // =========================
    // PARTY TOTALS
    // =========================

    let partyDamage = 0;
    let partyHealing = 0;
    let partyCC = 0;
    let partyTargeted = 0;
    let partyNat20 = 0;
    let partyNat1 = 0;
    let partyAttacksMade = 0;
    let partyAttacksHit = 0;
    let partySavesForced = 0;
    let partySavesSucceeded = 0;
    let partySummons = 0;

    (r.players || []).forEach(p => {

      const defense = p.defense || {};

      partyDamage += p.damage || 0;
      partyHealing += p.healing || 0;
      partyCC += p.cc || 0;

      partyTargeted +=
        (defense.attacksTaken || 0) +
        (defense.savesMade || 0);

      const fullChar = characterMap[p.name] || {};

const roundData =
  (fullChar.rounds || []).find(
    rr => rr.round === r.round
  ) || {};

partyNat20 +=
  p.nat20 ??
  roundData.nat20 ??
  p.stats?.nat20 ??
  0;

partyNat1 +=
  p.nat1 ??
  roundData.nat1 ??
  p.stats?.nat1 ??
  0;

      partyAttacksMade += p.attacks?.total || 0;
      partyAttacksHit += p.attacks?.hit || 0;

      partySavesForced += p.saves?.forced || 0;
      partySavesSucceeded += p.saves?.succeeded || 0;

      partySummons +=
        (p.summons || []).reduce(
          (sum, s) => sum + (s.count || 1),
          0
        );
    });

    const partyAccuracy = partyAttacksMade
      ? Math.round((partyAttacksHit / partyAttacksMade) * 100)
      : 0;

    const partyPotency = partySavesForced
      ? Math.round(
          (
        partySavesSucceeded /
        partySavesForced
      ) * 100
        )
      : 0;

    // =========================
    // PLAYER COLUMNS
    // =========================

    const playerColumns = await Promise.all(

      (r.players || []).map(async p => {

        const attacksMade =
          p.attacks?.total ??
          p.attacksMade ??
          0;

        const attacksHit =
          p.attacks?.hit ??
          p.attacksHit ??
          0;

        const accuracy = attacksMade
          ? Math.round(
              (attacksHit / attacksMade) * 100
            )
          : 0;

        const savesForced =
          p.saves?.forced ??
          p.savesForced ??
          0;

        const savesSucceeded =
          p.saves?.succeeded ??
          p.savesSucceeded ??
          0;

    
const potency = savesForced
  ? Math.round((savesFailed / savesForced) * 100)
  : 0;

        const defense = p.defense || {};

const fullChar = characterMap[p.name] || {};

const roundData =
  (fullChar.rounds || []).find(
    rr => rr.round === r.round
  ) || {};

const timesTargeted =
  (defense.attacksTaken || 0) +
  (defense.savesMade || 0);

        const slotEntries = Object.entries(
  p.spellSlotsUsed ||
  p.spellSlots ||
  p.stats?.spellSlotsUsed ||
  {}
).filter(([_, value]) => value > 0);

        const spellSlotDisplay = slotEntries.length
          ? slotEntries
              .map(([level, amount]) =>
                `${level}:${amount}`
              )
              .join(" | ")
          : "None";

        const color =
          await getCharacterColorFromPortrait(
            characterMap[p.name] || {},
            Object.keys(characterMap).indexOf(p.name)
          );

        // =========================
        // SUMMONS
        // =========================

        const summons = p.summons || [];

        const summonDisplay = summons.length
          ? summons.map(s => {

              if (typeof s === "string") {
                return s;
              }

              const totals = s.totals || {};

              return `
                <div class="active-summon-entry">

                  <div>
                    <b>${s.name || "Unknown"}</b>
                    ${s.count ? `(x${s.count})` : ""}
                  </div>

                  <div class="active-summon-substats">
                    ${totals.damage || 0} dmg /
                    ${totals.healing || 0} heal /
                    ${totals.cc || 0} cc /
                    ${totals.damageTaken || 0} taken
                  </div>

                  <div class="active-summon-substats">
                    Active:
                    ${s.roundsActive || 0} rounds
                  </div>

                </div>
              `;

            }).join("")
          : "None";

        // =========================
        // PLAYER CARD
        // =========================

        return `
  <div class="round-player-column" style="width:260px;">

            <div class="round-player-name">

              ${
                (
                  characterMap[p.name]?.image ||
                  characterMap[p.name]?.portrait
                )
                  ? `
                    <img
                      class="round-player-portrait"
                      src="${normalizeImageSrc(
                        characterMap[p.name]?.image ||
                        characterMap[p.name]?.portrait
                      )}"
                      alt="${p.name}"
                    >
                  `
                  : ""
              }

              <span class="round-player-name-text">

                ${p.name}

                ${
                  (
                    p.initiative ??
                    characterMap[p.name]?.initiative
                  ) !== undefined
                    ? `
                      <span
                        class="initiative-badge"
                        style="
                          background:${color};
                          box-shadow:0 0 12px ${color};
                        "
                      >
                        INIT ${
                          p.initiative ??
                          characterMap[p.name]?.initiative
                        }
                      </span>
                    `
                    : ""
                }

              </span>

            </div>

            <div class="round-player-stat">
              Damage: ${p.damage ?? 0}
            </div>

            <div class="round-player-stat">
              Healing: ${p.healing ?? 0}
            </div>

            <div class="round-player-stat">
              CC: ${p.cc ?? 0}
            </div>

            <div class="round-player-stat">
              Targeted: ${timesTargeted}
            </div>

            <div class="round-player-stat">
              Accuracy:
              ${attacksHit}/${attacksMade}
              (${accuracy}%)
            </div>

            <div class="round-player-stat">
              Potency:
              ${savesForced - savesSucceeded}/${savesForced}
              (${potency}%)
            </div>

            <div class="round-player-stat">
  Nat 20s:
  ${
    p.nat20 ??
    roundData.nat20 ??
    p.stats?.nat20 ??
    0
  }
</div>

<div class="round-player-stat">
  Nat 1s:
  ${
    p.nat1 ??
    roundData.nat1 ??
    p.stats?.nat1 ??
    0
  }
</div>

            <div class="round-player-stat">
              Slots: ${spellSlotDisplay}
            </div>

            <div class="round-player-summons">

              <div class="round-player-summons-title">
                Active Summons
              </div>

              <div class="round-player-summons-list">
                ${summonDisplay}
              </div>

            </div>

          </div>
        `;
      })
    );

    const playerColumnsHTML =
      playerColumns.join("");

    // =========================
    // ROUND CARD
    // =========================

    const div = document.createElement("div");

    div.className = "round-card";

    div.innerHTML = `
      <div class="round-header">

        <div class="round-title">
          Round ${r.round}
        </div>

      </div>

      <div class="round-player-columns">
        ${playerColumnsHTML}
      </div>

      <div class="round-party-box">

        <div class="round-party-header">

          <div class="round-party-title">
            Party Breakdown
          </div>

        </div>

        <div class="round-party-grid">

          <div class="round-party-stat-card">
            <span class="round-party-label">Damage</span>
            <span class="round-party-value">${partyDamage}</span>
          </div>

          <div class="round-party-stat-card">
            <span class="round-party-label">Healing</span>
            <span class="round-party-value">${partyHealing}</span>
          </div>

          <div class="round-party-stat-card">
            <span class="round-party-label">CC</span>
            <span class="round-party-value">${partyCC}</span>
          </div>

          <div class="round-party-stat-card">
            <span class="round-party-label">Targeted</span>
            <span class="round-party-value">${partyTargeted}</span>
          </div>

          <div class="round-party-stat-card">
            <span class="round-party-label">Nat 20s</span>
            <span class="round-party-value">${partyNat20}</span>
          </div>

          <div class="round-party-stat-card">
            <span class="round-party-label">Nat 1s</span>
            <span class="round-party-value">${partyNat1}</span>
          </div>

          <div class="round-party-stat-card">
            <span class="round-party-label">Accuracy</span>

            <span class="round-party-value">
              ${partyAttacksHit}/${partyAttacksMade}
            </span>

            <small>${partyAccuracy}%</small>
          </div>

          <div class="round-party-stat-card">
            <span class="round-party-label">Potency</span>

            <span class="round-party-value">
              ${partySavesForced - partySavesSucceeded}/${partySavesForced}
            </span>

            <small>${partyPotency}%</small>
          </div>

        </div>

      </div>
    `;

    el.appendChild(div);
  }
}

function renderActionUsage(actionSet = {}) {

  return `
    <div class="action-usage">

      <div>
        <span title="Attack">
          ⚔️ ${actionSet.attack || 0}
        </span>

        &nbsp;&nbsp;&nbsp;

        <span title="Spell">
          ⚡ ${actionSet.spell || 0}
        </span>
      </div>

      <div>
        <span title="Movement">
          💨 ${actionSet.move || 0}
        </span>

        &nbsp;&nbsp;&nbsp;

        <span title="Misc">
          ❔ ${actionSet.misc || 0}
        </span>
      </div>

      <div style="text-align:center;">
        <span
          title="Unused"
          class="unused-action"
        >
          ❌ ${actionSet.none || 0}
        </span>
      </div>

    </div>
  `;
}

async function renderPartyBreakdown(characters) {
  
  const el = document.getElementById("party-breakdown");
  el.innerHTML = "";

  for (const char of characters) {
    console.log("CHAR KEYS:", Object.keys(char));
     console.log("CHAR:", char);
    const stats = char.stats || {};
    const defense = stats.defense || {};
const color = await getCharacterColorFromPortrait(
  char,
  characters.indexOf(char)
);
    const timesTargeted =
      (defense.attacksTaken || 0) +
      (defense.savesMade || 0);

    const row = document.createElement("div");
    row.className = "party-row";

    const rounds = char.roundCount || 1;

const dpr = Math.round((stats.damage || 0) / rounds);

const attacksMade = stats.attacks?.total || 0;

const savesForced = stats.saves?.forced || 0;
const savesSucceeded = stats.saves?.succeeded || 0;
const savesFailed = Math.max(0, savesForced - savesSucceeded);

const potency = savesForced
  ? Math.round((savesFailed / savesForced) * 100)
  : 0;
const saveRate = savesForced
  ? Math.round((savesSucceeded / savesForced) * 100)
  : 0;
  const hp = getHP(char);
const current = hp.current;
const max = hp.max;

const hpPercent = max
  ? Math.round((current / max) * 100)
  : 0;

let hpColor = "#8b0000";

if (hpPercent === 0) {
  hpColor = "#3a0202";
} else if (hpPercent <= 25) {
  hpColor = "#ff0000";
} else if (hpPercent <= 50) {
  hpColor = "#ff9800";
} else if (hpPercent <= 75) {
  hpColor = "#bce059";
} else if (hpPercent < 100) {
  hpColor = "#4caf50";
} else {
  hpColor = "#2196f3";
}

    row.innerHTML = `
     <div class="party-left">

  <div class="party-header">

    ${
      (char.image || char.portrait)
        ? `
          <img
            class="character-portrait"
            src="${normalizeImageSrc(char.image || char.portrait)}"
            alt="${char.name}"
          >
        `
        : ""
    }

    <div>
  <h4>
    ${char.name}

    ${
      char.initiative !== undefined
        ? `
          <span
  class="initiative-badge"
  style="
  background:${color};
  box-shadow:0 0 12px ${color};
"
>
            INITIATIVE ${char.initiative}
          </span>
        `
        : ""
    }
  </h4>

  <span>${char.levelClass}</span>
</div>

  </div>


<div class="hp-block">
  <div class="hp-label">
    <b>HP:</b> ${current} / ${max} (${hpPercent}%)
  </div>

  <div class="hp-bar">
    <div class="hp-fill" style="width: ${hpPercent}%; background: ${hpColor}"></div>
  </div>
</div>
       <div class="party-sections">

  <!-- ========================= -->
  <!-- WINDOW 1 : ACTIONS -->
  <!-- ========================= -->
  <div class="party-subwindow">

    <div class="subwindow-header">
      <h5>Actions</h5>

      <span class="efficiency">
        ${
          (() => {

            const useful =
              (stats.actions?.attack || 0) +
              (stats.actions?.spell || 0) +
              (stats.actions?.move || 0) +
              (stats.actions?.misc || 0) +

              (stats.bonusActions?.attack || 0) +
              (stats.bonusActions?.spell || 0) +
              (stats.bonusActions?.move || 0) +
              (stats.bonusActions?.misc || 0) +

              (stats.reactions?.attack || 0) +
              (stats.reactions?.spell || 0) +
              (stats.reactions?.move || 0) +
              (stats.reactions?.misc || 0);

            const wasted =
              (stats.actions?.none || 0) +
              (stats.bonusActions?.none || 0) +
              (stats.reactions?.none || 0);

            const total = useful + wasted;

            const efficiency = total
              ? Math.round((useful / total) * 100)
              : 0;

            return `${efficiency}% efficiency`;

          })()
        }
      </span>
    </div>

    <div class="party-grid">

      <div>
  <b>Actions</b><br>
  ${renderActionUsage(stats.actions)}
</div>

<div>
  <b>BonusActions</b><br>
  ${renderActionUsage(stats.bonusActions)}
</div>

<div>
  <b>Reactions</b><br>
  ${renderActionUsage(stats.reactions)}
</div>

    </div>
  </div>


  <!-- ========================= -->
  <!-- WINDOW 2 : STATS -->
  <!-- ========================= -->
  <div class="party-subwindow">

    <div class="subwindow-header">
      <h5>Stats</h5>
    </div>

    <div class="party-grid">

      <div><b>Damage:</b> ${stats.damage}</div>

      <div><b>DPR:</b> ${dpr}</div>

      <div><b>Healing:</b> ${stats.healing}</div>

      <div><b>CC:</b> ${stats.cc}</div>

      <div><b>Times Targeted:</b> ${timesTargeted}</div>

      <div><b>Damage Taken:</b> ${stats.damageTaken}</div>

      <div>
        <b>Spell Slots Expended:</b>
        ${
          Object.values(
  stats.spellSlotsUsed ||
  stats.spellSlots ||
  {}
).reduce((a,b)=>a+b,0)
        }
      </div>

      <div><b>Attacks Made:</b> ${attacksMade}</div>

      <div><b>Saves Forced:</b> ${savesForced}</div>

    </div>
  </div>


  <!-- ========================= -->
  <!-- WINDOW 3 : ROLLS -->
  <!-- ========================= -->
  <div class="party-subwindow">

    <div class="subwindow-header">
      <h5>Rolls</h5>
    </div>

    <div class="party-grid">

      <div>
        <b>Attacks Dodged:</b>
        ${defense.attacksDodged || 0}
      </div>

      <div>
        <b>Saves Made:</b>
        ${defense.savesMade || 0}
      </div>

      <div>
        <b>Potency:</b>
         ${savesFailed}/${savesForced} (${potency}%)
      </div>

      <div>
        <b>Accuracy:</b>
        ${
          stats.attacks?.total
            ? Math.round(
                (stats.attacks.hit / stats.attacks.total) * 100
              )
            : 0
        }%
      </div>

      <div>
        <b>Nat 20s:</b>
        ${stats.nat20 ?? 0}
      </div>

      <div>
        <b>Nat 1s:</b>
        ${stats.nat1 ?? 0}
      </div>

    </div>
  </div>

</div>

      </div>

      <div class="party-right">
  <canvas id="radar-${char.name.replace(/\s+/g, "-")}"></canvas>
</div>
    `;

    el.appendChild(row);
    renderCharacterRadar(
  `radar-${char.name.replace(/\s+/g, "-")}`,
  char,
  characters,
  color
);
    }
}
function hexToRGBA(hex, alpha = 1) {

  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
function renderCharacterRadar(canvasId, char, allCharacters, color) {

  const canvas = document.getElementById(canvasId);

  if (!canvas) return;

  const stats = char.stats || {};
  const defense = stats.defense || {};

  // =========================
  // PARTY TOTALS
  // =========================

  const totalDamage = allCharacters.reduce(
    (s, c) => s + (c.stats?.damage || 0),
    0
  );

  const totalHealing = allCharacters.reduce(
    (s, c) => s + (c.stats?.healing || 0),
    0
  );

  const totalCC = allCharacters.reduce(
    (s, c) => s + (c.stats?.cc || 0),
    0
  );

  const totalTargeted = allCharacters.reduce((s, c) => {
    const d = c.stats?.defense || {};

    return s +
      (d.attacksTaken || 0) +
      (d.savesMade || 0);
  }, 0);

  // =========================
  // INDIVIDUAL SCORES
  // =========================

  const damageScore = totalDamage
    ? ((stats.damage || 0) / totalDamage) * 10
    : 0;

  const healingScore = totalHealing
    ? ((stats.healing || 0) / totalHealing) * 10
    : 0;

  const ccScore = totalCC
    ? ((stats.cc || 0) / totalCC) * 10
    : 0;

  const targeted =
    (defense.attacksTaken || 0) +
    (defense.savesMade || 0);

  const tankScore = totalTargeted
    ? (targeted / totalTargeted) * 10
    : 0;

  // =========================
  // LUCK SCORE
  // =========================

 // =========================
// LUCK SCORE
// =========================

// Offensive rolls
const attacksMade = stats.attacks?.total || 0;
const attacksHit = stats.attacks?.hit || 0;

// Offensive saves
const savesForced = stats.saves?.forced || 0;
const savesSucceeded = stats.saves?.succeeded || 0;
const savesFailed = Math.max(0, savesForced - savesSucceeded);
// Defensive saves
const savesMade = defense.savesMade || 0;
const savesTotal = defense.savesTotal || savesMade;

// Defensive dodges
const attacksTaken = defense.attacksTaken || 0;
const attacksDodged = defense.attacksDodged || 0;

// =========================
// TOTAL SUCCESSFUL ROLLS
// =========================

const successfulRolls =
  attacksHit +
  savesMade +
  attacksDodged;

const totalRolls =
  attacksMade +
  savesTotal +
  attacksTaken;

// =========================
// BASE SUCCESS RATE
// =========================

let luck = totalRolls
  ? (successfulRolls / totalRolls) * 10
  : 0;

// =========================
// CRITICAL MODIFIERS
// =========================

const nat20 = stats.nat20 || 0;
const nat1 = stats.nat1 || 0;

// small adjustments
luck += nat20 * 0.15;
luck -= nat1 * 0.10;

// clamp between 0–10
luck = Math.max(0, Math.min(10, luck));

  // =========================
  // CHART
  // =========================
const charIndex = allCharacters.findIndex(c => c.name === char.name);

const fill = color.startsWith("rgb")
  ? color.replace("rgb", "rgba").replace(")", ", 0.25)")
  : hexToRGBA(color, 0.25);

  new Chart(canvas, {
    type: "radar",

    data: {
      labels: [
        "Luck",
        "Damage",
        "Healing",
        "Tank",
        "CC"
      ],

      datasets: [{
        data: [
          luck,
          damageScore,
          healingScore,
          tankScore,
          ccScore
        ],

        borderColor: color,
backgroundColor: fill,
pointBackgroundColor: color,
        pointRadius: 4,
        borderWidth: 2
      }]
    },

    options: {

      responsive: true,
      maintainAspectRatio: false,

      plugins: {

  legend: {
    display: false
  },

  tooltip: {

    callbacks: {

      label: function(context) {

        const label = context.label;
        const value = Math.round(context.raw * 10) / 10;

        const descriptions = {

          "Luck":
            `Luck: ${value}/10 — percentage of successful rolls, extra weightage for criticals`,

          "Damage":
            `Damage: ${value}/10 — percentage of the party's total damage`,

          "Healing":
            `Healing: ${value}/10 — percentage of the party's total healing`,

          "Tank":
            `Tank: ${value}/10 — percentage of the party's attacks taken and saves made`,

          "CC":
            `CC: ${value}/10 — percentage of the party's crowd control`
        };

        return descriptions[label] || `${label}: ${value}`;
      }
    }
  }
},

      scales: {
        r: {

          min: 0,
          max: 10,

          ticks: {
            stepSize: 2,
            color: "#999",
            backdropColor: "transparent"
          },

          angleLines: {
            color: "#444"
          },

          grid: {
            color: "#333"
          },

          pointLabels: {
            color: "#ddd",
            font: {
              size: 14
            }
          }
        }
      }
    }
  });
}
function createPie(canvasId, label, labels, data, colors){
  const ctx = document.getElementById(canvasId);

  if (!ctx) return;

  new Chart(ctx, {
    type: "pie",
    data: {
      labels: labels,
      datasets: [{
  data: data,
  backgroundColor: colors
}]
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: label,
          color: "#fff",
          font: { size: 14 }
        },
        legend: {
          labels: {
            color: "#aaa",
            boxWidth: 10
          }
        }
      }
    }
  });
}
async function renderPartyCharts(characters) {
  const names = characters.map(c => c.name);

  const damage = characters.map(c => c.stats?.damage || 0);
  const healing = characters.map(c => c.stats?.healing || 0);
  const cc = characters.map(c => c.stats?.cc || 0);
const colors = await Promise.all(
  characters.map((c, i) =>
    getCharacterColorFromPortrait(c, i)
  )
);
  const targeted = characters.map(c => {
    const d = c.stats?.defense || {};
    return (d.attacksTaken || 0) + (d.savesMade || 0);
  });

  createPie("chart-damage", "Damage", names, damage, colors);
createPie("chart-healing", "Healing", names, healing, colors);
createPie("chart-cc", "CC", names, cc, colors);
createPie("chart-targeted", "Targeted", names, targeted, colors);
}
//Character and all time stats//

async function loadCampaignStats(campaignSlug) {
  const res = await fetch(`../battles/${campaignSlug}/characterStats.json`);

  if (!res.ok) {
    console.error("No stats file found");
    return null;
  }

  return await res.json();
}
async function loadStatsCampaigns() {
  container.innerHTML = "Loading campaign stats...";

  try {
    const res = await fetch("../battles/index.json");
    const battles = await res.json();

    // group campaigns (same logic as loadCampaigns)
    const campaignMap = {};

    battles.forEach(b => {
      if (!campaignMap[b.campaignSlug]) {
        campaignMap[b.campaignSlug] = {
          name: b.campaign,
          slug: b.campaignSlug
        };
      }
    });

    const campaigns = Object.values(campaignMap);

    campaigns.sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    container.innerHTML = `
      <h3>Character Stats</h3>
      <div id="campaignGrid"></div>
    `;

    const grid = document.getElementById("campaignGrid");

    campaigns.forEach(campaign => {

      const div = document.createElement("div");

      div.className =
        "world-card-previous-battles clickable";

      div.innerHTML = `
        <span class="battle-card-text">
          ${campaign.name}
        </span>
      `;

      div.onclick = () => {
        renderCampaignBreakdown(campaign.slug);
      };

      grid.appendChild(div);
    });

  } catch (err) {
    console.error(err);
    container.innerHTML = "Failed to load stats.";
  }
}

async function getCampaignCharacterPortraits(campaignSlug) {
    if (campaignPortraitCache[campaignSlug]) {
    return campaignPortraitCache[campaignSlug];
  }
let battles = campaignBattleCache[campaignSlug];

if (!battles) {
  const res = await fetch("../battles/index.json");
  const allBattles = await res.json();

  battles = allBattles.filter(
    b => b.campaignSlug === campaignSlug
  );

  campaignBattleCache[campaignSlug] = battles;
}

  const campaignBattles = battles.filter(
    b => b.campaignSlug === campaignSlug
  );

  const portraitMap = {};

  for (const battle of campaignBattles) {
    try {
      const url = `../battles/${battle.campaignSlug}/${battle.battleSlug}.json`;
      const res = await fetch(url);

      if (!res.ok) continue;

      const data = await res.json();

      (data.characters || []).forEach(char => {
        if (!portraitMap[char.name]) {
          portraitMap[char.name] =
            char.image || char.portrait || null;
        }
      });

    } catch (err) {
      console.warn("Failed to load battle for portraits:", err);
    }
  }

  return portraitMap;
}

function buildCampaignCharacters(statsData) {
  const chars = Object.values(statsData.characters);

  return chars.map(c => ({
    name: c.name,

    stats: {
      damage: c.totalDamage,
      healing: c.totalHealing,
      cc: c.totalCC,

      attacks: {
        total: c.totalAttacks,
        hit: c.totalHits
      },

      saves: {
        forced: c.totalPotencyAttempts,
        succeeded: c.totalPotencySuccess
      },

      defense: {
        attacksTaken: c.totalAttacksTaken || 0,
        attacksDodged: c.totalAttacksDodged || 0,
        savesMade: c.totalSavesMade || 0,
        savesTotal: c.totalSavesTotal || 0
      },

      nat20: c.totalNat20 || 0,
      nat1: c.totalNat1 || 0
    }
  }));
}
async function renderCampaignBreakdown(campaignSlug) {

  container.innerHTML = "Loading campaign stats...";

  const statsData = await loadCampaignStats(campaignSlug);

  if (!statsData) {
    container.innerHTML = "No stats found.";
    return;
  }

  const characters = buildCampaignCharacters(statsData);

const portraitMap =
  await getCampaignCharacterPortraits(campaignSlug);

characters.forEach(char => {
  char.image = portraitMap[char.name] || null;
});

  container.innerHTML = `
    <div class="backBtn">← Back</div>
    <h3>Campaign Stats</h3>
    <div id="campaign-breakdown"></div>
  `;

  container.querySelector(".backBtn").onclick =
    () => loadBattles(campaignSlug);

  const el = document.getElementById("campaign-breakdown");

  for (const char of characters) {

  const stats = char.stats || {};

  const attacksMade = stats.attacks?.total || 0;
  const attacksHit = stats.attacks?.hit || 0;

  const savesForced = stats.saves?.forced || 0;
  const savesSucceeded = stats.saves?.succeeded || 0;
const savesFailed = Math.max(0, savesForced - savesSucceeded);
  const accuracy = attacksMade
    ? Math.round((attacksHit / attacksMade) * 100)
    : 0;

 
const potency = savesForced
  ? Math.round((savesFailed / savesForced) * 100)
  : 0;
  const row = document.createElement("div");
  row.className = "party-row";

  row.innerHTML = `
    <div class="party-left">

      <div class="party-header">

  ${
    char.image
      ? `
        <img
          class="character-portrait"
          src="${normalizeImageSrc(char.image)}"
          alt="${char.name}"
        >
      `
      : ""
  }

  <h4>${char.name}</h4>

</div>

      <div class="party-grid">

        <div><b>Total Damage:</b> ${stats.damage}</div>
        <div><b>Total Healing:</b> ${stats.healing}</div>
        <div><b>Total CC:</b> ${stats.cc}</div>

        <div><b>Accuracy:</b> ${accuracy}%</div>
        <div><b>Potency:</b> ${potency}%</div>

      </div>

    </div>

    <div class="party-right">
      <canvas id="campaign-radar-${char.name.replace(/\s+/g, "-")}"></canvas>
    </div>
  `;

  el.appendChild(row);

  const color = await getCharacterColorFromPortrait(
  char,
  characters.indexOf(char)
);
  renderCharacterRadar(
    `campaign-radar-${char.name.replace(/\s+/g, "-")}`,
    char,
    characters,
    color
  );

  }
}