// Börse. Jedes Unternehmen hat einen Kurs, der an die Weltpreise seiner
// Leitrohstoffe (exposure) gekoppelt ist, plus Markt­stimmung (Ereignisse)
// und Rauschen. Der Spieler kann Aktien handeln; ab 50 % Anteil übernimmt er
// das Unternehmen (Reedereiflotten gehen in seinen Besitz über). KI-Reedereien
// handeln ebenfalls und können sich gegenseitig übernehmen.

import { COMPANIES } from '../data/companies.js';

export class Market {
  constructor(economy, rng) {
    this.rng = rng;
    this.economy = economy;
    this.firms = {};
    this.sentiment = 1;
    this.baseWorld = {};   // Referenz-Weltpreise zum Start
    for (const c of COMPANIES) {
      this.firms[c.id] = {
        ...c,
        basePrice: c.price,
        price: c.price,
        playerShares: 0,
        controlledBy: null,           // null | 'player' | companyId
        history: Array(48).fill(c.price),
        dividendPerShare: 0,
        cash: c.cash,
      };
    }
    for (const pid in economy.worldPrice) this.baseWorld[pid] = economy.worldPrice[pid];
  }

  list() { return Object.values(this.firms); }
  firm(id) { return this.firms[id]; }

  _commodityIndex(firm) {
    let sum = 0, n = 0;
    for (const pid of firm.exposure) {
      const base = this.baseWorld[pid];
      if (!base) continue;
      sum += this.economy.worldPrice[pid] / base;
      n++;
    }
    return n ? sum / n : 1;
  }

  // Aufgerufen je Wirtschaftstag.
  dailyTick(events) {
    // Marktstimmung: Rezession/Krieg drücken, Booms heben.
    let mood = 1;
    for (const ev of events.active) {
      if (ev.type === 'recession') mood -= 0.18;
      else if (ev.type === 'war') mood -= 0.06;
      else if (ev.type === 'boom') mood += 0.05;
      else if (ev.type === 'oil_shock') mood -= 0.04;
    }
    this.sentiment += (mood - this.sentiment) * 0.2;

    for (const f of this.list()) {
      const idx = this._commodityIndex(f);
      // Produzenten reagieren direkt auf Rohstoffpreise, Reeder gehebelt aufs
      // Welt-Handelsvolumen (hier über die Stimmung approximiert).
      const lever = f.sector === 'producer' ? 1.0 : f.sector === 'shipper' ? 1.3 : 0.8;
      const fair = f.basePrice * Math.pow(idx, lever) * this.sentiment;
      f.price += (fair - f.price) * 0.10;
      f.price *= 1 + (this.rng() - 0.5) * 0.04;        // Rauschen
      f.price = Math.max(1, f.price);
      f.history.push(f.price);
      if (f.history.length > 120) f.history.shift();

      // Dividende: an Profitabilität (Index × Stimmung) gekoppelt
      const yieldRate = Math.max(0, 0.004 * idx * this.sentiment);
      f.dividendPerShare = f.price * yieldRate;
      f.cash *= 1.0008;                                 // Gewinnthesaurierung
    }

    this._aiTrading();
  }

  // Leichte KI: Reedereien kaufen gelegentlich Anteile, treiben Kurse.
  _aiTrading() {
    for (const f of this.list()) {
      if (f.sector !== 'shipper' || f.controlledBy) continue;
      if (this.rng() > 0.15) continue;
      const targets = this.list().filter(t => t.id !== f.id && !t.controlledBy);
      const t = targets[Math.floor(this.rng() * targets.length)];
      if (!t) continue;
      const spend = f.cash * 0.05 * (f.ai?.aggression ?? 0.5);
      const qty = Math.floor(spend / t.price);
      if (qty > 0 && spend < f.cash) {
        f.cash -= qty * t.price;
        t.price *= 1 + Math.min(0.03, qty / t.shares); // Nachfrage-Impact
      }
    }
  }

  // Dividenden an den Spieler ausschütten (pro Wirtschaftstag).
  collectPlayerDividends() {
    let total = 0;
    for (const f of this.list()) total += f.playerShares * f.dividendPerShare;
    return total;
  }

  buyCost(firmId, qty) {
    const f = this.firm(firmId);
    const impact = 1 + Math.min(0.08, qty / f.shares);  // großer Kauf treibt Kurs
    return { gross: qty * f.price, fee: qty * f.price * 0.004, avgPrice: f.price * (1 + impact) / 2, impact };
  }

  buyShares(firmId, qty) {
    const f = this.firm(firmId);
    const cost = qty * f.price * 1.004;
    f.playerShares = Math.min(f.shares, f.playerShares + qty);
    f.price *= 1 + Math.min(0.08, qty / f.shares);
    this._checkTakeover(f);
    return cost;
  }

  sellShares(firmId, qty) {
    const f = this.firm(firmId);
    qty = Math.min(qty, f.playerShares);
    const proceeds = qty * f.price * 0.996;
    f.playerShares -= qty;
    f.price *= 1 - Math.min(0.08, qty / f.shares);
    f.price = Math.max(1, f.price);
    if (f.playerShares / f.shares < 0.5) f.controlledBy = (f.controlledBy === 'player') ? null : f.controlledBy;
    return proceeds;
  }

  playerStake(firmId) {
    const f = this.firm(firmId);
    return f.playerShares / f.shares;
  }

  // Prüft, ob der Spieler die Mehrheit hält -> Übernahme.
  _checkTakeover(f) {
    if (f.controlledBy === 'player') return false;
    if (f.playerShares / f.shares >= 0.5) {
      f.controlledBy = 'player';
      return true;
    }
    return false;
  }

  // Marktkapitalisierung & Spieler-Depotwert.
  portfolioValue() {
    let v = 0;
    for (const f of this.list()) v += f.playerShares * f.price;
    return v;
  }
}
