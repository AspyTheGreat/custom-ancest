

function showChronicles() {
  hideAll();
  document.getElementById("chronicles").style.display = "block";
}

function showHome() {
  hideAll();
  document.getElementById("home").style.display = "flex";
}




function hideAll() {
  document.getElementById("home").style.display = "none";
  document.getElementById("chronicles").style.display = "none";
}

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

function renderBattleUI(data) {
  const date = new Date(data.timestamp).toLocaleString();

  container.innerHTML = `
    <div class="backBtn">← Back</div>

    <h2>${data.displayName}</h2>
    <p class="meta">
      ${data.campaign} • ${date} • ${data.roundCount} rounds
    </p>

    ${renderImage(data.images?.start)}

    <div class="grid-3">
      <div class="box stat-box">
        <h3>Damage</h3>
        <span>${data.partyTotals.damage}</span>
      </div>
      <div class="box stat-box">
        <h3>Healing</h3>
        <span>${data.partyTotals.healing}</span>
      </div>
      <div class="box stat-box">
        <h3>CC</h3>
        <span>${data.partyTotals.cc}</span>
      </div>
    </div>

    <div class="box">
      <h3>Characters</h3>
      <div id="characters" class="char-grid"></div>
    </div>

    <div class="box">
      <h3>Rounds</h3>
      <div id="rounds"></div>
    </div>

    ${renderImage(data.images?.end)}
  `;

  container.querySelector(".backBtn").onclick = loadCampaigns;

  renderCharacters(data.characters || []);
  renderRounds(data.roundSummaries || []);
}

function renderCharacters(characters) {
  const el = document.getElementById("characters");
  el.innerHTML = "";

  characters.forEach(char => {
    const accuracy = char.stats.attacks.total
      ? Math.round((char.stats.attacks.hit / char.stats.attacks.total) * 100)
      : 0;

    const card = document.createElement("div");
    card.className = "char-card";

    card.innerHTML = `
      ${char.portrait ? `<img class="char-portrait" src="${char.portrait}">` : ""}

      <h4>${char.name}</h4>
      <span class="sub">${char.levelClass}</span>

      <div class="char-main-stats">
        <div><b>${char.stats.damage}</b><label>DMG</label></div>
        <div><b>${char.stats.healing}</b><label>HEAL</label></div>
        <div><b>${char.stats.cc}</b><label>CC</label></div>
      </div>

      <div class="char-details">
        <div>Actions: ${char.stats.actionsTotal}</div>
        <div>bonusActions: ${char.stats.bonusActionsTotal}</div>
        <div>Reactions: ${sumObj(char.stats.reactions)}</div>
        <div>Accuracy: ${accuracy}%</div>
        <div>Damage Taken: ${char.stats.damageTaken}</div>
        <div>Crits: ${char.stats.nat20} / Fails: ${char.stats.nat1}</div>
      </div>
    `;

    el.appendChild(card);
  });
}

function sumObj(obj = {}) {
  return Object.values(obj).reduce((a, b) => a + b, 0);
}

function renderRounds(rounds) {
  const el = document.getElementById("rounds");
  el.innerHTML = "";

  rounds.forEach(r => {
    const div = document.createElement("div");
    div.className = "round-card";

    div.innerHTML = `
      <div class="round-header">
        <h4>Round ${r.round}</h4>
        <div class="round-totals">
          <span>${r.totals.damage} dmg</span>
          <span>${r.totals.healing} heal</span>
          <span>${r.totals.cc} cc</span>
        </div>
      </div>

      <div class="round-players">
        ${r.players.map(p => `
          <div class="round-player">
            <span>${p.name}</span>
            <span>${p.damage} dmg</span>
          </div>
        `).join("")}
      </div>
    `;

    el.appendChild(div);
  });
}
