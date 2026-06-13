# OCEANUM — Hochauflösende Erde, Startbedingungen, Dropdown-Fix

**Datum:** 2026-06-13
**Status:** Genehmigt (zur Implementierung)

## Überblick

Drei zusammenhängend ausgelieferte Änderungen am Spiel OCEANUM:

- **A — Dropdown-Bug:** Das Frachtauswahl-Dropdown im Flotten-Panel schließt sich
  von selbst, während der Spieler noch auswählt.
- **B — Startbedingungen:** Spielstart ohne Schiffe, mit weniger Kapital und einer
  Heimathafen-Auswahl.
- **C — Hochauflösende Erde:** Der prozedurale Punkt-Globus wird durch einen
  WebGL-Globus mit echter Erdtextur und Online-Deep-Zoom (bis Stadt-/Hafenebene)
  ersetzt.

Alle drei werden in einem Spec/Plan zusammen umgesetzt.

---

## Teil A — Dropdown-Bug

### Ursache

`UI.tickUI()` baut das aktive Panel alle 1,5 s komplett per `innerHTML` neu auf
(`src/ui/ui.js`, ~Zeile 255: `if (now - this._lastFull > 1500) { … this.renderTab(); }`).
Beim Neuaufbau wird ein gerade geöffnetes `<select data-act="loadsel">` zerstört →
das Dropdown klappt zu, obwohl der Spieler noch nichts gewählt hat.

### Lösung

Das **zeitgesteuerte** Neu-Rendern in `tickUI` überspringen, solange der Fokus
innerhalb von `#panel` auf einem Bedienelement liegt:

- Wenn `document.activeElement` ein Nachkomme von `#panel` und vom Typ
  `SELECT` / `INPUT` / `TEXTAREA` ist, wird `renderTab()` in diesem Frame
  **nicht** aufgerufen (und `_lastFull` nicht zurückgesetzt, damit nach Verlassen
  sofort wieder aktualisiert wird).
- Die Topbar-Werte (Datum, Kapital, Vermögen, Ölpreis, Ticker) werden weiterhin
  jeden Frame aktualisiert.
- Explizite, vom Spieler ausgelöste `renderTab()`-Aufrufe (nach Laden, Auslaufen,
  Tab-Wechsel etc.) bleiben unberührt.

Minimaler, lokaler Eingriff in `tickUI`; keine Änderung an der Render-Logik der
Panels selbst.

---

## Teil B — Startbedingungen

### Verhalten

- **Startkapital:** 30.000.000 $ statt bisher 75.000.000 $.
- **Keine Starterflotte:** Der Spieler beginnt ohne Schiffe.
- **Heimathafen-Auswahl:** „Neues Spiel" zeigt zuerst einen Overlay zur Wahl des
  Heimathafens (Hafenliste, nach Region filterbar, analog zum Märkte-Reiter).
  Klick wählt den Heimathafen und startet das Spiel.
- **Erstes Schiff:** Der Spieler kauft sein erstes Schiff in der **Werft**; der
  Default-Hafen beim Kauf ist der Heimathafen.

### Änderungen im Code

- `GameState`:
  - Neues Feld `homePortId` (Default `null`).
  - `this.fleet.giveStarterFleet('player')` wird im Konstruktor **entfernt**.
  - `this.cash = 30_000_000`.
- `GameState.buyShip(classId, atPortId)`: Wenn `atPortId` fehlt, `this.homePortId`
  als Default verwenden.
- `src/main.js` / `src/ui/ui.js`:
  - `newState()` erzeugt den Zustand ohne Heimathafen; der Start-Flow zeigt den
    Heimathafen-Overlay (neues Spiel **und** Erststart ohne Spielstand).
  - Nach Auswahl: `state.homePortId = <gewählt>`, Willkommensmeldung nennt den
    Hafen, Werft-Default (`_yardPort`) auf den Heimathafen setzen.
- **Tutorial** (`TUTORIAL` in `ui.js`): Ein neuer/angepasster erster Schritt
  „Heimathafen wählen & erstes Schiff in der Werft kaufen" vor dem bisherigen
  „Handeln"-Schritt. Begrüßungstext in `newState()` an den neuen Start anpassen
  (kein „Startflotte in Hamburg, Rotterdam und Singapur" mehr).

### Heimathafen-Auswahl-Overlay

- Eigene Overlay-Komponente in der UI (analog zum Tutorial-Overlay: ein
  Container-Element, das per `innerHTML` gefüllt und nach Auswahl entfernt wird).
- Inhalt: Titel, Regionsfilter, Hafenliste mit Name/Region/Flagge; Klick auf einen
  Hafen löst die Auswahl aus.
- Erscheint bei „Neues Spiel" und beim allerersten Start ohne vorhandenen
  Spielstand (vor bzw. statt des automatischen Spielbeginns).

### Save/Load

- `snapshot()` schreibt `homePortId`.
- `restore()` liest `homePortId` tolerant: fehlt es, Default = `atPortId` des ersten
  Schiffs, sonst `'hamburg'`.
- **Kein Versionsbruch:** `VERSION` bleibt `1`; alte Spielstände bleiben ladbar.

---

## Teil C — Hochauflösende Erde (WebGL-Hybrid)

### Zielbild

Vom ganzen Planeten bis auf Stadt-/Hafenebene zoombar. Basis ist eine gebündelte,
hochauflösende Erdtextur (offline); beim starken Reinzoomen werden online echte
Satellitenkacheln nachgeladen. Ohne Internet bleibt die Blue-Marble-Basis sichtbar.

### Architektur — zwei gestapelte Canvas-Ebenen

1. **`#globe` als WebGL-Canvas** — zeichnet:
   - Weltraum-Hintergrund + Sterne,
   - die texturierte Kugel in orthographischer Projektion,
   - Tag/Nacht-Beleuchtung (Terminator) aus dem subsolaren Punkt,
   - den Atmosphären-Ring.
2. **Neuer transparenter 2D-Overlay-Canvas darüber** — zeichnet:
   - Routen (Großkreise), Häfen, Schiffe (Punkt/Silhouette/Detail), Labels.
   - Die bestehenden `_draw*`-Methoden (`_drawRoutes`, `_drawPorts`, `_drawShips`)
     bleiben praktisch unverändert und nutzen weiter dieselbe `project()`-Mathematik.
   - Pointer-Input (Drehen, Zoom, Picking) liegt auf dem Overlay-Canvas.

Die öffentliche `GlobeRenderer`-API bleibt stabil: `constructor(canvas)`, `render`,
`project`, `follow`, `zoomBy`, `resetView`, `setLayout`, `onSelect`, `_pick`. Dadurch
ändern sich `main.js` und `ui.js` nur minimal (Overlay-Canvas anlegen). Die
orthographischen Kameraparameter (`cam.lon0`, `cam.lat0`, `cam.zoom`, `R`, `cx`, `cy`)
müssen zwischen WebGL-Sphere und Overlay-`project()` exakt übereinstimmen.

### Sphere-Rendering (Shader)

- Ein Quad über der Bounding-Box der Globusscheibe.
- Fragment-Shader: pro Pixel Strahl auf die Kugel rückprojizieren, lat/lon bestimmen,
  Equirect-**Blue-Marble-Textur** sampeln; Tag/Nacht über `dot(normal, sunDir)`
  (weicher Terminator). Pixel außerhalb der Kugel: Hintergrund/transparent.
- Sterne und Weltraum-Hintergrund werden im WebGL-Layer gezeichnet (unter der Kugel).

### Basistextur (offline)

- Blue Marble **21K** (21600×10800) wird als komprimiertes JPG gebündelt
  (`assets/` oder vergleichbar; einziges großes Binärasset im Repo).
- **GPU-Texturgrößenlimit (häufig ~16384 px):** Das Bild wird beim Laden über einen
  Offscreen-Canvas in ein **2×2-Raster aus Teiltexturen** zerlegt; der Shader wählt
  die passende Kachel anhand der lat/lon. Kein Build-Schritt nötig (Slicing zur
  Laufzeit).

### Deep-Zoom (online, Esri World Imagery)

- Ab einer Zoom-Schwelle werden für den sichtbaren Bereich **Esri-World-Imagery**-
  Kacheln (XYZ, Web-Mercator) passend zum Bildschirmmaßstab geladen.
- Tiles werden zu einer **dynamischen Detailtextur** (mit Geo-Bounds) zusammengesetzt,
  auf die GPU geladen und im Shader **über die Blue-Marble-Basis geblendet**
  (Crossfade), wo der Pixel-lat/lon innerhalb der Detail-Bounds liegt.
- Mercator↔Equirect-Umrechnung erfolgt im Shader bzw. beim Bestimmen der UVs.
- **Tile-Cache** im Speicher; **Offline/Fehler → kein Detail, Blue-Marble-Basis
  bleibt**, kein Crash.
- **Esri-Attribution** wird sichtbar eingeblendet (Nutzungsbedingungen: Attribution
  erforderlich, kommerzielle Nutzung ggf. eingeschränkt).

### Fallback

- Ist kein WebGL-Kontext verfügbar, bleibt der bisherige prozedurale
  Canvas2D-Globus als Rückfallebene erhalten (bestehende `_drawLand`/`_drawOcean`
  etc. werden nicht gelöscht, sondern als Fallback-Pfad behalten).

### Im Implementierungsplan zu fixierende Details

- Exakte Zoom-Schwelle für den Tile-Deep-Zoom.
- Tile-Zoom-Level ↔ Globus-Maßstab-Mapping.
- Genaue Shader-Formeln (Rückprojektion, Mercator-UV, Beleuchtung, Blending).
- Crossfade-Dauer und Tile-Cache-Größe.
- Layout/Position des Overlay-Canvas (DPR, Resize, Mobile-`centerYFrac`).

---

## Nicht im Scope

- Kein Umbau der Wirtschafts-/Ereignis-/Börsen-Logik.
- Keine neuen Schiffsklassen/Produkte.
- Kein Build-Schritt, keine npm-Abhängigkeiten (Projektprinzip bleibt: Vanilla
  ES-Module, Offline-fähig; einzige Erweiterung sind das gebündelte Blue-Marble-JPG
  und die optionalen Online-Tiles).
