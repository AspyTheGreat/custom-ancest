exports.handler = async (event) => {
  try {
    const data = JSON.parse(event.body);

    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;

   let campaignSlug = data.campaignSlug;
let battleSlug = data.battleSlug;

// --- CHECK IF FILE EXISTS ---
const basePath = `battles/${campaignSlug}/${battleSlug}.json`;

const checkRes = await fetch(
  `https://api.github.com/repos/${owner}/${repo}/contents/${basePath}`,
  {
    headers: { Authorization: `token ${token}` }
  }
);

// If file exists → add timestamp
if (checkRes.status === 200) {
  battleSlug = `${battleSlug}-${Date.now()}`;
}

const battlePath = `battles/${campaignSlug}/${battleSlug}.json`;
const battleId = `${campaignSlug}/${battleSlug}`;
    const indexPath = `index.json`;

    // --- STEP 1: GET CURRENT INDEX ---
    let indexData = [];
    let sha = null;

    const indexRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${indexPath}`,
      {
        headers: {
          Authorization: `token ${token}`
        }
      }
    );

    if (indexRes.status === 200) {
      const json = await indexRes.json();
      sha = json.sha;

      const content = Buffer.from(json.content, "base64").toString();
      indexData = JSON.parse(content);
    }

    // --- STEP 2: ADD NEW ENTRY ---
    indexData.push({
  id: battleId, // e.g. "tolivric/final-siege"
  name: data.displayName,
  campaign: data.campaign,
  campaignSlug: campaignSlug,
  battleSlug: battleSlug,
  date: data.timestamp
});

    // --- STEP 3: UPLOAD BATTLE FILE ---
    await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${battlePath}`,
      {
        method: "PUT",
        headers: {
          Authorization: `token ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: `Add ${battleId}`,
          content: Buffer.from(JSON.stringify(data, null, 2)).toString("base64")
        })
      }
    );

    // --- STEP 4: UPDATE INDEX ---
    await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${indexPath}`,
      {
        method: "PUT",
        headers: {
          Authorization: `token ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: "Update index",
          content: Buffer.from(JSON.stringify(indexData, null, 2)).toString("base64"),
          sha: sha
        })
      }
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: err.toString()
    };
  }
};
