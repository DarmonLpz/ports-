// Speichern & Laden über localStorage. Es wird nur der dynamische Zustand
// serialisiert; statische Welt (Häfen, Produkte, Firmen, Schiffsklassen) baut
// der GameState-Konstruktor neu auf und wird anschließend überschrieben.

import { GameState } from './state.js';
import { Ship, setShipSeq } from './fleet.js';

const KEY = 'oceanum_save_v1';
const VERSION = 1;

function shipToJSON(s) {
  return {
    id: s.id, classId: s.classId, owner: s.owner, name: s.name,
    condition: s.condition, fuelCap: s.fuelCap, fuel: s.fuel,
    upgrades: s.upgrades.slice(), atPortId: s.atPortId, status: s.status,
    voyage: s.voyage, cargo: s.cargo, autoLoop: s.autoLoop,
    pos: { ...s.pos }, totalNm: s.totalNm,
  };
}

function shipFromJSON(o) {
  const s = new Ship(o.classId, o.owner, o.name, o.atPortId || 'hamburg');
  Object.assign(s, {
    id: o.id, condition: o.condition, fuelCap: o.fuelCap, fuel: o.fuel,
    upgrades: o.upgrades || [], atPortId: o.atPortId, status: o.status,
    voyage: o.voyage, cargo: o.cargo, autoLoop: o.autoLoop,
    pos: o.pos, totalNm: o.totalNm,
  });
  return s;
}

export function snapshot(state) {
  const eco = {};
  for (const pid in state.economy.ports) {
    const goods = {};
    for (const g in state.economy.ports[pid].goods) goods[g] = { ...state.economy.ports[pid].goods[g] };
    eco[pid] = { goods };
  }
  const firms = {};
  for (const f of state.market.list()) {
    firms[f.id] = {
      price: f.price, playerShares: f.playerShares, controlledBy: f.controlledBy,
      cash: f.cash, dividendPerShare: f.dividendPerShare, history: f.history.slice(-60),
    };
  }
  return {
    v: VERSION, seed: state.seed, homePortId: state.homePortId ?? null,
    cash: state.cash, lastDay: state.lastDay,
    clock: { hours: state.clock.hours, speed: state.clock.speed, paused: state.clock.paused },
    economy: { oilPrice: state.economy.oilPrice, worldPrice: { ...state.economy.worldPrice },
      eventMult: { ...state.economy.eventMult }, regionBlock: { ...state.economy.regionBlock }, ports: eco },
    events: { active: state.events.active, log: state.events.log,
      _nextId: state.events._nextId, spawnCooldown: state.events.spawnCooldown },
    market: { firms, sentiment: state.market.sentiment },
    assets: { portStakes: state.assets.portStakes, complexes: state.assets.complexes },
    fleet: { ships: state.fleet.ships.map(shipToJSON) },
    netWorthHistory: state.netWorthHistory.slice(-240),
    notifications: state.notifications.slice(0, 60),
    savedAt: new Date().toISOString(),
  };
}

export function restore(data) {
  const g = new GameState(data.seed);
  g.cash = data.cash; g.lastDay = data.lastDay;
  g.homePortId = data.homePortId ?? (data.fleet?.ships?.[0]?.atPortId) ?? 'hamburg';
  Object.assign(g.clock, data.clock);

  g.economy.oilPrice = data.economy.oilPrice;
  g.economy.worldPrice = data.economy.worldPrice;
  g.economy.eventMult = data.economy.eventMult || {};
  g.economy.regionBlock = data.economy.regionBlock || {};
  for (const pid in data.economy.ports) {
    const slot = g.economy.ports[pid] || (g.economy.ports[pid] = { goods: {} });
    for (const gid in data.economy.ports[pid].goods) slot.goods[gid] = data.economy.ports[pid].goods[gid];
  }

  g.events.active = data.events.active || [];
  g.events.log = data.events.log || [];
  g.events._nextId = data.events._nextId || 1;
  g.events.spawnCooldown = data.events.spawnCooldown || 0;

  g.market.sentiment = data.market.sentiment ?? 1;
  for (const id in data.market.firms) {
    const f = g.market.firm(id); if (!f) continue;
    Object.assign(f, data.market.firms[id]);
  }

  g.assets.portStakes = data.assets.portStakes || {};
  g.assets.complexes = data.assets.complexes || [];

  let maxSeq = 0;
  g.fleet.ships = (data.fleet.ships || []).map(o => {
    const n = parseInt(String(o.id).replace(/\D/g, ''), 10); if (n > maxSeq) maxSeq = n;
    return shipFromJSON(o);
  });
  setShipSeq(maxSeq + 1);

  g.netWorthHistory = data.netWorthHistory || [];
  g.notifications = data.notifications || [];
  return g;
}

export function saveToStorage(state) {
  try { localStorage.setItem(KEY, JSON.stringify(snapshot(state))); return true; }
  catch (e) { console.warn('Speichern fehlgeschlagen', e); return false; }
}

export function loadFromStorage() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.v !== VERSION) return null;
    return restore(data);
  } catch (e) { console.warn('Laden fehlgeschlagen', e); return null; }
}

export function hasSave() {
  try { return !!localStorage.getItem(KEY); } catch { return false; }
}

export function clearSave() {
  try { localStorage.removeItem(KEY); } catch {}
}
