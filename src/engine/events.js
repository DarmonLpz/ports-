// Weltereignisse: Kriege, Sanktionen, Krankheiten, Stürme, Booms, Rezessionen,
// Ölschocks, Piraterie, Kanalsperren, Streiks. Jedes Ereignis setzt für seine
// Laufzeit Multiplikatoren auf Warenpreise/Regionen und kann Routen verteuern.

import { PRODUCTS } from '../data/products.js';
import { REGIONS } from '../data/ports.js';

const REGION_IDS = Object.keys(REGIONS);

function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }

const TEMPLATES = [
  {
    type: 'war', icon: '⚔️', minDays: 25, maxDays: 70,
    make(rng) {
      const a = pick(rng, REGION_IDS);
      let b = pick(rng, REGION_IDS); if (b === a) b = pick(rng, REGION_IDS);
      return {
        title: `Krieg: ${REGIONS[a]} ↔ ${REGIONS[b]}`,
        desc: 'Bewaffneter Konflikt stört Handel und treibt Energie- & Metallpreise.',
        regions: [a, b], block: 0.55,
        priceUp: { crude_oil: 1.5, fuel_oil: 1.4, steel: 1.35, iron_ore: 1.25, wheat: 1.3 },
        routeRisk: 0.4, severity: 3,
      };
    },
  },
  {
    type: 'sanction', icon: '🚫', minDays: 30, maxDays: 90,
    make(rng) {
      const r = pick(rng, REGION_IDS);
      return {
        title: `Sanktionen gegen ${REGIONS[r]}`,
        desc: 'Handelssperren verknappen Exporte der Region weltweit.',
        regions: [r], block: 0.7,
        priceUp: { crude_oil: 1.25, lng: 1.3, copper: 1.2, rare_earths: 1.4 },
        routeRisk: 0.1, severity: 2,
      };
    },
  },
  {
    type: 'disease', icon: '🦠', minDays: 30, maxDays: 80,
    make(rng) {
      const r = pick(rng, REGION_IDS);
      return {
        title: `Epidemie in ${REGIONS[r]}`,
        desc: 'Krankheitswelle lähmt Produktion und treibt Pharma-Nachfrage.',
        regions: [r], block: 0.45,
        priceUp: { pharma: 1.8, dairy: 1.2, fish: 1.15 },
        routeRisk: 0.05, severity: 2,
      };
    },
  },
  {
    type: 'oil_shock', icon: '🛢️', minDays: 20, maxDays: 55,
    make() {
      return {
        title: 'Ölpreisschock',
        desc: 'Förderkürzungen lassen Rohöl und Treibstoffe explodieren.',
        regions: [], block: 0,
        priceUp: { crude_oil: 1.9, fuel_oil: 1.7, diesel: 1.6, gasoline: 1.6, lng: 1.3 },
        routeRisk: 0, severity: 3,
      };
    },
  },
  {
    type: 'boom', icon: '📈', minDays: 25, maxDays: 70,
    make(rng) {
      const p = pick(rng, PRODUCTS);
      return {
        title: `Nachfrageboom: ${p.name}`,
        desc: `Weltweit stark steigende Nachfrage nach ${p.name}.`,
        regions: [], block: 0,
        priceUp: { [p.id]: 1.6 }, routeRisk: 0, severity: 1,
      };
    },
  },
  {
    type: 'recession', icon: '📉', minDays: 40, maxDays: 110,
    make() {
      const up = {};
      for (const p of PRODUCTS) up[p.id] = 0.78;
      return {
        title: 'Globale Rezession',
        desc: 'Konjunktureinbruch drückt Nachfrage und Preise weltweit.',
        regions: [], block: 0.1, priceUp: up, routeRisk: 0, severity: 2,
      };
    },
  },
  {
    type: 'piracy', icon: '🏴‍☠️', minDays: 20, maxDays: 60,
    make(rng) {
      const r = pick(rng, ['africa', 'mideast', 'se_asia']);
      return {
        title: `Piraterie vor ${REGIONS[r]}`,
        desc: 'Überfälle verteuern Versicherung und Routen in der Region.',
        regions: [r], block: 0.05, priceUp: {}, routeRisk: 0.6, severity: 2,
      };
    },
  },
  {
    type: 'canal', icon: '⛔', minDays: 12, maxDays: 40,
    make(rng) {
      const canal = pick(rng, ['Sueskanal', 'Panamakanal']);
      return {
        title: `${canal} gesperrt`,
        desc: 'Sperrung erzwingt Umwege – globale Frachtraten steigen.',
        regions: [], block: 0, priceUp: { crude_oil: 1.15 }, routeRisk: 0.2,
        freightPremium: 0.35, severity: 3,
      };
    },
  },
  {
    type: 'strike', icon: '✊', minDays: 8, maxDays: 28,
    make(rng) {
      const r = pick(rng, REGION_IDS);
      return {
        title: `Hafenstreik in ${REGIONS[r]}`,
        desc: 'Arbeitsniederlegung blockiert Umschlag in der Region.',
        regions: [r], block: 0.6, priceUp: {}, routeRisk: 0, severity: 1,
      };
    },
  },
  {
    type: 'harvest', icon: '🌾', minDays: 30, maxDays: 70,
    make(rng) {
      const crops = ['wheat', 'corn', 'rice', 'soybeans', 'coffee', 'sugar', 'cocoa'];
      const p = pick(rng, crops);
      const bad = rng() < 0.5;
      return {
        title: bad ? `Missernte: ${p}` : `Rekordernte: ${p}`,
        desc: bad ? 'Ernteausfall verknappt das Angebot stark.' : 'Überangebot drückt den Preis.',
        regions: [], block: 0, priceUp: { [p]: bad ? 1.7 : 0.6 }, routeRisk: 0, severity: 1,
      };
    },
  },
];

export class EventSystem {
  constructor(rng) {
    this.rng = rng;
    this.active = [];     // { id, type, icon, title, desc, regions, block, priceUp, routeRisk, freightPremium, daysLeft, age }
    this.log = [];        // jüngste Meldungen
    this._nextId = 1;
    this.spawnCooldown = 6;
  }

  maybeSpawn() {
    if (this.spawnCooldown > 0) { this.spawnCooldown--; return null; }
    // Wahrscheinlichkeit steigt, wenn wenige Ereignisse aktiv sind.
    const p = 0.22 + Math.max(0, 3 - this.active.length) * 0.05;
    if (this.rng() > p) return null;
    const tpl = TEMPLATES[Math.floor(this.rng() * TEMPLATES.length)];
    const data = tpl.make(this.rng);
    const days = Math.floor(tpl.minDays + this.rng() * (tpl.maxDays - tpl.minDays));
    const ev = { id: this._nextId++, type: tpl.type, icon: tpl.icon, ...data, daysLeft: days, age: 0 };
    this.active.push(ev);
    this.log.unshift({ icon: ev.icon, title: ev.title, day: null });
    if (this.log.length > 12) this.log.pop();
    this.spawnCooldown = 4 + Math.floor(this.rng() * 6);
    return ev;
  }

  dailyTick() {
    for (const ev of this.active) { ev.daysLeft--; ev.age++; }
    const expired = this.active.filter(e => e.daysLeft <= 0);
    this.active = this.active.filter(e => e.daysLeft > 0);
    this.maybeSpawn();
    return expired;
  }

  // Schreibt Multiplikatoren/Blockaden in die Wirtschaft.
  applyTo(economy) {
    economy.eventMult = {};
    economy.regionBlock = {};
    for (const ev of this.active) {
      for (const pid in ev.priceUp) {
        economy.eventMult[pid] = (economy.eventMult[pid] ?? 1) * ev.priceUp[pid];
      }
      for (const r of ev.regions) {
        economy.regionBlock[r] = Math.min(0.95, (economy.regionBlock[r] ?? 0) + ev.block);
      }
    }
  }

  // Zusatzkosten-Faktor für eine Route, die durch betroffene Regionen führt.
  routePremium(regionsOnRoute) {
    let prem = 0;
    for (const ev of this.active) {
      if (ev.freightPremium) prem += ev.freightPremium;
      if (ev.routeRisk && ev.regions.some(r => regionsOnRoute.includes(r))) prem += ev.routeRisk * 0.5;
    }
    return prem;
  }
}
