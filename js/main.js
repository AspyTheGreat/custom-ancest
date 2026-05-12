const files = [

  "../../Character Sheets/Convulux/The Lost Tomb of Arkhanis/Lady Lavender.json",

  "../../Character Sheets/Convulux/The Lost Tomb of Arkhanis/Xue Yijun.json",

  "../../Character Sheets/Convulux/The Lost Tomb of Arkhanis/Sovelias Xalixar.json",

  "../../Character Sheets/Convulux/The Lost Tomb of Arkhanis/Sogark Okatir.json",

  "../../Character Sheets/Convulux/The Lost Tomb of Arkhanis/Maximillion.json"

];

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

    <div class="character-carousel">

      <button
        class="carousel-btn"
        onclick="changeCharacter(-1)">
        ←
      </button>

      <div class="carousel-character">

        ${renderCharacter(
          characters[currentCharacterIndex]
        )}

      </div>

      <button
        class="carousel-btn"
        onclick="changeCharacter(1)">
        →
      </button>

    </div>
  `;
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
