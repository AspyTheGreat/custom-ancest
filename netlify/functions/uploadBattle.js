exports.handler = async (event) => {

  try {

    // =========================
    // PARSE REQUEST
    // =========================

    const data = JSON.parse(event.body);

    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;

    if (!token || !owner || !repo) {
      throw new Error("Missing GitHub environment variables");
    }

    let campaignSlug = data.campaignSlug;
    let battleSlug = data.battleSlug;

    if (!campaignSlug) {
      throw new Error("campaignSlug missing");
    }

    if (!battleSlug) {
      throw new Error("battleSlug missing");
    }

    // =========================
    // HELPERS
    // =========================

    const getTime = d => {
      const t = new Date(d).getTime();
      return isNaN(t) ? 0 : t;
    };

    async function githubFetch(path, options = {}) {

      const res = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
        {
          ...options,

          headers: {
            Authorization: `token ${token}`,
            "Content-Type": "application/json",
            ...(options.headers || {})
          }
        }
      );

      return res;
    }

    async function getJsonFile(path, fallback) {

      const res = await githubFetch(path);

      if (res.status === 404) {
        return {
          exists: false,
          sha: null,
          data: fallback
        };
      }

      if (!res.ok) {

        const text = await res.text();

        throw new Error(
          `GitHub GET failed (${res.status}) for ${path}: ${text}`
        );
      }

      const json = await res.json();

      let parsed;

      try {

        parsed = JSON.parse(
          Buffer.from(
            json.content,
            "base64"
          ).toString("utf8")
        );

      } catch (err) {

        throw new Error(`Invalid JSON in ${path}`);
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
          JSON.stringify(content, null, 2)
        ).toString("base64")
      };

      if (sha) {
        body.sha = sha;
      }

      const res = await githubFetch(
        path,
        {
          method: "PUT",
          body: JSON.stringify(body)
        }
      );

      if (!res.ok) {

        const text = await res.text();

        throw new Error(
          `GitHub PUT failed (${res.status}) for ${path}: ${text}`
        );
      }

      return await res.json();
    }

    // =========================
    // PATHS
    // =========================

    const battlePath =
      `battles/${campaignSlug}/${battleSlug}.json`;

    const campaignIndexPath =
      `battles/${campaignSlug}/index.json`;

    const battlesIndexPath =
      `battles/index.json`;

    const characterStatsPath =
      `battles/${campaignSlug}/characterStats.json`;

    // =========================
    // DUPLICATE CHECK
    // =========================

    const existingBattleRes =
      await githubFetch(battlePath);

    if (existingBattleRes.status === 200) {

      battleSlug =
        `${battleSlug}-${Date.now()}`;
    }

    const finalBattlePath =
      `battles/${campaignSlug}/${battleSlug}.json`;

    const battleId =
      `${campaignSlug}/${battleSlug}`;

    // =========================
    // PRELOAD + VALIDATE EVERYTHING
    // =========================

    const campaignIndex =
      await getJsonFile(
        campaignIndexPath,
        []
      );

    const battlesIndex =
      await getJsonFile(
        battlesIndexPath,
        []
      );

    const statsFile =
      await getJsonFile(
        characterStatsPath,
        {
          characters: {},
          processedBattles: []
        }
      );

    // =========================
    // COMMON DATA
    // =========================

    const timestamp =
      data.timestamp ||
      data.date ||
      "";

    const startImage =
      data.images?.start ||
      data.startImage ||
      null;

    const battleName =
      data.displayName ||
      data.name ||
      data.battle ||
      battleSlug;

    const campaignName =
      data.campaign ||
      campaignSlug;

    // =========================
    // BUILD CAMPAIGN INDEX
    // =========================

    const filteredCampaignEntries =
      campaignIndex.data.filter(
        b => b.battleSlug !== battleSlug
      );

    filteredCampaignEntries.push({

      id: battleId,

      name: battleName,

      campaign: campaignName,

      campaignSlug,

      battleSlug,

      file: finalBattlePath,

      startImage,

      date: timestamp
    });

    filteredCampaignEntries.sort(
      (a, b) => getTime(b.date) - getTime(a.date)
    );

    // =========================
    // BUILD GLOBAL INDEX
    // =========================

    const filteredBattles =
      battlesIndex.data.filter(
        b => !(
          b.campaignSlug === campaignSlug &&
          b.battleSlug === battleSlug
        )
      );

    filteredBattles.push({

      id: battleId,

      name: battleName,

      campaign: campaignName,

      campaignSlug,

      battleSlug,

      startImage,

      date: timestamp
    });

    filteredBattles.sort(
      (a, b) => getTime(b.date) - getTime(a.date)
    );

    // =========================
    // BUILD CHARACTER STATS
    // =========================

    const statsData = statsFile.data;

    statsData.characters =
      statsData.characters || {};

    statsData.processedBattles =
      statsData.processedBattles || [];

    if (
      !statsData.processedBattles.includes(battleId)
    ) {

      processBattleStats(
        data,
        statsData,
        battleId
      );

      statsData.processedBattles.push(
        battleId
      );
    }

    // =========================
    // ALL VALIDATION PASSED
    // SAFE TO WRITE FILES
    // =========================

    await putJsonFile(
      finalBattlePath,
      data,
      `Add ${battleId}`
    );

    await putJsonFile(
      campaignIndexPath,
      filteredCampaignEntries,
      `Update ${campaignSlug} index`,
      campaignIndex.sha
    );

    await putJsonFile(
      battlesIndexPath,
      filteredBattles,
      "Update battles index",
      battlesIndex.sha
    );

    await putJsonFile(
      characterStatsPath,
      statsData,
      `Update character stats for ${campaignSlug}`,
      statsFile.sha
    );

    // =========================
    // DONE
    // =========================

    return {

      statusCode: 200,

      body: JSON.stringify({
        success: true,
        battleId
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

function parseLevelClass(levelClassStr) {

  if (!levelClassStr) {
    return [];
  }

  return levelClassStr

    .split(/[,|]/)

    .map(entry => entry.trim())

    .filter(Boolean)

    .map(entry => {

      const levelMatch =
        entry.match(/Level-(\d+)/i);

      const level =
        levelMatch
          ? Number(levelMatch[1])
          : 0;

      entry = entry.replace(
        /Level-\d+\s*/i,
        ""
      );

      const parts =
        entry.split(" ").filter(Boolean);

      if (!parts.length) {
        return null;
      }

      const className = parts.pop();

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
          subclass?.toLowerCase() || null,

        level
      };
    })

    .filter(Boolean);
}

function ensureChar(stats, slug, name) {

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

      totalSavesTotal: 0,
      totalSavesMade: 0,

      totalNat20: 0,
      totalNat1: 0,

      conditions: [],
      totalConditions: 0,

      totalAttacks: 0,
      totalHits: 0,

      totalPotencyAttempts: 0,
      totalPotencySuccess: 0,

      processedBattles: []
    };
  }

  const c = stats.characters[slug];

  c.portraits =
    c.portraits || [];

  c.conditions =
    c.conditions || [];

  c.classes =
    c.classes || [];

  c.levelHistory =
    c.levelHistory || [];

  c.processedBattles =
    c.processedBattles || [];
}

function processBattleStats(
  data,
  stats,
  battleId
) {

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
        Array.isArray(turn.conditions)
      ) {

        turn.conditions.forEach(cond => {

          if (!cond?.text) return;

          c.conditions.push({

            text: cond.text,

            round:
              cond.round ??
              round.round,

            turn:
              cond.turn ?? null,

            battle:
              data.battle || null
          });

          c.totalConditions += 1;
        });
      }

      // =========================
      // LEVELCLASS
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
          c.levelHistory.push(levelClass);
        }

        const parsed =
          parseLevelClass(levelClass);

        parsed.forEach(newClass => {

          const exists =
            c.classes.some(existing =>

              existing.classKey ===
                newClass.classKey &&

              existing.subclassKey ===
                newClass.subclassKey
            );

          if (!exists) {
            c.classes.push(newClass);
          }
        });

        const totalLevel =
          parsed.reduce(
            (sum, cls) =>
              sum + (cls.level || 0),
            0
          );

        if (
          !c._maxLevel ||
          totalLevel > c._maxLevel
        ) {

          c._maxLevel = totalLevel;
          c.levelClass = levelClass;
        }
      }

      if (
        turn.initiative !== undefined
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

    c.roundCount +=
      (data.roundSummaries || []).length;

    // =========================
    // BATTLE COUNTER
    // =========================

    if (
      !c.processedBattles.includes(battleId)
    ) {

      c.battles += 1;

      c.processedBattles.push(
        battleId
      );
    }

    // =========================
    // PORTRAITS
    // =========================

    const portrait =

      typeof char.portrait === "string" &&

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

    // =========================
    // ACTIONS
    // =========================

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

    // =========================
    // TOTALS
    // =========================

    c.totalDamage +=
      s.damage || 0;

    c.totalHealing +=
      s.healing || 0;

    c.totalCC +=
      s.cc || 0;

    // =========================
    // ACCURACY
    // =========================

    const attacksMade =
      s.attacks?.total || 0;

    const attacksHit =
      s.attacks?.hit || 0;

    c.totalAttacks +=
      attacksMade;

    c.totalHits +=
      attacksHit;

    // =========================
    // POTENCY
    // =========================

    const savesForced =
      s.saves?.forced || 0;

    const savesSucceeded =
      s.saves?.succeeded || 0;

    const savesFailed =
      Math.max(
        0,
        savesForced - savesSucceeded
      );

    c.totalPotencyAttempts +=
      savesForced;

    c.totalPotencySuccess +=
      savesFailed;

    // =========================
    // DEFENSE
    // =========================

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

    // =========================
    // LUCK
    // =========================

    c.totalNat20 +=
      s.nat20 || 0;

    c.totalNat1 +=
      s.nat1 || 0;
  }
}