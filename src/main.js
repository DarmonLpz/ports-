// Einstiegspunkt: Spielzustand, Globus, UI, Save-System und Render-/Sim-Schleife.

import { GameState } from './engine/state.js';
import { GlobeRenderer } from './render/globe.js';
import { UI } from './ui/ui.js';
import { loadManifest } from './render/assets.js';
import { saveToStorage, loadFromStorage, clearSave } from './engine/save.js';
import { PORTS_BY_ID } from './data/ports.js';

let state = loadFromStorage();
const hadSave = !!state;
if (!state) state = newState();   // temporär, bis Heimathafen gewählt ist

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

const canvas = document.getElementById('globe');
const globe = new GlobeRenderer(canvas);

// Layout an Bildschirmgröße koppeln (Globus auf Mobil in den oberen Bereich)
const mq = window.matchMedia('(max-width: 820px)');
const applyLayout = () => globe.setLayout(mq.matches);
applyLayout();
mq.addEventListener?.('change', applyLayout);
window.addEventListener('orientationchange', () => setTimeout(applyLayout, 200));

const app = {
  onSave() { return saveToStorage(state); },
  onLoad() {
    const loaded = loadFromStorage();
    if (loaded) { state = loaded; globe.resetView(); ui.setState(state); ui._toast({ ok: true, msg: 'Spielstand geladen.' }); }
    else ui._toast({ ok: false, msg: 'Kein Spielstand vorhanden.' });
  },
  onNew() { clearSave(); startNewGame(); ui._toast({ ok: true, msg: 'Neues Spiel gestartet.' }); },
};

const ui = new UI(state, globe, document.getElementById('hud'), app);

// Echte Hafenfotos nachladen (Fallback: prozedurale Szenen)
loadManifest().then(() => ui.renderTab());

// Ohne vorhandenen Spielstand: Heimathafen-Wahl zum Einstieg
if (!hadSave) startNewGame();

// Autosave alle 20 s und beim Schließen
setInterval(() => saveToStorage(state), 20000);
window.addEventListener('beforeunload', () => saveToStorage(state));

let last = performance.now();
function frame(now) {
  const dtMs = Math.min(120, now - last);
  last = now;
  state.tick(dtMs / 1000);
  globe.render(state, state.clock.subsolarPoint(), dtMs);
  ui.tickUI(now);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

window.OCEANUM = { get state() { return state; }, globe, ui, app };
