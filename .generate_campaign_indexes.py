import json
import pathlib

# =========================
# CONFIG
# =========================

ROOT = pathlib.Path("battles")

if not ROOT.exists():
    raise SystemExit("battles directory not found")

# =========================
# HELPERS
# =========================

def get_time(entry):

    value = entry.get("date") or ""

    try:
        return value

    except Exception:
        return ""

def load_json(path):

    try:

        return json.loads(
            path.read_text(encoding="utf-8")
        )

    except Exception as e:

        print(f"ERROR reading {path}: {e}")

        return None

def make_campaign_entry(
    data,
    campaign_dir,
    file
):

    campaign_slug = (
        data.get("campaignSlug")
        or campaign_dir.name
    )

    battle_slug = (
        data.get("battleSlug")
        or file.stem
    )

    if battle_slug is None:
        battle_slug = ""

    campaign_name = (
        data.get("campaign")
        or campaign_slug
            .replace("-", " ")
            .title()
    )

    battle_name = (
        data.get("displayName")
        or data.get("name")
        or data.get("battle")
        or battle_slug
        or ""
    )

    timestamp = (
        data.get("timestamp")
        or data.get("date")
        or ""
    )

    images = data.get("images")

    start_image = None

    if isinstance(images, dict):

        start_image = (
            images.get("start")
        )

    if start_image is None:

        start_image = (
            data.get("startImage")
        )

    return {

        "id":
            f"{campaign_slug}/{battle_slug}",

        "name":
            battle_name,

        "campaign":
            campaign_name,

        "campaignSlug":
            campaign_slug,

        "battleSlug":
            battle_slug,

        "file":
            f"battles/{campaign_dir.name}/{file.name}",

        "startImage":
            start_image,

        "date":
            timestamp
    }

def write_json(path, data):

    path.write_text(

        json.dumps(
            data,
            indent=2,
            ensure_ascii=False
        ),

        encoding="utf-8"
    )

# =========================
# MAIN
# =========================

created = []

all_battles = []

# =========================
# LOOP CAMPAIGNS
# =========================

for campaign_dir in sorted(ROOT.iterdir()):

    if not campaign_dir.is_dir():
        continue

    print(f"\nProcessing: {campaign_dir.name}")

    campaign_entries = []

    # =========================
    # LOOP BATTLE FILES
    # =========================

    for file in sorted(
        campaign_dir.glob("*.json")
    ):

        # =========================
        # SKIP GENERATED FILES
        # =========================

        if file.name in (
            "index.json",
            "characterStats.json"
        ):
            continue

        data = load_json(file)

        if data is None:
            continue

        # Skip non-battle files
        if not isinstance(data, dict):

            print(
                f"Skipping non-object JSON: {file}"
            )

            continue

        entry = make_campaign_entry(
            data,
            campaign_dir,
            file
        )

        campaign_entries.append(entry)

        all_battles.append({

            "id":
                entry["id"],

            "name":
                entry["name"],

            "campaign":
                entry["campaign"],

            "campaignSlug":
                entry["campaignSlug"],

            "battleSlug":
                entry["battleSlug"],

            "startImage":
                entry["startImage"],

            "date":
                entry["date"]
        })

    # =========================
    # REMOVE DUPLICATES
    # =========================

    deduped = {}

    for entry in campaign_entries:

        deduped[
            entry["battleSlug"]
        ] = entry

    campaign_entries = list(
        deduped.values()
    )

    # =========================
    # SORT NEWEST FIRST
    # =========================

    campaign_entries.sort(
        key=get_time,
        reverse=True
    )

    # =========================
    # WRITE CAMPAIGN INDEX
    # =========================

    campaign_index_path = (
        campaign_dir / "index.json"
    )

    write_json(
        campaign_index_path,
        campaign_entries
    )

    created.append(
        str(campaign_index_path)
    )

# =========================
# GLOBAL DEDUPE
# =========================

global_deduped = {}

for entry in all_battles:

    key = (
        entry["campaignSlug"],
        entry["battleSlug"]
    )

    global_deduped[key] = entry

all_battles = list(
    global_deduped.values()
)

# =========================
# SORT GLOBAL INDEX
# =========================

all_battles.sort(
    key=get_time,
    reverse=True
)

# =========================
# WRITE GLOBAL INDEX
# =========================

global_index_path = (
    ROOT / "index.json"
)

write_json(
    global_index_path,
    all_battles
)

created.append(
    str(global_index_path)
)

# =========================
# DONE
# =========================

print("\nCreated/updated files:\n")

for path in created:
    print(path)