// Flotte: einzelne Schiffe mit echtem Großkreis-Routing, Treibstoff,
// Verschleiß/Reparatur und Upgrades. Verwaltet sowohl die Spielerflotte als
// auch die Welt-Flotte der KI-Reedereien (für Bewegung auf dem Globus).

import { SHIP_CLASS_BY_ID, SHIP_CLASSES, UPGRADE_BY_ID, randomShipName } from '../data/ships.js';
import { COMPANIES } from '../data/companies.js';
import { PORTS, PORTS_BY_ID } from '../data/ports.js';
import { gcDistance, gcInterpolate } from './util.js';

let SHIP_SEQ = 1;

export class Ship {
  constructor(classId, owner, name, atPortId) {
    const c = SHIP_CLASS_BY_ID[classId];
    this.id = `S${SHIP_SEQ++}`;
    this.classId = classId;
    this.className = c.name;
    this.type = c.type;
    this.carry = c.carry;
    this.owner = owner;                 // 'player' oder company.id
    this.name = name;
    this.condition = 88 + Math.random() * 12;   // %
    this.fuelCap = c.fuel * 32;         // ~32 Tage Reichweite
    this.fuel = this.fuelCap * (0.4 + Math.random() * 0.5);
    this.upgrades = [];
    this.atPortId = atPortId;
    this.status = 'idle';               // idle | enroute | nofuel | repair
    this.voyage = null;
    this.cargo = null;                  // { pid, tons }
    this.autoLoop = null;               // { fromId, toId, pid } für Dauerschleifen
    const p = PORTS_BY_ID[atPortId];
    this.pos = { lat: p.lat, lon: p.lon };
    this.totalNm = 0;
  }

  get cls() { return SHIP_CLASS_BY_ID[this.classId]; }

  _eff(field, base) {
    let v = base;
    for (const u of this.upgrades) {
      const e = UPGRADE_BY_ID[u]?.effect;
      if (e && e[field] != null) v *= 1 + e[field];
    }
    return v;
  }
  get capacity() { return this._eff('capacity', this.cls.capacity); }
  get speed()    {
    let s = this._eff('speed', this.cls.speed);
    if (this.condition < 40) s *= 0.8;        // schlechter Zustand bremst
    if (this.condition < 20) s *= 0.7;
    return s;
  }
  get fuelRate() { return this._eff('fuel', this.cls.fuel); }
  get upkeep()   { return this._eff('upkeep', this.cls.upkeep); }
  get wearFactor() { return this._eff('wear', 1); }
  get fuelCostFactor() { return this._eff('fuelCost', 1); }

  canCarry(pid, prodCarry) { return this.carry.includes(prodCarry); }

  hasUpgrade(id) { return this.upgrades.includes(id); }
}

export class FleetManager {
  constructor(rng) {
    this.rng = rng;
    this.ships = [];
    this._usedNames = new Set();
    this._initWorldFleet();
  }

  _initWorldFleet() {
    // ~52 KI-Schiffe, verteilt auf die Reedereien, an zufälligen Häfen.
    const shippers = COMPANIES.filter(c => c.sector === 'shipper');
    const total = 52;
    for (let i = 0; i < total; i++) {
      const cls = SHIP_CLASSES[Math.floor(this.rng() * SHIP_CLASSES.length)];
      const owner = shippers[i % shippers.length].id;
      const port = PORTS[Math.floor(this.rng() * PORTS.length)];
      const ship = new Ship(cls.id, owner, randomShipName(this.rng, this._usedNames), port.id);
      this._assignRandomVoyage(ship);
      this.ships.push(ship);
    }
  }

  // Startflotte des Spielers.
  giveStarterFleet(playerName = 'player') {
    const starters = [
      new Ship('general', playerName, 'Erstlingswerk', 'hamburg'),
      new Ship('handysize', playerName, 'Nordstern', 'rotterdam'),
      new Ship('feeder', playerName, 'Hanseat', 'singapore'),
    ];
    for (const s of starters) { s.fuel = s.fuelCap; s.condition = 100; this.ships.push(s); }
    return starters;
  }

  playerShips() { return this.ships.filter(s => s.owner === 'player'); }
  shipsOf(owner) { return this.ships.filter(s => s.owner === owner); }

  routeRegions(fromId, toId) {
    const a = PORTS_BY_ID[fromId], b = PORTS_BY_ID[toId];
    return [...new Set([a.region, b.region])];
  }

  // Spieler schickt Schiff mit (bereits gekaufter) Ladung auf Reise.
  dispatch(ship, fromId, toId, cargo, events) {
    const a = PORTS_BY_ID[fromId], b = PORTS_BY_ID[toId];
    const dist = gcDistance(a.lat, a.lon, b.lat, b.lon);
    const regions = this.routeRegions(fromId, toId);
    ship.cargo = cargo;
    ship.atPortId = null;
    ship.status = 'enroute';
    ship.voyage = {
      fromId, toId, regions,
      distance: dist,
      totalHours: dist / Math.max(1, ship.speed),
      elapsedHours: 0,
      premium: events ? events.routePremium(regions) : 0,
    };
    ship.pos = { lat: a.lat, lon: a.lon };
  }

  _assignRandomVoyage(ship) {
    let to = PORTS[Math.floor(this.rng() * PORTS.length)];
    if (to.id === ship.atPortId) to = PORTS[Math.floor(this.rng() * PORTS.length)];
    const from = PORTS_BY_ID[ship.atPortId];
    const dist = gcDistance(from.lat, from.lon, to.lat, to.lon);
    ship.status = 'enroute';
    ship.voyage = { fromId: from.id, toId: to.id, regions: this.routeRegions(from.id, to.id),
      distance: dist, totalHours: dist / Math.max(1, ship.speed), elapsedHours: 0, premium: 0 };
  }

  // Bewegungs- & Zustandsupdate. dtHours = vergangene Spielstunden.
  // Liefert Liste abgeschlossener Spieler-Reisen für die Abrechnung.
  update(dtHours, economy) {
    const arrivals = [];
    for (const ship of this.ships) {
      if (ship.status !== 'enroute' || !ship.voyage) continue;
      const v = ship.voyage;

      // Treibstoffbedarf für dieses Zeitfenster
      const days = dtHours / 24;
      const need = ship.fuelRate * days;
      if (ship.owner === 'player' && ship.fuel < need) {
        ship.status = 'nofuel';                 // wartet auf Betankung
        continue;
      }
      ship.fuel = Math.max(0, ship.fuel - need);

      v.elapsedHours += dtHours;
      const f = Math.min(1, v.elapsedHours / v.totalHours);
      const a = PORTS_BY_ID[v.fromId], b = PORTS_BY_ID[v.toId];
      const [lat, lon] = gcInterpolate(a.lat, a.lon, b.lat, b.lon, f);
      ship.pos = { lat, lon };

      // Verschleiß proportional zur zurückgelegten Strecke
      const nm = (dtHours / v.totalHours) * v.distance;
      ship.totalNm += nm;
      ship.condition = Math.max(0, ship.condition - (nm / 1000) * 1.1 * ship.wearFactor);

      if (f >= 1) {
        ship.atPortId = v.toId;
        ship.pos = { lat: b.lat, lon: b.lon };
        if (ship.owner === 'player') {
          arrivals.push(ship);
          ship.status = 'idle';
          ship.voyage = null;
        } else {
          // KI: tankt/repariert pauschal, sucht neue Route
          ship.fuel = ship.fuelCap;
          ship.condition = Math.min(100, ship.condition + 15);
          this._assignRandomVoyage(ship);
        }
      }
    }
    return arrivals;
  }

  refuelCost(ship, economy) {
    const missing = ship.fuelCap - ship.fuel;
    const bunker = (economy.oilPrice / 540) * 620 * ship.fuelCostFactor; // $/t Bunker
    return { tons: missing, cost: missing * bunker, bunkerPrice: bunker };
  }

  repairCost(ship) {
    const missing = 100 - ship.condition;
    const cost = missing * (ship.cls.price * 0.0009);
    return { points: missing, cost };
  }
}
