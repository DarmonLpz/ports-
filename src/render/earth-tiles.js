// Esri-World-Imagery Deep-Zoom. Lädt XYZ-Satellitenkacheln (Web-Mercator) für den
// sichtbaren Kartenausschnitt und baut daraus eine Detailtextur im equirect-UV-Raum
// (u = (lon+180)/360, v = (90-lat)/180), die earth-gl.js über die Basistextur blendet.
// Ohne Internet liefert update() null und es bleibt bei Blue Marble.

const URL = (z, x, y) =>
  `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;
const TILE = 256;
const MAXZ = 19;

function lon2tileX(lon, z) { return (lon + 180) / 360 * (1 << z); }
function lat2tileY(lat, z) {
  const r = lat * Math.PI / 180;
  return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * (1 << z);
}
function tileX2lon(x, z) { return x / (1 << z) * 360 - 180; }
function tileY2lat(y, z) {
  const n = Math.PI - 2 * Math.PI * y / (1 << z);
  return 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

export class EarthTiles {
  constructor(gl) {
    this.gl = gl;
    this.tex = gl.createTexture();
    this.cache = new Map();          // "z/x/y" -> Image | 'loading' | 'error'
    this.cv = document.createElement('canvas');
    this.cx2d = this.cv.getContext('2d');
    this.cur = null;                 // zuletzt gebautes {tex, rect}
    this.disabled = false;           // bei CORS-/Sicherheitsfehler dauerhaft aus
  }

  // Wählt die Tile-Zoomstufe so, dass ein Tile ~ Bildschirmpixel passt.
  _zoomFor(R_devicePx) {
    const worldPx = 2 * R_devicePx * Math.PI;   // Näherung der Welt-Pixelbreite
    const z = Math.round(Math.log2(worldPx / TILE));
    return Math.max(2, Math.min(MAXZ, z));
  }

  _get(z, x, y) {
    const n = 1 << z;
    x = ((x % n) + n) % n;
    if (y < 0 || y >= n) return null;
    const key = `${z}/${x}/${y}`;
    let v = this.cache.get(key);
    if (v === undefined) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => this.cache.set(key, img);
      img.onerror = () => this.cache.set(key, 'error');
      img.src = URL(z, x, y);
      this.cache.set(key, 'loading');
      if (this.cache.size > 600) this._evict();
      return null;
    }
    return (v === 'loading' || v === 'error') ? null : v;
  }

  _evict() { let i = 0; for (const k of this.cache.keys()) { if (i++ > 120) break; this.cache.delete(k); } }

  // centerLon/Lat in Grad, R_devicePx = Globusradius in Gerätepixeln,
  // viewW/Hpx = Canvas-Größe in Gerätepixeln. Liefert {tex, rect} oder null.
  update(centerLon, centerLat, R_devicePx, viewWpx, viewHpx) {
    if (this.disabled) return null;
    if (Math.abs(centerLat) > 84) { this.cur = null; return null; }  // außerhalb Web-Mercator
    // Eine Stufe gröber als „1 Tile = 1 Bildschirmtile“ → ~512 px/Tile, weniger Kacheln
    const z = Math.max(2, Math.min(MAXZ, this._zoomFor(R_devicePx) - 1));
    // On-Screen-Größe einer Kachel und nötige Kachelzahl, um den Viewport zu decken
    const tileOnScreen = (2 * Math.PI * R_devicePx) / (1 << z);
    const HALF_CAP = 4;   // max. 9×9 Kacheln
    const halfX = Math.max(1, Math.min(HALF_CAP, Math.ceil((viewWpx / 2) / tileOnScreen) + 1));
    const halfY = Math.max(1, Math.min(HALF_CAP, Math.ceil((viewHpx / 2) / tileOnScreen) + 1));
    const cxT = lon2tileX(centerLon, z), cyT = lat2tileY(centerLat, z);
    const x0 = Math.floor(cxT) - halfX, y0 = Math.floor(cyT) - halfY;
    const cols = 2 * halfX + 1, rows = 2 * halfY + 1;

    // UV-Bounds der Kachelfläche
    const lonA = tileX2lon(x0, z), lonB = tileX2lon(x0 + cols, z);
    const latTop = tileY2lat(y0, z), latBot = tileY2lat(y0 + rows, z);
    const u0 = (lonA + 180) / 360, u1 = (lonB + 180) / 360;
    const v0 = (90 - latTop) / 180, v1 = (90 - latBot) / 180;

    const Wpx = cols * TILE;
    if (this.cv.width !== Wpx || this.cv.height !== rows * TILE) {
      this.cv.width = Wpx; this.cv.height = rows * TILE;
    }
    this.cx2d.clearRect(0, 0, this.cv.width, this.cv.height);
    let any = false;
    const vSpan = (v1 - v0) || 1e-6;
    for (let r = 0; r < rows; r++) {
      const tyTop = tileY2lat(y0 + r, z), tyBot = tileY2lat(y0 + r + 1, z);
      const rv0 = (90 - tyTop) / 180, rv1 = (90 - tyBot) / 180;
      const dy = ((rv0 - v0) / vSpan) * this.cv.height;
      const dh = ((rv1 - rv0) / vSpan) * this.cv.height;
      for (let cc = 0; cc < cols; cc++) {
        const img = this._get(z, x0 + cc, y0 + r);
        if (img) { this.cx2d.drawImage(img, cc * TILE, dy, TILE, dh); any = true; }
      }
    }
    if (!any) { this.cur = null; return null; }

    const gl = this.gl;
    try {
      gl.bindTexture(gl.TEXTURE_2D, this.tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, this.cv);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    } catch (e) {
      // getaintete Canvas (kein CORS) → Tiles dauerhaft deaktivieren
      console.warn('Esri-Tiles deaktiviert (CORS/Security):', e.message);
      this.disabled = true; this.cur = null; return null;
    }
    this.cur = { tex: this.tex, rect: [u0, v0, u1, v1] };
    return this.cur;
  }
}
