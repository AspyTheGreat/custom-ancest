function renderCharacter(character) {

  return `

  <div class="character-card" id="character-card">

    <!-- LEFT COLUMN -->
    <div class="card-left">

      <div class="image-block">

        <img
          id="character-portrait"
          src="${character.image}" alt="${character.name}">

      </div>

      <div class="items-box">
        <h3 class="items-title">ITEMS</h3>
        <div class="items-list">
          ${character.items
            .sort((a, b) => {
              const order = ["artifact", "divine arm", "legendary", "very rare", "rare", "uncommon", "common", "mundane"];
              const ai = order.indexOf(a.rarity);
              const bi = order.indexOf(b.rarity);
              return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
            })
            .slice(0, 8)
            .map(item => {
              const color = getRarityColor(item.rarity || "mundane");
              const bold = item.rarity === "divine arm" ? "font-weight:bold;" : "";
              return `<div class="item-entry" style="${bold}color:${color}">${item.name}</div>`;
            }).join("")}
        </div>
      </div>

    </div>

    <!-- RIGHT SIDE -->
    <div class="content-block">

      <!-- NAME -->
      <div class="name-block">

        <h2>${character.name}</h2>

      </div>

      <!-- INFO AREA -->
      <div class="top-info">

        <!-- CLASS / HP -->
        <div class="info-box">

          <h3>Character Info</h3>

          <p><strong>Class:</strong> ${character.class}</p>

          <p><strong>Level:</strong> ${character.level}</p>

          <p><strong>HP:</strong>
            ${character.hp.current}
            /
            ${character.hp.max}
          </p>
          <p>
           <strong>Skills:</strong><br>

            ${character.skills.map(s => s.proficiency === "expertise" ? s.name + " (E)" : s.name).join(", ")}
          </p>

        </div>

        <!-- SAVES -->
        <div class="info-box">

          <h3 class="center-title">Saving Throws</h3>

         <div class="saving-list">

           ${Object.entries(character.stats).map(([name, stat]) => `

             <div class="save-row">

               <span class="save-name">
               ${name.toUpperCase()}
               </span>

               <span class="save-value">
              ${stat.save}
               </span>

             </div>

           `).join("")}

          </div>

        </div>

      </div>

      <!-- STATS -->
      <div class="stats-wrapper">

  <div class="stats-block">

        ${Object.entries(character.stats).map(([name, stat]) => `

          <div class="stat-card">

            <div class="stat-name">
              ${name.substring(0,3).toUpperCase()}
            </div>

            <div class="stat-mod">
              ${stat.mod >= 0 ? "+" + stat.mod : stat.mod}
            </div>

            <div class="stat-score">
              ${stat.score}
            </div>

          </div>

        `).join("")}

      </div>

    </div>

  </div>

  </div>

  `;
}

