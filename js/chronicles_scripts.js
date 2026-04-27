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
  container.innerHTML = "Loading battle...";

  try {
    const res = await fetch(url);
    const data = await res.json();

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
    <div class="stat-box">
  <h3>Party HP</h3>
  <span>${totalFinalHP} / ${totalMaxHP}</span>
  <small>${partyHPPercent}% remaining</small>
</div>
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

  <!-- ✅ LINE CHARTS -->
  <div class="chart-grid line-charts">
    <canvas id="line-damage"></canvas>
    <canvas id="line-healing"></canvas>
    <canvas id="line-cc"></canvas>
    <canvas id="line-targeted"></canvas>
  </div>

    ${renderImage(data.images?.end)}
  `;

  container.querySelector(".backBtn").onclick = loadCampaigns;

  renderRounds(data.roundSummaries || []);
renderPartyBreakdown(data.characters || []);
renderPartyCharts(data.characters || []);
renderPerRoundCharts(data.roundSummaries || [], data.characters || []);
}

function sumObj(obj = {}) {
  return Object.values(obj).reduce((a, b) => a + b, 0);
}

function renderCharacters(characters) {
  const el = document.getElementById("characters");
  el.innerHTML = "";

  characters.forEach(char => {
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
});
}

function renderPerRoundCharts(rounds, characters) {
  if (!rounds.length) return;

  const labels = rounds.map(r => `R${r.round}`);
  const names = characters.map(c => c.name);

  function buildDataset(statKey) {
    return names.map(name => {
      return {
        label: name,
        data: rounds.map(r => {
          const player = (r.players || []).find(p => p.name === name);
          if (!player) return 0;

          if (statKey === "targeted") {
            const d = player.defense || {};
            return (d.attacksTaken || 0) + (d.savesMade || 0);
          }

          return player[statKey] || 0;
        })
      };
    });
  }

  createLine("line-damage", "Damage per Round", labels, buildDataset("damage"));
  createLine("line-healing", "Healing per Round", labels, buildDataset("healing"));
  createLine("line-cc", "CC per Round", labels, buildDataset("cc"));
  createLine("line-targeted", "Targeted per Round", labels, buildDataset("targeted"));
}

function createLine(canvasId, title, labels, datasets) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: datasets.map(d => ({
        label: d.label,
        data: d.data,
        fill: false,
        tension: 0.2
      }))
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: title,
          color: "#fff"
        },
        legend: {
          labels: {
            color: "#aaa"
          }
        }
      },
      scales: {
        x: {
          ticks: { color: "#aaa" }
        },
        y: {
          ticks: { color: "#aaa" }
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
          <div class="round-player">
            <span class="name">${p.name}</span>
            <span class="dmg">${p.damage ?? 0} dmg</span>
          </div>
        `).join("")}
      </div>
    `;

    el.appendChild(div);
  });
}
function renderPartyBreakdown(characters) {
  
  const el = document.getElementById("party-breakdown");
  el.innerHTML = "";

  characters.forEach(char => {
    console.log("CHAR KEYS:", Object.keys(char));
     console.log("CHAR:", char);
    const stats = char.stats || {};
    const defense = stats.defense || {};

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
  hpColor = "#5a0000";
} else if (hpPercent <= 25) {
  hpColor = "#ff0000";
} else if (hpPercent <= 50) {
  hpColor = "#ff9800";
} else if (hpPercent <= 75) {
  hpColor = "#ffeb3b";
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

<div><b>Save Fail Rate:</b> ${saveRate}%</div>
<div><b>Saves Forced:</b> ${savesForced}</div>

<div><b>Natural 20s:</b> ${stats.nat20}</div>
<div><b>Natural 1s:</b> ${stats.nat1}</div>

          <div><b>Attacks Taken:</b> ${defense.attacksTaken}</div>
          <div><b>Saves Made:</b> ${defense.savesMade}</div>
          <div><b>Times Targeted:</b> ${timesTargeted}</div>

        </div>

      </div>

      <div class="party-right">
        <!-- Reserved for advanced analytics -->
      </div>
    `;

    el.appendChild(row);
  });
}
function createPie(canvasId, label, labels, data) {
  const ctx = document.getElementById(canvasId);

  if (!ctx) return;

  new Chart(ctx, {
    type: "pie",
    data: {
      labels: labels,
      datasets: [{
        data: data
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
function renderPartyCharts(characters) {
  const names = characters.map(c => c.name);

  const damage = characters.map(c => c.stats?.damage || 0);
  const healing = characters.map(c => c.stats?.healing || 0);
  const cc = characters.map(c => c.stats?.cc || 0);

  const targeted = characters.map(c => {
    const d = c.stats?.defense || {};
    return (d.attacksTaken || 0) + (d.savesMade || 0);
  });

  createPie("chart-damage", "Damage", names, damage);
  createPie("chart-healing", "Healing", names, healing);
  createPie("chart-cc", "CC", names, cc);
  createPie("chart-targeted", "Targeted", names, targeted);

  <div class="chart-grid">
  <canvas id="line-damage"></canvas>
  <canvas id="line-healing"></canvas>
  <canvas id="line-cc"></canvas>
  <canvas id="line-targeted"></canvas>
</div>
}