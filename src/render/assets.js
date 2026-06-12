// Asset-Pipeline mit prozeduralem Fallback.
// Lädt zur Laufzeit ein Manifest (assets/manifest.json) mit echten Hafenfotos
// (z. B. von Wikimedia Commons). Ist kein Manifest/Bild vorhanden oder offline,
// greift überall die prozedurale SVG-/Canvas-Grafik. So bleibt das Spiel ohne
// Netzwerk voll spielbar, zeigt online aber echte Bilder.

export const PORT_PHOTOS = {};   // portId -> { url, attribution, title }
let _loaded = false;

export async function loadManifest() {
  if (_loaded) return PORT_PHOTOS;
  _loaded = true;
  try {
    const res = await fetch('assets/manifest.json', { cache: 'force-cache' });
    if (res.ok) {
      const data = await res.json();
      Object.assign(PORT_PHOTOS, data.ports || {});
    }
  } catch { /* offline / kein Manifest -> prozedural */ }
  return PORT_PHOTOS;
}

export function portPhoto(portId) { return PORT_PHOTOS[portId] || null; }

// Liefert HTML, das ein echtes Foto über die prozedurale Szene blendet, sobald
// es geladen ist; bei Ladefehler bleibt nur die Szene sichtbar.
export function photoOverlayHTML(portId) {
  const p = portPhoto(portId);
  if (!p) return '';
  const safe = p.url.replace(/"/g, '&quot;');
  return `<img class="portphoto" src="${safe}" loading="lazy"
    onload="this.classList.add('shown')" onerror="this.remove()"
    alt="${(p.title || '').replace(/"/g, '')}" />`;
}
