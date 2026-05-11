exports.handler = async () => {
  try {
    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;

    const basePath = "battles";

   async function getJsonFile(path) {
  console.log("Fetching:", path);

  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
    {
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github+json"
      }
    }
  );

  console.log("Status:", res.status);

  const text = await res.text();
  console.log("Response text:", text);

  if (res.status !== 200) {
    console.log("Failed to fetch:", path, res.status);
    return null;
  }

  const json = JSON.parse(text);

  // 🚨 Handle directories or invalid responses
  if (!json.content) {
    console.log("No content in response for:", path);
    return null;
  }

  try {
    const decoded = Buffer.from(json.content, "base64").toString();

    if (!decoded.trim()) {
      console.log("Empty file:", path);
      return null;
    }

    return JSON.parse(decoded);

  } catch (err) {
    console.log("JSON parse failed for:", path);
    console.log("Raw content:", json.content);
    return null;
  }
}

    async function putJsonFile(path, content, message) {
      const body = {
        message,
        content: Buffer.from(
          JSON.stringify(content, null, 2)
        ).toString("base64")
      };

      await fetch(
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
    }

    // =========================
    // LOAD GLOBAL INDEX
    // =========================

    const battlesIndex = await getJsonFile(`${basePath}/index.json`);

if (!Array.isArray(battlesIndex)) {
  console.log("index.json failed to load:", battlesIndex);

  return {
    statusCode: 500,
    body: "Failed to load battles/index.json"
  };
}

    const campaigns = {};

    // group battles by campaign
    battlesIndex.forEach(b => {
      if (!campaigns[b.campaignSlug]) {
        campaigns[b.campaignSlug] = [];
      }
      campaigns[b.campaignSlug].push(b);
    });

    // =========================
    // PROCESS EACH CAMPAIGN
    // =========================

    for (const campaignSlug of Object.keys(campaigns)) {

      const statsData = {
        characters: {},
        processedBattles: []
      };

      for (const battle of campaigns[campaignSlug]) {

        const path = `${basePath}/${campaignSlug}/${battle.battleSlug}.json`;

       

const battleData = await getJsonFile(path);

if (!battleData || !battleData.characters) {
  console.log("Skipping invalid battle:", path);
  continue;
}

// ✅ THIS WAS MISSING
const battleId = `${campaignSlug}/${battle.battleSlug}`;

processBattleStats(battleData, statsData, battleId);

statsData.processedBattles.push(
  `${campaignSlug}/${battle.battleSlug}`
);
      }

      // write stats file
      await putJsonFile(
        `${basePath}/${campaignSlug}/characterStats.json`,
        statsData,
        `Rebuild stats for ${campaignSlug}`
      );
    }

    return {
      statusCode: 200,
      body: "Stats rebuilt successfully"
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: err.toString()
    };
  }
};
function ensureChar(stats, slug, name) {
  if (!stats.characters[slug]) {
    stats.characters[slug] = {
      classes: [],
levelClass: null,
levelHistory: [],
_maxLevel: 0,
      name,
      battles: 0,
totalInitiative: 0,
initiativeCount: 0,
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
      totalPotencySuccess: 0
    };
  }
}

function processBattleStats(data, stats, battleId) {

  // =========================
// LEVEL CLASS + HISTORY (FROM ROUNDS)
// =========================

for (const round of data.roundSummaries || []) {
  for (const turn of round.players || []) {

    const actor = turn.actor || {
      name: turn.name,
      levelClass: null
    };

    const slug =
      actor.slug ||
      actor.name?.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    if (!slug) continue;

    ensureChar(stats, slug, actor.name);

    const c = stats.characters[slug];

    const levelClass =
      actor.levelClass ||
      actor.levelclass ||
      null;

    if (!levelClass) continue;

    // =========================
    // STORE HISTORY
    // =========================

    c.levelHistory = c.levelHistory || [];

    const exists = c.levelHistory.some(
      e => e.battleId === battleId
    );

    if (!exists) {
      c.levelHistory.push({
        battleId,
        value: levelClass
      });
    }

    // =========================
    // PARSE + MERGE CLASSES
    // =========================

    const parsed = parseLevelClass(levelClass);

    c.classes = c.classes || [];

    parsed.forEach(newClass => {
      const already = c.classes.some(existing =>
        existing.classKey === newClass.classKey &&
        existing.subclassKey === newClass.subclassKey
      );

      if (!already) {
        c.classes.push(newClass);
      }
    });

    // =========================
    // HIGHEST LEVEL TRACKING
    // =========================

    const totalLevel = parsed.reduce(
      (sum, cls) => sum + (cls.level || 0),
      0
    );

    if (!c._maxLevel || totalLevel > c._maxLevel) {
      c._maxLevel = totalLevel;
      c.levelClass = levelClass;
    }
  }
}

 
if (!data?.characters || !Array.isArray(data.characters)) {
  console.log("No characters, skipping");
  return;
}
  if (!data || !data.characters) {
    console.log("Invalid data passed to processBattleStats");
    return;
  }

  for (const char of data.characters || []) {

    const slug =
      char.slug ||
      char.name?.toLowerCase().replace(/\s+/g, "-");

    if (!slug) continue;

    ensureChar(stats, slug, char.name);

    const c = stats.characters[slug];
    const s = char.stats || {};
    const defense = s.defense || {};

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
    const savesSucceeded = s.saves?.succeeded || 0;

    c.totalPotencyAttempts += savesForced;
    c.totalPotencySuccess += savesSucceeded;

    // =========================
    // TANK
    // =========================

    c.totalDamageTaken += s.damageTaken || 0;

    c.totalAttacksTaken += defense.attacksTaken || 0;
    c.totalAttacksDodged += defense.attacksDodged || 0;

    c.totalSavesMade += defense.savesMade || 0;
    c.totalSavesTotal += defense.savesTotal || defense.savesMade || 0;

    // =========================
    // LUCK
    // =========================

    c.totalNat20 += s.nat20 || 0;
    c.totalNat1 += s.nat1 || 0;

   
   

    // =========================
    // BATTLES
    // =========================

    c.battles += 1;
  }
}
  
