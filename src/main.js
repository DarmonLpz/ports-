// Einstiegspunkt: erstellt Spielzustand, Globus-Renderer und UI und treibt die
// Render-/Simulationsschleife.

import { GameState } from './engine/state.js';
import { GlobeRenderer } from './render/globe.js';
import { UI } from './ui/ui.js';

const state = new GameState();
state.clock.speed = 0.6;     // Standard „1×“: ~40 Echtsekunden pro Spieltag

const canvas = document.getElementById('globe');
const globe = new GlobeRenderer(canvas);
const ui = new UI(state, globe, document.getElementById('hud'));

// Startauswahl: Heimatflotte sichtbar machen
state.notify('Willkommen bei OCEANUM. Beginne mit deiner Startflotte in Hamburg, Rotterdam und Singapur.', 'info');

let last = performance.now();
function frame(now) {
  const dtMs = Math.min(120, now - last);   // gegen Sprünge bei Tab-Wechsel
  last = now;
  const dtSeconds = dtMs / 1000;

  state.tick(dtSeconds);
  globe.render(state, state.clock.subsolarPoint(), dtMs);
  ui.tickUI(now);

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Für Debug/Konsole
window.OCEANUM = { state, globe, ui };
