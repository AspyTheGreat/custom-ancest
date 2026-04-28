// =========================
// ⚙️ CONFIG (EDIT THIS)
// =========================
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

const GITHUB_OWNER = "AspyTheGreat";
const GITHUB_REPO = "custom-ancest";

const container = document.getElementById("content");
if (!container) throw new Error("#content not found");

// =========================
// 📁 LOAD CAMPAIGNS
// =========================
async function loadCampaigns() {
  container.innerHTML = "Loading campaigns...";

  logGroup("loadCampaigns()", async () => {
    try {
      const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/battles?ref=main`;
      log("Fetching:", url);

      const res = await fetch(url);

      log("Response status:", res.status);

      if (!res.ok) {
        throw new Error(`GitHub API error: ${res.status}`);
      }

      const data = await res.json();

      log("Raw data:", data);

      if (!Array.isArray(data)) {
        throw new Error("Unexpected API response (not an array)");
      }

      const campaigns = data
        .filter(item => item.type === "dir")
        .sort((a, b) => a.name.localeCompare(b.name));

      log("Filtered campaigns:", campaigns);

      container.innerHTML = "<h3>Campaigns</h3>";

      campaigns.forEach(c => {
        log("Creating campaign card:", c.name, "| path:", c.path);

        const div = document.createElement("div");
        div.className = "world-card-previous-battles clickable";

        div.innerText = formatName(c.name);

        div.onclick = () => {
          log("Clicked campaign:", c.name, "| path:", c.path);
          loadBattles(c.path);
        };

        container.appendChild(div);
      });

      log("Total campaigns rendered:", campaigns.length);

    } catch (err) {
      logError("loadCampaigns", err);
      container.innerHTML = "Failed to load campaigns.";
    }
  });
}

// =========================
// 📜 LOAD BATTLES
// =========================

async function loadBattles(campaignPath) {
  container.innerHTML = "Loading battles...";

  await logGroup(`loadBattles(${campaignPath})`, async () => {
    try {
      const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${campaignPath}?ref=main`;
      log("Fetching:", url);

      const res = await fetch(url);
      log("Response status:", res.status);

      if (!res.ok) {
        throw new Error(`GitHub API error: ${res.status}`);
      }

      const data = await res.json();
      log("Raw data:", data);

      if (!Array.isArray(data)) {
        throw new Error("Unexpected API response (not an array)");
      }

      // ✅ Filter valid JSON files
      const battleFiles = data.filter(file =>
        file.type === "file" &&
        file.name.toLowerCase().endsWith(".json")
      );

      log("Battle files found:", battleFiles);

      // ✅ Fetch each battle JSON to extract timestamp
      const battlesWithData = await Promise.all(
  battleFiles.map(async (file) => {
    try {
      const res = await fetch(file.download_url);
      const json = await res.json();

      const parsedTime = new Date(json.timestamp).getTime();

      return {
        file,
        timestamp: isNaN(parsedTime) ? 0 : parsedTime,
        startImage: json.images?.start || null   // ✅ ADD THIS LINE
      };
    } catch (err) {
      logError(`Failed to load JSON for ${file.name}`, err);
      return {
        file,
        timestamp: 0,
        startImage: null // ✅ also here
      };
    }
  })
);

      // ✅ Sort newest first
      battlesWithData.sort((a, b) => b.timestamp - a.timestamp);

      log("Sorted battles:", battlesWithData);

      // ✅ Render header + back button
      const campaignName = campaignPath.split("/").pop();

      container.innerHTML = `
        <div class="backBtn">← Back</div>
        <h3>${formatName(campaignName)}</h3>
      `;

      container.querySelector(".backBtn").onclick = () => {
        log("Back button clicked");
        loadCampaigns();
      };

      // ✅ Render battles
      battlesWithData.forEach(({ file, timestamp, startImage }) => {
  const div = document.createElement("div");
  div.className = "world-card-previous-battles clickable";

  if (startImage) {
    div.style.backgroundImage =
      "linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.85)), url('" + startImage + "')";
  } else {
    div.style.backgroundColor = "#181818";
  }

  const battleName = file.name.replace(".json", "");
  div.innerText = formatName(battleName);

  const battleUrl = file.download_url; // ✅ fix

  div.onclick = () => {
    openBattle(battleUrl);
  };

  container.appendChild(div);
});

// ✅ Empty state OUTSIDE loop
if (battlesWithData.length === 0) {
  const empty = document.createElement("div");
  empty.innerText = "No battles found.";
  container.appendChild(empty);
}

      log("Total battles rendered:", battlesWithData.length);

    } catch (err) {
      logError("loadBattles", err);
      container.innerHTML = "Failed to load battles.";
    }
  });
}
// =========================
// 🔗 OPEN BATTLE
// =========================
function openBattle(url) {
  loadBattleView(url);
}
// =========================
// 🧼 FORMAT NAMES
// =========================
function renderImage(base64) {
  if (!base64) return "";

  // detect type (jpeg vs png)
  const isPNG = base64.startsWith("iVBOR");
  const type = isPNG ? "image/png" : "image/jpeg";

  return `
    <div class="battle-image">
      <img loading="lazy" src="data:${type};base64,${base64}" />
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

    renderBattleUI(data);

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

function renderBattleUI(data) {
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

  container.querySelector(".backBtn").onclick = loadCampaigns;

  renderRounds(data.roundSummaries || []);
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
  if (!character.image) {
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

    img.src = character.image;
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

  const savesFailed = savesForced - savesSucceeded;

  const saveRate = savesForced
    ? Math.round((savesFailed / savesForced) * 100)
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

function renderRounds(rounds) {
  console.log("Rounds data:", rounds);

  const el = document.getElementById("rounds");
  el.innerHTML = "";

  rounds.forEach(r => {
    const div = document.createElement("div");
    div.className = "round-card";

    div.innerHTML = `
      <div class="round-header">
        <h4>Round ${r.round}</h4>

        <div class="round-totals">
          <span>${r.totals?.damage ?? 0} dmg</span>
          <span>${r.totals?.healing ?? 0} heal</span>
          <span>${r.totals?.cc ?? 0} cc</span>
          <span>${r.totals?.averageDamage ?? 0} avg</span>
        </div>
      </div>

      <div class="round-players">
        ${(r.players || []).map(p => `
          ${(r.players || []).map(p => {

  const attacksMade =
    p.attacks?.total ??
    p.attacksMade ??
    0;

  const attacksHit =
    p.attacks?.hit ??
    p.attacksHit ??
    0;

  const accuracy = attacksMade
    ? Math.round((attacksHit / attacksMade) * 100)
    : 0;

  // Offensive saves
  const savesForced =
    p.saves?.forced ??
    p.savesForced ??
    0;

  const savesSucceeded =
    p.saves?.succeeded ??
    p.savesSucceeded ??
    0;

  // Potency = targets failing saves
  const potency = savesForced
    ? Math.round(((savesForced - savesSucceeded) / savesForced) * 100)
    : 0;

  // Defensive targeting
  const defense = p.defense || {};

  const timesTargeted =
    (defense.attacksTaken || 0) +
    (defense.savesMade || 0);

  return `
    <div class="round-player expanded">

      <div class="round-player-name">
        ${p.name}
      </div>

      <div class="round-player-stats">

        <span>${p.damage ?? 0} dmg</span>

        <span>${p.healing ?? 0} heal</span>

        <span>${p.cc ?? 0} cc</span>

        <span>${timesTargeted} targeted</span>

       <span>
  Accuracy:
  ${attacksHit}/${attacksMade}
  (${accuracy}%)
</span>

<span>
  Potency:
  ${savesForced - savesSucceeded}/${savesForced}
  (${potency}%)
</span>

      </div>

    </div>
  `;
}).join("")}
        `).join("")}
      </div>
    `;

    el.appendChild(div);
  });
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

const savesFailed = savesForced - savesSucceeded;

const saveRate = savesForced
  ? Math.round((savesFailed / savesForced) * 100)
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

          <div><b>Damage:</b> ${stats.damage}</div>
          <div><b>Healing:</b> ${stats.healing}</div>
          <div><b>CC:</b> ${stats.cc}</div>
          <div><b>Damage Taken:</b> ${stats.damageTaken}</div>

          <div><b>Actions:</b> ${stats.actionsTotal}</div>
          <div><b>Bonus Actions:</b> ${stats.bonusActionsTotal}</div>
          <div><b>Reactions:</b> ${sumObj(stats.reactions)}</div>

          <div><b>Accuracy:</b> ${
            stats.attacks?.total
              ? Math.round((stats.attacks.hit / stats.attacks.total) * 100)
              : 0
          }%</div>

          <div><b>Attacks Made:</b> ${attacksMade}</div>

<div><b>DPR:</b> ${dpr}</div>

<div><b>Potency:</b> ${saveRate}%</div>
<div><b>Saves Forced:</b> ${savesForced}</div>

<div><b>Natural 20s:</b> ${stats.nat20}</div>
<div><b>Natural 1s:</b> ${stats.nat1}</div>

          <div><b>Attacks Taken:</b> ${defense.attacksTaken}</div>
          <div><b>Saves Made:</b> ${defense.savesMade}</div>
          <div><b>Times Targeted:</b> ${timesTargeted}</div>

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

  const attacksMade = stats.attacks?.total || 0;
  const attacksHit = stats.attacks?.hit || 0;

  const accuracy = attacksMade
    ? attacksHit / attacksMade
    : 0;

  const savesForced = stats.saves?.forced || 0;
  const savesSucceeded = stats.saves?.succeeded || 0;

  // offensive potency
  const potency = savesForced
    ? (savesForced - savesSucceeded) / savesForced
    : 0;

  // defensive saves
  const savesMade = defense.savesMade || 0;
  const savesPassed = defense.savesSucceeded || 0;

  const saveSuccess = savesMade
    ? savesPassed / savesMade
    : 0;

  // dodges
  const attacksTaken = defense.attacksTaken || 0;
  const attacksDodged = defense.attacksDodged || 0;

  const dodgeRate = attacksTaken
    ? attacksDodged / attacksTaken
    : 0;

  const nat20 = stats.nat20 || 0;
  const nat1 = stats.nat1 || 0;

  // weighted formula
  let luck =
    (
      accuracy * 0.30 +
      potency * 0.25 +
      saveSuccess * 0.20 +
      dodgeRate * 0.15
    ) * 10;

  // nat weighting
  luck += nat20 * 0.15;
  luck -= nat1 * 0.10;

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