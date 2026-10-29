const timelineData = {
  Infinitum: [
    { name: "The Wish of Death", url: "../campaign.html?slug=the-wish-of-death" },
    { name: "Infinitum", url: "../campaign.html?slug=infinitumcamp" },
    { name: "The Plane Shift Conundrum", url: "../campaign.html?slug=the-planeshift-conundrum" },
    { name: "Redo of Wizard", url: "../campaign.html?slug=redo-of-wizard" },
    { name: "Ascension of Vecna 1: The Gith in the Sun", url: "../campaign.html?slug=ascension-of-vecna-1" },
    { name: "The Lost Pearl of Luscany", url: "../campaign.html?slug=the-lost-pearl-of-luscany" },
    { name: "Ascension of Vecna 2: The Rites of Apotheosis", url: "../campaign.html?slug=ascension-of-vecna-2" },
    { name: "the Boros Legionnaire", url: "../campaign.html?slug=the-boros-legionnair" },
    { name: "Dawn Cataclysm", url: "../campaign.html?slug=dawn-cataclysm" },
    { name: "The Break of Dawn", url: "../campaign.html?slug=the-break-of-dawn" },
    { name: "Vecna's Boys: Quenching the Wish", url: "../campaign.html?slug=vecnas-boys" },
    { name: "At Hell's Gate : The Styxian Serpent", url: "../campaign.html?slug=at-hells-gate" },
    { name: "Heart of The Styx", url: "../campaign.html?slug=heart-of-the-styx" }
  ],
  Tolivric: [
    { name: "Jorrid", url: "../campaign.html?slug=jorrid" },
    { name: "Jorrid 2", url: "../campaign.html?slug=jorrid-2" },
    { name: "On Rails", url: "../campaign.html?slug=on-rails" },
    { name: "Coast is Clear", url: "../campaign.html?slug=coast-is-clear" },
    { name: "Foray of Fable", url: "../campaign.html?slug=foray-of-fable" },
    { name: "Paths Less Travelled", url: "../campaign.html?slug=paths-less-travelled" },
    { name: "Lynhowen's Last Lineage", url: "../campaign.html?slug=lynhowens-last-lineage" },
    { name: "Turning Seasons", url: "../campaign.html?slug=turning-seasons" },
    { name: "Sha'terra: The 11th Wave", url: "../campaign.html?slug=shaterra" },
    { name: "The Siege of Torr Myrdmal", url: "../campaign.html?slug=the-siege-of-torr-myrdmal" },
    { name: "Project Zomboid", url: "../campaign.html?slug=project-zomboid" }
  ],
  Epalux: [
    { name: "Trauerspiel", url: "../campaign.html?slug=trauerspiel" },
    { name: "The Hiest", url: "../campaign.html?slug=the-hiest" },
    { name: "Echoes From the Deep", url: "../campaign.html?slug=echoes-from-the-past" },
    { name: "Trials of Trusth", url: "../campaign.html?slug=trials-of-truth" }
  ],
  Convulux: [
    { name: "Theron's Games", url: "../campaign.html?slug=therons-games" },
    { name: "The Lost Tomb of Arkhanis", url: "../campaign.html?slug=the-lost-tomb-of-arkhanis-1" },
    { name: "Into the wilds", url: "../campaign.html?slug=into-the-wilds" },
    { name: "The Tomb of Arkhanis", url: "../campaign.html?slug=the-lost-tomb-of-arkhanis-2" }
  ],
  Ravenfall: [
    { name: "Ravenfall", url: "../campaign.html?slug=ravenfall" },
    { name: "Ravenfall Returns", url: "../campaign.html?slug=ravenfall-returns" },
    { name: "Sands of Aranie", url: "../campaign.html?slug=sands-of-aranie" },
    { name: "Cerebrus Must Fall", url: "../campaign.html?slug=cerberus-must-fall" },
    { name: "The Initial Wishes", url: "../campaign.html?slug=the-initial-wishes" },
    { name: "Hell's Gate", url: "../campaign.html?slug=hells-gate" }
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
