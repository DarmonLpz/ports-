// Zentraler Spielzustand: bündelt Wirtschaft, Ereignisse, Flotte, Börse,
// Beteiligungen und den Spieler. Treibt die tägliche Simulation und die
// Abrechnung von Reisen.

import { mulberry32 } from './util.js';
import { GameClock } from './time.js';
import { Economy } from './economy.js';
import { EventSystem } from './events.js';
import { FleetManager, Ship } from './fleet.js';
import { SHIP_CLASS_BY_ID, UPGRADE_BY_ID, randomShipName } from '../data/ships.js';
import { Market } from './market.js';
import { AssetManager } from './assets.js';
import { PORTS_BY_ID } from '../data/ports.js';
import { PRODUCTS_BY_ID } from '../data/products.js';

export class GameState {
  constructor(seed = Date.now() & 0xffffffff) {
    this.seed = seed;
    this.rng = mulberry32(seed);
    this.clock = new GameClock();

    this.economy = new Economy(this.rng);
    this.events = new EventSystem(this.rng);
    this.fleet = new FleetManager(this.rng);
    this.market = new Market(this.economy, this.rng);
    this.assets = new AssetManager();

    this.cash = 75_000_000;
    this.netWorthHistory = [];
    this.notifications = [];
    this.lastDay = 0;

    this.fleet.giveStarterFleet('player');
  }

  notify(msg, kind = 'info') {
    this.notifications.unshift({ msg, kind, t: this.clock.dateString() });
    if (this.notifications.length > 60) this.notifications.pop();
  }

  // ---- Handelsaktionen ----
  // Kauft Ware an einem Hafen und lädt sie auf ein (leeres) Schiff.
  loadCargo(ship, portId, pid, tons) {
    if (ship.atPortId !== portId) return { ok: false, msg: 'Schiff liegt nicht in diesem Hafen.' };
    const prod = PRODUCTS_BY_ID[pid];
    if (!ship.carry.includes(prod.carry)) return { ok: false, msg: `${ship.className} kann ${prod.name} nicht laden.` };
    tons = Math.min(tons, ship.capacity, this.economy.buyableTons(portId, pid));
    if (tons <= 0) return { ok: false, msg: 'Kein Bestand verfügbar.' };
    const price = this.economy.buyPrice(portId, pid);
    const cost = price * tons;
    if (cost > this.cash) {
      tons = Math.floor(this.cash / price);
      if (tons <= 0) return { ok: false, msg: 'Nicht genug Kapital.' };
    }
    const total = this.economy.buyPrice(portId, pid) * tons;
    this.cash -= total;
    this.economy.applyBuy(portId, pid, tons);
    ship.cargo = { pid, tons };
    return { ok: true, msg: `${Math.round(tons)} t ${prod.name} geladen für ${Math.round(total).toLocaleString('de-DE')} $`, cost: total, tons };
  }

  // Schickt beladenes Schiff zum Zielhafen.
  sendShip(ship, toId) {
    if (!ship.cargo) return { ok: false, msg: 'Schiff hat keine Ladung.' };
    if (!ship.atPortId) return { ok: false, msg: 'Schiff ist nicht im Hafen.' };
    this.fleet.dispatch(ship, ship.atPortId, toId, ship.cargo, this.events);
    return { ok: true, msg: `${ship.name} → ${PORTS_BY_ID[toId].name}` };
  }

  // Reise abgeschlossen: Ladung am Zielhafen verkaufen.
  _settleArrival(ship) {
    if (!ship.cargo) return;
    const { pid, tons } = ship.cargo;
    const portId = ship.atPortId;
    const sellable = this.economy.sellableTons(portId, pid);
    const sold = Math.min(tons, Math.max(0, sellable));
    const price = this.economy.sellPrice(portId, pid);
    const revenue = price * sold;
    this.cash += revenue;
    this.economy.applySell(portId, pid, sold);
    const prod = PRODUCTS_BY_ID[pid];
    this.notify(`${ship.name}: ${Math.round(sold)} t ${prod.name} in ${PORTS_BY_ID[portId].name} verkauft (+${Math.round(revenue).toLocaleString('de-DE')} $)`, 'trade');
    ship.cargo = sold < tons ? { pid, tons: tons - sold } : null;

    // Dauerschleife? Direkt wieder beladen & zurücksenden.
    if (ship.autoLoop) this._runAutoLoop(ship);
  }

  _runAutoLoop(ship) {
    const loop = ship.autoLoop;
    // Ziel des nächsten Beins bestimmen
    const nextFrom = ship.atPortId;
    const nextTo = nextFrom === loop.toId ? loop.fromId : loop.toId;
    const pid = nextFrom === loop.fromId ? loop.pidOut : loop.pidBack;
    if (pid) {
      const res = this.loadCargo(ship, nextFrom, pid, ship.capacity);
      if (res.ok) this.fleet.dispatch(ship, nextFrom, nextTo, ship.cargo, this.events);
    }
  }

  refuel(ship) {
    const { tons, cost } = this.fleet.refuelCost(ship, this.economy);
    if (cost > this.cash) return { ok: false, msg: 'Nicht genug Kapital zum Bunkern.' };
    this.cash -= cost;
    ship.fuel = ship.fuelCap;
    if (ship.status === 'nofuel') ship.status = 'enroute';
    return { ok: true, msg: `${Math.round(tons)} t gebunkert für ${Math.round(cost).toLocaleString('de-DE')} $` };
  }

  repair(ship) {
    const { cost } = this.fleet.repairCost(ship);
    if (cost > this.cash) return { ok: false, msg: 'Nicht genug Kapital zur Reparatur.' };
    this.cash -= cost;
    ship.condition = 100;
    return { ok: true, msg: `${ship.name} repariert für ${Math.round(cost).toLocaleString('de-DE')} $` };
  }

  buyShip(classId, atPortId) {
    const cls = SHIP_CLASS_BY_ID[classId];
    if (!cls) return { ok: false, msg: 'Unbekannte Schiffsklasse.' };
    if (cls.price > this.cash) return { ok: false, msg: 'Nicht genug Kapital.' };
    this.cash -= cls.price;
    const ship = new Ship(classId, 'player', randomShipName(this.rng, this.fleet._usedNames), atPortId);
    ship.fuel = ship.fuelCap; ship.condition = 100;
    this.fleet.ships.push(ship);
    this.notify(`Gekauft: ${cls.name} „${ship.name}“`, 'fleet');
    return { ok: true, msg: `${cls.name} gekauft`, ship };
  }

  buyUpgrade(ship, upgradeId) {
    const u = UPGRADE_BY_ID[upgradeId];
    if (!u) return { ok: false, msg: 'Unbekanntes Upgrade.' };
    if (ship.hasUpgrade(upgradeId)) return { ok: false, msg: 'Bereits installiert.' };
    if (u.cost > this.cash) return { ok: false, msg: 'Nicht genug Kapital.' };
    this.cash -= u.cost;
    ship.upgrades.push(upgradeId);
    return { ok: true, msg: `${u.name} installiert auf ${ship.name}` };
  }

  // ---- Börse & Beteiligungen (mit Kapitalprüfung) ----
  buyShares(firmId, qty) {
    const f = this.market.firm(firmId);
    const cost = qty * f.price * 1.004;
    if (cost > this.cash) return { ok: false, msg: 'Nicht genug Kapital.' };
    const wasControlled = f.controlledBy === 'player';
    this.cash -= this.market.buyShares(firmId, qty);
    if (!wasControlled && f.controlledBy === 'player') this._onTakeover(f);
    return { ok: true, msg: `${qty.toLocaleString('de-DE')} Aktien ${f.ticker} gekauft` };
  }
  sellShares(firmId, qty) {
    this.cash += this.market.sellShares(firmId, qty);
    return { ok: true };
  }
  _onTakeover(f) {
    this.cash += f.cash; // Übernahme: Unternehmenskasse fließt zu
    let fleetGain = 0;
    if (f.sector === 'shipper') {
      for (const s of this.fleet.shipsOf(f.id)) { s.owner = 'player'; fleetGain++; }
    }
    this.notify(`🏛️ Übernahme: ${f.name} unter Kontrolle! +${Math.round(f.cash).toLocaleString('de-DE')} $${fleetGain ? `, +${fleetGain} Schiffe` : ''}`, 'takeover');
  }

  buyPortShare(portId, pct) {
    const cost = this.assets.portShareUnitCost(portId) * pct;
    if (cost > this.cash) return { ok: false, msg: 'Nicht genug Kapital.' };
    this.cash -= this.assets.buyPortShare(portId, pct);
    return { ok: true, msg: `${pct}% Anteil an ${PORTS_BY_ID[portId].name} gekauft` };
  }
  expandPort(portId) {
    const cost = this.assets.portExpandCost(portId);
    if (cost > this.cash) return { ok: false, msg: 'Nicht genug Kapital.' };
    this.cash -= this.assets.expandPort(portId);
    return { ok: true, msg: `${PORTS_BY_ID[portId].name} ausgebaut` };
  }
  buildComplex(portId, pid) {
    const cost = this.assets.complexBuildCost(portId, pid);
    if (cost > this.cash) return { ok: false, msg: 'Nicht genug Kapital.' };
    this.cash -= cost;
    const cx = this.assets.buildComplex(portId, pid);
    this.notify(`${cx.type === 'raw' ? 'Abbau' : 'Industrie'}komplex (${PRODUCTS_BY_ID[pid].name}) in ${PORTS_BY_ID[portId].name} errichtet`, 'asset');
    return { ok: true, msg: 'Komplex errichtet', cx };
  }
  expandComplex(cx) {
    const cost = this.assets.complexExpandCost(cx);
    if (cost > this.cash) return { ok: false, msg: 'Nicht genug Kapital.' };
    this.cash -= this.assets.expandComplex(cx);
    return { ok: true, msg: 'Komplex ausgebaut' };
  }

  netWorth() {
    let v = this.cash;
    v += this.market.portfolioValue();
    v += this.assets.portfolioValue(this.economy);
    for (const s of this.fleet.playerShips()) v += s.cls.price * (s.condition / 100) * 0.85;
    return v;
  }

  // ---- Simulationsschritt ----
  tick(dtSeconds) {
    const dh = this.clock.advance(dtSeconds);
    if (dh <= 0) return;

    // Schiffe bewegen (in Stundenschritten)
    const arrivals = this.fleet.update(dh, this.economy);
    for (const ship of arrivals) this._settleArrival(ship);

    // Tageswechsel -> Wirtschaft, Ereignisse, Börse, Erträge, Fixkosten
    const day = this.clock.day;
    while (this.lastDay < day) {
      this.lastDay++;
      this.events.applyTo(this.economy);
      this.economy.dailyTick();
      const expired = this.events.dailyTick();
      for (const e of expired) this.notify(`Ereignis beendet: ${e.title}`, 'event');
      this.market.dailyTick(this.events);

      const div = this.market.collectPlayerDividends();
      const assetIncome = this.assets.dailyIncome(this.economy);
      this.cash += div + assetIncome;

      // Fixkosten der Spielerflotte
      let upkeep = 0;
      for (const s of this.fleet.playerShips()) upkeep += s.upkeep;
      this.cash -= upkeep;

      this.netWorthHistory.push(this.netWorth());
      if (this.netWorthHistory.length > 240) this.netWorthHistory.shift();
    }

    // Neue Ereignisse melden
    if (this.events.log.length && !this.events.log[0].day) {
      const e = this.events.log[0];
      e.day = this.clock.day;
      this.notify(`${e.icon} ${e.title}`, 'event');
    }
  }
}
