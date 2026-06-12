// Sachwerte des Spielers jenseits der Flotte:
//  - Hafenanteile: prozentuale Beteiligung an Häfen, zahlt aus dem Umschlag.
//  - Industriekomplexe: veredeln Waren, erhöhen das lokale Angebot, werfen Marge ab.
//  - Rohstoffabbau: fördert Erze/Energie/Agrar, erhöht das Angebot am Hafen.
// Komplexe speisen ihren Ausstoß in die Wirtschaft (economy.boostProduction)
// und verzahnen so Eigenproduktion mit den Marktpreisen.

import { PORTS_BY_ID } from '../data/ports.js';
import { PRODUCTS_BY_ID } from '../data/products.js';

const RAW_CATS = new Set(['ore', 'energy', 'agri']);

let CX_SEQ = 1;

export class AssetManager {
  constructor() {
    this.portStakes = {};   // portId -> { stake: 0..1, level: 1 }
    this.complexes = [];    // { id, type, portId, pid, level, baseOutput }
  }

  // ---- Hafenanteile ----
  portShareUnitCost(portId) {
    const p = PORTS_BY_ID[portId];
    const h = this.portStakes[portId];
    const lvl = h?.level ?? 1;
    const stake = h?.stake ?? 0;
    // Preis pro 1 % steigt mit bereits gehaltenem Anteil und Ausbaustufe.
    return p.size * 1_800_000 * lvl * (1 + stake * 1.5);
  }
  buyPortShare(portId, pct) {                 // pct in Prozentpunkten (z. B. 5)
    const frac = pct / 100;
    const h = this.portStakes[portId] ?? (this.portStakes[portId] = { stake: 0, level: 1 });
    const cost = this.portShareUnitCost(portId) * pct;
    h.stake = Math.min(1, h.stake + frac);
    return cost;
  }
  portExpandCost(portId) {
    const p = PORTS_BY_ID[portId];
    const lvl = this.portStakes[portId]?.level ?? 1;
    return p.size * 12_000_000 * lvl;
  }
  expandPort(portId) {
    const h = this.portStakes[portId] ?? (this.portStakes[portId] = { stake: 0, level: 1 });
    const cost = this.portExpandCost(portId);
    h.level += 1;
    return cost;
  }

  // ---- Komplexe ----
  complexBuildCost(portId, pid) {
    const prod = PRODUCTS_BY_ID[pid];
    const p = PORTS_BY_ID[portId];
    const raw = RAW_CATS.has(prod.cat);
    const base = raw ? 28_000_000 : 45_000_000;
    return base * p.size * (0.6 + Math.min(2, prod.base / 4000));
  }
  buildComplex(portId, pid) {
    const prod = PRODUCTS_BY_ID[pid];
    const type = RAW_CATS.has(prod.cat) ? 'raw' : 'industry';
    const baseOutput = type === 'raw' ? 320 + Math.random() * 280 : 180 + Math.random() * 200;
    const cx = { id: `CX${CX_SEQ++}`, type, portId, pid, level: 1, baseOutput };
    this.complexes.push(cx);
    return cx;
  }
  complexExpandCost(cx) {
    return this.complexBuildCost(cx.portId, cx.pid) * 0.55 * cx.level;
  }
  expandComplex(cx) {
    const cost = this.complexExpandCost(cx);
    cx.level += 1;
    return cost;
  }

  // ---- Tägliche Erträge + Einspeisung in die Wirtschaft ----
  dailyIncome(economy) {
    let income = 0;

    for (const portId in this.portStakes) {
      const h = this.portStakes[portId];
      const p = PORTS_BY_ID[portId];
      // Umschlagswert ~ Hafengröße × Ausbaustufe × Welt-Konjunktur
      const throughput = p.size * 4_500_000 * h.level;
      income += throughput * h.stake * 0.0016;
    }

    for (const cx of this.complexes) {
      const output = cx.baseOutput * cx.level;              // t/Tag
      economy.boostProduction(cx.portId, cx.pid, output);   // erhöht lokales Angebot
      const price = economy.worldPriceOf(cx.pid);
      const margin = cx.type === 'raw' ? 0.16 : 0.11;
      income += output * price * margin;
    }
    return income;
  }

  portfolioValue(economy) {
    let v = 0;
    for (const portId in this.portStakes) {
      const h = this.portStakes[portId];
      const p = PORTS_BY_ID[portId];
      v += p.size * 1_800_000 * h.level * 60 * h.stake;
    }
    for (const cx of this.complexes) v += this.complexBuildCost(cx.portId, cx.pid) * cx.level * 0.8;
    return v;
  }
}
