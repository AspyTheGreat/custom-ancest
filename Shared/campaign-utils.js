let characters = [];
let currentCharacterIndex = 0;

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
      characters.push(character);
    } catch (e) {
      console.warn("Could not load character:", file);
    }
  }
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
