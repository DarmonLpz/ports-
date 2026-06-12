// Einstiegspunkt: Spielzustand, Globus, UI, Save-System und Render-/Sim-Schleife.

import { GameState } from './engine/state.js';
import { GlobeRenderer } from './render/globe.js';
import { UI } from './ui/ui.js';
import { loadManifest } from './render/assets.js';
import { saveToStorage, loadFromStorage, clearSave, hasSave } from './engine/save.js';

let state = loadFromStorage() || newState();
function newState() {
  const s = new GameState();
  s.clock.speed = 0.6;     // Standard „1×“: ~40 Echtsekunden pro Spieltag
  s.notify('Willkommen bei OCEANUM. Beginne mit deiner Startflotte in Hamburg, Rotterdam und Singapur.', 'info');
  return s;
}

const canvas = document.getElementById('globe');
const globe = new GlobeRenderer(canvas);

const app = {
  onSave() { return saveToStorage(state); },
  onLoad() {
    const loaded = loadFromStorage();
    if (loaded) { state = loaded; globe.resetView(); ui.setState(state); ui._toast({ ok: true, msg: 'Spielstand geladen.' }); }
    else ui._toast({ ok: false, msg: 'Kein Spielstand vorhanden.' });
  },
  onNew() { clearSave(); state = newState(); globe.resetView(); ui.setState(state); ui._toast({ ok: true, msg: 'Neues Spiel gestartet.' }); },
};

const ui = new UI(state, globe, document.getElementById('hud'), app);

// Echte Hafenfotos nachladen (Fallback: prozedurale Szenen)
loadManifest().then(() => ui.renderTab());

// Tutorial beim ersten Start
let tutDone = false;
try { tutDone = !!localStorage.getItem('oceanum_tut_done'); } catch {}
if (!tutDone && !hasSave()) ui.showTutorial();

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
