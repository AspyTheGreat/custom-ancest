(function () {
  const ROOT = "../";
  const DEFAULT_SECTION = "characters";
  const SECTIONS = ["characters", "synopsis", "npcs", "discoveries", "notes"];

  function asset(p) {
    if (!p) return p;
    if (/^(?:[a-z]+:)?\/\//i.test(p) || p.startsWith("data:") || p.startsWith("/")) return p;
    return ROOT + p.replace(/^\.?\//, "");
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function sectionFromHash() {
    let hash = location.hash.replace(/^#/, "").replace(/^\//, "").toLowerCase();
    try {
      hash = decodeURIComponent(hash);
    } catch (e) {
      hash = "";
    }
    return SECTIONS.includes(hash) ? hash : DEFAULT_SECTION;
  }

  function setActiveTile(section) {
    document.querySelectorAll(".side-tile[data-section]").forEach((tile) => {
      const active = tile.dataset.section === section;
      tile.classList.toggle("active", active);
      tile.setAttribute("aria-current", active ? "page" : "false");
    });
  }

  function render(section) {
    setActiveTile(section);
    loadSection(section);
  }

  function navigate(section) {
    const target = SECTIONS.includes(section) ? section : DEFAULT_SECTION;
    if (location.hash === "#" + target) {
      render(target);
      return;
    }
    location.hash = target;
  }

  function showError(message) {
    document.title = "Campaign not found - Nat 1 Archive";
    document.getElementById("campaign-title").textContent = "Campaign not found";
    document.getElementById("back-link").href = "worlds.html";
    document.getElementById("campaign-image").style.display = "none";
    document.getElementById("side-panel").style.display = "none";
    document.getElementById("content-panel").innerHTML =
      '<h2>Campaign not found</h2>' +
      "<p>" + escapeHtml(message) + "</p>" +
      '<p><a href="worlds.html">Browse worlds</a></p>';
  }

  function wireSections() {
    document.querySelectorAll(".side-tile[data-section]").forEach((tile) => {
      tile.addEventListener("click", () => navigate(tile.dataset.section));
    });

    window.addEventListener("hashchange", () => render(sectionFromHash()));

    const battleTile = document.getElementById("battle-tile");
    if (battleTile) {
      const goToBattle = () => {
        if (window.campaign && window.campaign.battleHash) {
          location.href =
            ROOT + "chronicles/Chronicles_previous_battles.html#" + window.campaign.battleHash;
        } else {
          alert("Battle mode coming soon!");
        }
      };
      battleTile.addEventListener("click", goToBattle);
      battleTile.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          goToBattle();
        }
      });
    }
  }

  async function init() {
    const slug = new URLSearchParams(location.search).get("slug");

    let manifest;
    try {
      const response = await fetch("campaigns.json", { cache: "no-cache" });
      if (!response.ok) throw new Error("HTTP " + response.status);
      manifest = await response.json();
    } catch (err) {
      console.error("Could not load campaigns.json", err);
      showError("The campaign index could not be loaded.");
      return;
    }

    const campaigns = Array.isArray(manifest) ? manifest : manifest.campaigns || [];
    const campaign = slug ? campaigns.find((c) => c.slug === slug) : null;

    if (!campaign) {
      showError(slug ? 'No campaign matches "' + slug + '".' : "No campaign was selected.");
      return;
    }

    window.campaign = campaign;
    document.title = campaign.title + " - Nat 1 Archive";

    const titleEl = document.getElementById("campaign-title");
    titleEl.textContent = campaign.title;

    const backLink = document.getElementById("back-link");
    backLink.href = campaign.worldPage || "worlds.html";
    backLink.setAttribute("aria-label", "Back to " + campaign.world);

    const hero = document.getElementById("campaign-hero");
    hero.alt = campaign.title;
    hero.src = asset(campaign.heroImage || "assets/nat1backdrop.png");
    hero.addEventListener("error", function onError() {
      hero.removeEventListener("error", onError);
      hero.src = asset("assets/nat1backdrop.png");
    });

    window.files = (campaign.files || []).map(asset);
    window.characterImages = Object.fromEntries(
      Object.entries(campaign.characterImages || {}).map(([name, image]) => [name, asset(image)])
    );

    const sections = campaign.sections || {};
    window.campaignData = {
      synopsis: sections.synopsis || "<h2>Campaign Synopsis</h2><p>Content coming soon.</p>",
      characters: '<h2>Characters</h2><div id="characters-container"></div>',
      npcs: sections.npcs || "<h2>NPCs Encountered</h2><p>Content coming soon.</p>",
      discoveries: sections.discoveries || "<h2>Discoveries</h2><p>Content coming soon.</p>",
      notes: sections.notes || "<h2>Player Notes</h2><p>Player notes coming soon.</p>",
    };

    wireSections();

    const initial = sectionFromHash();
    if (location.hash !== "#" + initial) {
      history.replaceState(null, "", "#" + initial);
    }
    render(initial);
  }

  init();
})();
