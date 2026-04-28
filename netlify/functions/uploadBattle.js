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
    // UPDATE CAMPAIGN INDEX
    // =========================

    const campaignIndex =
      await getJsonFile(campaignIndexPath);

    // remove duplicates
    const filteredCampaignEntries =
      campaignIndex.data.filter(
        b => b.slug !== battleSlug
      );

    filteredCampaignEntries.push({

      name: data.displayName ||
            battleSlug,

      slug: battleSlug,

      file:
        `battles/${campaignSlug}/${battleSlug}.json`,

      timestamp:
        data.timestamp || Date.now(),

      startImage:
        data.images?.start || null
    });

    // newest first
    filteredCampaignEntries.sort(
      (a, b) =>
        new Date(b.timestamp) -
        new Date(a.timestamp)
    );

    await putJsonFile(
      campaignIndexPath,
      filteredCampaignEntries,
      `Update ${campaignSlug} index`,
      campaignIndex.sha
    );

    // =========================
    // UPDATE BATTLES INDEX
    // =========================

    const battlesIndex =
      await getJsonFile(battlesIndexPath);

    const campaignExists =
      battlesIndex.data.some(
        c => c.slug === campaignSlug
      );

    if (!campaignExists) {

      battlesIndex.data.push({

        name:
          data.campaign ||
          campaignSlug,

        slug:
          campaignSlug,

        path:
          `battles/${campaignSlug}`
      });
    }

    battlesIndex.data.sort(
      (a, b) =>
        a.name.localeCompare(b.name)
    );

    await putJsonFile(
      battlesIndexPath,
      battlesIndex.data,
      "Update battles index",
      battlesIndex.sha
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