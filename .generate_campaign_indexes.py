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
        try:
            data = json.loads(file.read_text(encoding='utf-8'))
        except Exception as e:
            print(f'ERROR reading {file}: {e}')
            continue
        campaign_slug = data.get('campaignSlug') or campaign_dir.name
        battle_slug = data.get('battleSlug') if data.get('battleSlug') is not None else file.stem
        if battle_slug is None:
            battle_slug = ''
        name = data.get('displayName') or data.get('name') or data.get('battle') or battle_slug or ''
        timestamp = data.get('timestamp') or data.get('date') or 0
        images = data.get('images')
        start_image = None
        if isinstance(images, dict):
            start_image = images.get('start')
        if start_image is None:
            start_image = data.get('startImage')
        entry = {
            'name': name,
            'slug': battle_slug,
            'file': f'battles/{campaign_dir.name}/{file.name}',
            'timestamp': timestamp,
            'startImage': start_image if start_image is not None else None,
        }
        entries.append(entry)
        all_battles.append({
            'id': f'{campaign_slug}/{battle_slug}' if battle_slug else f'{campaign_slug}/',
            'name': name,
            'campaign': data.get('campaign') or campaign_dir.name,
            'campaignSlug': campaign_slug,
            'battleSlug': battle_slug,
            'date': timestamp,
        })
    entries.sort(key=lambda e: e.get('timestamp') or '', reverse=True)
    index_path = campaign_dir / 'index.json'
    index_path.write_text(json.dumps(entries, indent=2), encoding='utf-8')
    created.append(str(index_path))
all_battles.sort(key=lambda e: (e.get('campaignSlug', ''), e.get('battleSlug', '')))
index_path = root / 'index.json'
index_path.write_text(json.dumps(all_battles, indent=2), encoding='utf-8')
created.append(str(index_path))
print('Created/updated files:')
for path in created:
    print(path)
