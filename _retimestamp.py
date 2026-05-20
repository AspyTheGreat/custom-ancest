import json
from datetime import datetime, timedelta

BASE = r"D:\games\Dnd\nat1website\custom-ancest"

# Chronological order of campaign slugs (using actual directory names)
CHRONO_ORDER = [
    "tollivric-coast-is-clear",
    "ravenfall-sands-of-aranie",
    "the-lost-pearl-of-luscany",
    "the-lost-tomb-of-arkhanis",
    "the-boros-legionaire",
    "into-the-wilds",
    "the-second-blood-war",
    "the-dawn-cataclysm",
    "tolivric-path-less-travelled",
    "the-break-of-dawn",
    "the-tomb-of-arkhanis-2",
]

# Load global index
with open(f"{BASE}\\battles\\index.json", encoding="utf-8") as f:
    global_idx = json.load(f)

# Group battles by campaign, preserving relative order
by_campaign = {}
for e in global_idx:
    slug = e["campaignSlug"]
    by_campaign.setdefault(slug, []).append(e)

# Generate new timestamps
# Campaign 1 starts 2023-01-01, each campaign gets ~2 months, battles spaced ~2 days
current_date = datetime(2023, 1, 1)
new_timestamps = {}  # battleSlug -> new timestamp string

for cs in CHRONO_ORDER:
    if cs not in by_campaign:
        print(f"WARNING: {cs} not found in global index, skipping")
        continue
    entries = by_campaign[cs]
    n = len(entries)
    # Space battles across the campaign duration (2-3 days apart, at least a week total)
    days_per_battle = max(1, 14 // n)
    for e in entries:
        new_timestamps[e["battleSlug"]] = current_date.strftime("%Y-%m-%dT%H:%M:%S.000Z")
        current_date += timedelta(days=days_per_battle)
    # Move to next campaign: 30 days after last battle of this campaign
    current_date += timedelta(days=30)

print(f"Generated {len(new_timestamps)} new timestamps")

# Update global index
updated_count = 0
for e in global_idx:
    bs = e["battleSlug"]
    cs = e["campaignSlug"]
    if bs in new_timestamps:
        old = e.get("date", "")
        new = new_timestamps[bs]
        if old != new:
            e["date"] = new
            updated_count += 1

print(f"Updated {updated_count} entries in global index")

with open(f"{BASE}\\battles\\index.json", "w", encoding="utf-8") as f:
    json.dump(global_idx, f, indent=2, ensure_ascii=False)

# Update campaign indexes and individual battle files
campaign_battles = {}
for e in global_idx:
    campaign_battles.setdefault(e["campaignSlug"], []).append(e)

for cs, entries in campaign_battles.items():
    # Update campaign index
    camp_idx_path = f"{BASE}\\battles\\{cs}\\index.json"
    with open(camp_idx_path, encoding="utf-8") as f:
        camp_idx = json.load(f)
    
    for ce in camp_idx:
        bs = ce["battleSlug"]
        if bs in new_timestamps:
            ce["date"] = new_timestamps[bs]
    
    with open(camp_idx_path, "w", encoding="utf-8") as f:
        json.dump(camp_idx, f, indent=2, ensure_ascii=False)
    
    # Update individual battle JSON files
    for e in entries:
        bs = e["battleSlug"]
        battle_path = f"{BASE}\\battles\\{cs}\\{bs}.json"
        try:
            with open(battle_path, encoding="utf-8-sig") as f:
                battle = json.load(f)
            battle["timestamp"] = new_timestamps[bs]
            with open(battle_path, "w", encoding="utf-8") as f:
                json.dump(battle, f, indent=4, ensure_ascii=False)
        except FileNotFoundError:
            print(f"  WARNING: Battle file not found: {battle_path}")

print("Done! All timestamps updated.")
