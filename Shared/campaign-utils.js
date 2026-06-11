let characters = [];
let currentCharacterIndex = 0;
let itemRarityMap = null;

function loadItemRarityMap() {
  if (itemRarityMap) return;
  itemRarityMap = ITEM_RARITY_MAP || {};
}

function normalizeRarity(r) {
  r = (r || "").toLowerCase();
  if (r === "divine arm") return "divine arm";
  if (r === "legendary") return "legendary";
  if (r === "artifact") return "artifact";
  if (r === "very rare") return "very rare";
  if (r === "rare") return "rare";
  if (r === "uncommon") return "uncommon";
  if (r === "common") return "common";
  return "mundane";
}

function lookupItemRarity(name) {
  const key = name.toLowerCase().trim();
  let r = itemRarityMap?.[key];
  if (r) return normalizeRarity(r);
  const words = key.split(" ");
  if (words.length > 1) {
    r = itemRarityMap?.[words.slice(0, -1).join(" ")];
    if (r) return normalizeRarity(r);
    r = itemRarityMap?.[key + " (*)"];
    if (r) return normalizeRarity(r);
  }
  return "mundane";
}

function getRarityColor(rarity) {
  const colors = {
    "divine arm": "#ffd700",
    "artifact": "#ff3b00",
    "legendary": "#1e90ff",
    "very rare": "#ff8c00",
    "rare": "#b388ff",
    "uncommon": "#a09890",
    "common": "#a0a0a0",
    "mundane": "#666666"
  };
  return colors[rarity] || colors.mundane;
}

function loadSection(section) {
  const panel = document.getElementById("content-panel");
  if (campaignData[section]) {
    panel.innerHTML = campaignData[section];
    if (section === "characters") {
      loadCharacters();
    }
  } else {
    panel.innerHTML = "<p>Section not found.</p>";
  }
}

async function loadCharacters() {
  characters = [];
  for (const file of files) {
    try {
      const response = await fetch(file);
      const data = await response.json();
      const character = parseCharacter(data);
      character.items = character.items.map(item => {
        let r = lookupItemRarity(item.lookupName || item.name);
        if (r === "mundane" && item.suffixRarity) r = item.suffixRarity;
        return { ...item, rarity: r };
      });
      characters.push(character);
    } catch (e) {
      console.warn("Could not load character:", file);
    }
  }
  renderCurrentCharacter();
}

loadItemRarityMap();
if (characters.length) {
    characters.forEach(c => {
      c.items = c.items.map(item => {
        let r = lookupItemRarity(item.lookupName || item.name);
        if (r === "mundane" && item.suffixRarity) r = item.suffixRarity;
        return { ...item, rarity: r };
      });
    });
  renderCurrentCharacter();
}

function renderCurrentCharacter() {
  const container = document.getElementById("characters-container");
  if (!container) return;
  if (characters.length === 0) {
    container.innerHTML =
      '<p style="text-align:center;padding:40px;color:#888;">Character data coming soon.</p>';
    return;
  }
  container.innerHTML = `
    <div class="carousel-wrapper">
      <div class="carousel-character">
        ${renderCharacter(characters[currentCharacterIndex])}
      </div>
      <div class="carousel-controls">
        <div class="nav-tile" onclick="changeCharacter(-1)">←</div>
        <div class="nav-tile" onclick="changeCharacter(1)">→</div>
      </div>
    </div>
  `;
  setTimeout(applyCharacterTheme, 100);
}

function changeCharacter(direction) {
  currentCharacterIndex += direction;
  if (currentCharacterIndex < 0) currentCharacterIndex = characters.length - 1;
  if (currentCharacterIndex >= characters.length) currentCharacterIndex = 0;
  renderCurrentCharacter();
}

function applyCharacterTheme() {
  const img = document.getElementById("character-portrait");
  const card = document.getElementById("character-card");
  if (!img || !card) return;
  const colorThief = new ColorThief();
  if (img.complete) {
    const palette = colorThief.getPalette(img, 4);
    let primary = palette[0];
    const color2 = palette[1] || palette[0];
    const color3 = palette[2] || palette[0];
    const color4 = palette[3] || palette[0];
    primary = primary.map(c => Math.min(255, c + 50));
    const primaryRGB = `rgb(${primary[0]}, ${primary[1]}, ${primary[2]})`;
    card.style.border = `4px solid ${primaryRGB}`;
    card.style.boxShadow = `0 0 12px ${primaryRGB}, 0 0 30px rgba(${primary[0]}, ${primary[1]}, ${primary[2]}, 0.9)`;
    card.style.setProperty("--theme-color", primaryRGB);
    card.style.animation = "pulseGlow 2s infinite";
    card.style.background = `linear-gradient(to right, rgb(${color2[0]},${color2[1]},${color2[2]}), rgb(${color3[0]},${color3[1]},${color3[2]}), rgb(${color4[0]},${color4[1]},${color4[2]}))`;
    card.style.setProperty("--glow-from", primaryRGB);
    card.style.setProperty("--glow-to", `rgba(${primary[0]}, ${primary[1]}, ${primary[2]}, 0.3)`);
  }
}
