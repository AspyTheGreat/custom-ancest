const timelineData = {
  Infinitum: [
    { name: "The Wish of Death", url: "The_Wish_of_death.html" },
    { name: "Infinitum", url: "Infinitumcamp.html" },
    { name: "The Plane Shift Conundrum", url: "The_Planeshift_Conundrum.html" },
    { name: "Redo of Wizard", url: "Redo_of_Wizard.html" },
    { name: "Ascension of Vecna 1: The Gith in the Sun", url: "Ascension_of_Vecna_1.html" },
    { name: "The Lost Pearl of Luscany", url: "The_Lost_Pearl_of_Luscany.html" },
    { name: "Ascension of Vecna 2: The Rites of Apotheosis", url: "Ascension_of_Vecna_2.html" },
    { name: "the Boros Legionnaire", url: "The_Boros_Legionnair.html" },
    { name: "Dawn Cataclysm", url: "Dawn_cataclysm.html" },
    { name: "The Break of Dawn", url: "The_Break_of_Dawn.html" },
    { name: "Vecna's Boys: Quenching the Wish", url: "Vecna's_Boys.html" },
    { name: "At Hell's Gate : The Styxian Serpent", url: "At_Hell's_Gate.html" },
    { name: "Heart of The Styx", url: "Heart_of_The_Styx.html" }
  ],
  Tolivric: [
    { name: "Jorrid", url: "Jorrid.html" },
    { name: "Jorrid 2", url: "Jorrid_2.html" },
    { name: "On Rails", url: "On_rails.html" },
    { name: "Coast is Clear", url: "Coast_Is_Clear.html" },
    { name: "Foray of Fable", url: "Foray_of_Fable.html" },
    { name: "Paths Less Travelled", url: "Paths_Less_Travelled.html" },
    { name: "Lynhowen's Last Lineage", url: "Lynhowens_Last_Lineage.html" },
    { name: "Turning Seasons", url: "Turning_Seasons.html" },
    { name: "Sha'terra: The 11th Wave", url: "Shaterra.html" },
    { name: "The Siege of Torr Myrdmal", url: "The_siege_of_Torr_Myrdmal.html" },
    { name: "Project Zomboid", url: "Project_zomboid.html" }
  ],
  Epalux: [
    { name: "Trauerspiel", url: "Trauerspiel.html" },
    { name: "The Hiest", url: "The_hiest.html" },
    { name: "Echoes From the Deep", url: "Echoes_From_the_past.html" },
    { name: "Trials of Trusth", url: "Trials_of_Truth.html" }
  ],
  Convulux: [
    { name: "Theron's Games", url: "Therons_games.html" },
    { name: "The Lost Tomb of Arkhanis", url: "The_Lost_tomb_of_Arkhanis_1.html" },
    { name: "Into the wilds", url: "Into_the_wilds.html" },
    { name: "The Tomb of Arkhanis", url: "The_Lost_tomb_of_Arkhanis_2.html" }
  ],
  Ravenfall: [
    { name: "Ravenfall", url: "Ravenfall.html" },
    { name: "Ravenfall Returns", url: "Ravenfall_returns.html" },
    { name: "Sands of Aranie", url: "Sands_of_aranie.html" },
    { name: "Cerebrus Must Fall", url: "Cerberus_must_fall.html" },
    { name: "The Initial Wishes", url: "The_Initial_wishes.html" },
    { name: "Hell's Gate", url: "Hells_gate.html" }
  ]
};

function openTimeline(worldName) {
  const panel = document.getElementById("timelinePanel");
  const overlay = document.getElementById("timelineOverlay");

  const data = timelineData[worldName] || [];

  panel.innerHTML = `
    <h2>${worldName} Timeline</h2>
    <div class="timeline-line">
      <div class="timeline-start"></div>
      ${data.map((e, i) => {
        const isLeft = i % 2 === 0;
        return `
          <div class="timeline-event">
            <div class="event-row">
              <div class="tile-side">${isLeft ? `<a href="${e.url}" class="timeline-tile">${e.name}</a>` : ''}</div>
              <div class="connector"></div>
              <div class="tile-side">${!isLeft ? `<a href="${e.url}" class="timeline-tile">${e.name}</a>` : ''}</div>
            </div>
            <div class="event-dot"></div>
          </div>
        `;
      }).join("")}
      <div class="timeline-end"></div>
    </div>
  `;

  panel.classList.remove("hidden");
  overlay.classList.remove("hidden");

  setTimeout(() => {
    panel.classList.add("open");
    adjustConnectors();
  }, 50);
}

function adjustConnectors() {
  const events = document.querySelectorAll(".timeline-event");
  events.forEach(event => {
    const row = event.querySelector(".event-row");
    const connector = row.querySelector(".connector");
    const firstSide = row.children[0];
    const lastSide = row.children[2];
    const rowWidth = row.offsetWidth;
    if (!rowWidth) return;
    const dotOffset = 9;
    const center = rowWidth / 2;
    const events = Array.from(event.parentElement.children).filter(c => c.classList.contains("timeline-event"));
    const isEven = events.indexOf(event) % 2 === 0;
    if (isEven) {
      const tileRight = firstSide.offsetLeft + firstSide.offsetWidth;
      const connLeft = Math.max(tileRight, 0);
      const connRight = center - dotOffset;
      const connWidth = connRight - connLeft;
      if (connWidth > 0) {
        connector.style.left = connLeft + "px";
        connector.style.width = connWidth + "px";
      }
    } else {
      const tileLeft = lastSide.offsetLeft;
      const connLeft = center + dotOffset;
      const connRight = Math.min(tileLeft, rowWidth);
      const connWidth = connRight - connLeft;
      if (connWidth > 0) {
        connector.style.left = connLeft + "px";
        connector.style.width = connWidth + "px";
      }
    }
  });
}

function closeTimeline() {
  const panel = document.getElementById("timelinePanel");
  const overlay = document.getElementById("timelineOverlay");

  panel.classList.remove("open");

  setTimeout(() => {
    panel.classList.add("hidden");
    overlay.classList.add("hidden");
  }, 300);
}

document.addEventListener("DOMContentLoaded", () => {
  const overlay = document.getElementById("timelineOverlay");
  if (overlay) {
    overlay.addEventListener("click", closeTimeline);
  }
});
