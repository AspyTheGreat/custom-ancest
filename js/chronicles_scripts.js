// =========================
// ⚙️ CONFIG (EDIT THIS).character-card
// =========================
const campaignBattleCache = {};
const campaignPortraitCache = {};
const characterStatsCache = {};
const DEBUG = true;

const campaignCardImages = {
  "the-break-of-dawn": "../assets/campaign-cards/break of dawn.webp",
  "the-boros-legionaire": "../assets/campaign-cards/boros legionaire.webp"
};

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

        const campaignImage = campaignCardImages[campaign.slug];

        if (campaignImage) {
          div.className = "campaign-card clickable";
          div.innerHTML = `
            <img class="campaign-card-bg" src="${campaignImage}" alt="" loading="lazy">
            <div class="campaign-card-overlay"></div>
            <div class="campaign-card-title">${campaign.name}</div>
          `;
        } else {
          div.className = "world-card-previous-battles clickable";
          div.innerHTML = `<span class="battle-card-text">${campaign.name}</span>`;
        }

        div.onclick = () => {
          window.location.hash = `#battles/${campaign.slug}`;
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
        () => { window.location.hash = "#campaigns"; };

      // =========================
      // RENDER BATTLES
      // =========================

      const fragment = document.createDocumentFragment();

      for (const battle of battles) {

        const div = document.createElement("div");

        div.className =
          "battle-card clickable";

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
              loading="lazy"
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
          window.location.hash = `#battle/${battle.campaignSlug}/${battle.battleSlug}`;
        };

        fragment.appendChild(div);
      }

      grid.appendChild(fragment);

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
function normalizeImageSrc(src) {
  if (!src) return "";

  // ✅ already a base64 image
  if (src.startsWith("data:image")) {
    return src;
  }

  // ✅ already absolute
  if (
    src.startsWith("http://") ||
    src.startsWith("https://") ||
    src.startsWith("/")
  ) {
    return src;
  }

  // relative image path
  return `../${src}`;
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
function router() {
  const hash = window.location.hash.slice(1) || "campaigns";
  const parts = hash.split("/");

  if (parts[0] === "campaigns" || hash === "") {
    loadCampaigns();
  } else if (parts[0] === "battles" && parts[1]) {
    loadBattles(parts[1]);
  } else if (parts[0] === "battle" && parts[1] && parts[2]) {
    loadBattleView(`../battles/${parts[1]}/${parts[2]}.json`);
  } else {
    loadCampaigns();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (document.querySelector(".all-time-container")) {
    renderAllTimeStats();
  } else {
    router();
  }
});
window.addEventListener("hashchange", router);

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
  <div class="collapsible-header" id="rounds-toggle">
    <h3>Rounds</h3>
    <span class="toggle-icon">▼</span>
  </div>

  <div id="rounds-wrapper" class="collapsed">
    <div id="rounds"></div>
  </div>
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
const toggle = document.getElementById("rounds-toggle");
const wrapper = document.getElementById("rounds-wrapper");

toggle.onclick = () => {
  wrapper.classList.toggle("collapsed");

  const icon = toggle.querySelector(".toggle-icon");
  icon.textContent = wrapper.classList.contains("collapsed") ? "▼" : "▲";
};
  container.querySelector(".backBtn").onclick = () => {
  const campaign = data.campaignSlug || data.campaign?.toLowerCase().replace(/\s+/g, "-");

  window.location.hash = `#battles/${campaign}`;
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
    (defense.savesTotal || 0);

  const rounds = char.roundCount || 1;
  const dpr = Math.round((stats.damage || 0) / rounds);

  const attacksMade = stats.attacks?.total || 0;

  const savesForced = stats.saves?.forced || 0;
const savesSucceeded = stats.saves?.succeeded || 0;
const savesFailed = Math.max(0, savesForced - savesSucceeded);
// enemy FAILED saves = total - succeeded


const saveRate = savesForced
  ? Math.round((savesSucceeded / savesForced) * 100)
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
document
  .querySelectorAll(".level-history-btn")
  .forEach(btn => {

    btn.onclick = () => {

      const dropdown =
        btn.parentElement
          .parentElement
          .querySelector(".level-history-dropdown");

      if (!dropdown) return;

      dropdown.classList.toggle("hidden");

      btn.textContent =
        dropdown.classList.contains("hidden")
          ? "▶"
          : "▼";
    };
  });
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
            (d.savesTotal || 0);

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
        (defense.savesTotal || 0);

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
   
      const partySavesFailed = Math.max(
  0,
  partySavesForced - partySavesSucceeded
);

const partyPotency = partySavesForced
  ? Math.round((partySavesFailed / partySavesForced) * 100)
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

          const savesFailed = Math.max(0, savesForced - savesSucceeded);
    
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
  (defense.savesTotal || 0);

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
                      loading="lazy"
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
      <div class="round-header collapsible-round-header">
  <div class="round-title">
    Round ${r.round}
  </div>
  <span class="toggle-icon">▼</span>
</div>

<div class="round-body collapsed">

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
      </div> <!-- round-body -->
    `;

    el.appendChild(div);
    const header = div.querySelector(".collapsible-round-header");
const body = div.querySelector(".round-body");

header.onclick = () => {
  body.classList.toggle("collapsed");

  const icon = header.querySelector(".toggle-icon");
  icon.textContent = body.classList.contains("collapsed") ? "▼" : "▲";
};
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
      (defense.savesTotal || 0);

  const row = document.createElement("div");
  row.className = "party-row";
  if (char.slug) row.id = `char-${char.slug}`;

  const dark1 = darkenColor(color, 0.45);
  const dark2 = darkenColor(color, 0.15);
  row.style.background = `linear-gradient(135deg, ${dark1}, ${dark2})`;

    const rounds = char.roundCount || 1;

const dpr = Math.round((stats.damage || 0) / rounds);

      
const attacksMade = stats.attacks?.total || 0;
const attacksHit = stats.attacks?.hit || 0;

const accuracy = attacksMade
  ? Math.round((attacksHit / attacksMade) * 100)
  : 0;
          
const savesForced = stats.saves?.forced || 0;
const savesSucceeded = stats.saves?.succeeded || 0;
const savesFailed = Math.max(0, savesForced - savesSucceeded);

const potency = savesForced
  ? Math.round((savesFailed / savesForced) * 100)
  : 0;
const saveRate = savesForced
  ? Math.round((savesSucceeded / savesForced) * 100)
  : 0;
  const attacksTaken = defense.attacksTaken || 0;
const attacksDodged = defense.attacksDodged || 0;

const evasion = attacksTaken
  ? Math.round((attacksDodged / attacksTaken) * 100)
  : 0;

const savesMade = defense.savesMade ?? 0;

const savesTotal =
  defense.savesTotal ?? savesMade;

const fortitude = savesTotal
  ? Math.round((savesMade / savesTotal) * 100)
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
     <div class="party-left" style="background:transparent;">

  <div class="party-header">

    ${
      (char.image || char.portrait)
        ? `
          <img
            class="character-portrait"
            src="${normalizeImageSrc(char.image || char.portrait)}"
            alt="${char.name}"
            loading="lazy"
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
  <b>Evasion:</b>
  ${attacksDodged}/${attacksTaken}
  (${evasion}%)
</div>

<div>
  <b>Fortitude:</b>
  ${savesMade}/${savesTotal}
  (${fortitude}%)
</div>

<div>
  <b>Potency:</b>
  ${savesFailed}/${savesForced}
  (${potency}%)
</div>

<div>
  <b>Accuracy:</b>
  ${attacksHit}/${attacksMade}
  (${accuracy}%)
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

      <div class="party-right" style="background:transparent;">
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
function darkenColor(c, factor, alpha) {
  let r, g, b;
  if (c.startsWith("rgb")) {
    const m = c.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (!m) return c;
    r = Math.round(m[1]*factor);
    g = Math.round(m[2]*factor);
    b = Math.round(m[3]*factor);
  } else if (c.startsWith("#")) {
    r = Math.round(parseInt(c.slice(1,3),16)*factor);
    g = Math.round(parseInt(c.slice(3,5),16)*factor);
    b = Math.round(parseInt(c.slice(5,7),16)*factor);
  } else return c;
  return alpha !== undefined ? `rgba(${r},${g},${b},${alpha})` : `rgb(${r},${g},${b})`;
}
function brightenColor(c, amount) {
  let r, g, b;
  if (c.startsWith("rgb")) {
    const m = c.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (!m) return c;
    r = parseInt(m[1]); g = parseInt(m[2]); b = parseInt(m[3]);
  } else if (c.startsWith("#")) {
    r = parseInt(c.slice(1,3),16); g = parseInt(c.slice(3,5),16); b = parseInt(c.slice(5,7),16);
  } else return c;
  r = Math.min(255, Math.round(r + (255 - r) * amount));
  g = Math.min(255, Math.round(g + (255 - g) * amount));
  b = Math.min(255, Math.round(b + (255 - b) * amount));
  return `rgb(${r},${g},${b})`;
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
      (d.savesTotal || 0);
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
    (defense.savesTotal || 0);

  const tankScore = totalTargeted
    ? (targeted / totalTargeted) * 10
    : 0;



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
const savesMade = defense.savesMade ?? 0;
const savesTotal = defense.savesTotal ?? savesMade;

// Defensive dodges
const attacksTaken = defense.attacksTaken || 0;
const attacksDodged = defense.attacksDodged || 0;

// =========================
// TOTAL SUCCESSFUL ROLLS
// =========================

const successfulRolls =
  attacksHit +
  savesMade +
  savesFailed +
  attacksDodged;

const totalRolls =
  attacksMade +
  savesTotal +
  savesForced +
  attacksTaken;

// =========================
// SUCCESS SCORE (0–5)
// =========================

const successScore = totalRolls
  ? (successfulRolls / totalRolls) * 5
  : 0;

// =========================
// NAT SCORE (-5 to +5)
// =========================

const nat20 = stats.nat20 || 0;
const nat1 = stats.nat1 || 0;

let natScore = nat20 - nat1;

// clamp between -5 and +5
natScore = Math.max(-5, Math.min(5, natScore));

// shift to 0–5 scale
natScore = ((natScore + 5) / 10) * 5;

// =========================
// FINAL LUCK SCORE (0–10)
// =========================

let luck = successScore + natScore;

// clamp between 0–10
luck = Math.max(0, Math.min(10, luck));

  // =========================
  // CHART
  // =========================
const charIndex = allCharacters.findIndex(c => c.name === char.name);

const bright = brightenColor(color, 0.15);
const fill = bright.startsWith("rgb")
  ? bright.replace("rgb", "rgba").replace(")", ", 0.45)")
  : hexToRGBA(bright, 0.45);

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

        borderColor: bright,
backgroundColor: fill,
pointBackgroundColor: bright,
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
    return (d.attacksTaken || 0) + (d.savesTotal || 0);
  });

  createPie("chart-damage", "Damage", names, damage, colors);
createPie("chart-healing", "Healing", names, healing, colors);
createPie("chart-cc", "CC", names, cc, colors);
createPie("chart-targeted", "Targeted", names, targeted, colors);
}
//Character and all time stats//

async function loadCampaignStats(campaignSlug) {

  if (characterStatsCache[campaignSlug]) {
    return characterStatsCache[campaignSlug];
  }

  const res = await fetch(
    `../battles/${campaignSlug}/characterStats.json`
  );

  if (!res.ok) {
    console.error("No stats file found");
    return null;
  }

  const data = await res.json();

  characterStatsCache[campaignSlug] = data;

  return data;
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

      const campaignImage = campaignCardImages[campaign.slug];

      if (campaignImage) {
        div.className = "campaign-card clickable";
        div.innerHTML = `
          <img class="campaign-card-bg" src="${campaignImage}" alt="" loading="lazy">
          <div class="campaign-card-overlay"></div>
          <div class="campaign-card-title">${campaign.name}</div>
        `;
      } else {
        div.className = "world-card-previous-battles clickable";
        div.innerHTML = `
          <span class="battle-card-text">
            ${campaign.name}
          </span>
        `;
      }

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

  const stats =
    await loadCampaignStats(campaignSlug);

  if (!stats?.characters) {
    return {};
  }

  const portraitMap = {};

  Object.values(stats.characters).forEach(char => {

    if (char.name) {
      portraitMap[char.name] =
        char.portrait || null;
    }
  });

  return portraitMap;
}

function buildLevelTimeline(levelHistory = []) {

  return levelHistory
    .slice()

    // remove duplicates (same level repeated consecutively)
    .filter((entry, i, arr) =>
      i === 0 || entry !== arr[i - 1]
    );
}

function renderLevelTimeline(history) {

  if (!history.length) return "";

  // calculate total character level
  const getTotalLevel = (entry) => {

    const matches =
      [...entry.matchAll(/Level-(\d+)/g)];

    return matches.reduce(
      (sum, match) =>
        sum + parseInt(match[1]),
      0
    );
  };

  // sort highest total level first
  const sortedHistory =
    history
      .slice()
      .sort((a, b) =>
        getTotalLevel(b) -
        getTotalLevel(a)
      );

  return `
    <div class="level-header">
      <div class="level-title">
        Level Progression
      </div>
    </div>

    <div class="level-timeline">

     ${sortedHistory.map(level => {

  const totalLevel =
    getTotalLevel(level);

  return `

    <div class="level-node">

      <div class="level-entry-header">
        Level-${totalLevel}
      </div>

      <div class="level-label">
        ${level}
      </div>

    </div>

  `;
}).join("")}

    </div>
  `;
}

function calcLevel(levelClass) {
  if (!levelClass) return 0;
  const ms = levelClass.match(/Level-(\d+)/gi);
  if (!ms) return 0;
  let total = 0;
  ms.forEach(m => { total += parseInt(m.match(/\d+/)[0]); });
  return total;
}

function buildCampaignCharacters(statsData) {
  const chars = Object.values(statsData.characters);

  return chars.map(c => ({
    name: c.name,
    slug: c.slug,
    battles: c.battles || 0,
    level: calcLevel(c.levelClass),
    levelClass: c.levelClass || "", // ✅ ADD THIS
    levelHistory: c.levelHistory || [],

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
        savesTotal: c.totalSavesTotal || 0,
        damageTaken: c.totalDamageTaken || 0
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

characters.sort((a, b) => (b.level || 0) - (a.level || 0) || b.battles - a.battles);

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
  const defense = stats.defense || {};

const attacksTaken =
  defense.attacksTaken ?? 0;

const attacksDodged =
  defense.attacksDodged ?? 0;

const evasion = attacksTaken
  ? Math.round(
      (attacksDodged / attacksTaken) * 100
    )
  : 0;

const savesMade =
  defense.savesMade ?? 0;

const savesTotal =
  defense.savesTotal ?? savesMade;

const fortitude = savesTotal
  ? Math.round(
      (savesMade / savesTotal) * 100
    )
  : 0;
  const row = document.createElement("div");
  row.className = "party-row";
  if (char.slug) row.id = `char-${char.slug}`;

  const color = await getCharacterColorFromPortrait(
  char,
  characters.indexOf(char)
);

  const dark1 = darkenColor(color, 0.45);
  const dark2 = darkenColor(color, 0.15);
  row.style.background = `linear-gradient(135deg, ${dark1}, ${dark2})`;

  row.innerHTML = `
    <div class="party-left" style="background:transparent;">

      <div class="party-header">

  ${
    char.image
      ? `
        <img
          class="character-portrait"
          src="${normalizeImageSrc(char.image)}"
          alt="${char.name}"
          loading="lazy"
        >
      `
      : ""
  }

<div class="character-text">

  <h4>${char.name}</h4>

  ${
    char.levelClass
      ? `
        <div class="character-subtitle-row">

          <div class="character-subtitle">
            ${char.levelClass}
          </div>

        ${
  char.levelHistory?.length
    ? `
      <button
        class="level-history-btn"
        data-character="${char.name}"
      >
        ▶
      </button>
    `
    : ""
}

        </div>
        ${
  char.levelHistory?.length
    ? `
      <div class="level-history-dropdown hidden">

        ${renderLevelTimeline(
          buildLevelTimeline(char.levelHistory)
        )}

      </div>
    `
    : ""
}
      `
      : ""
      
  }

</div>

</div>

    <div class="all-time-party-grid">

  <div><b>Battles Fought:</b> ${char.battles}</div>

  <div><b>Total Damage:</b> ${stats.damage}</div>
  <div><b>Total Healing:</b> ${stats.healing}</div>
  <div><b>Total CC:</b> ${stats.cc}</div>
  <div><b>Damage Taken:</b> ${defense.damageTaken}</div>

  <div>
  <b>Accuracy:</b>
  ${attacksHit}/${attacksMade}
  (${accuracy}%)
</div>

<div>
  <b>Potency:</b>
  ${savesFailed}/${savesForced}
  (${potency}%)
</div>

<div>
  <b>Evasion:</b>
  ${attacksDodged}/${attacksTaken}
  (${evasion}%)
</div>

<div>
  <b>Fortitude:</b>
  ${savesMade}/${savesTotal}
  (${fortitude}%)
</div>

  <div><b>Nat 20s:</b> ${stats.nat20}</div>
  <div><b>Nat 1s:</b> ${stats.nat1}</div>

</div>



    </div>

    <div class="party-right" style="background:transparent;">
      <canvas id="campaign-radar-${char.name.replace(/\s+/g, "-")}"></canvas>
    </div>
  `;

  el.appendChild(row);

  renderCharacterRadar(
    `campaign-radar-${char.name.replace(/\s+/g, "-")}`,
    char,
    characters,
    color
  );

  }
 document
  .querySelectorAll(".level-history-btn")
  .forEach(btn => {

    btn.onclick = () => {

      const characterText =
        btn.closest(".character-text");

      if (!characterText) return;

      const dropdown =
        characterText.querySelector(
          ".level-history-dropdown"
        );

      if (!dropdown) return;

      dropdown.classList.toggle("hidden");

      btn.textContent =
        dropdown.classList.contains("hidden")
          ? "▶"
          : "▼";
    };
  });

}


//All-time stats//
async function getAllCharacterPortraits() {

  const battlesIndexRes =
    await fetch("../battles/index.json");

  if (!battlesIndexRes.ok) {
    return {};
  }

  const battles =
    await battlesIndexRes.json();

  const portraitMap = {};

  // unique campaigns
  const campaigns = [
    ...new Set(
      battles.map(b => b.campaignSlug)
    )
  ];

  // load each campaign's characterStats.json
  for (const campaignSlug of campaigns) {

    const res = await fetch(
      `../battles/${campaignSlug}/characterStats.json`
    );

    if (!res.ok) continue;

    const stats = await res.json();

    const chars =
      stats.characters || {};

    for (const slug in chars) {

      const char = chars[slug];

      if (
        char.name &&
        char.portrait
      ) {

        portraitMap[char.name] =
          char.portrait;
      }
    }
  }

  return portraitMap;
}
async function getAllBattlesList() {
  const battles = await loadAllBattles();

  return battles.map(b => ({
    name: b.name,
    campaign: b.campaign
  }));
}
async function loadAllBattles() {
  const res = await fetch("../battles/index.json");
  return await res.json();
}
async function computeAllTimeStats() {
  const battles = await loadAllBattles();

  let totalDamage = 0;
  let totalHealing = 0;
  let totalCC = 0;

  const seenCampaigns = new Set();

  let topDamage = { name: "—", value: 0, image: null };
let topHealing = { name: "—", value: 0, image: null };
let topCC = { name: "—", value: 0, image: null };

  for (const b of battles) {
    if (seenCampaigns.has(b.campaignSlug)) continue;
    seenCampaigns.add(b.campaignSlug);

    const res = await fetch(`../battles/${b.campaignSlug}/characterStats.json`);
    if (!res.ok) continue;

    const data = await res.json();

    Object.values(data.characters).forEach(c => {
      const dmg = c.totalDamage || 0;
      const heal = c.totalHealing || 0;
      const cc = c.totalCC || 0;
        const img = c.portrait || null;

      totalDamage += dmg;
      totalHealing += heal;
      totalCC += cc;

      if (dmg > topDamage.value) {
  topDamage = { name: c.name, value: dmg, image: img };
}

if (heal > topHealing.value) {
  topHealing = { name: c.name, value: heal, image: img };
}

if (cc > topCC.value) {
  topCC = { name: c.name, value: cc, image: img };
}
    });
  }

  return {
    totalDamage,
    totalHealing,
    totalCC,
    topDamage,
    topHealing,
    topCC
  };
}

function capitalizeWords(str) {
  return str.replace(/\b\w/g, l => l.toUpperCase());
}

async function computeClassStats() {
  const battles = await loadAllBattles();

  const classMap = {};
  const subclassMap = {};

  const seen = new Set();

  // unique campaigns
  const campaigns = [
    ...new Set(battles.map(b => b.campaignSlug))
  ];

  for (const campaignSlug of campaigns) {

    const stats = await loadCampaignStats(campaignSlug);
    if (!stats?.characters) continue;

    Object.values(stats.characters).forEach(char => {

      (char.classes || []).forEach(c => {

        // normalize class/subclass names
        const normalizedClass =
          (c.class || "").trim().toLowerCase();

        const normalizedSubclass =
          (c.subclass || "").trim().toLowerCase();

        // unique per character + class
        const classKey =
          `${char.name.toLowerCase()}-${normalizedClass}`;

        if (normalizedClass) {
          if (!classMap[normalizedClass]) {
            classMap[normalizedClass] = { count: 0, levels: 0 };
          }
          if (!seen.has(classKey)) {
            classMap[normalizedClass].count++;
            seen.add(classKey);
          }
          classMap[normalizedClass].levels += c.level || 0;
        }

        if (normalizedSubclass) {

          const label =
            `${normalizedSubclass} (${normalizedClass})`;

          const subKey =
            `${char.name.toLowerCase()}-${label}`;

          if (!subclassMap[label]) {
            subclassMap[label] = { count: 0, levels: 0 };
          }
          if (!seen.has(subKey)) {
            subclassMap[label].count++;
            seen.add(subKey);
          }
          subclassMap[label].levels += c.level || 0;
        }

      });

    });
  }

  return { classMap, subclassMap };
}

async function getAllCampaigns() {
  const battles = await loadAllBattles();

  const campaignMap = new Map();

  battles.forEach(b => {
    if (!campaignMap.has(b.campaignSlug)) {
      campaignMap.set(b.campaignSlug, {
        name: b.campaign,
        slug: b.campaignSlug,
        battles: 0
      });
    }

    campaignMap.get(b.campaignSlug).battles++;
  });

  return Array.from(campaignMap.values());
}
function parseLevelClass(levelClassStr) {
  if (!levelClassStr) return [];

  return levelClassStr
    // ✅ split on comma OR pipe
    .split(/[,|]/)
    .map(entry => entry.trim())
    .filter(Boolean)
    .map(entry => {

      // remove "Level-X"
      entry = entry.replace(/Level-\d+\s*/i, "");

      const parts = entry.split(" ").filter(Boolean);

      if (!parts.length) return null;

      const className = parts.pop().toLowerCase();
      const subclass = parts.length
        ? parts.join(" ").toLowerCase()
        : null;

      return {
        className,
        subclass
      };
    })
    .filter(Boolean);
}
function renderTopStat(label, total, top) {
  return `
    <div class="stat-item">
      <span>${label}</span>
      <span>${total}</span>
    </div>

    <div class="stat-sub stat-top">
      ${
        top.image
          ? `<img class="stat-portrait" src="${normalizeImageSrc(top.image)}" loading="lazy">`
          : ""
      }
      <span>${top.name} (${top.value})</span>
    </div>
  `;
}
async function loadAllTimeData() {
  const battles = await loadAllBattles();

  const campaignMap = new Map();
  battles.forEach(b => {
    if (!campaignMap.has(b.campaignSlug)) {
      campaignMap.set(b.campaignSlug, { name: b.campaign, slug: b.campaignSlug, battles: 0 });
    }
    campaignMap.get(b.campaignSlug).battles++;
  });
  const campaigns = Array.from(campaignMap.values());

  const statsResults = await Promise.all(
    campaigns.map(c => loadCampaignStats(c.slug))
  );

  let totalDamage = 0, totalHealing = 0, totalCC = 0;
  let totalDamageTaken = 0, totalNat20 = 0, totalNat1 = 0;
  let topDamage = { name: "—", value: 0, image: null };
  let topHealing = { name: "—", value: 0, image: null };
  let topCC = { name: "—", value: 0, image: null };
  let topDamageTaken = { name: "—", value: 0, image: null };
  let topNat20 = { name: "—", value: 0, image: null };
  let topNat1 = { name: "—", value: 0, image: null };
  const classMap = {};
  const subclassMap = {};
  const seen = new Set();
  const characters = [];
  const portraitMap = {};

  for (let i = 0; i < statsResults.length; i++) {
    const stats = statsResults[i];
    if (!stats?.characters) continue;
    const campaignName = campaigns[i].name || "Unknown";

    Object.values(stats.characters).forEach(char => {
      const name = char.name || "Unknown";
      const img = char.portrait || null;

      characters.push({ name, campaign: campaignName, campaignSlug: campaigns[i].slug, slug: char.slug, image: img });
      if (char.name && char.portrait) portraitMap[char.name] = char.portrait;

      const dmg = char.totalDamage || 0;
      const heal = char.totalHealing || 0;
      const cc = char.totalCC || 0;
      const dmgTaken = char.totalDamageTaken || 0;
      const nat20 = char.totalNat20 || 0;
      const nat1 = char.totalNat1 || 0;
      totalDamage += dmg; totalHealing += heal; totalCC += cc;
      totalDamageTaken += dmgTaken; totalNat20 += nat20; totalNat1 += nat1;
      if (dmg > topDamage.value) topDamage = { name, value: dmg, image: img };
      if (heal > topHealing.value) topHealing = { name, value: heal, image: img };
      if (cc > topCC.value) topCC = { name, value: cc, image: img };
      if (dmgTaken > topDamageTaken.value) topDamageTaken = { name, value: dmgTaken, image: img };
      if (nat20 > topNat20.value) topNat20 = { name, value: nat20, image: img };
      if (nat1 > topNat1.value) topNat1 = { name, value: nat1, image: img };

      (char.classes || []).forEach(c => {
        const cls = (c.class || "").trim().toLowerCase();
        const sub = (c.subclass || "").trim().toLowerCase();
        const key = `${name.toLowerCase()}-${cls}`;

        if (cls) {
          if (!classMap[cls]) classMap[cls] = { count: 0, levels: 0 };
          if (!seen.has(key)) { classMap[cls].count++; seen.add(key); }
          classMap[cls].levels += c.level || 0;
        }

        if (sub && sub !== "null") {
          const label = `${sub} (${cls})`;
          const sk = `${name.toLowerCase()}-${label}`;
          if (!subclassMap[label]) subclassMap[label] = { count: 0, levels: 0 };
          if (!seen.has(sk)) { subclassMap[label].count++; seen.add(sk); }
          subclassMap[label].levels += c.level || 0;
        }
      });
    });
  }

  if (!topDamage.image) topDamage.image = portraitMap[topDamage.name] || null;
  if (!topHealing.image) topHealing.image = portraitMap[topHealing.name] || null;
  if (!topCC.image) topCC.image = portraitMap[topCC.name] || null;
  if (!topDamageTaken.image) topDamageTaken.image = portraitMap[topDamageTaken.name] || null;
  if (!topNat20.image) topNat20.image = portraitMap[topNat20.name] || null;
  if (!topNat1.image) topNat1.image = portraitMap[topNat1.name] || null;

  return { campaigns, characters, stats: { totalDamage, totalHealing, totalCC, topDamage, topHealing, topCC, totalDamageTaken, totalNat20, totalNat1, topDamageTaken, topNat20, topNat1 }, classes: { classMap, subclassMap }, battles };
}

async function renderAllTimeStats() {

  const data = await loadAllTimeData();

  const { campaigns, characters, stats, classes, battles } = data;

campaigns.sort((a, b) =>
  b.battles - a.battles
);

document.getElementById("alltime-campaigns").innerHTML =
  campaigns.map(c => `
    <div class="stat-item">
      <span>${c.name}</span>
      <span>Number of battles: ${c.battles}</span>
    </div>
  `).join("");

// sort by campaign, then name
characters.sort((a, b) =>
  a.campaign.localeCompare(b.campaign) ||
  a.name.localeCompare(b.name)
);

const groupedChars = {};

characters.forEach(char => {
  if (!groupedChars[char.campaign]) {
    groupedChars[char.campaign] = [];
  }
  groupedChars[char.campaign].push(char);
});

const charHTML = Object.entries(groupedChars)
  .map(([campaign, chars]) => `
    <details class="campaign-section">
      <summary class="campaign-header">${campaign}</summary>

      ${chars.map(char => `
        <div class="stat-item stat-character clickable" onclick="window.location.href='Chronicles_character_stats.html#campaign/${char.campaignSlug}/${char.slug}'">
          ${
            char.image
              ? `<img class="stat-portrait" src="${normalizeImageSrc(char.image)}" loading="lazy">`
              : ""
          }
          <span>${char.name}</span>
        </div>
      `).join("")}
    </details>
  `).join("");

document.getElementById("alltime-characters").innerHTML = charHTML;
  // Window 1
document.getElementById("alltime-stats").innerHTML = `
  ${renderTopStat("Damage", Math.round(stats.totalDamage), stats.topDamage)}
  ${renderTopStat("Healing", Math.round(stats.totalHealing), stats.topHealing)}
  ${renderTopStat("CC", Math.round(stats.totalCC), stats.topCC)}
  ${renderTopStat("Damage Taken", Math.round(stats.totalDamageTaken), stats.topDamageTaken)}
  ${renderTopStat("Nat 20s", Math.round(stats.totalNat20), stats.topNat20)}
  ${renderTopStat("Nat 1s", Math.round(stats.totalNat1), stats.topNat1)}
`;

  // Window 2
  const classHTML = Object.entries(classes.classMap)
    .map(([k,v]) => `
  <div class="stat-item">
    <span>${capitalizeWords(k)}</span>
    <span>${v.count} (Level ${v.levels})</span>
  </div>
`)
    .join("");

  const subclassHTML = Object.entries(classes.subclassMap)
    .map(([k,v]) => `
  <div class="stat-item">
    <span>${capitalizeWords(k)}</span>
    <span>${v.count} (Level ${v.levels})</span>
  </div>
`)
    .join("");

window.__classData = Object.entries(classes.classMap);
window.__subclassData = Object.entries(classes.subclassMap);
window.__classSort = { field: 'levels', dir: 'desc' };
window.__subclassSort = { field: 'levels', dir: 'desc' };

document.getElementById("alltime-classes").innerHTML =
  renderClassRows(window.__classData, 'levels', 'desc');

document.getElementById("alltime-subclasses").innerHTML =
  renderClassRows(window.__subclassData, 'levels', 'desc');
  // Window 3
  battles.forEach((b, i) => {
  b._index = i;
});

const groupedBattles = {};

battles.forEach(b => {
 const slug =
  b.campaignSlug ||
  b.campaign?.toLowerCase().trim() ||
  "unknown";

  if (!groupedBattles[slug]) {
    groupedBattles[slug] = {
      name: b.campaign,
      battles: []
    };
  }

  groupedBattles[slug].battles.push(b);
});

const sortedGroups = Object.values(groupedBattles).sort(
  (a, b) => b.battles.length - a.battles.length
);

sortedGroups.forEach(group => {
  group.battles.sort((a, b) =>
    a.name.localeCompare(b.name)
  );
});

const battleHTML = sortedGroups
  .map(group => `
      <details class="campaign-section">
        <summary class="campaign-header">${group.name}</summary>

        ${group.battles.map(b => `
          <div class="stat-item clickable" onclick="window.location.href='Chronicles_previous_battles.html#battle/${b.campaignSlug}/${b.battleSlug}'">
            <span>${b.name}</span>
          </div>
        `).join("")}
      </details>
    `)
    .join("");

document.getElementById("alltime-battles").innerHTML = battleHTML;
    
}
document.addEventListener("DOMContentLoaded", () => {
  if (document.querySelector(".all-time-container")) {
    renderAllTimeStats();
  }
});
function renderClassRows(entries, field, dir) {
  const sorted = [...entries].sort((a, b) => {
    if (field === 'class' || field === 'subclass') {
      return dir === 'asc' ? a[0].localeCompare(b[0]) : b[0].localeCompare(a[0]);
    }
    return dir === 'desc' ? b[1][field] - a[1][field] : a[1][field] - b[1][field];
  });
  return sorted.map(([k, v]) => `
    <div class="stat-item-3col">
      <span>${capitalizeWords(k)}</span>
      <span>${v.count}</span>
      <span>${v.levels}</span>
    </div>
  `).join('');
}
function sortClasses(field) {
  const s = window.__classSort;
  if (s.field === field) {
    s.dir = s.dir === 'asc' ? 'desc' : 'asc';
  } else {
    s.field = field;
    s.dir = field === 'class' ? 'asc' : 'desc';
  }
  document.getElementById('alltime-classes').innerHTML =
    renderClassRows(window.__classData, s.field, s.dir);
}
function sortSubclasses(field) {
  const s = window.__subclassSort;
  if (s.field === field) {
    s.dir = s.dir === 'asc' ? 'desc' : 'asc';
  } else {
    s.field = field;
    s.dir = field === 'subclass' ? 'asc' : 'desc';
  }
  document.getElementById('alltime-subclasses').innerHTML =
    renderClassRows(window.__subclassData, s.field, s.dir);
}
async function getAllCharactersWithCampaign() {

  const battles = await loadAllBattles();

  const campaigns = [
    ...new Set(
      battles.map(b => b.campaignSlug)
    )
  ];

  const characters = [];

  for (const slug of campaigns) {

    const stats =
      await loadCampaignStats(slug);

    if (!stats?.characters) continue;

    Object.values(stats.characters).forEach(char => {

      characters.push({
        name: char.name,
        campaign: stats.campaign || formatName(slug),
        image: char.portrait || null
      });

    });
  }

  return characters;
}
