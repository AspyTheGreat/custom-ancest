const loreData = {
  Infinitum: [
    { title: "World Overview", body: "Lore coming soon." }
  ],
  Tolivric: [
    { title: "World Overview", body: "Lore coming soon." }
  ],
  Convulux: [
    { title: "World Overview", body: "Lore coming soon." }
  ],
  Ravenfall: [
    { title: "World Overview", body: "Lore coming soon." }
  ],
  "Midgard / Ravenfall": [
    { title: "World Overview", body: "Lore coming soon." }
  ],
  Epalux: [
    { title: "World Overview", body: "Lore coming soon." }
  ]
};

function openLore(worldName) {
  const panel = document.getElementById("lorePanel");
  const overlay = document.getElementById("loreOverlay");

  const data = loreData[worldName] || [];

  panel.innerHTML = `
    <h2>${worldName} Lore</h2>
    ${data.map(s => `
      <div class="lore-section">
        <h3>${s.title}</h3>
        <p>${s.body}</p>
      </div>
    `).join("")}
  `;

  panel.classList.remove("hidden");
  overlay.classList.remove("hidden");

  setTimeout(() => panel.classList.add("open"), 10);
}

function closeLore() {
  const panel = document.getElementById("lorePanel");
  const overlay = document.getElementById("loreOverlay");

  panel.classList.remove("open");

  setTimeout(() => {
    panel.classList.add("hidden");
    overlay.classList.add("hidden");
  }, 300);
}

document.addEventListener("DOMContentLoaded", () => {
  const overlay = document.getElementById("loreOverlay");
  if (overlay) {
    overlay.addEventListener("click", closeLore);
  }
});
