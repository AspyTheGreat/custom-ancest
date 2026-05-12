exports.handler = async (event) => {
  try {

    const data = JSON.parse(event.body);

    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;

    let campaignSlug = data.campaignSlug;
    let battleSlug = data.battleSlug;

    // =========================
    // PATHS
    // =========================

    const battlePath =
      `battles/${campaignSlug}/${battleSlug}.json`;

const characterStatsPath =
  `battles/${campaignSlug}/characterStats.json`;

    const campaignIndexPath =
      `battles/${campaignSlug}/index.json`;

    const battlesIndexPath =
      `battles/index.json`;

    // =========================
    // CHECK IF BATTLE EXISTS
    // =========================

    const checkRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${battlePath}`,
      {
        headers: {
          Authorization: `token ${token}`
        }
      }
    );

    // duplicate filename → append timestamp
    if (checkRes.status === 200) {

      battleSlug =
        `${battleSlug}-${Date.now()}`;
    }

    const finalBattlePath =
      `battles/${campaignSlug}/${battleSlug}.json`;

    // =========================
    // HELPERS
    // =========================

 async function getJsonFile(path) {

  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
    {
      headers: {
        Authorization: `token ${token}`
      }
    }
  );

  if (res.status !== 200) {
    return {
      exists: false,
      data: [],
      sha: null
    };
  }

  const json = await res.json();

  let parsed;

  try {
    parsed = JSON.parse(
      Buffer.from(
        json.content,
        "base64"
      ).toString()
    );
  } catch (e) {
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

      const res = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
        {
          method: "PUT",

          headers: {
            Authorization: `token ${token}`,
            "Content-Type": "application/json"
          },

          body: JSON.stringify(body)
        }
      );
      if (!res.ok) {

  const text = await res.text();

  throw new Error(
    `GitHub PUT failed (${res.status}): ${text}`
  );
}
    }

    // =========================
    // UPLOAD BATTLE FILE
    // =========================

    await putJsonFile(
      finalBattlePath,
      data,
      `Add ${campaignSlug}/${battleSlug}`
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
    // UPDATE CAMPAIGN INDEX
    // =========================

    const campaignIndex =
      await getJsonFile(campaignIndexPath);

    // remove duplicates
    const filteredCampaignEntries =
      campaignIndex.data.filter(
        b => b.battleSlug !== battleSlug
      );

    filteredCampaignEntries.push({

      id:
        `${campaignSlug}/${battleSlug}`,

      name:
        battleName,

      campaign:
        campaignName,

      campaignSlug:
        campaignSlug,

      battleSlug:
        battleSlug,

      file:
        `battles/${campaignSlug}/${battleSlug}.json`,

      startImage:
        startImage,

      date:
        timestamp
    });

    // newest first
   filteredCampaignEntries.sort(
  (a, b) => getTime(b.date) - getTime(a.date)
);

    await putJsonFile(
      campaignIndexPath,
      filteredCampaignEntries,
      `Update ${campaignSlug} index`,
      campaignIndex.sha
    );

    // =========================
    // UPDATE GLOBAL INDEX
    // =========================

    const battlesIndex =
      await getJsonFile(battlesIndexPath);

    // remove duplicates
    const filteredBattles =
      battlesIndex.data.filter(
        b => !(
          b.campaignSlug === campaignSlug &&
          b.battleSlug === battleSlug
        )
      );

    filteredBattles.push({

      id:
        `${campaignSlug}/${battleSlug}`,

      name:
        battleName,

      campaign:
        campaignName,

      campaignSlug:
        campaignSlug,

      battleSlug:
        battleSlug,

      startImage:
        startImage,

      date:
        timestamp
    });

    // newest first
   const getTime = d => {
  const t = new Date(d).getTime();
  return isNaN(t) ? 0 : t;
};

filteredBattles.sort(
  (a, b) => getTime(b.date) - getTime(a.date)
);

    await putJsonFile(
      battlesIndexPath,
      filteredBattles,
      "Update battles index",
      battlesIndex.sha
    );
// =========================
// UPDATE CHARACTER STATS DB
// =========================

// =========================
// UPDATE CHARACTER STATS DB
// =========================

const statsFile =
  await getJsonFile(characterStatsPath);

let statsData = statsFile.exists
  ? statsFile.data
  : { characters: {}, processedBattles: [] };

// Ensure field exists even for older files
statsData.processedBattles =
  statsData.processedBattles || [];

  const battleId = `${campaignSlug}/${battleSlug}`;

if (!statsData.processedBattles.includes(battleId)) {

processBattleStats(data, statsData, battleId);

  statsData.processedBattles.push(battleId);

} else {
  console.log("Battle already processed, skipping stats.");
}

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
        success: true
      })
    };

  } catch (err) {

    return {
  statusCode: 500,
  body: JSON.stringify({
    success: false,
    error: err.message || err.toString()
  })
};
  }
  
};
// =========================
// CHARACTER STAT HELPERS
// =========================
function makeSlug(name) {
  return name?.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function ensureChar(stats, slug, name) {
  
  if (!stats.characters[slug]) {
    stats.characters[slug] = {
  name,
  slug,

roundCount: 0,
  // =========================
  // PORTRAITS
  // =========================

  portrait: null,
  portraits: [],

  classes: [],
  levelClass: null,
  levelHistory: [], 
  battles: 0,
totalInitiative: 0,
initiativeCount: 0,
actions: { attack: 0, spell: 0, move: 0, misc: 0, none: 0 },
bonusActions: { attack: 0, spell: 0, move: 0, misc: 0, none: 0 },
reactions: { attack: 0, spell: 0, move: 0, misc: 0, none: 0 },

spellSlots: {
  1: 0, 2: 0, 3: 0, 4: 0, 5: 0,
  6: 0, 7: 0, 8: 0, 9: 0
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
      totalPotencySuccess: 0
      
    };
    if (
  stats.characters[slug].portrait === undefined
) {
  stats.characters[slug].portrait = null;
}
  }
  stats.characters[slug].portraits =
  stats.characters[slug].portraits || [];
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

      // extract level
      const levelMatch =
        entry.match(/Level-(\d+)/i);

      const level =
        levelMatch
          ? Number(levelMatch[1])
          : 0;

      // remove "Level-X"
      entry = entry.replace(
        /Level-\d+\s*/i,
        ""
      );

      const parts =
        entry.split(" ").filter(Boolean);

      if (!parts.length) {
        return null;
      }

      // final word = class
        const className = parts.pop();

      const subclass =
        parts.length
          ? parts.join(" ")
          : null;

      return {
  class: className,                      // original case (for display)
  classKey: className.toLowerCase(),     // normalized (for logic)

  subclass,
  subclassKey: subclass?.toLowerCase() || null,

  level
};
    })
    .filter(Boolean);
}

function mergeCounts(target, source) {
  if (!source) return;

  for (const key in source) {
    target[key] = (target[key] || 0) + (source[key] || 0);
  }
}

function processBattleStats(data, stats, battleId) {
for (const round of data.roundSummaries || []) {
  for (const turn of round.players || []) {
// =========================
// ROUND CONDITIONS
// =========================

if (Array.isArray(turn.conditions)) {
  const slug = makeSlug(turn.name);
  if (!slug) continue;

  ensureChar(stats, slug, turn.name);

  const c = stats.characters[slug];

  c.conditions = c.conditions || [];

  turn.conditions.forEach(cond => {
    if (!cond || !cond.text) return;

    c.conditions.push({
      text: cond.text,
      round: cond.round ?? round.round,
      turn: cond.turn ?? null,
      battle: data.battle || null
    });

    c.totalConditions += 1;
  });
}
   const actor = turn.actor || {
  name: turn.name,
  levelClass: null
};

   const slug =
  actor.slug || makeSlug(actor.name);

    if (!slug) continue;

    ensureChar(stats, slug, actor.name || actor);

    const c = stats.characters[slug];
const levelClass =
  actor.levelClass ||
  actor.levelclass ||
  null;

if (levelClass) {

  // store history (avoid duplicates per battle)
 // STORE SIMPLE LEVELCLASS HISTORY (NO METADATA)
c.levelHistory = c.levelHistory || [];

// avoid duplicate consecutive entries (optional but recommended)
const last = c.levelHistory[c.levelHistory.length - 1];

if (last !== levelClass) {
  c.levelHistory.push(levelClass);
}

  // parse current entry
  const parsed = parseLevelClass(levelClass);

  // merge into classes (for class stats)
  c.classes = c.classes || [];
  parsed.forEach(newClass => {

  const exists = c.classes.some(existing =>
    existing.classKey === newClass.classKey &&
    existing.subclassKey === newClass.subclassKey
  );

  if (!exists) {
    c.classes.push(newClass);
  }
});

  // =========================
  // COMPUTE HIGHEST LEVEL
  // =========================

  const totalLevel = parsed.reduce(
    (sum, cls) => sum + (cls.level || 0),
    0
  );

  if (!c._maxLevel || totalLevel > c._maxLevel) {
    c._maxLevel = totalLevel;
    c.levelClass = levelClass; // display string
  }
}
    if (turn.initiative !== undefined) {
  c.totalInitiative += turn.initiative;
  c.initiativeCount += 1;
}

  }
}

function sum(obj) {
  return Object.values(obj || {}).reduce((a, b) => a + b, 0);
}

  for (const char of data.characters || []) {

   const slug =
  char.slug || makeSlug(char.name);

    if (!slug) continue;

    ensureChar(stats, slug, char.name);

   const c = stats.characters[slug];

c.roundCount += (data.roundSummaries || []).length;
// =========================
// PORTRAITS
// =========================

const portrait =
  typeof char.portrait === "string" &&
  char.portrait.startsWith("data:image")
    ? char.portrait
    : null;

if (portrait) {

  // latest portrait
  c.portrait = portrait;

  // ensure array exists
  c.portraits = c.portraits || [];

  // avoid duplicates
 // keep only latest portrait
c.portraits = [portrait];
}

const s = char.stats || {};
// =========================
// CONDITIONS
// =========================

const defense = s.defense || {};

// =========================
// ACTION BREAKDOWNS
// =========================

mergeCounts(c.actions, s.actions);
mergeCounts(c.bonusActions, s.bonusActions);
mergeCounts(c.reactions, s.reactions);
mergeCounts(c.spellSlots, s.spellSlots || s.spellSlotsUsed);

c.totalActions += sum(s.actions);
c.totalBonusActions += sum(s.bonusActions);
c.totalReactions += sum(s.reactions);
c.totalSpellSlotsUsed += sum(s.spellSlots || s.spellSlotsUsed);
    // =========================
    // BASIC TOTALS
    // =========================

    c.totalDamage += s.damage || 0;
    c.totalHealing += s.healing || 0;
    c.totalCC += s.cc || 0;

    // =========================
    // ACCURACY
    // =========================

    const attacksMade = s.attacks?.total || 0;
    const attacksHit = s.attacks?.hit || 0;

    c.totalAttacks += attacksMade;
    c.totalHits += attacksHit;


   // =========================
// POTENCY
// =========================

const savesForced = s.saves?.forced || 0;

// defender successes
const savesSucceeded = s.saves?.succeeded || 0;

// potency succeeds when enemies FAIL saves
const savesFailed =
  Math.max(0, savesForced - savesSucceeded);

c.totalPotencyAttempts += savesForced;
c.totalPotencySuccess += savesFailed;

    // =========================
    // TANK
    // =========================

    c.totalDamageTaken += s.damageTaken || 0;

    c.totalAttacksTaken += defense.attacksTaken || 0;
    c.totalAttacksDodged += defense.attacksDodged || 0;

    c.totalSavesMade += defense.savesMade || 0;
    c.totalSavesTotal += defense.savesTotal || 0;

    // =========================
    // LUCK
    // =========================

    c.totalNat20 += s.nat20 || 0;
    c.totalNat1 += s.nat1 || 0;

   
   

    // =========================
    // BATTLES
    // =========================

    c.processedBattles = c.processedBattles || [];

if (!c.processedBattles.includes(battleId)) {
  c.battles += 1;
  c.processedBattles.push(battleId);
}
  }
}
  