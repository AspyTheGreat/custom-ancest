

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

function logGroup(title, fn) {
  if (!DEBUG) return fn();
  console.group(`[DEBUG] ${title}`);
  try {
    fn();
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
        div.className = "world-card clickable";

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
function openBattle(url) {
  log("Opening battle in new tab:", url);
  window.open(url, "_blank");
}
async function loadBattles(campaignPath) {
  container.innerHTML = "Loading battles...";

  logGroup(`loadBattles(${campaignPath})`, async () => {
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

            // 🔧 Adjust this if your structure differs
            const rawTimestamp = json.timestamp || json.date || 0;

            const parsedTime = new Date(json.timestamp).getTime();

           return {
  file,
  timestamp: isNaN(parsedTime) ? 0 : parsedTime
};
          } catch (err) {
            logError(`Failed to load JSON for ${file.name}`, err);
            return {
              file,
              timestamp: 0
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
      battlesWithData.forEach(({ file, timestamp }) => {
        log("Rendering battle:", file.name, "| timestamp:", timestamp);

        const div = document.createElement("div");
        div.className = "world-card clickable";

        const battleName = file.name.replace(".json", "");
        div.innerText = formatName(battleName);

        div.onclick = () => {
          log("Opening battle:", file.download_url);
          openBattle(file.download_url);
        };

        container.appendChild(div);
      });

      // ⚠️ Empty state
      if (battlesWithData.length === 0) {
        log("⚠️ No battles found");
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

    <h2>${data.displayName || data.battle}</h2>
    <p style="color:#aaa;">
      ${data.campaign} • ${date} • ${data.rounds} round(s)
    </p>

    <div class="box">
      <h3>Party Totals</h3>
      <p>Damage: <b>${data.partyTotals.damage}</b></p>
      <p>Healing: <b>${data.partyTotals.healing}</b></p>
      <p>CC: <b>${data.partyTotals.cc}</b></p>
    </div>

    <div class="box">
      <h3>Characters</h3>
      <div id="characters"></div>
    </div>

    <div class="box">
      <h3>Rounds</h3>
      <div id="rounds"></div>
    </div>
  `;

  container.querySelector(".backBtn").onclick = loadCampaigns;

  renderCharacters(data.characters);
  renderRounds(data.roundsBreakdown);
}

function renderCharacters(characters) {
  const containerDiv = document.getElementById("characters");

  characters.forEach(char => {
    const card = document.createElement("div");
    card.className = "world-card";

    card.innerHTML = `
      <h4>${char.name.trim()}</h4>
      <p style="color:#aaa;">${char.levelClass}</p>

      <p>Damage: <b>${char.stats.damage}</b></p>
      <p>Healing: <b>${char.stats.healing}</b></p>
      <p>Actions: ${char.stats.actions} | Bonus: ${char.stats.bonus}</p>

      <p>Crits: ${char.stats.nat20} | Fumbles: ${char.stats.nat1}</p>
    `;

    containerDiv.appendChild(card);
  });
}

function renderRounds(rounds) {
  const containerDiv = document.getElementById("rounds");

  rounds.forEach(r => {
    const div = document.createElement("div");
    div.className = "world-card";

    div.innerHTML = `
      <h4>Round ${r.round}</h4>
      <p>Total Damage: <b>${r.totalDamage}</b></p>

      <div style="margin-top:8px;">
        ${r.players.map(p => `
          <div style="margin-bottom:6px;">
            <b>${p.name.trim()}</b>: ${p.damage} dmg
          </div>
        `).join("")}
      </div>
    `;

    containerDiv.appendChild(div);
  });
}