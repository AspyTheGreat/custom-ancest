const timelineData = {
  Infinitum: [
    "The Wish of Death",
    "Infinitum",
    "The Plane Shift Conundrum",
    "Redo of Wizard",
    "Ascension of Vecna 1: The gith in the Sun",
    "The Lost Pearl of Luscany",
    "Ascension of Vecna 2: The Rites of Apotheosis",
    "the Boros Legionnaire",
    "Dawn Cataclysm",
    "The Break of Dawn",
    "Vecna's Boys: Quenching the Wish",
    "At Hell's Gate : The Styxian Serpent",
    "Heart of The Styx"
  ],
  Tolivric: [
    "Jorrid",
    "On Rails",
    "Coast is Clear",
    "Foray of Fable",
    "Paths Less Travelled",
    "Lynhowen's Last Lineage",
    "Turning Seasons",
    "Sha'terra: The 11th Wave"
  ],
  Epalux: [
    "Trauerspiel",
    "The Hiest",
    "Echoes From the Deep",
    "Trials of Trusth"
  ],
  Convulux: [
    "Theron's Games",
    "The Lost Tomb of Arkhanis",
    "Into the wilds",
    "The Tomb of Arkhanis"
  ],
  Ravenfall: [
    "Ravenfall",
    "Ravenfall Returns",
    "Sands of Aranie",
    "Cerebrus Must Fall",
    "The Initial Wishes",
    "Hell's Gate"
  ]
  // add others later
};

function openTimeline(worldName) {
  const panel = document.getElementById("timelinePanel");
  const overlay = document.getElementById("timelineOverlay");

  const data = timelineData[worldName] || [];

  panel.innerHTML = `
    <h2>${worldName} Timeline</h2>
    <div class="timeline-line">
      ${data.map(e => `
        <div class="timeline-event">${e}</div>
      `).join("")}
    </div>
  `;

  panel.classList.remove("hidden");
  overlay.classList.remove("hidden");

  setTimeout(() => panel.classList.add("open"), 10);
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
  document.getElementById("timelineOverlay")
    .addEventListener("click", closeTimeline);
});