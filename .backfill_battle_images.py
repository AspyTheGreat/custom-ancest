import json
import base64
import io
from pathlib import Path

from PIL import Image

ROOT = Path("battles")
CARDS = Path("assets/battle-cards")
CARDS.mkdir(parents=True, exist_ok=True)

def load_json(path):
    try:
        raw = path.read_bytes()
        if raw[:3] == b'\xef\xbb\xbf':
            raw = raw[3:]
        return json.loads(raw.decode("utf-8"))
    except Exception as e:
        print(f"  ERROR reading {path}: {e}")
        return None

def decode_data_uri(uri):
    if not uri or not isinstance(uri, str) or not uri.startswith("data:image"):
        return None, None
    try:
        _, data = uri.split(",", 1)
        header = uri.split(",")[0]
        ext = header.split(";")[0].split("/")[-1]
        return base64.b64decode(data), ext
    except Exception as e:
        print(f"  Failed to decode data URI: {e}")
        return None, None

def process_start_image(data_uri, output_path):
    img_data, ext = decode_data_uri(data_uri)
    if img_data is None:
        return False
    try:
        img = Image.open(io.BytesIO(img_data))
        if img.width > 400:
            ratio = 400.0 / img.width
            new_h = int(img.height * ratio)
            img = img.resize((400, new_h), Image.LANCZOS)
        img.save(output_path, "WEBP", quality=80)
        return True
    except Exception as e:
        print(f"  Image processing failed: {e}")
        return False

# Load global index
print("Loading global index...")
global_idx = load_json(ROOT / "index.json")
if global_idx is None:
    raise SystemExit("Failed to load global index")

total = len(global_idx)
processed = 0
skipped_no_data = 0
skipped_placeholder = 0
failed = 0

# Build lookup: campaignSlug -> dict of battle data
for entry in global_idx:
    cs = entry["campaignSlug"]
    bs = entry["battleSlug"]
    slug_key = f"{cs}-{bs}"
    slug_path = CARDS / f"{slug_key}.webp"

    # Already has a non-data-URI startImage (placeholder path from before)
    existing_img = entry.get("startImage")
    if existing_img and isinstance(existing_img, str) and not existing_img.startswith("data:image"):
        if not slug_path.exists() and existing_img.startswith("/assets/"):
            pass  # will still try to generate from battle JSON
        else:
            skipped_placeholder += 1
            continue

    # Read the battle JSON to find the data URI
    battle_file = ROOT / cs / f"{bs}.json"
    if not battle_file.exists():
        skipped_no_data += 1
        continue

    battle = load_json(battle_file)
    if battle is None:
        skipped_no_data += 1
        continue

    data_uri = (battle.get("images") or {}).get("start") or battle.get("startImage")
    if not data_uri or not isinstance(data_uri, str) or not data_uri.startswith("data:image"):
        skipped_no_data += 1
        continue

    if slug_path.exists():
        print(f"  EXISTS  {slug_key}")
    else:
        print(f"  CONVERT {slug_key}")
        if not process_start_image(data_uri, slug_path):
            failed += 1
            continue

    entry["startImage"] = f"/assets/battle-cards/{slug_key}.webp"
    processed += 1

print(f"\nProcessed: {processed}, Already had placeholder: {skipped_placeholder}, Skipped (no data URI): {skipped_no_data}, Failed: {failed}")

# Write updated global index
print("\nWriting global index...")
ROOT.joinpath("index.json").write_text(
    json.dumps(global_idx, indent=2, ensure_ascii=False),
    encoding="utf-8"
)

# Update campaign indexes
print("Updating campaign indexes...")
campaigns = {}
for entry in global_idx:
    cs = entry["campaignSlug"]
    campaigns.setdefault(cs, []).append(entry)

for cs, entries in campaigns.items():
    camp_path = ROOT / cs / "index.json"
    camp_idx = load_json(camp_path)
    if camp_idx is None:
        print(f"  WARNING: Could not load campaign index for {cs}")
        continue

    # Build lookup from global
    global_lookup = {}
    for e in entries:
        if e.get("startImage"):
            global_lookup[e["battleSlug"]] = e["startImage"]

    updated = 0
    for ce in camp_idx:
        if ce["battleSlug"] in global_lookup:
            ce["startImage"] = global_lookup[ce["battleSlug"]]
            updated += 1

    camp_path.write_text(
        json.dumps(camp_idx, indent=2, ensure_ascii=False),
        encoding="utf-8"
    )
    print(f"  {cs}: {updated} entries updated")

print("\nDone!")
