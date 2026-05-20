import json
from collections import OrderedDict

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

BASE = r"D:\games\Dnd\nat1website\custom-ancest"

with open(f"{BASE}\\battles\\index.json", encoding="utf-8") as f:
    global_idx = json.load(f)

# Group battles by campaign
by_campaign = {}
for e in global_idx:
    slug = e["campaignSlug"]
    by_campaign.setdefault(slug, []).append(e)

# Print current timestamps grouped by campaign
print("=== Current timestamps by campaign ===")
for cs in CHRONO_ORDER:
    if cs in by_campaign:
        entries = by_campaign[cs]
        print(f"\n{cs} ({len(entries)} battles):")
        for e in entries:
            print(f"  {e['battleSlug']}: {e.get('date','N/A')}")
    else:
        print(f"\n{cs}: NOT FOUND")
