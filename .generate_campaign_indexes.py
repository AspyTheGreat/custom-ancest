import json
import pathlib

root = pathlib.Path('battles')

if not root.exists():
    raise SystemExit('battles directory not found')

created = []
all_battles = []

for campaign_dir in sorted(root.iterdir()):

    if not campaign_dir.is_dir():
        continue

    entries = []

    for file in sorted(campaign_dir.glob('*.json')):

        # Skip generated indexes
        if file.name == 'index.json':
            continue

        try:
            data = json.loads(
                file.read_text(encoding='utf-8')
            )

        except Exception as e:
            print(f'ERROR reading {file}: {e}')
            continue

        # =========================
        # BASIC DATA
        # =========================

        campaign_slug = (
            data.get('campaignSlug')
            or campaign_dir.name
        )

        battle_slug = (
            data.get('battleSlug')
            if data.get('battleSlug') is not None
            else file.stem
        )

        if battle_slug is None:
            battle_slug = ''

        campaign_name = (
            data.get('campaign')
            or campaign_slug
                .replace('-', ' ')
                .title()
        )

        battle_name = (
            data.get('displayName')
            or data.get('name')
            or data.get('battle')
            or battle_slug
            or ''
        )

        timestamp = (
            data.get('timestamp')
            or data.get('date')
            or ''
        )

        images = data.get('images')

        start_image = None

        if isinstance(images, dict):
            start_image = images.get('start')

        if start_image is None:
            start_image = data.get('startImage')

        # =========================
        # CAMPAIGN INDEX ENTRY
        # =========================

        campaign_entry = {
            'id': (
                f'{campaign_slug}/{battle_slug}'
                if battle_slug
                else f'{campaign_slug}/'
            ),

            'name': battle_name,

            'campaign': campaign_name,

            'campaignSlug': campaign_slug,

            'battleSlug': battle_slug,

            'file':
                f'battles/{campaign_dir.name}/{file.name}',

            'startImage': (
                start_image
                if start_image is not None
                else None
            ),

            'date': timestamp,
        }

        entries.append(campaign_entry)

        # =========================
        # GLOBAL INDEX ENTRY
        # =========================

        global_entry = {
            'id': (
                f'{campaign_slug}/{battle_slug}'
                if battle_slug
                else f'{campaign_slug}/'
            ),

            'name': battle_name,

            'campaign': campaign_name,

            'campaignSlug': campaign_slug,

            'battleSlug': battle_slug,

            'startImage': (
                start_image
                if start_image is not None
                else None
            ),

            'date': timestamp,
        }

        all_battles.append(global_entry)

    # =========================
    # SORT NEWEST FIRST
    # =========================

    entries.sort(
        key=lambda e: e.get('date') or '',
        reverse=True
    )

    # =========================
    # WRITE CAMPAIGN INDEX
    # =========================

    index_path = campaign_dir / 'index.json'

    index_path.write_text(
        json.dumps(entries, indent=2),
        encoding='utf-8'
    )

    created.append(str(index_path))

# =========================
# GLOBAL INDEX
# =========================

all_battles.sort(
    key=lambda e: e.get('date') or '',
    reverse=True
)

index_path = root / 'index.json'

index_path.write_text(
    json.dumps(all_battles, indent=2),
    encoding='utf-8'
)

created.append(str(index_path))

print('Created/updated files:')

for path in created:
    print(path)