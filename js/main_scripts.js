

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
const GITHUB_OWNER = "AspyTheGreat";
const GITHUB_REPO = "custom-ancest";

const container = document.getElementById("content");
if (!container) throw new Error("#content not found");

// =========================
// 📁 LOAD CAMPAIGNS
// =========================
async function loadCampaigns() {
  container.innerHTML = "Loading campaigns...";

  try {
    const res = await fetch(
  `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/battles`
);

if (!res.ok) {
  throw new Error(`GitHub API error: ${res.status}`);
}

const data = await res.json();

    const campaigns = data
  .filter(item => item.type === "dir")
  .sort((a, b) => a.name.localeCompare(b.name));
    
if (!Array.isArray(data)) {
  throw new Error("Unexpected API response");
}

const campaigns = data.filter(item => item.type === "dir");

    container.innerHTML = "<h3>Campaigns</h3>";

    campaigns.forEach(c => {
      const div = document.createElement("div");
      div.className = "world-card clickable";

      div.innerText = formatName(c.name);
      div.onclick = () => loadBattles(c.name);

      container.appendChild(div);
    });

  } catch (err) {
    console.error(err);
    container.innerHTML = "Failed to load campaigns.";
  }
}

// =========================
// 📜 LOAD BATTLES
// =========================
async function loadBattles(campaignSlug) {
  container.innerHTML = "Loading battles...";

  try {
    const res = await fetch(
  `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/battles/${campaignSlug}`
);

if (!res.ok) {
  throw new Error(`GitHub API error: ${res.status}`);
}

const data = await res.json();

if (!Array.isArray(data)) {
  throw new Error("Unexpected API response");
}

    container.innerHTML = `
      <div class="backBtn" onclick="loadCampaigns()">← Back</div>
      <h3>${formatName(campaignSlug)}</h3>
    `;

    data.forEach(file => {
      if (!file.name.endsWith(".json")) return;

      const div = document.createElement("div");
      div.className = "world-card clickable";

      const battleName = file.name.replace(".json", "");

      div.innerText = formatName(battleName);
      div.onclick = () => openBattle(file.download_url);

      container.appendChild(div);
    });

  } catch (err) {
    console.error(err);
    container.innerHTML = "Failed to load battles.";
  }
}

// =========================
// 🔗 OPEN BATTLE
// =========================
function openBattle(url) {
  window.open(url, "_blank");
}

// =========================
// 🧼 FORMAT NAMES
// =========================
function formatName(slug) {
  return slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, l => l.toUpperCase());
}
