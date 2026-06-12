// Prozedurale Seitenprofil-Illustrationen der Schiffstypen (zweite Perspektive
// ergänzend zur Draufsicht auf dem Globus). Liefert fertiges SVG-Markup.

const SEA = '#0b2c4a';

function hull(color, deck = 64) {
  return `<path d="M8 ${deck} L18 ${deck + 18} L182 ${deck + 18} L196 ${deck + 4} L196 ${deck} Z" fill="${color}"/>
          <rect x="8" y="${deck - 2}" width="188" height="3" fill="rgba(255,255,255,0.25)"/>`;
}

const ART = {
  Container: (c) => hull('#324b66') + `
    ${[0,1,2,3,4,5,6].map(i=>`<rect x="${22+i*22}" y="34" width="20" height="30" fill="${['#d24b4b','#4b8ad2','#46b06a','#d2a64b','#9a6fd2','#46b0b0','#d2734b'][i%7]}"/>`).join('')}
    <rect x="168" y="22" width="22" height="42" fill="#1b2838"/><rect x="172" y="26" width="14" height="10" fill="#9ad0ff"/>`,
  Bulker: (c) => hull('#3a3320') + `
    <rect x="20" y="50" width="150" height="14" fill="#5a4f30"/>
    ${[0,1,2,3,4].map(i=>`<rect x="${28+i*28}" y="44" width="22" height="8" fill="#2c2718"/>`).join('')}
    <rect x="170" y="26" width="20" height="38" fill="#26303c"/>
    <line x1="40" y1="44" x2="40" y2="20" stroke="#888" stroke-width="2"/><line x1="96" y1="44" x2="96" y2="20" stroke="#888" stroke-width="2"/>`,
  Tanker: (c) => hull('#3a2622') + `
    <rect x="20" y="46" width="150" height="18" rx="3" fill="#5b3b34"/>
    ${[0,1,2,3,4,5].map(i=>`<circle cx="${34+i*24}" cy="46" r="3" fill="#caa"/><line x1="${34+i*24}" y1="46" x2="${34+i*24}" y2="38" stroke="#caa" stroke-width="2"/>`).join('')}
    <rect x="170" y="28" width="20" height="36" fill="#2c2622"/>`,
  Gastanker: (c) => hull('#2a2438') + `
    ${[0,1,2,3].map(i=>`<circle cx="${42+i*36}" cy="44" r="17" fill="#b9a6e8" stroke="#fff" stroke-width="1"/>`).join('')}
    <rect x="172" y="28" width="18" height="36" fill="#241f30"/>`,
  Reefer: (c) => hull('#dfe6ee', 60) + `
    <rect x="18" y="38" width="150" height="22" fill="#eef3f8"/>
    <rect x="18" y="38" width="150" height="6" fill="#cdd8e3"/>
    <rect x="168" y="22" width="22" height="38" fill="#b8c4d0"/><rect x="172" y="26" width="14" height="9" fill="#9ad0ff"/>`,
  RoRo: (c) => hull('#2f3b4a', 58) + `
    <rect x="14" y="22" width="160" height="38" fill="#46586c"/>
    <rect x="14" y="22" width="160" height="5" fill="#5f7a9c"/>
    ${[0,1,2,3,4,5,6,7].map(i=>`<rect x="${20+i*19}" y="30" width="13" height="22" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.15)"/>`).join('')}`,
  'Stückgut': (c) => hull('#33414f') + `
    <rect x="22" y="48" width="150" height="16" fill="#445463"/>
    <rect x="150" y="26" width="22" height="38" fill="#26303c"/>
    <line x1="60" y1="48" x2="60" y2="14" stroke="#aaa" stroke-width="3"/><line x1="60" y1="14" x2="92" y2="30" stroke="#aaa" stroke-width="2"/>
    <line x1="110" y1="48" x2="110" y2="14" stroke="#aaa" stroke-width="3"/><line x1="110" y1="14" x2="142" y2="30" stroke="#aaa" stroke-width="2"/>`,
  'Heavy-Lift': (c) => hull('#2e3a30') + `
    <rect x="22" y="50" width="150" height="14" fill="#3d4d3f"/>
    <rect x="150" y="28" width="22" height="36" fill="#26302a"/>
    <line x1="70" y1="50" x2="70" y2="8" stroke="#c9a24b" stroke-width="4"/><line x1="70" y1="8" x2="120" y2="34" stroke="#c9a24b" stroke-width="3"/>
    <rect x="116" y="34" width="10" height="12" fill="#888"/>`,
};

export function shipProfileSVG(type) {
  const body = (ART[type] || ART['Stückgut'])();
  return `<svg viewBox="0 0 204 96" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0a2540"/><stop offset="1" stop-color="#103a5c"/></linearGradient></defs>
    <rect width="204" height="96" fill="url(#sky)"/>
    <rect y="82" width="204" height="14" fill="${SEA}"/>
    <rect y="80" width="204" height="3" fill="rgba(120,190,255,0.25)"/>
    ${body}
  </svg>`;
}
