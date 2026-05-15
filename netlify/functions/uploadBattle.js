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
const contentType = res.headers.get("content-type");

if (contentType && !contentType.includes("application/json")) {
  const text = await res.text();
  throw new Error(`GitHub returned non-JSON for ${path}: ${text}`);
}
      return res;
    }

async function getJsonFile(path, fallback = []) {

  const url =
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github+json"
    }
  });

  // file missing
  if (res.status === 404) {
    return {
      exists: false,
      data: fallback,
      sha: null
    };
  }

  // github error
  if (!res.ok) {
    const text = await res.text();

    throw new Error(
      `GitHub GET failed (${res.status}) for ${path}: ${text}`
    );
  }

  const json = await res.json();

// =========================
// HANDLE LARGE FILES (no content, use download_url)
// =========================

if (!json.content && json.download_url) {
  const rawRes = await fetch(json.download_url);

  if (!rawRes.ok) {
    throw new Error(`Failed to fetch raw file for ${path}`);
  }

  const text = await rawRes.text();

  if (!text.trim()) {
    return {
      exists: true,
      data: fallback,
      sha: json.sha
    };
  }

  try {
    return {
      exists: true,
      data: JSON.parse(text),
      sha: json.sha
    };
  } catch (err) {
    throw new Error(`Invalid JSON in raw file ${path}`);
  }
}

// =========================
// NORMAL FILE (has base64 content)
// =========================

if (!json.content) {
  throw new Error(
    `GitHub response for ${path} was not a file`
  );
}

  let decoded;

  try {

    decoded = Buffer.from(
      json.content.replace(/\n/g, ""),
      "base64"
    ).toString("utf8");

  } catch (err) {

    throw new Error(
      `Failed to decode base64 for ${path}`
    );
  }

  // empty file
  if (!decoded.trim()) {

    return {
      exists: true,
      data: fallback,
      sha: json.sha
    };
  }

  try {

    return {
      exists: true,
      data: JSON.parse(decoded),
      sha: json.sha
    };

  } catch (err) {

    console.error(
      `BROKEN JSON IN ${path}:\n`,
      decoded
    );

    throw new Error(
      `Invalid JSON in ${path}: ${err.message}`
    );
  }
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
    // BINARY FILE UPLOAD (for images)
    // =========================

    async function putFile(path, buffer, message, sha = null) {
      const body = {
        message,
        content: buffer.toString("base64")
      };
      if (sha) body.sha = sha;

      const res = await githubFetch(path, {
        method: "PUT",
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`GitHub PUT failed (${res.status}) for ${path}: ${text}`);
      }

      return await res.json();
    }

    // =========================
    // PROCESS BATTLE CARD IMAGE
    // =========================

    async function processAndUploadImage(startImage, slug) {
      if (!startImage || typeof startImage !== "string" || !startImage.startsWith("data:image")) {
        return startImage;
      }

      const matches = startImage.match(/^data:image\/(\w+);base64,(.+)$/);
      if (!matches) return startImage;

      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, "base64");

      let sharp;
      try {
        sharp = require("sharp");
      } catch {
        console.warn("sharp not available, using original image");
        return startImage;
      }

      try {
        const webpBuffer = await sharp(buffer)
          .resize(400, undefined, { withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer();

        const imagePath = `assets/battle-cards/${slug}.webp`;

        const checkRes = await githubFetch(imagePath);
        let imageSha = null;
        if (checkRes.status === 200) {
          const d = await checkRes.json();
          imageSha = d.sha;
        }

        await putFile(
          imagePath,
          webpBuffer,
          `Add battle card image for ${slug}`,
          imageSha
        );

        return `/assets/battle-cards/${slug}.webp`;
      } catch (err) {
        console.error("Image processing failed:", err);
        return startImage;
      }
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
  await getJsonFile(campaignIndexPath, []);

const battlesIndex =
  await getJsonFile(battlesIndexPath, []);

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

    const placeholders = [
      "/assets/battle-cards/previous_battles%20placeholder%201.webp",
      "/assets/battle-cards/previous_battles%20placeholder%202.webp",
      "/assets/battle-cards/previous_battles%20placeholder%203.webp",
      "/assets/battle-cards/previous_battles%20placeholder%204.webp"
    ];

    const recentPlaceholder = (battlesIndex.data || [])
      .filter(b => b.startImage && b.startImage.startsWith("/assets/battle-cards/previous_battles"))
      .sort((a, b) => getTime(b.date) - getTime(a.date))
      [0]?.startImage;

    const availablePlaceholders = recentPlaceholder
      ? placeholders.filter(p => p !== recentPlaceholder)
      : placeholders;

    const startImage =
      data.images?.start ||
      data.startImage ||
      availablePlaceholders[Math.floor(Math.random() * availablePlaceholders.length)];

    // Process data URI images → crop/resize to WebP for battle cards
    const indexStartImage = startImage && startImage.startsWith("data:image")
      ? await processAndUploadImage(startImage, `${campaignSlug}-${battleSlug}`)
      : startImage;

    if (data.archive && !data.archive.thumbnail) {
      data.archive.thumbnail = startImage;
    }

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

      startImage: indexStartImage,

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

      startImage: indexStartImage,

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

async function rebuildLevelHistory(
  campaignSlug,
  characterSlug,
  getJsonFile,
  currentData = null,
  currentBattleId = null
) {
  const basePath = `battles/${campaignSlug}`;

  // get campaign index (list of battles)
  const index = await getJsonFile(`${basePath}/index.json`, []);

  const history = [];
  let lastNormalized = null;

  const normalize = str =>
    str
      .toLowerCase()
      .split(/[|,]/)
      .map(s => s.trim())
      .sort()
      .join("|");

  // sort oldest → newest
const safeTime = (d) => {
  const t = new Date(d).getTime();
  return isNaN(t) ? 0 : t;
};

const battles = [...index.data].sort(
  (a, b) => safeTime(a.date) - safeTime(b.date)
);

  for (const battle of battles) {

    const file = await getJsonFile(battle.file, null);
    if (!file?.data) continue;

    const char = (file.data.characters || []).find(c =>
      (c.slug || makeSlug(c.name)) === characterSlug
    );

    if (!char) continue;

    const lc =
      char.levelClass ||
      char.levelclass ||
      null;

    if (!lc) continue;

    const cleaned = lc.trim().replace(/\s+/g, " ");
    const normalized = normalize(cleaned);

    if (normalized !== lastNormalized) {
      history.push(cleaned);
      lastNormalized = normalized;
    }
  }

  // also include the current upload data (which hasn't been saved yet)
  if (currentData) {
    const char = (currentData.characters || []).find(c =>
      (c.slug || makeSlug(c.name)) === characterSlug
    );
    if (char) {
      const lc = char.levelClass || char.levelclass || null;
      if (lc) {
        const cleaned = lc.trim().replace(/\s+/g, " ");
        const normalized = normalize(cleaned);
        if (normalized !== lastNormalized) {
          history.push(cleaned);
          lastNormalized = normalized;
        }
      }
    }
  }

  return history;
}

function parseLevelClass(levelClassStr) {
  if (!levelClassStr || typeof levelClassStr !== "string") return [];

  return levelClassStr
    .split(/[|,]/)
    .map(e => e.trim())
    .filter(Boolean)
    .map(entry => {

      entry = entry.replace(/\s+/g, " ").trim();

      const levelMatch = entry.match(/level\s*-\s*(\d+)/i);
      const level = levelMatch ? Number(levelMatch[1]) : 0;

      let rest = entry.replace(/level\s*-\s*\d+/i, "").trim();
      if (!rest) return null;

      const parts = rest.split(" ");
      const className = parts.at(-1);
      const subclassRaw = parts.slice(0, -1).join(" ").trim();

      return {
        class: capitalize(className),
        subclass: subclassRaw || null,
        level
      };
    })
    .filter(Boolean);
}

// helper
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function buildLevelHistory(classes) {
  if (!classes || !classes.length) return [];

  const history = [];

  // Sort so main class (highest level) comes first
  const sorted = [...classes].sort((a, b) => b.level - a.level);

  const main = sorted[0];
  const others = sorted.slice(1);

  // --- MAIN CLASS LEVELING ---
  // start from level 6 like your example (you can tweak this)
  const START_LEVEL = 1;

  for (let lvl = START_LEVEL; lvl <= main.level; lvl++) {
    history.push(formatEntry([{ ...main, level: lvl }]));
  }

  // --- MULTICLASS ADDITIONS ---
  others.forEach(cls => {
    for (let lvl = 1; lvl <= cls.level; lvl++) {
      history.push(
        formatEntry([
          main,
          { ...cls, level: lvl }
        ])
      );
    }
  });

  return history;
}

// helper
function formatEntry(classes) {
  return classes
    .map(c =>
      `Level-${c.level} ${
        c.subclass ? c.subclass + " " : ""
      }${c.class}`
    )
    .join(" | ");
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
_maxLevel: 0,
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

   const newLevelClass =
  char.levelClass ||
  char.levelclass ||
  null;

if (newLevelClass) {

  const normalize = str =>
    str
      .toLowerCase()
      .split(/[|,]/)
      .map(s => s.trim())
      .sort()
      .join("|");

  const normalizedNew = normalize(newLevelClass);
  const normalizedOld = c.levelClass
    ? normalize(c.levelClass)
    : null;

  // ✅ only update if different
  if (normalizedNew !== normalizedOld) {

    c.levelHistory.push(newLevelClass.trim());

    c.levelClass = newLevelClass.trim();
  }

  // still update class stats
  const parsed = parseLevelClass(newLevelClass);

  parsed.forEach(newClass => {
    const index = c.classes.findIndex(existing =>
      existing.class?.toLowerCase() === newClass.class?.toLowerCase() &&
      (existing.subclass ?? "")?.toLowerCase() === (newClass.subclass ?? "")?.toLowerCase()
    );

    if (index !== -1) {
      c.classes[index].level = newClass.level;
      c.classes[index].class = newClass.class;
      c.classes[index].subclass = newClass.subclass;
      delete c.classes[index].classKey;
      delete c.classes[index].subclassKey;
    } else {
      c.classes.push(newClass);
    }
  });

  const totalLevel = parsed.reduce(
    (sum, cls) => sum + (cls.level || 0),
    0
  );

  if (!c._maxLevel || totalLevel > c._maxLevel) {
    c._maxLevel = totalLevel;
  }
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

    const damageTaken =
      s.damageTaken ?? (
        s.hp?.max && s.hp?.current !== undefined
          ? s.hp.max - s.hp.current
          : 0
      );

    c.totalDamageTaken += damageTaken;

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