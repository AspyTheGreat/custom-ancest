
const files = [

  "../../Character Sheets/Convulux/The Lost Tomb of Arkhanis/Lady Lavender.json",

  "../../Character Sheets/Convulux/The Lost Tomb of Arkhanis/Xue Yijun.json",

  "../../Character Sheets/Convulux/The Lost Tomb of Arkhanis/Sovelias Xalixar.json",

  "../../Character Sheets/Convulux/The Lost Tomb of Arkhanis/Sogark Okatir.json",

  "../../Character Sheets/Convulux/The Lost Tomb of Arkhanis/Maximillion.json"

];

const characterImages = {
  "Lady Lavender": "../../assets/Character_images/Lost_Tomb_of_Arkhanis/lavender.jpg",

  "Maximillion Cardcastle": "../../assets/Character_images/Lost_Tomb_of_Arkhanis/Max.jpg",

  "Sogark Okatir": "../../assets/Character_images/Lost_Tomb_of_Arkhanis/sogark.png",

  "Sovelias Xalixar (aka WeedMan)": "../../assets/Character_images/Lost_Tomb_of_Arkhanis/sovelias.jpg",

  "Xue Yijun": "../../assets/Character_images/Lost_Tomb_of_Arkhanis/Xue.webp"
};
let characters = [];

let currentCharacterIndex = 0;

async function loadCharacters() {

  const container =
    document.getElementById("characters-container");

  characters = [];

  for (const file of files) {

    const response =
      await fetch(file);

    const data =
      await response.json();

    const character =
      parseCharacter(data);

    characters.push(character);
  }

  renderCurrentCharacter();
}
const campaignData = {

  synopsis: `
    <h2>Campaign Synopsis</h2>

    <p>
      The Lost Tomb of Arkhanis lies buried
      beneath cursed sands.
    </p>
  `,

  characters: `
    <h2>Characters</h2>

    <div id="characters-container"></div>
  `,

  npcs: `
    <h2>NPCs Encountered</h2>

    <p>NPC content here.</p>
  `,

  discoveries: `
    <h2>Discoveries</h2>

    <p>Discoveries here.</p>
  `,

  notes: `
    <h2>Player Notes</h2>

    <p>Notes here.</p>
  `
};

function loadSection(section) {

  const panel =
    document.getElementById("content-panel");

  if (campaignData[section]) {

    panel.innerHTML =
      campaignData[section];

    // LOAD CHARACTER CARDS
    if (section === "characters") {

      loadCharacters();
      
    }

  } else {

    panel.innerHTML =
      "<p>Section not found.</p>";
  }
  
}
function renderCurrentCharacter() {

  const container =
    document.getElementById("characters-container");

  container.innerHTML = `

    <div class="carousel-wrapper">

      <div class="carousel-character">
        ${renderCharacter(
          characters[currentCharacterIndex]
        )}
      </div>

      <div class="carousel-controls">

        <div
          class="nav-tile"
          onclick="changeCharacter(-1)">
          ←
        </div>

        <div
          class="nav-tile"
          onclick="changeCharacter(1)">
          →
        </div>

      </div>

    </div>
  `;

  setTimeout(applyCharacterTheme, 100);
}
function changeCharacter(direction) {

  currentCharacterIndex += direction;

  if (currentCharacterIndex < 0) {

    currentCharacterIndex =
      characters.length - 1;
  }

  if (
    currentCharacterIndex >=
    characters.length
  ) {

    currentCharacterIndex = 0;
  }

  renderCurrentCharacter();
}
function applyCharacterTheme() {

  const img =
    document.getElementById("character-portrait");

  const card =
    document.getElementById("character-card");

  if (!img || !card) return;

  const colorThief = new ColorThief();

  if (img.complete) {

    /* GET MULTIPLE COLORS */
    const palette =
      colorThief.getPalette(img, 4);

    /* PRIMARY = BORDER COLOR */
let primary = palette[0];

/* GRADIENT COLORS */
let color2 = palette[1] || palette[0];
let color3 = palette[2] || palette[0];
let color4 = palette[3] || palette[0];

/* BRIGHTEN BORDER COLOR */
primary =
  primary.map(c => Math.min(255, c + 50));

/* RGB STRINGS */
const primaryRGB =
  `rgb(${primary[0]}, ${primary[1]}, ${primary[2]})`;

const color2RGB =
  `rgb(${color2[0]}, ${color2[1]}, ${color2[2]})`;

const color3RGB =
  `rgb(${color3[0]}, ${color3[1]}, ${color3[2]})`;

const color4RGB =
  `rgb(${color4[0]}, ${color4[1]}, ${color4[2]})`;

/* BORDER */
card.style.border =
  `4px solid ${primaryRGB}`;

/* GLOW */
card.style.boxShadow =
`
0 0 12px ${primaryRGB},
0 0 30px rgba(
  ${primary[0]},
  ${primary[1]},
  ${primary[2]},
  0.9
)
`;

/* STORE CSS VARIABLE */
card.style.setProperty(
  "--theme-color",
  primaryRGB
);

/* ANIMATION */
card.style.animation =
  "pulseGlow 2s infinite";

/* KING YNA STYLE GRADIENT */
card.style.background =
`
linear-gradient(
  to right,
  ${color2RGB},
  ${color3RGB},
  ${color4RGB}
)
`;

    card.style.setProperty(
  "--theme-color",
  rgb
);

card.style.animation =
  "pulseGlow 2s infinite";  

    /* GLOW */
    card.style.boxShadow =
     `
       0 0 10px rgba(
    ${primary[0]},
    ${primary[1]},
    ${primary[2]},
      0.8
      ),

0 0 25px rgba(
  ${primary[0]},
  ${primary[1]},
  ${primary[2]},
  0.45
)
`;

    /* DARK CARD BACKGROUND */
    card.style.background =
      "rgba(15,15,20,0.96)";

    
  }
}