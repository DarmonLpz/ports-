# Erde, Startbedingungen & Dropdown-Fix — Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Den Dropdown-Schließbug beheben, den Spielstart auf Heimathafen-Wahl + 30 Mio. ohne Schiffe umstellen und den prozeduralen Globus durch einen WebGL-Globus mit echter Erdtextur + Online-Deep-Zoom (Esri) ersetzen.

**Architecture:** Vanilla ES-Module, kein Build. Der Globus wird auf zwei gestapelte Canvas-Ebenen aufgeteilt: ein WebGL-Canvas (`#globe`) für die texturierte Kugel inkl. Tag/Nacht, Sterne und Atmosphäre, darüber ein transparenter 2D-Overlay-Canvas (`#globe-fx`) für Routen/Häfen/Schiffe/Labels. Die `GlobeRenderer`-API und die `project()`-Mathematik bleiben unverändert, damit `main.js`/`ui.js` nur minimal angefasst werden.

**Tech Stack:** JavaScript (ES-Module), Canvas2D, WebGL1 (GLSL ES 1.00), Esri World Imagery XYZ-Tiles (online), NASA Blue Marble (gebündeltes JPG).

**Verifikation:** Es gibt kein Test-Framework. Jede Code-Datei wird mit `node --check <datei>` syntaxgeprüft; funktionale Prüfung erfolgt im Browser über den Dev-Server (`node server.js`, dann http://localhost:8080). Browser-Schritte sind explizit beschrieben.

**Hinweis zur Erdtextur:** Die Basistextur wird als **8192×4096** Blue Marble (eine Textur, keine Nähte, innerhalb aller gängigen GPU-Limits) ausgeliefert. Eine echte 21K-Einzeltextur ist im Browser nicht praktikabel (Decode ~930 MB, über GPU-Limit). Das Nah-Detail liefern die Esri-Tiles.

---

## Dateienüberblick

| Datei | Verantwortung | Änderung |
|---|---|---|
| `src/ui/ui.js` | UI, Panels, Heimathafen-Overlay, tickUI-Fix, Tutorial | Modify |
| `src/engine/state.js` | Startkapital, keine Starterflotte, `homePortId`, `buyShip`-Default | Modify |
| `src/engine/save.js` | `homePortId` speichern/laden | Modify |
| `src/main.js` | Start-Flow (Heimathafen-Overlay), Overlay-Canvas anlegen, Esri-Attribution | Modify |
| `index.html` | zweiter Canvas `#globe-fx`, Esri-Attribution-Element | Modify |
| `src/render/globe.js` | Dual-Canvas-Umbau, Vektor-Layer aufs Overlay, WebGL-Anbindung, prozeduraler Fallback | Modify |
| `src/render/earth-gl.js` | WebGL-Sphere-Renderer (Shader, Blue-Marble-Textur, Tag/Nacht, Sterne, Atmosphäre) | Create |
| `src/render/earth-tiles.js` | Esri-Deep-Zoom: Tile-Fetch, Detailtextur, Cache, Offline-Fallback | Create |
| `assets/earth/bluemarble-8k.jpg` | gebündelte Basistextur | Create (Binärasset) |
| `styles/main.css` | Layout `#globe-fx`, Attribution | Modify |

---

# TEIL A — Dropdown-Bug

## Task 1: tickUI überspringt Re-Render bei Fokus im Panel

**Files:**
- Modify: `src/ui/ui.js` (Methode `tickUI`, ~Zeile 243-256)

- [ ] **Step 1: tickUI anpassen**

In `src/ui/ui.js` die `tickUI`-Methode so ändern, dass das zeitgesteuerte Voll-Render aussetzt, solange ein Bedienelement im Panel den Fokus hat. Ersetze den Block

```js
    // aktives Panel selten neu rendern, um Interaktion nicht zu stören
    if (now - this._lastFull > 1500) { this._lastFull = now; this.renderTab(); }
```

durch

```js
    // aktives Panel selten neu rendern, um Interaktion nicht zu stören.
    // Nicht neu rendern, solange der Spieler ein Bedienelement im Panel benutzt
    // (offenes Dropdown / fokussiertes Eingabefeld) – sonst klappt z. B. die
    // Frachtauswahl mitten im Aussuchen wieder zu.
    if (now - this._lastFull > 1500 && !this._panelInteracting()) {
      this._lastFull = now; this.renderTab();
    }
```

- [ ] **Step 2: Hilfsmethode `_panelInteracting` ergänzen**

Direkt nach `tickUI` (vor `_set`) einfügen:

```js
  _panelInteracting() {
    const a = document.activeElement;
    if (!a) return false;
    const panel = this.root.querySelector('#panel');
    if (!panel || !panel.contains(a)) return false;
    return a.tagName === 'SELECT' || a.tagName === 'INPUT' || a.tagName === 'TEXTAREA';
  }
```

- [ ] **Step 3: Syntaxprüfung**

Run: `node --check src/ui/ui.js`
Expected: kein Output (Exit 0).

- [ ] **Step 4: Browser-Test**

Run: `node server.js` (Hintergrund), dann http://localhost:8080 öffnen, Reiter **Flotte**, ein Schiff im Hafen wählen, das **Laden-Dropdown** öffnen und ~3 s offen lassen.
Expected: Das Dropdown bleibt offen und schließt sich nicht mehr von selbst. Topbar-Datum läuft weiter.

- [ ] **Step 5: Commit**

```bash
git add src/ui/ui.js
git commit -m "Fix: Frachtauswahl-Dropdown bleibt offen (kein Re-Render bei Panel-Fokus)"
```

---

# TEIL B — Startbedingungen

## Task 2: GameState — 30 Mio., keine Starterflotte, homePortId

**Files:**
- Modify: `src/engine/state.js` (Konstruktor ~Zeile 16-34, `buyShip` ~Zeile 118-128)

- [ ] **Step 1: Konstruktor anpassen**

In `src/engine/state.js` im Konstruktor `this.cash = 75_000_000;` ersetzen durch:

```js
    this.cash = 30_000_000;
    this.homePortId = null;   // wird bei „Neues Spiel“ über die Heimathafen-Wahl gesetzt
```

und die Zeile `this.fleet.giveStarterFleet('player');` **entfernen**.

- [ ] **Step 2: buyShip-Default auf Heimathafen**

In `buyShip(classId, atPortId)` die erste Zeile des Rumpfs um einen Default ergänzen. Aus

```js
  buyShip(classId, atPortId) {
    const cls = SHIP_CLASS_BY_ID[classId];
```

wird

```js
  buyShip(classId, atPortId) {
    atPortId = atPortId || this.homePortId || 'hamburg';
    const cls = SHIP_CLASS_BY_ID[classId];
```

- [ ] **Step 3: Syntaxprüfung**

Run: `node --check src/engine/state.js`
Expected: kein Output (Exit 0).

- [ ] **Step 4: Commit**

```bash
git add src/engine/state.js
git commit -m "Start: 30 Mio. Kapital, keine Starterflotte, Heimathafen-Feld"
```

## Task 3: Heimathafen-Auswahl-Overlay in der UI

**Files:**
- Modify: `src/ui/ui.js` (neue Methoden + `_onClick`-Fall)

- [ ] **Step 1: Overlay-Methoden ergänzen**

In `src/ui/ui.js` direkt vor `showTutorial()` einfügen:

```js
  // ---------- Heimathafen-Auswahl (Spielstart) ----------
  showHomePortPicker(onPick) {
    this._homePick = onPick;
    this._homeFilter = 'all';
    if (!this._homeEl) {
      this._homeEl = document.createElement('div');
      this._homeEl.id = 'homepicker';
      this.root.appendChild(this._homeEl);
    }
    this._renderHomePicker();
  }
  _renderHomePicker() {
    const regions = ['all', ...Object.keys(REGIONS)];
    const filt = this._homeFilter;
    const shown = PORTS.filter(p => filt === 'all' || p.region === filt);
    const chips = regions.map(r =>
      `<button data-act="home-filter" data-r="${r}" class="chip ${r===filt?'on':''}">${r==='all'?'Alle':REGIONS[r]}</button>`).join('');
    const list = shown.map(p =>
      `<button class="portrow" data-act="home-pick" data-id="${p.id}">
        <b>${flagEmoji(p.country)} ${p.name}</b><small>${p.country} · ${REGIONS[p.region]}</small></button>`).join('');
    this._homeEl.innerHTML = `<div class="home-card">
      <div class="tut-emoji">⚓</div>
      <h3>Wähle deinen Heimathafen</h3>
      <p class="muted">Hier startest du dein Handelsimperium. Du beginnst mit 30 Mio. $ und ohne Schiffe –
        kaufe dein erstes Schiff anschließend in der <b>Werft</b>.</p>
      <div class="chips">${chips}</div>
      <div class="home-list">${list}</div>
    </div>`;
  }
  _pickHome(id) {
    if (this._homeEl) { this._homeEl.remove(); this._homeEl = null; }
    const cb = this._homePick; this._homePick = null;
    cb?.(id);
  }
```

- [ ] **Step 2: Klick-Fälle ergänzen**

In `_onClick`, im `switch (act)`, vor `case 'tutorial':` einfügen:

```js
      case 'home-filter': this._homeFilter = el.dataset.r; this._renderHomePicker(); break;
      case 'home-pick': this._pickHome(el.dataset.id); break;
```

- [ ] **Step 3: Syntaxprüfung**

Run: `node --check src/ui/ui.js`
Expected: kein Output (Exit 0).

- [ ] **Step 4: CSS für das Overlay**

In `styles/main.css` am Ende ergänzen (am Tutorial-Stil orientiert):

```css
#homepicker { position: fixed; inset: 0; z-index: 60; display: grid; place-items: center;
  background: rgba(3,8,18,0.72); backdrop-filter: blur(3px); }
.home-card { width: min(560px, 92vw); max-height: 86vh; overflow: auto; background: #0c1726;
  border: 1px solid rgba(120,180,255,0.18); border-radius: 14px; padding: 22px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.5); }
.home-card h3 { margin: 6px 0 4px; }
.home-list { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 10px; }
@media (max-width: 560px) { .home-list { grid-template-columns: 1fr; } }
```

- [ ] **Step 5: Commit**

```bash
git add src/ui/ui.js styles/main.css
git commit -m "UI: Heimathafen-Auswahl-Overlay für den Spielstart"
```

## Task 4: Start-Flow, Tutorial-Text und Save/Load für homePortId

**Files:**
- Modify: `src/main.js` (`newState`, `onNew`, Erststart), `src/ui/ui.js` (Tutorial-Text), `src/engine/save.js` (`snapshot`/`restore`)

- [ ] **Step 1: main.js — Start-Flow mit Heimathafen-Wahl**

In `src/main.js` `newState()` ersetzen durch:

```js
function newState() {
  const s = new GameState();
  s.clock.speed = 0.6;     // Standard „1×“: ~40 Echtsekunden pro Spieltag
  return s;
}

// Zeigt die Heimathafen-Wahl und initialisiert das Spiel danach.
function startNewGame() {
  state = newState();
  globe.resetView();
  ui.setState(state);
  ui.showHomePortPicker((portId) => {
    state.homePortId = portId;
    ui._yardPort = portId;
    state.notify(`Heimathafen ${PORTS_BY_ID[portId].name} gewählt. Kaufe dein erstes Schiff in der Werft.`, 'info');
    ui.renderTab();
    // Tutorial erst nach der Heimathafen-Wahl zeigen (sofern noch nicht gesehen)
    let tutDone = false;
    try { tutDone = !!localStorage.getItem('oceanum_tut_done'); } catch {}
    if (!tutDone) ui.showTutorial();
  });
}
```

Den Import oben um `PORTS_BY_ID` erweitern:

```js
import { PORTS_BY_ID } from './data/ports.js';
```

Den Block, der `state` initialisiert (Zeile `let state = loadFromStorage() || newState();`), ersetzen durch:

```js
let state = loadFromStorage();
```

Und `app.onNew` ersetzen durch:

```js
  onNew() { clearSave(); startNewGame(); ui._toast({ ok: true, msg: 'Neues Spiel gestartet.' }); },
```

Nach der UI-Initialisierung (nach `const ui = new UI(...)`) und vor der Render-Schleife sicherstellen, dass bei fehlendem Spielstand der Start-Flow läuft. Direkt nach der Zeile mit `loadManifest().then(...)` einfügen:

```js
// Ohne vorhandenen Spielstand: Heimathafen-Wahl zum Einstieg
if (!state) startNewGame();
```

- [ ] **Step 2: main.js — UI/Globe mit evtl. leerem state initialisieren**

`startNewGame` setzt `state` neu und ruft `ui.setState`. Damit `new UI(state, ...)` und der erste Frame nicht an `state === null` scheitern, muss vor `new UI(...)` ein Zustand existieren. Ändere die Initialisierung so, dass ein temporärer Zustand erzeugt wird, falls keiner geladen wurde:

Ersetze `let state = loadFromStorage();` durch:

```js
let state = loadFromStorage();
const hadSave = !!state;
if (!state) state = newState();   // temporär, bis Heimathafen gewählt ist
```

Und den Erststart-Block am Ende anpassen zu:

```js
// Ohne vorhandenen Spielstand: Heimathafen-Wahl zum Einstieg
if (!hadSave) startNewGame();
```

(Der temporäre `newState()` ohne Heimathafen ist unkritisch: Es gibt keine Schiffe, der Spieler interagiert erst nach der Wahl.)

- [ ] **Step 3: Alten Tutorial-Trigger entfernen**

Das Tutorial wird jetzt aus dem `showHomePortPicker`-Callback (Step 1) gestartet, also nach der Heimathafen-Wahl. Entferne daher in `src/main.js` den bestehenden Erststart-Block

```js
// Tutorial beim ersten Start
let tutDone = false;
try { tutDone = !!localStorage.getItem('oceanum_tut_done'); } catch {}
if (!tutDone && !hasSave()) ui.showTutorial();
```

vollständig. (Bei vorhandenem Spielstand startet weder Picker noch Tutorial; bei neuem Spiel kommt das Tutorial nach der Hafenwahl.) Der Import von `hasSave` aus `./engine/save.js` kann bleiben oder entfernt werden, falls sonst ungenutzt – beides ist syntaktisch gültig.

- [ ] **Step 4: Tutorial-Inhalt anpassen (ui.js)**

In `src/ui/ui.js` im `TUTORIAL`-Array den dritten Eintrag (`icon: '🚢', title: 'Handeln'`) **davor** um einen neuen Schritt ergänzen. Füge als neues Element vor dem `'Handeln'`-Objekt ein:

```js
  { icon: '⚓', title: 'Heimathafen & erstes Schiff', body: 'Du startest mit <b>30 Mio. $</b> und <b>ohne Schiffe</b> in deinem gewählten Heimathafen. Geh in die <b>Werft</b> und kaufe dein erstes Schiff – zum Beispiel einen günstigen <b>Feeder</b> oder <b>Mehrzweckfrachter</b>.' },
```

- [ ] **Step 5: save.js — homePortId speichern/laden**

In `src/engine/save.js` in `snapshot(state)` dem Rückgabeobjekt das Feld hinzufügen (z. B. direkt nach `seed: state.seed,`):

```js
    homePortId: state.homePortId ?? null,
```

In `restore(data)` nach `g.cash = data.cash; g.lastDay = data.lastDay;` ergänzen:

```js
  g.homePortId = data.homePortId ?? (data.fleet?.ships?.[0]?.atPortId) ?? 'hamburg';
```

- [ ] **Step 6: Syntaxprüfung**

Run: `node --check src/main.js && node --check src/ui/ui.js && node --check src/engine/save.js`
Expected: kein Output (Exit 0).

- [ ] **Step 7: Browser-Test**

`node server.js`, http://localhost:8080. localStorage vorher leeren (DevTools → Application → Local Storage → `oceanum_save_v1` und `oceanum_tut_done` löschen) bzw. Menü **🆕 Neues Spiel**.
Expected: Heimathafen-Overlay erscheint, Regionsfilter funktioniert, Klick auf einen Hafen schließt es; Kapital zeigt 30 Mio., Flotte ist leer; in der **Werft** ist der gewählte Hafen vorausgewählt; Schiffkauf dort funktioniert. Nach Reload bleibt `homePortId` erhalten (Werft-Default stimmt).

- [ ] **Step 8: Commit**

```bash
git add src/main.js src/ui/ui.js src/engine/save.js
git commit -m "Start-Flow: Heimathafen-Wahl, angepasstes Tutorial, homePortId persistiert"
```

---

# TEIL C — WebGL-Erde

## Task 5: Dual-Canvas-Gerüst — Overlay-Canvas + Vektor-Layer trennen

Ziel dieses Tasks: Einen zweiten, transparenten 2D-Canvas `#globe-fx` über `#globe` legen und die Vektor-Zeichnungen (Routen/Häfen/Schiffe) sowie das Picking dorthin verlagern. `#globe` rendert vorerst weiterhin den **prozeduralen** Globus (unverändert) als Hintergrund — WebGL kommt in Task 6. Danach ist die Architektur umgestellt, ohne dass sich das Bild ändert.

**Files:**
- Modify: `index.html`
- Modify: `styles/main.css`
- Modify: `src/render/globe.js`
- Modify: `src/main.js`

- [ ] **Step 1: index.html — zweiten Canvas einfügen**

In `index.html` die Zeile `<canvas id="globe"></canvas>` ersetzen durch:

```html
  <canvas id="globe"></canvas>
  <canvas id="globe-fx"></canvas>
  <div id="earth-credit" hidden>Satellitenbilder: Esri, Maxar, Earthstar Geographics</div>
```

- [ ] **Step 2: styles/main.css — Overlay positionieren**

Suche die bestehende `#globe`-Regel in `styles/main.css`. Ergänze (bzw. füge hinzu), sodass beide Canvas deckungsgleich liegen und das Overlay die Eingaben erhält:

```css
#globe, #globe-fx { position: fixed; inset: 0; width: 100%; height: 100%; display: block; }
#globe { z-index: 0; }
#globe-fx { z-index: 1; }
#earth-credit { position: fixed; right: 8px; bottom: 6px; z-index: 2; font-size: 11px;
  color: rgba(220,235,255,0.6); background: rgba(3,8,18,0.4); padding: 2px 6px; border-radius: 4px;
  pointer-events: none; }
```

(Falls `#globe` bereits Positionierung hat, nur `#globe-fx` analog ergänzen und die `z-index` setzen.)

- [ ] **Step 3: globe.js — Konstruktor auf zwei Canvas umstellen**

In `src/render/globe.js` den Konstruktor so ändern, dass der übergebene Canvas der **Hintergrund** ist und ein zweiter Canvas (`#globe-fx`) als Overlay genutzt wird. Ersetze den Konstruktor-Kopf

```js
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
```

durch

```js
  constructor(canvas) {
    this.canvas = canvas;                 // Hintergrund (#globe) – Prozedural/WebGL
    this.ctx = canvas.getContext('2d');   // wird in Task 6 durch WebGL ersetzt
    this.fx = document.getElementById('globe-fx') || canvas;  // Overlay (Vektoren)
    this.fxctx = this.fx.getContext('2d');
```

- [ ] **Step 4: globe.js — Resize für beide Canvas**

`_resize()` so ändern, dass beide Canvas dieselbe Größe bekommen. Ersetze `_resize()` durch:

```js
  _resize() {
    const r = this.canvas.getBoundingClientRect();
    const w = Math.max(1, r.width * this.dpr), h = Math.max(1, r.height * this.dpr);
    for (const c of [this.canvas, this.fx]) { c.width = w; c.height = h; }
    this.W = r.width; this.H = r.height;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.fxctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }
```

- [ ] **Step 5: globe.js — Eingabe-Bindung auf Overlay**

In `_bindInput()` die lokale Variable `const c = this.canvas;` ersetzen durch `const c = this.fx;` (Pointer/Wheel-Events am Overlay, das oben liegt). Im `_pick(clientX, clientY)` die Zeile `const r = this.canvas.getBoundingClientRect();` ersetzen durch `const r = this.fx.getBoundingClientRect();`.

- [ ] **Step 6: globe.js — Vektoren aufs Overlay rendern**

In `render(...)` die Vektor-Zeichnungen auf den Overlay-Kontext umlenken und den Overlay vor dem Zeichnen leeren. Im `render`-Rumpf:

1. Direkt nach `ctx.clearRect(0, 0, this.W, this.H);` (Hintergrund) ergänzen:

```js
    this.fxctx.clearRect(0, 0, this.W, this.H);
```

2. Die Aufrufe `this._drawRoutes(ctx, state); this._drawPorts(ctx); this._drawShips(ctx, state);` ersetzen durch:

```js
    this._drawRoutes(this.fxctx, state);
    this._drawPorts(this.fxctx);
    this._drawShips(this.fxctx, state);
```

(Hintergrund-Zeichnungen `_drawSpace/_drawOcean/_drawLand/_drawGraticule/_drawTerminatorGlow` bleiben auf `ctx`. Die `_draw*`-Methoden bekommen ihren Kontext bereits als Parameter – keine weiteren Änderungen nötig.)

- [ ] **Step 7: Syntaxprüfung**

Run: `node --check src/render/globe.js`
Expected: kein Output (Exit 0).

- [ ] **Step 8: Browser-Test**

`node server.js`, http://localhost:8080.
Expected: Bild sieht aus wie vorher (Routen/Häfen/Schiffe sichtbar). Drehen per Ziehen, Mausrad-Zoom, Klick-Auswahl auf Hafen/Schiff funktionieren weiterhin (Eingaben gehen jetzt über das Overlay).

- [ ] **Step 9: Commit**

```bash
git add index.html styles/main.css src/render/globe.js
git commit -m "Globus: Dual-Canvas-Gerüst, Vektoren & Eingabe auf Overlay-Canvas"
```

## Task 6: WebGL-Sphere-Renderer mit Blue-Marble-Textur und Tag/Nacht

**Files:**
- Create: `src/render/earth-gl.js`
- Create: `assets/earth/bluemarble-8k.jpg`
- Modify: `src/render/globe.js`

- [ ] **Step 1: Basistextur beschaffen**

Eine NASA-Blue-Marble-Equirectangular-Textur in **8192×4096** als JPG unter `assets/earth/bluemarble-8k.jpg` ablegen (Public Domain, NASA Visible Earth „Blue Marble Next Generation"). Dateigröße als JPG i. d. R. 2–5 MB.

Run (Verifikation, dass die Datei existiert und ein JPEG ist):
`node -e "const b=require('fs').readFileSync('assets/earth/bluemarble-8k.jpg');console.log(b.length, b[0]===0xFF&&b[1]===0xD8?'JPEG-OK':'KEIN-JPEG')"`
Expected: eine Größe > 100000 und `JPEG-OK`.

- [ ] **Step 2: earth-gl.js anlegen**

`src/render/earth-gl.js` erstellen. Der Renderer zeichnet einen Vollbild-Quad; der Fragment-Shader projiziert pro Pixel orthographisch auf die Kugel, sampelt die Equirect-Textur und schattiert Tag/Nacht. Sterne werden als statisches Punktfeld im selben Pass über einen Hash erzeugt; die Atmosphäre als weicher Ring um die Scheibe.

```js
// WebGL-Renderer der texturierten Erde (orthographisch) mit Tag/Nacht, Sternen
// und Atmosphären-Ring. Eine optionale Detailtextur (Esri-Tiles, siehe
// earth-tiles.js) wird über die Basistextur geblendet. Fällt der WebGL-Kontext
// aus, signalisiert create() null und der Aufrufer nutzt den prozeduralen Globus.

const VERT = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2  u_res;        // Canvas-Größe in Gerätepixeln
uniform vec2  u_center;     // Globusmitte in Gerätepixeln (y von oben)
uniform float u_R;          // Globusradius in Gerätepixeln
uniform float u_lon0;       // Kamera-Längengrad (rad)
uniform float u_lat0;       // Kamera-Breitengrad (rad)
uniform vec3  u_sun;        // Sonnenrichtung (Einheitsvektor, Weltkoord.)
uniform sampler2D u_base;   // Blue-Marble (equirect)
uniform sampler2D u_detail; // Detailtextur (Esri), in equirect-UV vorgerendert
uniform vec4  u_detRect;    // Detail-Bounds als UV: (u0, v0, u1, v1); leer wenn u1<=u0
uniform float u_detMix;     // Blend-Stärke 0..1

const float PI = 3.14159265358979;

void main() {
  // Pixel relativ zur Globusmitte (y nach unten positiv wie im 2D-Canvas)
  float px = gl_FragCoord.x;
  float py = u_res.y - gl_FragCoord.y;
  float X = (px - u_center.x) / u_R;
  float Y = (u_center.y - py) / u_R;   // nach oben positiv
  float rho2 = X*X + Y*Y;
  if (rho2 > 1.0) {
    // außerhalb der Kugel: Weltraum + Sterne
    vec2 g = gl_FragCoord.xy / u_res.xy;
    float star = fract(sin(dot(floor(gl_FragCoord.xy/1.5), vec2(12.9898,78.233))) * 43758.5453);
    float s = step(0.997, star);
    vec3 space = vec3(0.012, 0.024, 0.06) + s * vec3(0.8);
    // weicher Atmosphären-Ring knapp außerhalb R
    float rim = smoothstep(1.0, 0.985, sqrt(rho2)) * smoothstep(1.10, 1.0, sqrt(rho2));
    space += rim * vec3(0.35, 0.66, 1.0) * 0.6;
    gl_FragColor = vec4(space, 1.0);
    return;
  }
  float rho = sqrt(rho2);
  float c = asin(clamp(rho, 0.0, 1.0));
  float sinc = sin(c), cosc = cos(c);
  float lat, lon;
  if (rho < 1e-6) { lat = u_lat0; lon = u_lon0; }
  else {
    lat = asin(cosc * sin(u_lat0) + (Y * sinc * cos(u_lat0)) / rho);
    lon = u_lon0 + atan(X * sinc, rho * cosc * cos(u_lat0) - Y * sinc * sin(u_lat0));
  }
  // equirect-UV
  float u = fract((lon + PI) / (2.0 * PI));
  float v = (PI/2.0 - lat) / PI;        // 0 = Nordpol
  vec3 col = texture2D(u_base, vec2(u, v)).rgb;
  // Detailtextur überblenden, falls Pixel innerhalb der Bounds
  if (u_detRect.z > u_detRect.x) {
    if (u > u_detRect.x && u < u_detRect.z && v > u_detRect.y && v < u_detRect.w) {
      vec2 duv = vec2((u - u_detRect.x) / (u_detRect.z - u_detRect.x),
                      (v - u_detRect.y) / (u_detRect.w - u_detRect.y));
      vec3 det = texture2D(u_detail, duv).rgb;
      col = mix(col, det, u_detMix);
    }
  }
  // Tag/Nacht
  vec3 n = vec3(cos(lat)*cos(lon), cos(lat)*sin(lon), sin(lat));
  float l = dot(n, u_sun);                 // -1..1
  float day = smoothstep(-0.12, 0.18, l);
  vec3 night = col * 0.10 + vec3(0.01, 0.02, 0.04);
  col = mix(night, col * (0.55 + 0.6 * day), day);
  // Randverdunklung
  col *= mix(1.0, 0.78, smoothstep(0.7, 1.0, rho));
  gl_FragColor = vec4(col, 1.0);
}
`;

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src); gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.warn('Shader-Fehler', gl.getShaderInfoLog(sh)); return null;
  }
  return sh;
}

export class EarthGL {
  static create(canvas) {
    const gl = canvas.getContext('webgl', { antialias: true, alpha: false })
            || canvas.getContext('experimental-webgl');
    if (!gl) return null;
    const e = new EarthGL();
    if (!e._init(gl)) return null;
    return e;
  }

  _init(gl) {
    this.gl = gl;
    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return false;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn('Link-Fehler', gl.getProgramInfoLog(prog)); return false;
    }
    this.prog = prog;
    this.buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    this.aPos = gl.getAttribLocation(prog, 'a_pos');
    this.u = {};
    for (const name of ['u_res','u_center','u_R','u_lon0','u_lat0','u_sun','u_base','u_detail','u_detRect','u_detMix'])
      this.u[name] = gl.getUniformLocation(prog, name);
    // Platzhalter-Texturen (1x1), bis das Bild geladen ist
    this.baseTex = this._tex1(gl, [9, 26, 48]);
    this.detailTex = this._tex1(gl, [0, 0, 0]);
    this.baseReady = false;
    this._loadBase('assets/earth/bluemarble-8k.jpg');
    return true;
  }

  _tex1(gl, rgb) {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array(rgb));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return t;
  }

  _loadBase(url) {
    const gl = this.gl;
    const img = new Image();
    img.onload = () => {
      const max = gl.getParameter(gl.MAX_TEXTURE_SIZE);
      let src = img;
      if (img.width > max) {            // auf GPU-Limit herunterskalieren
        const cv = document.createElement('canvas');
        const k = max / img.width;
        cv.width = max; cv.height = Math.round(img.height * k);
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        src = cv;
      }
      gl.bindTexture(gl.TEXTURE_2D, this.baseTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, src);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      this.baseReady = true;
    };
    img.onerror = () => { /* offline: Platzhalter bleibt */ };
    img.src = url;
  }

  // detail: {tex, rect:[u0,v0,u1,v1], mix} oder null
  render({ resW, resH, cx, cy, R, lon0, lat0, sun, detail }) {
    const gl = this.gl;
    if (gl.canvas.width !== resW || gl.canvas.height !== resH) gl.viewport(0, 0, resW, resH);
    else gl.viewport(0, 0, resW, resH);
    gl.useProgram(this.prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.enableVertexAttribArray(this.aPos);
    gl.vertexAttribPointer(this.aPos, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(this.u.u_res, resW, resH);
    gl.uniform2f(this.u.u_center, cx, cy);
    gl.uniform1f(this.u.u_R, R);
    gl.uniform1f(this.u.u_lon0, lon0);
    gl.uniform1f(this.u.u_lat0, lat0);
    gl.uniform3f(this.u.u_sun, sun[0], sun[1], sun[2]);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.baseTex);
    gl.uniform1i(this.u.u_base, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, detail?.tex || this.detailTex);
    gl.uniform1i(this.u.u_detail, 1);
    const r = detail?.rect || [0, 0, 0, 0];
    gl.uniform4f(this.u.u_detRect, r[0], r[1], r[2], r[3]);
    gl.uniform1f(this.u.u_detMix, detail?.mix ?? 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}
```

- [ ] **Step 3: globe.js — WebGL als Hintergrund einbinden, Prozedural als Fallback**

In `src/render/globe.js` oben importieren:

```js
import { EarthGL } from './earth-gl.js';
```

Im Konstruktor `this.ctx`-Zeile anpassen: Der Hintergrund-Canvas bekommt **nicht** automatisch einen 2D-Kontext, wenn WebGL läuft (ein Canvas kann nur einen Kontext-Typ haben). Ersetze die zwei Zeilen

```js
    this.canvas = canvas;                 // Hintergrund (#globe) – Prozedural/WebGL
    this.ctx = canvas.getContext('2d');   // wird in Task 6 durch WebGL ersetzt
```

durch

```js
    this.canvas = canvas;                 // Hintergrund (#globe)
    this.gl = EarthGL.create(canvas);     // WebGL-Erde (oder null)
    this.ctx = this.gl ? null : canvas.getContext('2d');  // 2D nur im Fallback
```

In `_resize()` den 2D-`setTransform`-Aufruf für den Hintergrund absichern. Ersetze `this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);` durch:

```js
    if (this.ctx) this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
```

- [ ] **Step 4: globe.js — render() verzweigt WebGL vs. prozedural**

In `render(state, subsolar, dtMs)` den Hintergrund-Block austauschen. Die bestehende Sequenz ab `ctx.clearRect(0, 0, this.W, this.H);` bis `this._drawTerminatorGlow(ctx);` so umstellen, dass nur die **Vektoren** immer auf `fxctx` gehen und der Hintergrund je nach Modus gezeichnet wird. Ersetze:

```js
    ctx.clearRect(0, 0, this.W, this.H);
    this._drawSpace(ctx);

    // Sonnenvektor für Tag/Nacht
    const sφ = subsolar.lat * DEG, sλ = subsolar.lon * DEG;
    const sun = [Math.cos(sφ) * Math.cos(sλ), Math.cos(sφ) * Math.sin(sλ), Math.sin(sφ)];

    this._drawOcean(ctx, sun);
    this._drawLand(ctx, sun);
    this._drawGraticule(ctx);
    this.fxctx.clearRect(0, 0, this.W, this.H);
    this._drawRoutes(this.fxctx, state);
    this._drawPorts(this.fxctx);
    this._drawShips(this.fxctx, state);
    this._drawTerminatorGlow(ctx);
```

durch:

```js
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
      this.ctx.clearRect(0, 0, this.W, this.H);
      this._drawSpace(this.ctx);
      this._drawOcean(this.ctx, sun);
      this._drawLand(this.ctx, sun);
      this._drawGraticule(this.ctx);
      this._drawTerminatorGlow(this.ctx);
    }

    // Vektor-Overlay (immer Canvas2D)
    this.fxctx.clearRect(0, 0, this.W, this.H);
    this._drawRoutes(this.fxctx, state);
    this._drawPorts(this.fxctx);
    this._drawShips(this.fxctx, state);
```

(`_detail` wird in Task 8 gesetzt; bis dahin immer `null`.)

- [ ] **Step 5: Syntaxprüfung**

Run: `node --check src/render/earth-gl.js && node --check src/render/globe.js`
Expected: kein Output (Exit 0).

- [ ] **Step 6: Browser-Test**

`node server.js`, http://localhost:8080.
Expected: Der Globus zeigt jetzt die **fotorealistische** Erde mit Tag/Nacht-Terminator; Kontinente decken sich exakt mit den Hafen-Markern (Projektion stimmt). Drehen/Zoom/Auswahl funktionieren. In der DevTools-Konsole keine Shader-/Link-Fehler. (Bei abgeschaltetem WebGL erscheint der alte prozedurale Globus.)

- [ ] **Step 7: Commit**

```bash
git add src/render/earth-gl.js src/render/globe.js assets/earth/bluemarble-8k.jpg
git commit -m "Globus: WebGL-Erde mit Blue-Marble-Textur und Tag/Nacht (Prozedural als Fallback)"
```

## Task 7: Esri-Deep-Zoom — Tiles laden und als Detailtextur einblenden

**Files:**
- Create: `src/render/earth-tiles.js`
- Modify: `src/render/globe.js`
- Modify: `src/main.js`

- [ ] **Step 1: earth-tiles.js anlegen**

`src/render/earth-tiles.js` erstellen. Es bestimmt aus Kameramitte und Zoom ein Web-Mercator-Tile-Fenster, lädt die Esri-Kacheln, zeichnet sie in einen Offscreen-Canvas in **equirect-UV-Layout** (passend zum Shader-Sampling) und liefert `{canvas, rect:[u0,v0,u1,v1]}`. Offline/Fehler → die betroffene Kachel bleibt transparent; ist gar nichts geladen, liefert `update()` null.

```js
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
    this.cur = null;                 // zuletzt gebautes {rect, mix}
    this.lastKey = '';
  }

  // Wählt die Tile-Zoomstufe so, dass ein Tile ~ Bildschirmpixel passt.
  _zoomFor(R_devicePx) {
    // R = halbe Erdbreite (π·Erdradius) in Pixeln → Welt-Pixelbreite = 2πR... grob:
    // Weltbreite in Pixeln ≈ 2·R·π? Wir nähern: worldPx = 2*R (orthographische Mitte).
    const worldPx = 2 * R_devicePx * Math.PI;
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

  // centerLon/Lat in Grad, R_devicePx = Globusradius in Gerätepixeln, span ~ sichtbarer
  // Halbwinkel in Grad. Liefert {tex, rect, mix} oder null.
  update(centerLon, centerLat, R_devicePx, spanDeg) {
    const z = this._zoomFor(R_devicePx);
    // Fensterausschnitt in Tiles um die Mitte (begrenzte Kachelzahl)
    const cxT = lon2tileX(centerLon, z), cyT = lat2tileY(centerLat, z);
    const half = 2;   // (2*half+1)² Tiles, hier 5×5
    const x0 = Math.floor(cxT) - half, y0 = Math.floor(cyT) - half;
    const cols = 2 * half + 1, rows = 2 * half + 1;
    const key = `${z}/${x0}/${y0}/${cols}`;

    // UV-Bounds der Kachelfläche
    const lonA = tileX2lon(x0, z), lonB = tileX2lon(x0 + cols, z);
    const latTop = tileY2lat(y0, z), latBot = tileY2lat(y0 + rows, z);
    const u0 = (lonA + 180) / 360, u1 = (lonB + 180) / 360;
    const v0 = (90 - latTop) / 180, v1 = (90 - latBot) / 180;

    // Detail-Canvas im equirect-UV-Raster aufbauen: Spalten linear in lon (passt zu u),
    // Zeilen über die Mercator→lat→v-Abbildung pro Tile-Zeile (Tiles sind in v leicht
    // ungleich hoch; bei kleinem Ausschnitt vernachlässigbar – wir platzieren jede
    // Tile-Zeile an ihrer v-Position).
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
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, this.cv);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    this.cur = { tex: this.tex, rect: [u0, v0, u1, v1] };
    return this.cur;
  }
}
```

- [ ] **Step 2: earth-gl.js — Tiles-Zugang freigeben**

In `src/render/earth-gl.js` der Klasse `EarthGL` eine Methode hinzufügen, damit `globe.js` die Tile-Engine an denselben GL-Kontext binden kann. Vor dem schließenden `}` der Klasse einfügen:

```js
  glContext() { return this.gl; }
```

- [ ] **Step 3: globe.js — Tile-Engine ansteuern (mit Zoom-Schwelle & Crossfade)**

In `src/render/globe.js` oben importieren:

```js
import { EarthTiles } from './earth-tiles.js';
```

Im Konstruktor nach der `this.gl = EarthGL.create(canvas);`-Zeile ergänzen:

```js
    this.tiles = this.gl ? new EarthTiles(this.gl.glContext()) : null;
    this._detail = null;       // an earth-gl übergebene Detailtextur
    this._detMix = 0;          // aktueller Crossfade-Wert
```

In `render(...)` **vor** dem `if (this.gl) { ... }`-Block die Detailtextur aktualisieren:

```js
    // Deep-Zoom-Detail (Esri) ab Schwelle einblenden
    const DEEP = 8;            // Zoom-Schwelle, ab der Tiles geladen werden
    if (this.tiles) {
      const want = this.cam.zoom > DEEP ? 1 : 0;
      this._detMix += (want - this._detMix) * Math.min(1, dtMs / 400);  // Crossfade
      if (this.cam.zoom > DEEP) {
        const span = 90 / this.cam.zoom;
        const d = this.tiles.update(this.cam.lon0, this.cam.lat0, this.R * this.dpr, span);
        this._detail = d ? { tex: d.tex, rect: d.rect, mix: this._detMix } : null;
      } else if (this._detMix < 0.01) {
        this._detail = null;
      } else if (this._detail) {
        this._detail = { ...this._detail, mix: this._detMix };
      }
    }
```

- [ ] **Step 4: main.js — Esri-Attribution einblenden**

In `src/main.js` nach der Globe-Initialisierung (`const globe = new GlobeRenderer(canvas);`) ergänzen:

```js
// Esri-Attribution einblenden, sobald der WebGL-Globus aktiv ist
if (globe.gl) { const cr = document.getElementById('earth-credit'); if (cr) cr.hidden = false; }
```

- [ ] **Step 5: Syntaxprüfung**

Run: `node --check src/render/earth-tiles.js && node --check src/render/earth-gl.js && node --check src/render/globe.js && node --check src/main.js`
Expected: kein Output (Exit 0).

- [ ] **Step 6: Browser-Test (online)**

`node server.js`, http://localhost:8080. Auf einen Hafen/ein Schiff klicken und mit **🎯** bzw. Mausrad nah heranzoomen (Zoom > 8).
Expected: Bei starkem Zoom blenden echte **Satellitenkacheln** über die Blue-Marble-Basis (Crossfade), Küsten/Strukturen werden scharf; beim Rauszoomen verschwinden sie wieder. Die Attribution unten rechts ist sichtbar. Im Netzwerk-Tab der DevTools werden `arcgisonline.com/.../World_Imagery/...`-Tiles geladen. Keine Konsolenfehler.

- [ ] **Step 7: Browser-Test (offline-Fallback)**

DevTools → Network → „Offline" aktivieren, nah heranzoomen.
Expected: Kein Crash; es bleibt die Blue-Marble-Basis sichtbar (keine Tiles, aber flüssig).

- [ ] **Step 8: Commit**

```bash
git add src/render/earth-tiles.js src/render/earth-gl.js src/render/globe.js src/main.js
git commit -m "Globus: Esri-Deep-Zoom mit Tile-Detailtextur, Crossfade und Offline-Fallback"
```

## Task 8: Politur & Gesamtdurchlauf

**Files:**
- Modify: `src/render/globe.js` (Aufräumen ungenutzter Pfade), `README.md`

- [ ] **Step 1: README aktualisieren**

In `README.md` den Abschnitt „Hinweis zu den Grafiken" und „Architektur" um die WebGL-Erde + Esri-Deep-Zoom + neue Startbedingungen ergänzen (kurzer Absatz): Erde ist jetzt eine texturierte WebGL-Kugel (Blue Marble, offline) mit Online-Satelliten-Deep-Zoom (Esri World Imagery, Attribution); Start ohne Schiffe, 30 Mio. $, Heimathafen-Wahl. Den Datei-Baum um `render/earth-gl.js`, `render/earth-tiles.js` und `assets/earth/` erweitern.

- [ ] **Step 2: Gesamttest im Browser**

`node server.js`, http://localhost:8080, neues Spiel:
Expected (Checkliste):
- Heimathafen-Overlay → Auswahl → 30 Mio., keine Schiffe.
- Werft: gewählter Hafen vorausgewählt; Schiff kaufen; in **Flotte** laden (Dropdown bleibt offen), Ziel wählen, auslaufen.
- Globus: fotorealistische Erde, Tag/Nacht; nah heranzoomen → Esri-Detail; rauszoomen → Blue Marble; Drehen/Auswahl/Folgen ok.
- Speichern/Laden/Reload: Spielstand inkl. Heimathafen bleibt erhalten.

- [ ] **Step 3: Syntax-Gesamtprüfung**

Run: `node --check src/render/globe.js && node --check src/render/earth-gl.js && node --check src/render/earth-tiles.js && node --check src/ui/ui.js && node --check src/engine/state.js && node --check src/engine/save.js && node --check src/main.js`
Expected: kein Output (Exit 0).

- [ ] **Step 4: Commit**

```bash
git add README.md src/render/globe.js
git commit -m "Doku & Politur: WebGL-Erde, Esri-Deep-Zoom, neue Startbedingungen"
```

---

## Selbstprüfungs-Notizen (für die Umsetzung)

- **Projektionsdeckung:** Der Shader (earth-gl.js) und `project()` (globe.js) müssen exakt dieselbe Orthographie verwenden (gleiche `lon0/lat0/R/cx/cy`). Falls Kontinente gegen Hafenmarker verschoben wirken, zuerst Vorzeichen von `Y` und die `v`-Formel prüfen.
- **DPR:** Der Shader rechnet in Gerätepixeln (`gl_FragCoord`/`canvas.width`), die Vektoren in CSS-Pixeln. Deshalb werden `cx,cy,R` für den Shader mit `this.dpr` multipliziert.
- **Tile-Zoomwahl** (`_zoomFor`) und **`span`** sind Näherungen und beim Testen feinzujustieren (Schärfe vs. Tile-Last). Also bewusst als Konstante `DEEP=8`/`half=2` gehalten.
- **Mercator-Pol-Grenzen:** Esri/Web-Mercator endet bei ±85.05°; bei Heranzoomen an Polnähe liefert `update()` ggf. keine Tiles → Blue Marble bleibt (akzeptiert).
