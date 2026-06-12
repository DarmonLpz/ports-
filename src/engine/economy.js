// Verzahnte Wirtschaftssimulation.
// Jeder Hafen führt für seine gehandelten Waren einen Markt mit
// Gleichgewichtspreis, aktuellem Preis, kaufbarem Bestand und Aufnahme-
// kapazität (Nachfrage). Exporthäfen bieten Waren günstig an, Importhäfen
// zahlen Aufschläge -> der Spieler arbitriert die Differenz per Schiff.
//
// Preise reagieren auf: Ereignis-Multiplikatoren (Kriege, Sanktionen ...),
// zufällige Angebots-/Nachfrageschwankungen und den Preis-Impact eigener
// Handelsgeschäfte. Welt-Durchschnittspreise treiben die Börse, der
// Ölpreis treibt die Bunkerkosten der Flotte.

import { PRODUCTS, PRODUCTS_BY_ID } from '../data/products.js';
import { PORTS } from '../data/ports.js';
import { clamp } from './util.js';

const REGION_MULT = {
  n_europe: 1.06, s_europe: 1.02, n_america: 1.05, s_america: 0.94,
  e_asia: 0.97, se_asia: 0.92, s_asia: 0.90, mideast: 0.88,
  africa: 0.95, oceania: 1.0,
};

// Grundwaren, die praktisch jeder Hafen zusätzlich nachfragt (Energie/Nahrung).
const UNIVERSAL_DEMAND = ['crude_oil', 'diesel', 'wheat', 'machinery'];

export class Economy {
  constructor(rng) {
    this.rng = rng;
    this.ports = {};            // portId -> { goods: { productId -> good } }
    this.worldPrice = {};       // productId -> Welt-Durchschnittspreis
    this.eventMult = {};        // key `${productId}` oder `${productId}@${region}` -> Faktor
    this.regionBlock = {};      // region -> Sanktions-/Kriegssperre (0..1 Handelsdämpfung)
    this.oilPrice = PRODUCTS_BY_ID.crude_oil.base;
    this._init();
  }

  _mkGood(product, role, region) {
    const rng = this.rng;
    const roleMult = role === 'export' ? 0.74 + rng() * 0.08
                   : role === 'import' ? 1.20 + rng() * 0.12
                   : 0.98 + rng() * 0.06;
    const regionMult = (REGION_MULT[region] ?? 1) * (0.95 + rng() * 0.1);
    const eq = product.base * roleMult * regionMult;
    const big = role === 'export';
    const stockCap   = (big ? 1 : 0.18) * (30000 + rng() * 90000);
    const demandCap  = (big ? 0.18 : 1) * (30000 + rng() * 90000);
    return {
      pid: product.id,
      role,
      eq,
      price: eq * (0.95 + rng() * 0.1),
      stock: stockCap * (0.5 + rng() * 0.4),
      stockCap,
      demand: demandCap * (0.5 + rng() * 0.4),
      demandCap,
      regen: (stockCap + demandCap) * 0.012,  // Erholung pro Tag
      pressure: 0,                              // transiente Preisverschiebung
      vol: product.vol,
    };
  }

  _init() {
    for (const port of PORTS) {
      const goods = {};
      for (const pid of port.exports) {
        if (PRODUCTS_BY_ID[pid]) goods[pid] = this._mkGood(PRODUCTS_BY_ID[pid], 'export', port.region);
      }
      for (const pid of port.imports) {
        if (PRODUCTS_BY_ID[pid] && !goods[pid]) goods[pid] = this._mkGood(PRODUCTS_BY_ID[pid], 'import', port.region);
      }
      for (const pid of UNIVERSAL_DEMAND) {
        if (!goods[pid] && PRODUCTS_BY_ID[pid]) goods[pid] = this._mkGood(PRODUCTS_BY_ID[pid], 'import', port.region);
      }
      this.ports[port.id] = { goods };
    }
    this._recomputeWorldPrices();
  }

  _recomputeWorldPrices() {
    for (const p of PRODUCTS) {
      let sum = 0, n = 0;
      for (const pid in this.ports) {
        const g = this.ports[pid].goods[p.id];
        if (g) { sum += g.price; n++; }
      }
      this.worldPrice[p.id] = n ? sum / n : p.base;
    }
    this.oilPrice = this.worldPrice.crude_oil;
  }

  // Multiplikator aus Ereignissen für eine Ware in einer Region.
  _mult(pid, region) {
    return (this.eventMult[pid] ?? 1) * (this.eventMult[`${pid}@${region}`] ?? 1);
  }

  // Ein Wirtschaftstag.
  dailyTick() {
    const rng = this.rng;
    for (const port of PORTS) {
      const block = this.regionBlock[port.region] ?? 0;
      const goods = this.ports[port.id].goods;
      for (const pid in goods) {
        const g = goods[pid];
        const mult = this._mult(pid, port.region);
        const targetPrice = g.eq * mult;
        // Mittelwertrückkehr zum (ereignisbeeinflussten) Gleichgewicht
        g.price += (targetPrice - g.price) * 0.12;
        // Zufällige Angebots-/Nachfrageschwankung
        g.price *= 1 + (rng() - 0.5) * g.vol * 0.06;
        // Transienter Handels-Impact klingt ab
        g.price += g.pressure;
        g.pressure *= 0.7;
        g.price = clamp(g.price, g.eq * 0.25, g.eq * 4);
        // Bestände/Nachfrage erholen sich (Welt-Hintergrundhandel), gedämpft durch Blockaden
        const regen = g.regen * (1 - block * 0.85);
        g.stock = clamp(g.stock + regen, 0, g.stockCap);
        g.demand = clamp(g.demand + regen, 0, g.demandCap);
      }
    }
    this._recomputeWorldPrices();
  }

  good(portId, pid) { return this.ports[portId]?.goods[pid]; }

  // Kaufpreis pro Tonne beim Hafen (inkl. kleinem Spread).
  buyPrice(portId, pid) { const g = this.good(portId, pid); return g ? g.price * 1.02 : null; }
  // Verkaufspreis pro Tonne an den Hafen.
  sellPrice(portId, pid) { const g = this.good(portId, pid); return g ? g.price * 0.98 : null; }

  // Wie viel der Spieler hier maximal kaufen / verkaufen kann.
  buyableTons(portId, pid) { const g = this.good(portId, pid); return g ? Math.floor(g.stock) : 0; }
  sellableTons(portId, pid) { const g = this.good(portId, pid); return g ? Math.floor(g.demand) : 0; }

  // Spieler kauft Ware -> Bestand sinkt, Preis steigt (Impact).
  applyBuy(portId, pid, tons) {
    const g = this.good(portId, pid); if (!g) return;
    g.stock = clamp(g.stock - tons, 0, g.stockCap);
    const impact = (tons / g.stockCap) * g.price * 0.6;
    g.pressure += impact; g.price += impact * 0.3;
  }
  // Spieler verkauft Ware -> Aufnahmekapazität sinkt, Preis fällt.
  applySell(portId, pid, tons) {
    const g = this.good(portId, pid); if (!g) return;
    g.demand = clamp(g.demand - tons, 0, g.demandCap);
    const impact = (tons / g.demandCap) * g.price * 0.6;
    g.pressure -= impact; g.price -= impact * 0.3;
  }

  // Produktionskomplex (im Besitz des Spielers/KI) erhöht das Angebot
  // einer Ware an einem Hafen -> drückt dort tendenziell den Preis.
  boostProduction(portId, pid, tons) {
    let g = this.good(portId, pid);
    if (!g) {
      const prod = PRODUCTS_BY_ID[pid]; if (!prod) return;
      const region = PORTS.find(p => p.id === portId)?.region ?? 'oceania';
      g = this._mkGood(prod, 'export', region);
      this.ports[portId].goods[pid] = g;
    }
    g.stock = clamp(g.stock + tons, 0, g.stockCap * 1.5);
  }

  worldPriceOf(pid) { return this.worldPrice[pid] ?? PRODUCTS_BY_ID[pid]?.base ?? 0; }
}
