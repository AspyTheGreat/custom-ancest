exports.handler = async () => {

  try {

    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;

    if (!token || !owner || !repo) {
      throw new Error(
        "Missing GitHub environment variables"
      );
    }

    const basePath = "battles";

    // =========================
    // HELPERS
    // =========================

    function makeSlug(name) {

      return name
        ?.toLowerCase()
        .replace(/[^a-z0-9]+/g, "-");
    }

    function sum(obj) {

      return Object.values(obj || {})
        .reduce((a, b) => a + b, 0);
    }

    function mergeCounts(target, source) {

      if (!source) return;

      for (const key in source) {

        target[key] =
          (target[key] || 0) +
          (source[key] || 0);
      }
    }

    async function githubFetch(
      path,
      options = {}
    ) {

      const res = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
        {
          ...options,

          headers: {
            Authorization: `token ${token}`,
            Accept: "application/vnd.github+json",
            "Content-Type": "application/json",
            ...(options.headers || {})
          }
        }
      );

      return res;
    }

    async function getJsonFile(
      path,
      fallback = null
    ) {

      console.log("Fetching:", path);

      const res =
        await githubFetch(path);

      if (res.status === 404) {

        console.log(
          "Missing file:",
          path
        );

        return {
          exists: false,
          sha: null,
          data: fallback
        };
      }

      if (!res.ok) {

        const text =
          await res.text();

        throw new Error(
          `GitHub GET failed (${res.status}) for ${path}: ${text}`
        );
      }

      const json =
        await res.json();

      if (!json.content) {

        throw new Error(
          `No content in ${path}`
        );
      }

      let parsed;

      try {

        const decoded =
          Buffer.from(
            json.content,
            "base64"
          ).toString("utf8");

        if (!decoded.trim()) {

          throw new Error(
            "File is empty"
          );
        }

        parsed =
          JSON.parse(decoded);

      } catch (err) {

        throw new Error(
          `Invalid JSON in ${path}`
        );
      }

      return {
        exists: true,
        sha: json.sha,
        data: parsed
      };
    }

    async function putJsonFile(
      path,
      content,
      message,
      sha = null
    ) {

      const body = {

        message,

        content: Buffer.from(
          JSON.stringify(
            content,
            null,
            2
          )
        ).toString("base64")
      };

      if (sha) {
        body.sha = sha;
      }

      const res =
        await githubFetch(
          path,
          {
            method: "PUT",
            body: JSON.stringify(body)
          }
        );

      if (!res.ok) {

        const text =
          await res.text();

        throw new Error(
          `GitHub PUT failed (${res.status}) for ${path}: ${text}`
        );
      }

      return await res.json();
    }

    // =========================
    // LOAD GLOBAL INDEX
    // =========================

    const battlesIndexFile =
      await getJsonFile(
        `${basePath}/index.json`,
        []
      );

    const battlesIndex =
      battlesIndexFile.data;

    if (!Array.isArray(battlesIndex)) {

      throw new Error(
        "battles/index.json is not an array"
      );
    }

    // =========================
    // GROUP BY CAMPAIGN
    // =========================

    const campaigns = {};

    for (const battle of battlesIndex) {

      if (
        !battle?.campaignSlug ||
        !battle?.battleSlug
      ) {

        console.log(
          "Skipping malformed battle index entry:",
          battle
        );

        continue;
      }

      campaigns[
        battle.campaignSlug
      ] =
        campaigns[
          battle.campaignSlug
        ] || [];

      campaigns[
        battle.campaignSlug
      ].push(battle);
    }

    // =========================
    // PROCESS CAMPAIGNS
    // =========================

    for (const campaignSlug of Object.keys(campaigns)) {

      console.log(
        `\nRebuilding: ${campaignSlug}`
      );

      const statsData = {

        characters: {},

        processedBattles: []
      };

      const processedBattleSet =
        new Set();

      for (const battle of campaigns[campaignSlug]) {

        const battleId =
          `${campaignSlug}/${battle.battleSlug}`;

        // prevent duplicates
        if (
          processedBattleSet.has(
            battleId
          )
        ) {

          console.log(
            "Skipping duplicate battle:",
            battleId
          );

          continue;
        }

        processedBattleSet.add(
          battleId
        );

        const battlePath =
          `${basePath}/${campaignSlug}/${battle.battleSlug}.json`;

        const battleFile =
          await getJsonFile(
            battlePath,
            null
          );

        const battleData =
          battleFile.data;

        if (
          !battleData ||
          !Array.isArray(
            battleData.characters
          )
        ) {

          console.log(
            "Skipping invalid battle:",
            battlePath
          );

          continue;
        }

        processBattleStats(
          battleData,
          statsData,
          battleId
        );

        statsData.processedBattles.push(
          battleId
        );
      }

      // =========================
      // CLEAN INTERNAL FIELDS
      // =========================

      for (const slug of Object.keys(
        statsData.characters
      )) {

        delete statsData.characters[
          slug
        ]._maxLevel;
      }

      // =========================
      // WRITE FILE
      // =========================

      const statsPath =
        `${basePath}/${campaignSlug}/characterStats.json`;

      const existingStats =
        await getJsonFile(
          statsPath,
          null
        );

      await putJsonFile(

        statsPath,

        statsData,

        `Rebuild stats for ${campaignSlug}`,

        existingStats.sha
      );

      console.log(
        `Finished: ${campaignSlug}`
      );
    }

    // =========================
    // DONE
    // =========================

    return {

      statusCode: 200,

      body: JSON.stringify({

        success: true,

        campaigns:
          Object.keys(campaigns)
            .length
      })
    };

  } catch (err) {

    console.error(err);

    return {

      statusCode: 500,

      body: JSON.stringify({

        success: false,

        error:
          err?.message ||
          String(err)
      })
    };
  }
};

// =========================
// CHARACTER HELPERS
// =========================

function ensureChar(
  stats,
  slug,
  name
) {

  stats.characters =
    stats.characters || {};

  if (!stats.characters[slug]) {

    stats.characters[slug] = {

      name,
      slug,

      roundCount: 0,

      portrait: null,
      portraits: [],

      classes: [],
      levelClass: null,
      levelHistory: [],
      _maxLevel: 0,

      battles: 0,

      totalInitiative: 0,
      initiativeCount: 0,

      actions: {
        attack: 0,
        spell: 0,
        move: 0,
        misc: 0,
        none: 0
      },

      bonusActions: {
        attack: 0,
        spell: 0,
        move: 0,
        misc: 0,
        none: 0
      },

      reactions: {
        attack: 0,
        spell: 0,
        move: 0,
        misc: 0,
        none: 0
      },

      spellSlots: {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
        6: 0,
        7: 0,
        8: 0,
        9: 0
      },

      totalActions: 0,
      totalBonusActions: 0,
      totalReactions: 0,
      totalSpellSlotsUsed: 0,

      totalDamage: 0,
      totalHealing: 0,
      totalCC: 0,

      totalDamageTaken: 0,

      totalAttacksTaken: 0,
      totalAttacksDodged: 0,

      totalSavesMade: 0,
      totalSavesTotal: 0,

      totalNat20: 0,
      totalNat1: 0,

      totalAttacks: 0,
      totalHits: 0,

      totalPotencyAttempts: 0,
      totalPotencySuccess: 0,

      conditions: [],
      totalConditions: 0,

      processedBattles: []
    };
  }

  const c =
    stats.characters[slug];

  c.classes =
    c.classes || [];

  c.levelHistory =
    c.levelHistory || [];

  c.conditions =
    c.conditions || [];

  c.portraits =
    c.portraits || [];

  c.processedBattles =
    c.processedBattles || [];
}

function parseLevelClass(
  levelClassStr
) {

  if (!levelClassStr) {
    return [];
  }

  return levelClassStr

    .split(/[,|]/)

    .map(entry => entry.trim())

    .filter(Boolean)

    .map(entry => {

      const levelMatch =
        entry.match(
          /Level-(\d+)/i
        );

      const level =
        levelMatch
          ? Number(
              levelMatch[1]
            )
          : 0;

      entry = entry.replace(
        /Level-\d+\s*/i,
        ""
      );

      const parts =
        entry.split(" ")
          .filter(Boolean);

      if (!parts.length) {
        return null;
      }

      const className =
        parts.pop();

      const subclass =
        parts.length
          ? parts.join(" ")
          : null;

      return {

        class: className,

        classKey:
          className.toLowerCase(),

        subclass,

        subclassKey:
          subclass?.toLowerCase() ||
          null,

        level
      };
    })

    .filter(Boolean);
}

function processBattleStats(
  data,
  stats,
  battleId
) {

  // =========================
  // ROUND DATA
  // =========================

  for (const round of data.roundSummaries || []) {

    for (const turn of round.players || []) {

      const actor =
        turn.actor || {
          name: turn.name
        };

      const slug =
        actor.slug ||
        makeSlug(actor.name);

      if (!slug) continue;

      ensureChar(
        stats,
        slug,
        actor.name
      );

      const c =
        stats.characters[slug];

      // =========================
      // CONDITIONS
      // =========================

      if (
        Array.isArray(
          turn.conditions
        )
      ) {

        turn.conditions.forEach(
          cond => {

            if (!cond?.text) return;

            c.conditions.push({

              text:
                cond.text,

              round:
                cond.round ??
                round.round,

              turn:
                cond.turn ?? null,

              battle:
                data.battle ||
                null
            });

            c.totalConditions += 1;
          }
        );
      }

      // =========================
      // LEVEL CLASS
      // =========================

      const levelClass =
        actor.levelClass ||
        actor.levelclass ||
        null;

      if (levelClass) {

        const last =
          c.levelHistory[
            c.levelHistory.length - 1
          ];

        if (last !== levelClass) {
          c.levelHistory.push(
            levelClass
          );
        }

        const parsed =
          parseLevelClass(
            levelClass
          );

        parsed.forEach(
          newClass => {

            const exists =
              c.classes.some(
                existing =>

                  existing.classKey ===
                    newClass.classKey &&

                  existing.subclassKey ===
                    newClass.subclassKey
              );

            if (!exists) {
              c.classes.push(
                newClass
              );
            }
          }
        );

        const totalLevel =
          parsed.reduce(
            (sum, cls) =>
              sum +
              (cls.level || 0),
            0
          );

        if (
          totalLevel >
          c._maxLevel
        ) {

          c._maxLevel =
            totalLevel;

          c.levelClass =
            levelClass;
        }
      }

      // initiative
      if (
        turn.initiative !==
        undefined
      ) {

        c.totalInitiative +=
          turn.initiative;

        c.initiativeCount += 1;
      }
    }
  }

  // =========================
  // CHARACTER TOTALS
  // =========================

  for (const char of data.characters || []) {

    const slug =
      char.slug ||
      makeSlug(char.name);

    if (!slug) continue;

    ensureChar(
      stats,
      slug,
      char.name
    );

    const c =
      stats.characters[slug];

    // avoid double battle count
    if (
      !c.processedBattles.includes(
        battleId
      )
    ) {

      c.battles += 1;

      c.processedBattles.push(
        battleId
      );
    }

    c.roundCount +=
      (data.roundSummaries || [])
        .length;

    // portraits
    const portrait =

      typeof char.portrait ===
        "string" &&

      char.portrait.startsWith(
        "data:image"
      )

        ? char.portrait
        : null;

    if (portrait) {

      c.portrait = portrait;

      c.portraits = [portrait];
    }

    const s =
      char.stats || {};

    const defense =
      s.defense || {};

    // actions
    mergeCounts(
      c.actions,
      s.actions
    );

    mergeCounts(
      c.bonusActions,
      s.bonusActions
    );

    mergeCounts(
      c.reactions,
      s.reactions
    );

    mergeCounts(
      c.spellSlots,
      s.spellSlots ||
      s.spellSlotsUsed
    );

    c.totalActions +=
      sum(s.actions);

    c.totalBonusActions +=
      sum(s.bonusActions);

    c.totalReactions +=
      sum(s.reactions);

    c.totalSpellSlotsUsed +=
      sum(
        s.spellSlots ||
        s.spellSlotsUsed
      );

    // totals
    c.totalDamage +=
      s.damage || 0;

    c.totalHealing +=
      s.healing || 0;

    c.totalCC +=
      s.cc || 0;

    // attacks
    const attacksMade =
      s.attacks?.total || 0;

    const attacksHit =
      s.attacks?.hit || 0;

    c.totalAttacks +=
      attacksMade;

    c.totalHits +=
      attacksHit;

    // potency
    const savesForced =
      s.saves?.forced || 0;

    const savesSucceeded =
      s.saves?.succeeded || 0;

    const savesFailed =
      Math.max(
        0,
        savesForced -
        savesSucceeded
      );

    c.totalPotencyAttempts +=
      savesForced;

    c.totalPotencySuccess +=
      savesFailed;

    // defense
    c.totalDamageTaken +=
      s.damageTaken || 0;

    c.totalAttacksTaken +=
      defense.attacksTaken || 0;

    c.totalAttacksDodged +=
      defense.attacksDodged || 0;

    c.totalSavesMade +=
      defense.savesMade || 0;

    c.totalSavesTotal +=
      defense.savesTotal || 0;

    // luck
    c.totalNat20 +=
      s.nat20 || 0;

    c.totalNat1 +=
      s.nat1 || 0;
  }
}