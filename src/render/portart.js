// Prozedurale Hafen-Illustrationen. Palette und Kulisse richten sich nach der
// Region (tropisch, nordisch, Wüste, Metropole ...); markante Häfen erhalten
// ein eigenes Wahrzeichen. Deterministisch aus der Hafen-ID erzeugt.

import { mulberry32 } from '../engine/util.js';

const PALETTE = {
  n_europe: { sky: ['#9bb4cc', '#6f8aa6'], sea: '#27506b', land: '#3f5a47' },
  s_europe: { sky: ['#bcd6e8', '#7fb0c8'], sea: '#1f7fa6', land: '#9c8b54' },
  n_america:{ sky: ['#aac3da', '#7791b0'], sea: '#2b5e7e', land: '#566b54' },
  s_america:{ sky: ['#cfe6d6', '#86c098'], sea: '#1f8f8a', land: '#5b7a3f' },
  africa:   { sky: ['#e7d3a6', '#cba66a'], sea: '#2a86a0', land: '#9a7b3e' },
  mideast:  { sky: ['#f1dcab', '#e0b878'], sea: '#2f9fb0', land: '#c2a05a' },
  s_asia:   { sky: ['#dcd6b0', '#b8b272'], sea: '#2b8f96', land: '#7a8a44' },
  e_asia:   { sky: ['#b9cdd9', '#8aa6b6'], sea: '#2c6f8a', land: '#5a7060' },
  se_asia:  { sky: ['#cfe7d3', '#8fc79a'], sea: '#179f9a', land: '#4f8a4a' },
  oceania:  { sky: ['#bfe0ea', '#84bcd4'], sea: '#1f9bc0', land: '#7a8a4a' },
};

// Wahrzeichen für ausgewählte Häfen (SVG-Fragment, ~ x 40..260, Wasserlinie y=150).
const LANDMARKS = {
  sydney:    `<path d="M150 150 q8 -34 22 0 M168 150 q8 -40 24 0 M188 150 q9 -30 22 0" fill="none" stroke="#f2f2f2" stroke-width="3"/>`,
  singapore: `<rect x="150" y="70" width="14" height="80" fill="#2b3a4a"/><rect x="168" y="60" width="14" height="90" fill="#33485c"/><rect x="186" y="78" width="14" height="72" fill="#2b3a4a"/><ellipse cx="178" cy="58" rx="36" ry="8" fill="#3a5066"/>`,
  newyork:   `<rect x="150" y="58" width="12" height="92" fill="#3a4654"/><rect x="166" y="44" width="14" height="106" fill="#46566a"/><rect x="184" y="66" width="12" height="84" fill="#3a4654"/><rect x="200" y="52" width="10" height="98" fill="#46566a"/>`,
  jebelali:  `<polygon points="178,40 184,150 172,150" fill="#cdd8e3"/><rect x="150" y="96" width="10" height="54" fill="#b9a06a"/><rect x="196" y="86" width="10" height="64" fill="#b9a06a"/>`,
  hongkong:  `<rect x="150" y="60" width="10" height="90" fill="#33485c"/><rect x="164" y="48" width="12" height="102" fill="#3d556b"/><rect x="180" y="66" width="10" height="84" fill="#33485c"/><rect x="194" y="54" width="11" height="96" fill="#3d556b"/>`,
  shanghai:  `<rect x="158" y="52" width="13" height="98" fill="#3a4f63"/><rect x="176" y="40" width="9" height="110" fill="#46607a"/><circle cx="180" cy="44" r="7" fill="#7fa6c4"/><rect x="190" y="70" width="11" height="80" fill="#3a4f63"/>`,
};

export function portSceneSVG(port) {
  const pal = PALETTE[port.region] || PALETTE.n_europe;
  const rng = mulberry32([...port.id].reduce((a, c) => a + c.charCodeAt(0), 7));
  // Hintergrund-Skyline / Hügel
  let hills = '';
  for (let i = 0; i < 7; i++) {
    const x = i * 40 - 10, h = 30 + rng() * 60;
    hills += `<rect x="${x}" y="${150 - h}" width="${24 + rng() * 16}" height="${h}" fill="${pal.land}" opacity="0.5"/>`;
  }
  // Kräne am Kai
  let cranes = '';
  for (let i = 0; i < 4; i++) {
    const x = 30 + i * 26;
    cranes += `<g stroke="#d8a13a" stroke-width="3" fill="none">
      <line x1="${x}" y1="150" x2="${x}" y2="96"/><line x1="${x - 14}" y1="96" x2="${x + 20}" y2="96"/>
      <line x1="${x + 20}" y1="96" x2="${x + 20}" y2="108"/></g>`;
  }
  // Containerstapel
  let boxes = '';
  const cols = ['#d24b4b', '#4b8ad2', '#46b06a', '#d2a64b', '#9a6fd2', '#46b0b0'];
  for (let i = 0; i < 10; i++) {
    const x = 24 + i * 11, stack = 1 + Math.floor(rng() * 3);
    for (let s = 0; s < stack; s++)
      boxes += `<rect x="${x}" y="${146 - s * 7}" width="10" height="6" fill="${cols[(i + s) % cols.length]}"/>`;
  }
  const landmark = LANDMARKS[port.id] || '';
  return `<svg viewBox="0 0 260 170" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="psky_${port.id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${pal.sky[0]}"/><stop offset="1" stop-color="${pal.sky[1]}"/></linearGradient></defs>
    <rect width="260" height="170" fill="url(#psky_${port.id})"/>
    ${hills}
    ${landmark}
    <rect x="0" y="120" width="260" height="6" fill="#5a5048"/>
    ${cranes}${boxes}
    <rect y="150" width="260" height="20" fill="${pal.sea}"/>
    <rect y="148" width="260" height="3" fill="rgba(150,210,255,0.3)"/>
    <text x="8" y="164" font-family="system-ui" font-size="9" fill="rgba(255,255,255,0.8)">${port.name}, ${port.country}</text>
  </svg>`;
}
