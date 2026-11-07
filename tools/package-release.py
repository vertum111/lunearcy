"""Package only the static build; local testnet credentials/tools are never included."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import hashlib, json, datetime
root=Path(__file__).resolve().parent.parent
build=root/'dist'
if not (build/'index.html').is_file():
    raise SystemExit('Run npm run build first.')
release=root/'releases'
release.mkdir(exist_ok=True)
version=json.loads((root/'package.json').read_text())['version']
output=release/f'lunearcy-v{version}-web.zip'
files=sorted(p for p in build.rglob('*') if p.is_file())
for p in files:
    rel=p.relative_to(build)
    if p.is_symlink() or any(part in {'.local','.git','node_modules'} for part in rel.parts) or p.name.startswith('.env'):
        raise SystemExit(f'Private or non-build path rejected: {rel}')
with ZipFile(output,'w',ZIP_DEFLATED,compresslevel=9) as archive:
    for p in files: archive.write(p,p.relative_to(build))
manifest={'name':'Lunearcy','version':version,'createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'staticGameOnly':True,'fileCount':len(files),'archiveBytes':output.stat().st_size,'sha256':hashlib.sha256(output.read_bytes()).hexdigest(),'networkBoundary':'Local game. Disposable NEAR testnet bridge is development-only and excluded from this archive.'}
(release/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps(manifest,indent=2))
