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

      return {
        exists: true,
        sha: json.sha,
        data: JSON.parse(
          Buffer.from(
            json.content,
            "base64"
          ).toString()
        )
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
      (a, b) =>
        new Date(b.date || 0) -
        new Date(a.date || 0)
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
    filteredBattles.sort(
      (a, b) =>
        new Date(b.date || 0) -
        new Date(a.date || 0)
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

  processBattleStats(data, statsData);

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
      body: err.toString()
    };
  }
  
};
// =========================
// CHARACTER STAT HELPERS
// =========================

function ensureChar(stats, slug, name) {
  if (!stats.characters[slug]) {
    stats.characters[slug] = {
  name,
  slug,

  // =========================
  // PORTRAITS
  // =========================

  portrait: null,
  portraits: [],

  classes: [],
  levelClass: null,
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
stats.characters[slug].portraits =
  stats.characters[slug].portraits || [];

if (
  stats.characters[slug].portrait === undefined
) {
  stats.characters[slug].portrait = null;
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
      const className =
        parts.pop().toLowerCase();

      // remaining words = subclass
      const subclass =
        parts.length
          ? parts.join(" ").toLowerCase()
          : null;

      return {
        class: className,
        subclass,
        level
      };
    })
    .filter(Boolean);
}

function processBattleStats(data, stats) {
for (const round of data.roundSummaries || []) {
  for (const turn of round.players || []) {

    const actor = turn.actor;
    if (!actor) continue;

    const slug =
      actor.slug ||
      actor.toLowerCase().replace(/\s+/g, "-");

    if (!slug) continue;

    ensureChar(stats, slug, actor);

    const c = stats.characters[slug];
const levelClass =
  char.levelClass ||
  char.levelclass ||
  null;

if (levelClass) {

  c.levelClass = levelClass;

  c.classes =
    parseLevelClass(levelClass);
}
    if (turn.initiativeOrder !== undefined) {
      c.totalInitiative += turn.initiativeOrder;
      c.initiativeCount += 1;
    }
  }
}
  for (const char of data.characters || []) {

    const slug =
      char.slug ||
      char.name?.toLowerCase().replace(/\s+/g, "-");

    if (!slug) continue;

    ensureChar(stats, slug, char.name);

   const c = stats.characters[slug];

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
  