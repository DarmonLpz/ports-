// Animierte Erde in orthographischer Projektion mit Tag/Nacht-Terminator.
// Stufenloser Zoom (Mausrad / Pinch / Buttons) vom kompletten Globus bis dicht
// an ein einzelnes fahrendes Schiff. Schiffe folgen exakten Großkreisrouten und
// werden je nach Zoom als Punkt, Silhouette mit Kielwasser oder Detailmodell mit
// Namensschild gezeichnet. Häfen erscheinen als leuchtende Marker mit Beschriftung.

import { DEG, gcInterpolate as gcInterp } from '../engine/util.js';
import { MASK, isLand } from '../data/world.js';
import { PORTS } from '../data/ports.js';
import { SHIP_CLASS_BY_ID } from '../data/ships.js';
import { EarthGL } from './earth-gl.js';

const TYPE_COLOR = {
  Container: '#5bd6ff', Bulker: '#f2c14e', Tanker: '#ff7a59', Gastanker: '#b388ff',
  Reefer: '#5effa5', RoRo: '#ff5ec4', Stückgut: '#9ad0ff', 'Heavy-Lift': '#ffd24a',
};

export class GlobeRenderer {
  constructor(canvas) {
    this.canvas = canvas;                 // Hintergrund (#globe)
    this.gl = EarthGL.create(canvas);     // WebGL-Erde (oder null)
    this.ctx = this.gl ? null : canvas.getContext('2d');  // 2D nur im Fallback
    this.fx = document.getElementById('globe-fx') || canvas;  // Overlay (Vektoren)
    this.fxctx = this.fx.getContext('2d');
    this.cam = { lon0: 10, lat0: 18, zoom: 1, targetZoom: 1, follow: null, autoRotate: true };
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.centerYFrac = 0.5;   // vertikale Globusmitte (auf Mobil nach oben geschoben)
    this.selected = null;
    this.onSelect = null;
    this._drag = null;
    this._landPoints = this._buildLandPoints();
    this._resize();
    window.addEventListener('resize', () => this._resize());
    this._bindInput();
  }

  _resize() {
    const r = this.canvas.getBoundingClientRect();
    const w = Math.max(1, r.width * this.dpr), h = Math.max(1, r.height * this.dpr);
    for (const c of [this.canvas, this.fx]) { c.width = w; c.height = h; }
    this.W = r.width; this.H = r.height;
    if (this.ctx) this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.fxctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  _buildLandPoints() {
    MASK.get();
    const pts = [];
    for (let lat = -84; lat <= 84; lat += 1) {
      for (let lon = -179; lon <= 179; lon += 1) {
        if (isLand(lat, lon)) {
          const φ = lat * DEG, λ = lon * DEG;
          pts.push({ lat, lon, x: Math.cos(φ) * Math.cos(λ), y: Math.cos(φ) * Math.sin(λ), z: Math.sin(φ) });
        }
      }
    }
    return pts;
  }

  get baseR() {
    // Auf Mobilgeräten den Radius an den sichtbaren oberen Bereich koppeln.
    const ref = this.centerYFrac < 0.45 ? Math.min(this.W, this.H * 2 * this.centerYFrac) : Math.min(this.W, this.H);
    return ref * 0.42;
  }
  get R() { return this.baseR * this.cam.zoom; }
  get cx() { return this.W / 2; }
  get cy() { return this.H * this.centerYFrac; }

  setLayout(mobile) { this.centerYFrac = mobile ? 0.27 : 0.5; }

  project(lat, lon) {
    const φ = lat * DEG, λ = lon * DEG;
    const φ0 = this.cam.lat0 * DEG, λ0 = this.cam.lon0 * DEG;
    const dλ = λ - λ0;
    const cosc = Math.sin(φ0) * Math.sin(φ) + Math.cos(φ0) * Math.cos(φ) * Math.cos(dλ);
    const x = Math.cos(φ) * Math.sin(dλ);
    const y = Math.cos(φ0) * Math.sin(φ) - Math.sin(φ0) * Math.cos(φ) * Math.cos(dλ);
    return { x: this.cx + this.R * x, y: this.cy - this.R * y, visible: cosc >= -0.02, cosc };
  }

  // ---- Eingabe: 1 Finger/Maus = drehen, 2 Finger = Pinch-Zoom, Wheel = Zoom ----
  _bindInput() {
    const c = this.fx;
    this._ptrs = new Map();      // pointerId -> {x,y}
    this._moved = 0;
    this._pinchDist = 0;

    c.addEventListener('pointerdown', (e) => {
      this._ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      this.cam.autoRotate = false;
      this._moved = 0;
      if (this._ptrs.size === 2) this._pinchDist = this._twoFingerDist();
      try { c.setPointerCapture(e.pointerId); } catch {}
    });

    c.addEventListener('pointermove', (e) => {
      const prev = this._ptrs.get(e.pointerId);
      if (!prev) return;
      const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
      this._ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      this._moved += Math.abs(dx) + Math.abs(dy);

      if (this._ptrs.size >= 2) {
        // Pinch-to-Zoom
        const d = this._twoFingerDist();
        if (this._pinchDist > 0) {
          this.cam.targetZoom = Math.max(1, Math.min(60, this.cam.targetZoom * (d / this._pinchDist)));
        }
        this._pinchDist = d;
      } else {
        // Drehen
        const k = 0.25 / this.cam.zoom;
        this.cam.lon0 -= dx * k;
        this.cam.lat0 = Math.max(-85, Math.min(85, this.cam.lat0 + dy * k));
        this.cam.follow = null;
      }
    });

    const end = (e) => {
      const wasOne = this._ptrs.size === 1;
      this._ptrs.delete(e.pointerId);
      if (wasOne && this._moved < 8) this._pick(e.clientX, e.clientY);
      if (this._ptrs.size < 2) this._pinchDist = 0;
    };
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);

    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      const f = Math.exp(-e.deltaY * 0.0015);
      this.cam.targetZoom = Math.max(1, Math.min(60, this.cam.targetZoom * f));
    }, { passive: false });
  }

  _twoFingerDist() {
    const p = [...this._ptrs.values()];
    if (p.length < 2) return 0;
    return Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
  }

  zoomBy(f) { this.cam.targetZoom = Math.max(1, Math.min(60, this.cam.targetZoom * f)); }
  resetView() { this.cam.targetZoom = 1; this.cam.follow = null; this.cam.autoRotate = true; }

  follow(target) {              // target = {lat, lon} live-Referenz oder Schiff
    this.cam.follow = target;
    this.cam.autoRotate = false;
    if (this.cam.targetZoom < 8) this.cam.targetZoom = 14;
  }

  _pick(clientX, clientY) {
    const r = this.fx.getBoundingClientRect();
    const px = clientX - r.left, py = clientY - r.top;
    let best = null, bestD = 18 * 18;
    for (const s of this._ships ?? []) {
      const p = this.project(s.pos.lat, s.pos.lon);
      if (!p.visible) continue;
      const d = (p.x - px) ** 2 + (p.y - py) ** 2;
      if (d < bestD) { bestD = d; best = { kind: 'ship', ref: s }; }
    }
    for (const port of PORTS) {
      const p = this.project(port.lat, port.lon);
      if (!p.visible) continue;
      const d = (p.x - px) ** 2 + (p.y - py) ** 2;
      if (d < bestD) { bestD = d; best = { kind: 'port', ref: port }; }
    }
    if (best) { this.selected = best; this.onSelect?.(best); }
  }

  // ---- Rendering ----
  render(state, subsolar, dtMs) {
    const ctx = this.ctx;
    this._ships = state.fleet.ships;

    // sanfter Zoom & Auto-Rotation & Verfolgung
    this.cam.zoom += (this.cam.targetZoom - this.cam.zoom) * Math.min(1, dtMs / 140);
    if (this.cam.follow) {
      this.cam.lon0 += (((this.cam.follow.lon ?? this.cam.follow.pos?.lon) - this.cam.lon0 + 540) % 360 - 180) * 0.12;
      const tlat = this.cam.follow.lat ?? this.cam.follow.pos?.lat;
      this.cam.lat0 += (tlat - this.cam.lat0) * 0.12;
    } else if (this.cam.autoRotate) {
      this.cam.lon0 += dtMs * 0.0016;
    }
    this.cam.lon0 = ((this.cam.lon0 + 180) % 360 + 360) % 360 - 180;

    // Sonnenvektor für Tag/Nacht
    const sφ = subsolar.lat * DEG, sλ = subsolar.lon * DEG;
    const sun = [Math.cos(sφ) * Math.cos(sλ), Math.cos(sφ) * Math.sin(sλ), Math.sin(sφ)];

    if (this.gl) {
      this.gl.render({
        resW: this.canvas.width, resH: this.canvas.height,
        cx: this.cx * this.dpr, cy: this.cy * this.dpr, R: this.R * this.dpr,
        lon0: this.cam.lon0 * DEG, lat0: this.cam.lat0 * DEG, sun,
        detail: this._detail || null,
      });
    } else {
      ctx.clearRect(0, 0, this.W, this.H);
      this._drawSpace(ctx);
      this._drawOcean(ctx, sun);
      this._drawLand(ctx, sun);
      this._drawGraticule(ctx);
      this._drawTerminatorGlow(ctx);
    }

    // Vektor-Overlay (immer Canvas2D)
    this.fxctx.clearRect(0, 0, this.W, this.H);
    this._drawRoutes(this.fxctx, state);
    this._drawPorts(this.fxctx);
    this._drawShips(this.fxctx, state);
  }

  _drawSpace(ctx) {
    ctx.fillStyle = '#03060f';
    ctx.fillRect(0, 0, this.W, this.H);
    // ferne Sterne
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    if (!this._stars) {
      this._stars = [];
      for (let i = 0; i < 220; i++) this._stars.push([Math.random(), Math.random(), Math.random() * 1.4]);
    }
    for (const [sx, sy, r] of this._stars) ctx.fillRect(sx * this.W, sy * this.H, r, r);
  }

  _drawOcean(ctx, sun) {
    const R = this.R;
    const grd = ctx.createRadialGradient(this.cx, this.cy, R * 0.1, this.cx, this.cy, R);
    grd.addColorStop(0, '#0b2c4a');
    grd.addColorStop(0.7, '#07223b');
    grd.addColorStop(1, '#04101d');
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.cx, this.cy, R, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = grd;
    ctx.fillRect(this.cx - R, this.cy - R, R * 2, R * 2);
    ctx.restore();
  }

  _light(nx, ny, nz, sun) {
    return nx * sun[0] + ny * sun[1] + nz * sun[2]; // -1..1
  }

  _drawLand(ctx, sun) {
    const stride = Math.max(1, Math.round(2.4 / this.cam.zoom));
    const size = Math.max(1, Math.min(6, 1.1 * this.cam.zoom * (this.baseR / 320)));
    const pts = this._landPoints;
    for (let i = 0; i < pts.length; i += stride) {
      const pt = pts[i];
      const p = this.project(pt.lat, pt.lon);
      if (!p.visible || p.cosc < 0) continue;
      if (p.x < -size || p.x > this.W + size || p.y < -size || p.y > this.H + size) continue;
      const l = this._light(pt.x, pt.y, pt.z, sun);     // -1..1
      let r, g, b;
      if (l > 0) {                                       // Tagseite: grün/braun
        const t = Math.min(1, l);
        r = 40 + t * 70; g = 90 + t * 95; b = 50 + t * 35;
      } else {                                           // Nachtseite: dunkel
        const t = Math.max(0, l + 1);
        r = 12 + t * 14; g = 18 + t * 20; b = 24 + t * 22;
      }
      ctx.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
      ctx.fillRect(p.x - size / 2, p.y - size / 2, size, size);
    }
  }

  _drawGraticule(ctx) {
    if (this.cam.zoom > 6) return;
    ctx.strokeStyle = 'rgba(120,180,255,0.06)';
    ctx.lineWidth = 1;
    for (let lat = -60; lat <= 60; lat += 30) this._strokeParallel(ctx, lat);
    for (let lon = -180; lon < 180; lon += 30) this._strokeMeridian(ctx, lon);
  }
  _strokeParallel(ctx, lat) {
    ctx.beginPath(); let started = false;
    for (let lon = -180; lon <= 180; lon += 4) {
      const p = this.project(lat, lon);
      if (!p.visible) { started = false; continue; }
      if (!started) { ctx.moveTo(p.x, p.y); started = true; } else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }
  _strokeMeridian(ctx, lon) {
    ctx.beginPath(); let started = false;
    for (let lat = -85; lat <= 85; lat += 4) {
      const p = this.project(lat, lon);
      if (!p.visible) { started = false; continue; }
      if (!started) { ctx.moveTo(p.x, p.y); started = true; } else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }

  _drawRoutes(ctx, state) {
    ctx.lineWidth = Math.max(1, this.cam.zoom * 0.4);
    for (const s of state.fleet.ships) {
      if (s.status !== 'enroute' || !s.voyage) continue;
      const isPlayer = s.owner === 'player';
      const a = PORTS.find(p => p.id === s.voyage.fromId);
      const b = PORTS.find(p => p.id === s.voyage.toId);
      if (!a || !b) continue;
      ctx.strokeStyle = isPlayer ? 'rgba(95,214,255,0.55)' : 'rgba(150,170,200,0.16)';
      ctx.setLineDash(isPlayer ? [] : [4, 6]);
      this._strokeGreatCircle(ctx, a.lat, a.lon, b.lat, b.lon);
    }
    ctx.setLineDash([]);
  }
  _strokeGreatCircle(ctx, lat1, lon1, lat2, lon2) {
    ctx.beginPath(); let started = false;
    const N = 48;
    for (let i = 0; i <= N; i++) {
      const f = i / N;
      const [lat, lon] = gcInterp(lat1, lon1, lat2, lon2, f);
      const p = this.project(lat, lon);
      if (!p.visible) { started = false; continue; }
      if (!started) { ctx.moveTo(p.x, p.y); started = true; } else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }

  _drawPorts(ctx) {
    const showLabel = this.cam.zoom > 2.2;
    for (const port of PORTS) {
      const p = this.project(port.lat, port.lon);
      if (!p.visible || p.cosc < 0) continue;
      const sel = this.selected?.kind === 'port' && this.selected.ref.id === port.id;
      const r = (1.6 + port.size * 0.9) * Math.min(2.4, 0.6 + this.cam.zoom * 0.25);
      ctx.beginPath();
      ctx.arc(p.x, p.y, r + 2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,210,120,0.18)';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = sel ? '#ffffff' : '#ffcd6b';
      ctx.fill();
      if (showLabel || sel) {
        ctx.font = `${sel ? 'bold ' : ''}${Math.min(15, 9 + this.cam.zoom)}px system-ui, sans-serif`;
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        ctx.textBaseline = 'middle';
        ctx.fillText(port.name, p.x + r + 4, p.y);
      }
    }
  }

  _bearing(lat1, lon1, lat2, lon2) {
    const φ1 = lat1 * DEG, φ2 = lat2 * DEG, dλ = (lon2 - lon1) * DEG;
    const y = Math.sin(dλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(dλ);
    return Math.atan2(y, x);
  }

  _drawShips(ctx, state) {
    const z = this.cam.zoom;
    for (const s of state.fleet.ships) {
      const p = this.project(s.pos.lat, s.pos.lon);
      if (!p.visible || p.cosc < 0) continue;
      const isPlayer = s.owner === 'player';
      const sel = this.selected?.kind === 'ship' && this.selected.ref.id === s.id;
      const col = TYPE_COLOR[s.type] || '#9ad0ff';

      // Kurs für Ausrichtung
      let ang = 0;
      if (s.voyage) {
        const b = PORTS.find(pp => pp.id === s.voyage.toId);
        if (b) {
          const br = this._bearing(s.pos.lat, s.pos.lon, b.lat, b.lon);
          // in Bildschirmwinkel umsetzen (Nord oben am Projektionspunkt – Näherung)
          const pAhead = this.project(...gcInterp(s.pos.lat, s.pos.lon, b.lat, b.lon, 0.01));
          ang = Math.atan2(pAhead.y - p.y, pAhead.x - p.x);
        }
      }

      if (z < 3.5) {
        // weit weg: einfacher Punkt
        ctx.beginPath();
        ctx.arc(p.x, p.y, isPlayer ? 3 : 2, 0, Math.PI * 2);
        ctx.fillStyle = isPlayer ? col : 'rgba(170,190,215,0.7)';
        ctx.fill();
      } else {
        // nah: Silhouette mit Kielwasser
        const L = Math.min(46, 4 + z * 1.6) * (0.7 + s.cls.tier * 0.12);
        const Wd = L * 0.34;
        // Kielwasser
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(ang);
        const wake = ctx.createLinearGradient(-L * 2.4, 0, -L * 0.4, 0);
        wake.addColorStop(0, 'rgba(180,225,255,0)');
        wake.addColorStop(1, 'rgba(180,225,255,0.28)');
        ctx.fillStyle = wake;
        ctx.beginPath();
        ctx.moveTo(-L * 0.4, -Wd * 0.18);
        ctx.lineTo(-L * 2.4, -Wd * 0.6);
        ctx.lineTo(-L * 2.4, Wd * 0.6);
        ctx.lineTo(-L * 0.4, Wd * 0.18);
        ctx.closePath();
        ctx.fill();
        // Rumpf (Schiffsform von oben)
        ctx.fillStyle = isPlayer ? col : '#8fa6c0';
        ctx.beginPath();
        ctx.moveTo(L * 0.6, 0);
        ctx.lineTo(L * 0.18, -Wd * 0.5);
        ctx.lineTo(-L * 0.42, -Wd * 0.5);
        ctx.lineTo(-L * 0.42, Wd * 0.5);
        ctx.lineTo(L * 0.18, Wd * 0.5);
        ctx.closePath();
        ctx.fill();
        // Aufbauten
        ctx.fillStyle = 'rgba(20,30,45,0.85)';
        ctx.fillRect(-L * 0.38, -Wd * 0.32, L * 0.16, Wd * 0.64);
        if (sel) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke(); }
        ctx.restore();

        if (z > 7 || sel) {
          ctx.font = `${sel ? 'bold ' : ''}11px system-ui, sans-serif`;
          ctx.fillStyle = 'rgba(255,255,255,0.9)';
          ctx.textBaseline = 'bottom';
          ctx.fillText(s.name, p.x + 8, p.y - 8);
        }
      }
      if (s.status === 'nofuel') {
        ctx.fillStyle = '#ff5050';
        ctx.font = '12px system-ui'; ctx.fillText('⛽', p.x + 6, p.y + 4);
      }
    }
  }

  _drawTerminatorGlow(ctx) {
    // feiner Atmosphären-Ring
    const R = this.R;
    ctx.save();
    ctx.beginPath();
    const g = ctx.createRadialGradient(this.cx, this.cy, R * 0.96, this.cx, this.cy, R + R * 0.06);
    g.addColorStop(0, 'rgba(90,170,255,0)');
    g.addColorStop(1, 'rgba(90,170,255,0.20)');
    ctx.fillStyle = g;
    ctx.arc(this.cx, this.cy, R + R * 0.06, 0, Math.PI * 2);
    ctx.arc(this.cx, this.cy, R * 0.96, 0, Math.PI * 2, true);
    ctx.fill('evenodd');
    ctx.restore();
  }
}
