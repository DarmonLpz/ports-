# OCEANUM — Welthandels-Wirtschaftssimulation

Eine Wirtschaftssimulation im Geiste von *Ports of Call* — **ohne den
Schiffssteuerungs-/Simulationsteil**. Im Zentrum steht eine animierte,
drehbare **Erde mit Tag-/Nacht-Zyklus**, auf der alle Schiffsbewegungen entlang
exakter **Großkreisrouten** dargestellt werden. Du baust ein globales
Handelsimperium aus Flotte, Hafenanteilen, Industrie- und Rohstoffkomplexen und
einem Börsenportfolio auf.

Komplett in **Vanilla JavaScript (ES-Module) + Canvas/SVG**, ohne Build-Schritt
und ohne externe Abhängigkeiten. Alle Grafiken werden prozedural erzeugt.

## Starten

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
| **Progression** | Start mit 75 Mio. $ und 3 Schiffen; Wachstum über Handelsmargen, Dividenden, Komplex-Erträge und Übernahmen |

## Spielablauf in Kürze

1. **Flotte** → ein Schiff wählen, im Heimathafen eine günstige Ware **laden**.
2. Bestes **Ziel** wählen (Gewinn-Schätzung inkl. Treibstoff & Fixkosten) und
   **auslaufen**. Optional **Dauerschleife** für Pendelverkehr.
3. Auf dem Globus zusehen, wie das Schiff der Route folgt — heranzoomen mit 🎯.
4. Gewinne in **Werft** (neue/größere Schiffe), **Beteiligungen** (Häfen,
   Komplexe) und **Börse** (Anteile bis zur Übernahme) reinvestieren.
5. **Ereignisse** beobachten und Preisverwerfungen ausnutzen.

## Architektur

```
src/
  data/      world.js (Kontinente/Landmaske), ports.js, products.js,
             ships.js, companies.js
  engine/    state.js (Orchestrierung), time.js (Uhr/Sonnenstand),
             economy.js, events.js, fleet.js (Routing/Treibstoff/Verschleiß),
             market.js (Börse/Übernahmen), assets.js (Beteiligungen), util.js
  render/    globe.js (Orthographie-Globus, Tag/Nacht, Zoom, Schiffe),
             shipart.js (Schiff-Seitenprofile), portart.js (Hafenszenen)
  ui/        ui.js (Panels, Steuerung)
  main.js    Render-/Simulationsschleife
```

## Hinweis zu den Grafiken

Es werden bewusst **prozedurale** Canvas-/SVG-Grafiken statt Fotos verwendet, damit
das Spiel komplett offline, ohne Assets und ohne Build läuft. Die Erde ist als
beleuchteter, gepunkteter Globus mit Tag/Nacht-Terminator umgesetzt; Schiffe
erscheinen je nach Zoom als Punkt, Silhouette mit Kielwasser oder Detailmodell
mit Namensschild.
