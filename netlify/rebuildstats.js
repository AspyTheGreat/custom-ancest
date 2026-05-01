exports.handler = async () => {
  try {
    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;

    const basePath = "battles";

    async function getJsonFile(path) {
      const res = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
        {
          headers: {
            Authorization: `token ${token}`
          }
        }
      );

      if (res.status !== 200) return null;

      const json = await res.json();

      return JSON.parse(
        Buffer.from(json.content, "base64").toString()
      );
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

        if (!battleData) continue;

        processBattleStats(battleData, statsData);

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
processBattleStats()
ensureChar()