# OCEANUM — Welthandels-Wirtschaftssimulation

Eine Wirtschaftssimulation im Geiste von *Ports of Call* — **ohne den
Schiffssteuerungs-/Simulationsteil**. Im Zentrum steht eine animierte,
drehbare **Erde mit Tag-/Nacht-Zyklus**, auf der alle Schiffsbewegungen entlang
exakter **Großkreisrouten** dargestellt werden. Du baust ein globales
Handelsimperium aus Flotte, Hafenanteilen, Industrie- und Rohstoffkomplexen und
einem Börsenportfolio auf.

Komplett in **Vanilla JavaScript (ES-Module) + Canvas/WebGL/SVG**, ohne
Build-Schritt und ohne npm-Abhängigkeiten. Die Erde nutzt eine gebündelte
Blue-Marble-Textur (WebGL) mit optionalem Online-Satelliten-Deep-Zoom; alle
übrigen Grafiken (Häfen, Schiffe, UI) werden prozedural erzeugt.

## Starten

**Einfachster Weg (Doppelklick):**
- **Windows:** `start.bat` doppelklicken
- **macOS/Linux:** `./start.sh` ausführen

Beide Skripte beenden zuerst eine evtl. noch laufende Instanz (geben Port 8080
frei), starten dann den lokalen Server und öffnen den Browser automatisch.

**Manuell:**

```bash
node server.js          # http://localhost:8080
# oder
npm start
```

Danach im Browser öffnen. (Wegen ES-Modulen muss über einen Server geladen
werden, nicht per `file://`.)

## Steuerung

- **Ziehen** — Globus drehen
- **Mausrad / Pinch** — stufenlos zoomen, vom ganzen Planeten bis dicht an ein
  einzelnes fahrendes Schiff
- **Klick** auf Hafen oder Schiff — auswählen
- **🎯 Folgen** — Kamera heftet sich an ein Schiff/Hafen und zoomt heran
- **🌐** — Gesamtansicht, **＋ / －** — zoomen
- **⏸ ▶ ⏩ ⏭ 🚀** — Zeitraffer

## Spielinhalte

| Bereich | Umfang |
|---|---|
| **Häfen** | 73 reale Welthäfen mit echten Koordinaten, Region & Handelsprofil; regionstypische, prozedurale Hafengrafiken (Wahrzeichen für markante Häfen) |
| **Produkte** | 68 Waren in 7 Kategorien (Energie, Erze/Metalle, Agrar, Lebensmittel, Industrie, Chemie, Konsum/Luxus) |
| **Schiffe** | 55+ Schiffe in 20 Klassen/Kategorien (Feeder bis ULCV, Handysize bis Valemax, MR-Tanker bis VLCC, LNG/LPG, Reefer, Autotransporter, Schwergut, Chemie …) mit Draufsicht auf dem Globus **und** Seitenprofil-Illustration |
| **Wirtschaft** | Verzahntes Angebot/Nachfrage-Modell: Exporthäfen bieten günstig, Importhäfen zahlen Aufschläge; Preise reagieren auf Ereignisse, Zufallsschwankungen und den Preis-Impact eigener Geschäfte |
| **Börse** | KI-Reedereien (Gegner) + globale Rohstoff-/Industriekonzerne + Handelshäuser; Kurse an Rohstoff-Exposure gekoppelt, Dividenden, **Übernahmen** ab 50 % (Reedereiflotten gehen in deinen Besitz über) |
| **Beteiligungen** | Hafenanteile kaufen & Häfen ausbauen; Industrie- und Rohstoffabbau-Komplexe errichten & ausbauen (speisen ihren Ausstoß in die Marktpreise ein) |
| **Ereignisse** | Kriege, Sanktionen, Epidemien, Ölpreisschocks, Booms, Rezessionen, Piraterie, Kanalsperren, Streiks, Miss-/Rekordernten — mit Preis- & Routenwirkung |
| **Schiffsbetrieb** | Treibstoff/Bunkern an einen simulierten **Ölpreis** gekoppelt, **Verschleiß & Reparatur**, **Upgrades** (Sparmotor, Wulstbug, Rumpfbeschichtung, Laderaum, Scrubber, Automatisierung) |
| **Progression** | Start mit **30 Mio. $**, **ohne Schiffe** und einem frei gewählten **Heimathafen**; das erste Schiff kaufst du in der Werft. Wachstum über Handelsmargen, Dividenden, Komplex-Erträge und Übernahmen |

## Spielablauf in Kürze

0. Beim ersten Start **Heimathafen wählen** und in der **Werft** ein erstes (günstiges) Schiff kaufen.
1. **Flotte** → ein Schiff wählen, im Hafen eine günstige Ware **laden**.
2. Bestes **Ziel** wählen (Gewinn-Schätzung inkl. Treibstoff & Fixkosten) und
   **auslaufen**. Optional **Dauerschleife** für Pendelverkehr.
3. Auf dem Globus zusehen, wie das Schiff der Route folgt — heranzoomen mit 🎯.
4. Gewinne in **Werft** (neue/größere Schiffe), **Beteiligungen** (Häfen,
   Komplexe) und **Börse** (Anteile bis zur Übernahme) reinvestieren.
5. **Ereignisse** beobachten und Preisverwerfungen ausnutzen.

## Speichern, Tutorial & Steuer-Menü

Oben rechts: **❓ Tutorial**, **💾 Speichern**, **📂 Laden**, **🆕 Neues Spiel**.
Der Spielstand wird zusätzlich **alle 20 s automatisch** und beim Schließen in
`localStorage` gesichert; beim nächsten Start wird er automatisch geladen. Das
**Tutorial** (7 Schritte) erscheint beim ersten Start automatisch.

## Echte Bilder: Asset-Pipeline

Das Spiel läuft komplett offline mit prozeduralen Grafiken. Online werden
zusätzlich **echte Bilder** eingeblendet:

- **Flaggen** aller Hafenländer (Emoji offline; Raster über flagcdn.com online).
- **Hafenfotos** aus *Wikimedia Commons* über ein Manifest. Erzeugen/aktualisieren:

  ```bash
  node tools/fetch-assets.mjs      # schreibt assets/manifest.json (benötigt Internet)
  ```

  Das Manifest enthält nur **URLs + Attribution** (keine Binärdateien im Repo);
  Bilder werden zur Laufzeit von `upload.wikimedia.org` nachgeladen und mit einem
  sanften Crossfade über die prozedurale Hafenszene gelegt. Fehlt ein Bild oder
  bist du offline, bleibt die prozedurale Szene sichtbar. (Aktuell sind für einen
  Teil der Häfen Fotos hinterlegt; ein erneuter Lauf des Skripts ergänzt weitere.)

## Architektur

```
src/
  data/      world.js (Kontinente/Landmaske), ports.js, products.js,
             ships.js, companies.js
  engine/    state.js (Orchestrierung), time.js (Uhr/Sonnenstand),
             economy.js, events.js, fleet.js (Routing/Treibstoff/Verschleiß),
             market.js (Börse/Übernahmen), assets.js (Beteiligungen), util.js
  render/    globe.js (Orthographie-Globus: WebGL-Erde + Vektor-Overlay, Zoom, Schiffe),
             earth-gl.js (WebGL-Sphere: Blue-Marble-Textur, Tag/Nacht, Sterne),
             earth-tiles.js (Esri-Satelliten-Deep-Zoom, online),
             shipart.js (Schiff-Seitenprofile), portart.js (Hafenszenen)
assets/
  earth/     bluemarble-8k.jpg (gebündelte NASA-Blue-Marble-Basistextur)
  ui/        ui.js (Panels, Steuerung)
  main.js    Render-/Simulationsschleife
```

## Die Erde: WebGL-Globus mit Deep-Zoom

Der Globus ist eine **texturierte WebGL-Kugel** in orthographischer Projektion:
- **Basis (offline):** eine gebündelte NASA-**Blue-Marble**-Textur
  (`assets/earth/bluemarble-8k.jpg`) mit prozedural berechnetem
  **Tag/Nacht-Terminator** und Sternenhimmel.
- **Deep-Zoom (online):** Beim starken Reinzoomen werden echte
  **Esri-World-Imagery**-Satellitenkacheln nachgeladen und weich über die Basis
  geblendet – bis auf Stadt-/Hafenebene. Ohne Internet bleibt die Blue-Marble-Basis
  sichtbar (kein Bruch). Attribution: *Esri, Maxar, Earthstar Geographics*.
- **Fallback:** Steht kein WebGL zur Verfügung, rendert ein prozeduraler,
  gepunkteter Canvas2D-Globus als Rückfallebene.

Häfen, Seerouten und Schiffe liegen als **Canvas2D-Overlay** darüber; Schiffe
erscheinen je nach Zoom als Punkt, Silhouette mit Kielwasser oder Detailmodell mit
Namensschild. Hafenszenen und Schiffsprofile bleiben prozedurale SVG-Grafiken.
