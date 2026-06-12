// Asset-Pipeline: löst pro Hafen ein echtes Foto über die Wikimedia-Commons-API
// auf und schreibt assets/manifest.json (nur Text/URLs, keine Binärdateien im
// Repo). Die Bilder werden zur Laufzeit von upload.wikimedia.org geladen; ohne
// Netzwerk/Manifest greift der prozedurale Fallback.
//
// Aufruf:  node tools/fetch-assets.mjs   (benötigt Internet)

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PORTS } from '../src/data/ports.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const UA = 'OceanumGame/0.1 (educational trade simulation; contact: local)';
const API = 'https://commons.wikimedia.org/w/api.php';

async function findImage(port) {
  const search = `${port.name} ${port.country} harbour port ship`;
  const url = `${API}?action=query&format=json` +
    `&generator=search&gsrsearch=${encodeURIComponent(search)}` +
    `&gsrnamespace=6&gsrlimit=6&prop=imageinfo` +
    `&iiprop=url|extmetadata&iiurlwidth=720`;
  let res;
  for (let attempt = 0; attempt < 5; attempt++) {
    res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.ok) break;
    await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));  // 1,2,4,8,16s
  }
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const data = await res.json();
  const pages = Object.values(data?.query?.pages || {});
  // bestes Treffer-Bild wählen (jpg/png, möglichst breit)
  const cand = pages
    .map(p => p.imageinfo?.[0])
    .filter(Boolean)
    .filter(ii => /\.(jpe?g|png)$/i.test(ii.url) && (ii.thumburl || ii.url))
    .sort((a, b) => (b.thumbwidth || 0) - (a.thumbwidth || 0));
  if (!cand.length) return null;
  const ii = cand[0];
  const meta = ii.extmetadata || {};
  const strip = (s) => (s || '').replace(/<[^>]*>/g, '').trim();
  return {
    url: ii.thumburl || ii.url,
    full: ii.url,
    title: strip(meta.ObjectName?.value) || port.name,
    attribution: strip(meta.Artist?.value) || 'Wikimedia Commons',
    license: strip(meta.LicenseShortName?.value) || '',
  };
}

async function pool(items, worker, size = 4) {
  const out = {};
  let i = 0;
  async function run() {
    while (i < items.length) {
      const idx = i++;
      const port = items[idx];
      try {
        const r = await findImage(port);
        if (r) { out[port.id] = r; process.stdout.write('✓'); }
        else process.stdout.write('·');
      } catch { process.stdout.write('×'); }
      await new Promise(r => setTimeout(r, 400));   // höflich drosseln
    }
  }
  await Promise.all(Array.from({ length: size }, run));
  return out;
}

(async () => {
  console.log(`Suche Hafenfotos für ${PORTS.length} Häfen …`);
  const ports = await pool(PORTS, findImage, 1);
  console.log(`\nGefunden: ${Object.keys(ports).length}/${PORTS.length}`);
  await mkdir(join(ROOT, 'assets'), { recursive: true });
  const manifest = { generatedAt: new Date().toISOString(), source: 'Wikimedia Commons', ports };
  await writeFile(join(ROOT, 'assets', 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log('assets/manifest.json geschrieben.');
})();
