function renderCharacter(character) {

  return `

  <div class="character-card" id="character-card">

    <!-- LEFT IMAGE -->
    <div class="image-block">

      <img
        id="character-portrait"
        src="${character.image}" alt="${character.name}">

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

            ${character.skills.join(", ")}
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

