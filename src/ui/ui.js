// Benutzeroberfläche. Baut die Kopfleiste, die Seitennavigation, die Panels
// (Übersicht, Flotte, Märkte/Häfen, Börse, Beteiligungen, Werft, Ereignisse)
// und die Auswahl-/Zoom-Steuerung. Aktionen laufen über data-act-Attribute.

import { fmtMoney, fmtNum, fmtTons } from '../engine/util.js';
import { PORTS, PORTS_BY_ID, REGIONS } from '../data/ports.js';
import { PRODUCTS_BY_ID, CATEGORIES } from '../data/products.js';
import { SHIP_CLASSES, UPGRADES, UPGRADE_BY_ID } from '../data/ships.js';
import { gcDistance } from '../engine/util.js';
import { shipProfileSVG } from '../render/shipart.js';
import { portSceneSVG } from '../render/portart.js';
import { photoOverlayHTML } from '../render/assets.js';
import { flagEmoji } from '../data/countries.js';

const STATUS = { idle: 'im Hafen', enroute: 'auf See', nofuel: 'Treibstoff leer!', repair: 'Werft' };

const TUTORIAL = [
  { icon: '🌍', title: 'Willkommen bei OCEANUM', body: 'Du leitest ein globales Handelsimperium. Im Zentrum dreht sich die Erde mit Tag-/Nacht-Zyklus – darauf siehst du alle Schiffe entlang exakter Seerouten fahren.' },
  { icon: '🖱️', title: 'Globus steuern', body: 'Ziehen dreht den Globus, das <b>Mausrad zoomt</b> stufenlos bis dicht an ein Schiff. Klicke einen Hafen oder ein Schiff an, um es auszuwählen. Mit <b>🎯</b> folgt die Kamera einem Schiff.' },
  { icon: '🚢', title: 'Handeln', body: 'Im Reiter <b>Flotte</b> wählst du ein Schiff im Hafen, <b>lädst</b> eine günstige Ware und wählst das <b>profitabelste Ziel</b>. Mit „Auslaufen“ startet die Reise – bei Ankunft wird automatisch verkauft.' },
  { icon: '⛽', title: 'Betrieb', body: 'Schiffe verbrauchen Treibstoff (am <b>Ölpreis</b> gekoppelt) und nutzen sich ab. <b>Bunkern</b>, <b>Reparieren</b> und <b>Upgrades</b> findest du in der Schiffsansicht.' },
  { icon: '🏗️', title: 'Märkte & Beteiligungen', body: 'In <b>Märkte</b> kaufst du Hafenanteile, baust Häfen aus und errichtest <b>Industrie- & Rohstoffkomplexe</b>, die Waren produzieren und Ertrag abwerfen.' },
  { icon: '🏛️', title: 'Börse & Übernahmen', body: 'An der <b>Börse</b> handelst du Aktien von Reedereien und Konzernen. Ab <b>50 % Anteil</b> übernimmst du ein Unternehmen – Reedereiflotten und Kasse gehen an dich über.' },
  { icon: '🌪️', title: 'Weltgeschehen', body: 'Kriege, Sanktionen, Epidemien, Ölschocks und Kanalsperren verschieben Preise und Routen. Beobachte die Laufschrift und nutze Verwerfungen für Gewinne. Viel Erfolg!' },
];

export class UI {
  constructor(state, globe, root, app = {}) {
    this.state = state;
    this.globe = globe;
    this.root = root;
    this.app = app;
    this.tab = 'dash';
    this.activeShipId = null;
    this.portRegionFilter = 'all';
    this.dest = {};            // shipId -> Zielhafen-Auswahl
    this._build();
    globe.onSelect = (sel) => this._onGlobeSelect(sel);
    this._lastFull = 0;
  }

  _build() {
    this.root.innerHTML = `
      <div id="topbar">
        <div class="brand">⚓ <b>OCEANUM</b> <span class="sub">Welthandels-Simulation</span></div>
        <div class="stat"><label>Datum</label><span id="t-date">–</span></div>
        <div class="stat"><label>Kapital</label><span id="t-cash" class="money">–</span></div>
        <div class="stat"><label>Vermögen</label><span id="t-net">–</span></div>
        <div class="stat"><label>Ölpreis</label><span id="t-oil">–</span></div>
        <div class="spacer"></div>
        <div class="menu">
          <button data-act="tutorial" title="Tutorial">❓</button>
          <button data-act="save" title="Speichern">💾</button>
          <button data-act="load" title="Laden">📂</button>
          <button data-act="newgame" title="Neues Spiel">🆕</button>
        </div>
        <div class="speed">
          <button data-act="speed" data-v="0" title="Pause">⏸</button>
          <button data-act="speed" data-v="1" class="on">▶</button>
          <button data-act="speed" data-v="3">⏩</button>
          <button data-act="speed" data-v="8">⏭</button>
          <button data-act="speed" data-v="24" title="Sehr schnell">🚀</button>
        </div>
      </div>
      <div id="ticker"><span id="ticker-text"></span></div>
      <nav id="nav">
        ${[['dash','📊','Übersicht'],['fleet','🚢','Flotte'],['ports','🏗️','Märkte'],
           ['market','🏛️','Börse'],['holdings','📈','Beteiligungen'],['yard','⚒️','Werft'],
           ['events','🌍','Ereignisse']].map(([id,ic,l])=>
          `<button data-act="tab" data-tab="${id}" class="${id===this.tab?'on':''}"><span>${ic}</span>${l}</button>`).join('')}
      </nav>
      <section id="panel"></section>
      <div id="zoomctl">
        <button data-act="zoom" data-v="1.4">＋</button>
        <button data-act="zoom" data-v="0.71">－</button>
        <button data-act="resetview" title="Gesamtansicht">🌐</button>
        <button data-act="followsel" title="Auswahl folgen">🎯</button>
      </div>
      <div id="toasts"></div>`;

    this.root.addEventListener('click', (e) => this._onClick(e));
    this.root.addEventListener('change', (e) => this._onChange(e));
    this.renderTab();
  }

  // ---------- Eingaben ----------
  _onClick(e) {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const act = el.dataset.act;
    const s = this.state;
    switch (act) {
      case 'tab': this.tab = el.dataset.tab; this._navHighlight(); this.renderTab(); break;
      case 'speed': {
        const v = +el.dataset.v;
        s.clock.paused = v === 0; if (v > 0) s.clock.speed = v * 0.6;
        [...this.root.querySelectorAll('.speed button')].forEach(b => b.classList.toggle('on', b === el));
        break; }
      case 'zoom': this.globe.zoomBy(+el.dataset.v); break;
      case 'resetview': this.globe.resetView(); break;
      case 'followsel': {
        const sh = this._activeShip();
        if (sh) this.globe.follow(sh);
        else if (this.globe.selected?.kind === 'port') this.globe.follow(this.globe.selected.ref);
        break; }
      case 'selectship': this.activeShipId = el.dataset.id; this.tab = 'fleet'; this._navHighlight(); this.renderTab(); break;
      case 'followship': { const sh = s.fleet.ships.find(x => x.id === el.dataset.id); if (sh) this.globe.follow(sh); break; }
      case 'load': this._doLoad(el); break;
      case 'sail': this._doSail(el); break;
      case 'refuel': { this._toast(s.refuel(this._ship(el.dataset.id))); this.renderTab(); break; }
      case 'repair': { this._toast(s.repair(this._ship(el.dataset.id))); this.renderTab(); break; }
      case 'upgrade': { this._toast(s.buyUpgrade(this._ship(el.dataset.id), el.dataset.up)); this.renderTab(); break; }
      case 'autoloop': this._toggleLoop(el); break;
      case 'buyship': { this._toast(s.buyShip(el.dataset.cls, el.dataset.port || 'hamburg')); this.renderTab(); break; }
      case 'openport': this._openPort(el.dataset.id); break;
      case 'portshare': { this._toast(s.buyPortShare(el.dataset.id, +el.dataset.pct)); this.renderTab(); break; }
      case 'portexpand': { this._toast(s.expandPort(el.dataset.id)); this.renderTab(); break; }
      case 'buildcx': this._doBuildComplex(el); break;
      case 'expandcx': { const cx = s.assets.complexes.find(c => c.id === el.dataset.id); this._toast(s.expandComplex(cx)); this.renderTab(); break; }
      case 'buyshares': { this._toast(s.buyShares(el.dataset.id, +el.dataset.qty)); this.renderTab(); break; }
      case 'sellshares': { this._toast(s.sellShares(el.dataset.id, +el.dataset.qty)); this.renderTab(); break; }
      case 'regionfilter': this.portRegionFilter = el.dataset.r; this.renderTab(); break;
      case 'save': this._toast({ ok: this.app.onSave?.(), msg: this.app.onSave ? 'Spielstand gespeichert.' : '' }); break;
      case 'load': this.app.onLoad?.(); break;
      case 'newgame': if (confirm('Neues Spiel starten? Ungespeicherter Fortschritt geht verloren.')) this.app.onNew?.(); break;
      case 'home-filter': this._homeFilter = el.dataset.r; this._renderHomePicker(); break;
      case 'home-pick': this._pickHome(el.dataset.id); break;
      case 'tutorial': this.showTutorial(); break;
      case 'tut-next': this._tutStep(+el.dataset.dir); break;
      case 'tut-close': this._closeTutorial(); break;
    }
  }

  setState(state) {
    this.state = state;
    this.activeShipId = null;
    this.dest = {};
    this._openPortId = null;
    globalThis.requestAnimationFrame(() => { this.renderTab(); this.tickUI(performance.now()); });
  }

  // ---------- Heimathafen-Auswahl (Spielstart) ----------
  showHomePortPicker(onPick) {
    this._homePick = onPick;
    this._homeFilter = 'all';
    if (!this._homeEl) {
      this._homeEl = document.createElement('div');
      this._homeEl.id = 'homepicker';
      this.root.appendChild(this._homeEl);
    }
    this._renderHomePicker();
  }
  _renderHomePicker() {
    const regions = ['all', ...Object.keys(REGIONS)];
    const filt = this._homeFilter;
    const shown = PORTS.filter(p => filt === 'all' || p.region === filt);
    const chips = regions.map(r =>
      `<button data-act="home-filter" data-r="${r}" class="chip ${r===filt?'on':''}">${r==='all'?'Alle':REGIONS[r]}</button>`).join('');
    const list = shown.map(p =>
      `<button class="portrow" data-act="home-pick" data-id="${p.id}">
        <b>${flagEmoji(p.country)} ${p.name}</b><small>${p.country} · ${REGIONS[p.region]}</small></button>`).join('');
    this._homeEl.innerHTML = `<div class="home-card">
      <div class="tut-emoji">⚓</div>
      <h3>Wähle deinen Heimathafen</h3>
      <p class="muted">Hier startest du dein Handelsimperium. Du beginnst mit 30 Mio. $ und ohne Schiffe –
        kaufe dein erstes Schiff anschließend in der <b>Werft</b>.</p>
      <div class="chips">${chips}</div>
      <div class="home-list">${list}</div>
    </div>`;
  }
  _pickHome(id) {
    if (this._homeEl) { this._homeEl.remove(); this._homeEl = null; }
    const cb = this._homePick; this._homePick = null;
    cb?.(id);
  }

  // ---------- Tutorial ----------
  showTutorial() {
    this._tut = 0;
    if (!this._tutEl) {
      this._tutEl = document.createElement('div');
      this._tutEl.id = 'tutorial';
      this.root.appendChild(this._tutEl);
    }
    this._renderTutorial();
  }
  _closeTutorial() { if (this._tutEl) { this._tutEl.remove(); this._tutEl = null; } try { localStorage.setItem('oceanum_tut_done', '1'); } catch {} }
  _tutStep(dir) {
    this._tut = Math.max(0, Math.min(TUTORIAL.length - 1, this._tut + dir));
    this._renderTutorial();
  }
  _renderTutorial() {
    const t = TUTORIAL[this._tut];
    const last = this._tut === TUTORIAL.length - 1;
    this._tutEl.innerHTML = `<div class="tut-card">
      <div class="tut-emoji">${t.icon}</div>
      <h3>${t.title}</h3>
      <p>${t.body}</p>
      <div class="tut-dots">${TUTORIAL.map((_, i) => `<i class="${i === this._tut ? 'on' : ''}"></i>`).join('')}</div>
      <div class="tut-btns">
        <button data-act="tut-close">Überspringen</button>
        ${this._tut > 0 ? '<button data-act="tut-next" data-dir="-1">Zurück</button>' : ''}
        <button data-act="${last ? 'tut-close' : 'tut-next'}" data-dir="1" class="primary">${last ? 'Los geht\'s!' : 'Weiter'}</button>
      </div>
    </div>`;
  }

  _onChange(e) {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    if (el.dataset.act === 'destsel') { this.dest[el.dataset.id] = el.value; this.renderTab(); }
    if (el.dataset.act === 'loadsel') { this._loadSel = el.value; }
    if (el.dataset.act === 'cxsel') { this._cxSel = el.value; }
    if (el.dataset.act === 'yardport') { this._yardPort = el.value; }
  }

  _ship(id) { return this.state.fleet.ships.find(s => s.id === id); }
  _activeShip() { return this.state.fleet.playerShips().find(s => s.id === this.activeShipId); }

  _onGlobeSelect(sel) {
    if (sel.kind === 'ship' && sel.ref.owner === 'player') {
      this.activeShipId = sel.ref.id; this.tab = 'fleet';
    } else if (sel.kind === 'ship') {
      this.tab = 'fleet';
    } else if (sel.kind === 'port') {
      this._openPort(sel.ref.id); return;
    }
    this._navHighlight(); this.renderTab();
  }

  _openPort(id) { this.tab = 'ports'; this._openPortId = id; this._navHighlight(); this.renderTab(); }

  _doLoad(el) {
    const ship = this._ship(el.dataset.id);
    const pid = this._loadSel || el.dataset.pid;
    const frac = +el.dataset.frac || 1;
    const max = Math.min(ship.capacity, this.state.economy.buyableTons(ship.atPortId, pid));
    this._toast(this.state.loadCargo(ship, ship.atPortId, pid, Math.floor(max * frac)));
    this.renderTab();
  }
  _doSail(el) {
    const ship = this._ship(el.dataset.id);
    const to = this.dest[ship.id] || el.dataset.to;
    if (!to) { this._toast({ ok: false, msg: 'Kein Ziel gewählt.' }); return; }
    this._toast(this.state.sendShip(ship, to));
    this.renderTab();
  }
  _toggleLoop(el) {
    const ship = this._ship(el.dataset.id);
    if (ship.autoLoop) { ship.autoLoop = null; this._toast({ ok: true, msg: 'Dauerschleife beendet.' }); }
    else if (ship.cargo && ship.atPortId && this.dest[ship.id]) {
      ship.autoLoop = { fromId: ship.atPortId, toId: this.dest[ship.id], pidOut: ship.cargo.pid, pidBack: null };
      this._toast({ ok: true, msg: 'Dauerschleife aktiv (Pendelverkehr).' });
    } else this._toast({ ok: false, msg: 'Erst laden & Ziel wählen.' });
    this.renderTab();
  }
  _doBuildComplex(el) {
    const portId = el.dataset.id;
    const pid = this._cxSel || el.dataset.pid;
    if (!pid) return;
    this._toast(this.state.buildComplex(portId, pid));
    this.renderTab();
  }

  _navHighlight() {
    [...this.root.querySelectorAll('#nav button')].forEach(b => b.classList.toggle('on', b.dataset.tab === this.tab));
  }

  _toast(res) {
    if (!res || !res.msg) return;
    const t = document.createElement('div');
    t.className = 'toast ' + (res.ok ? 'ok' : 'bad');
    t.textContent = res.msg;
    this.root.querySelector('#toasts').appendChild(t);
    setTimeout(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3200);
  }

  // ---------- laufende Aktualisierung (jede Frame, günstig) ----------
  tickUI(now) {
    const s = this.state;
    this._set('t-date', s.clock.dateString());
    this._set('t-cash', fmtMoney(s.cash));
    this._set('t-net', fmtMoney(s.netWorth()));
    this._set('t-oil', `$${s.economy.oilPrice.toFixed(0)}/t`);
    const tt = this.root.querySelector('#ticker-text');
    if (tt) {
      const evs = s.events.active.map(e => `${e.icon} ${e.title} (${e.daysLeft}T)`);
      tt.textContent = evs.length ? evs.join('   •   ') : 'Ruhige See – keine besonderen Ereignisse.';
    }
    // aktives Panel selten neu rendern, um Interaktion nicht zu stören.
    // Nicht neu rendern, solange der Spieler ein Bedienelement im Panel benutzt
    // (offenes Dropdown / fokussiertes Eingabefeld) – sonst klappt z. B. die
    // Frachtauswahl mitten im Aussuchen wieder zu.
    if (now - this._lastFull > 1500 && !this._panelInteracting()) {
      this._lastFull = now; this.renderTab();
    }
  }
  _panelInteracting() {
    const a = document.activeElement;
    if (!a) return false;
    const panel = this.root.querySelector('#panel');
    if (!panel || !panel.contains(a)) return false;
    return a.tagName === 'SELECT' || a.tagName === 'INPUT' || a.tagName === 'TEXTAREA';
  }
  _set(id, v) { const el = this.root.querySelector('#' + id); if (el) el.textContent = v; }

  // ---------- Panels ----------
  renderTab() {
    const p = this.root.querySelector('#panel');
    if (!p) return;
    switch (this.tab) {
      case 'dash': p.innerHTML = this._dash(); break;
      case 'fleet': p.innerHTML = this._fleet(); break;
      case 'ports': p.innerHTML = this._ports(); break;
      case 'market': p.innerHTML = this._market(); break;
      case 'holdings': p.innerHTML = this._holdings(); break;
      case 'yard': p.innerHTML = this._yard(); break;
      case 'events': p.innerHTML = this._events(); break;
    }
  }

  _dash() {
    const s = this.state;
    const ships = s.fleet.playerShips();
    const enroute = ships.filter(x => x.status === 'enroute').length;
    const controlled = s.market.list().filter(f => f.controlledBy === 'player');
    const spark = this._spark(s.netWorthHistory, 260, 60);
    return `<h2>Übersicht</h2>
      <div class="cards">
        <div class="card"><label>Kapital</label><div class="big money">${fmtMoney(s.cash)}</div></div>
        <div class="card"><label>Reinvermögen</label><div class="big">${fmtMoney(s.netWorth())}</div>${spark}</div>
        <div class="card"><label>Flotte</label><div class="big">${ships.length} <small>Schiffe</small></div><div class="muted">${enroute} auf See</div></div>
        <div class="card"><label>Depot</label><div class="big">${fmtMoney(s.market.portfolioValue())}</div><div class="muted">${controlled.length} übernommen</div></div>
        <div class="card"><label>Beteiligungen</label><div class="big">${fmtMoney(s.assets.portfolioValue(s.economy))}</div><div class="muted">${s.assets.complexes.length} Komplexe</div></div>
      </div>
      <div class="cols">
        <div><h3>Aktive Ereignisse</h3>${this._eventList(true)}</div>
        <div><h3>Meldungen</h3><div class="log">${s.notifications.slice(0,14).map(n=>`<div class="logline ${n.kind}"><span>${n.t}</span> ${n.msg}</div>`).join('') || '<div class="muted">Noch keine Meldungen.</div>'}</div></div>
      </div>`;
  }

  _fleet() {
    const s = this.state;
    const ships = s.fleet.playerShips();
    const active = this._activeShip() || ships[0];
    if (active) this.activeShipId = active.id;
    const list = ships.map(sh => {
      const on = sh.id === active?.id;
      const cond = sh.condition;
      return `<button class="shiprow ${on?'on':''}" data-act="selectship" data-id="${sh.id}">
        <div class="srow-top"><b>${sh.name}</b><span class="badge">${sh.type}</span></div>
        <div class="srow-sub">${STATUS[sh.status]} ${sh.cargo?`· ${fmtTons(sh.cargo.tons)} ${PRODUCTS_BY_ID[sh.cargo.pid].name}`:''}</div>
        <div class="bars"><i class="bar"><b style="width:${cond}%;background:${cond<35?'#ff5050':cond<60?'#f2b03b':'#5effa5'}"></b></i>
        <i class="bar"><b style="width:${(sh.fuel/sh.fuelCap)*100}%;background:#5bd6ff"></b></i></div>
      </button>`;
    }).join('');
    return `<h2>Flotte <small>(${ships.length})</small></h2>
      <div class="fleetwrap">
        <div class="shiplist">${list || '<div class="muted">Keine Schiffe.</div>'}</div>
        <div class="shipdetail">${active ? this._shipDetail(active) : '<div class="muted">Kein Schiff gewählt.</div>'}</div>
      </div>`;
  }

  _shipDetail(sh) {
    const s = this.state;
    const cls = sh.cls;
    const refuel = s.fleet.refuelCost(sh, s.economy);
    const repair = s.fleet.repairCost(sh);
    const profile = shipProfileSVG(sh.type);
    let trade = '';
    if (sh.status === 'idle' && sh.atPortId) {
      const port = PORTS_BY_ID[sh.atPortId];
      const goods = Object.keys(s.economy.ports[port.id].goods)
        .filter(pid => sh.carry.includes(PRODUCTS_BY_ID[pid].carry));
      if (!sh.cargo) {
        const sel = this._loadSel && goods.includes(this._loadSel) ? this._loadSel : goods[0];
        trade = `<div class="trade">
          <h4>Laden in ${port.name}</h4>
          <select data-act="loadsel">${goods.map(pid=>`<option value="${pid}" ${pid===sel?'selected':''}>${PRODUCTS_BY_ID[pid].name} – $${s.economy.buyPrice(port.id,pid).toFixed(0)}/t · ${fmtTons(s.economy.buyableTons(port.id,pid))} verf.</option>`).join('')}</select>
          <div class="btnrow">
            <button data-act="load" data-id="${sh.id}" data-frac="0.25">25%</button>
            <button data-act="load" data-id="${sh.id}" data-frac="0.5">50%</button>
            <button data-act="load" data-id="${sh.id}" data-frac="1" class="primary">Voll laden</button>
          </div></div>`;
      } else {
        trade = `<div class="trade">
          <h4>Ladung: ${fmtTons(sh.cargo.tons)} ${PRODUCTS_BY_ID[sh.cargo.pid].name}</h4>
          ${this._destChooser(sh)}
        </div>`;
      }
    } else if (sh.status === 'enroute' && sh.voyage) {
      const v = sh.voyage;
      const eta = Math.max(0, (v.totalHours - v.elapsedHours) / 24);
      trade = `<div class="trade">
        <h4>Unterwegs → ${PORTS_BY_ID[v.toId].name}</h4>
        <div class="progress"><b style="width:${Math.min(100,(v.elapsedHours/v.totalHours)*100)}%"></b></div>
        <div class="muted">${Math.round(v.distance)} sm · ETA ${eta.toFixed(1)} Tage · Kurs ${sh.pos.lat.toFixed(1)}°/${sh.pos.lon.toFixed(1)}°</div>
        <button data-act="followship" data-id="${sh.id}" class="primary">🎯 Kamera folgen</button>
      </div>`;
    } else if (sh.status === 'nofuel') {
      trade = `<div class="trade warn"><h4>⛽ Treibstoff leer!</h4><p>Schiff wartet auf See. Sofort bunkern:</p>
        <button data-act="refuel" data-id="${sh.id}" class="primary">Notbetankung – ${fmtMoney(refuel.cost)}</button></div>`;
    }

    const upg = UPGRADES.map(u => {
      const has = sh.hasUpgrade(u.id);
      return `<button class="upg ${has?'have':''}" data-act="upgrade" data-id="${sh.id}" data-up="${u.id}" ${has?'disabled':''}>
        <b>${u.name}</b><small>${u.desc}</small><span>${has?'✓ installiert':fmtMoney(u.cost)}</span></button>`;
    }).join('');

    return `
      <div class="shiphdr">
        <div class="shipart">${profile}</div>
        <div>
          <h3>${sh.name}</h3>
          <div class="muted">${cls.name} · Tier ${cls.tier} · ${STATUS[sh.status]}</div>
          <div class="kv">
            <span>Kapazität <b>${fmtTons(sh.capacity)}</b></span>
            <span>Speed <b>${sh.speed.toFixed(1)} kn</b></span>
            <span>Verbrauch <b>${sh.fuelRate.toFixed(0)} t/Tag</b></span>
            <span>Fixkosten <b>${fmtMoney(sh.upkeep)}/Tag</b></span>
          </div>
          <div class="kv">
            <span>Zustand <b>${sh.condition.toFixed(0)}%</b></span>
            <span>Bunker <b>${(sh.fuel/sh.fuelCap*100).toFixed(0)}%</b></span>
            <span>gefahren <b>${fmtNum(sh.totalNm)} sm</b></span>
          </div>
        </div>
      </div>
      ${trade}
      <div class="btnrow">
        <button data-act="refuel" data-id="${sh.id}">⛽ Bunkern ${fmtMoney(refuel.cost)}</button>
        <button data-act="repair" data-id="${sh.id}">🔧 Reparieren ${fmtMoney(repair.cost)}</button>
        <button data-act="followship" data-id="${sh.id}">🎯 Folgen</button>
      </div>
      <h4>Upgrades</h4><div class="upgrades">${upg}</div>`;
  }

  _destChooser(sh) {
    const s = this.state;
    const pid = sh.cargo.pid;
    const from = PORTS_BY_ID[sh.atPortId];
    // Beste Ziele nach Schätzgewinn
    const ranked = PORTS.filter(p => p.id !== from.id).map(p => {
      const dist = gcDistance(from.lat, from.lon, p.lat, p.lon);
      const days = dist / Math.max(1, sh.speed) / 24;
      const sell = s.economy.sellPrice(p.id, pid) ?? s.economy.worldPriceOf(pid) * 0.9;
      const fuel = days * sh.fuelRate * (s.economy.oilPrice / 540) * 620 * sh.fuelCostFactor;
      const profit = sell * sh.cargo.tons - fuel - days * sh.upkeep;
      return { p, dist, days, sell, profit };
    }).sort((a, b) => b.profit - a.profit);
    const chosen = this.dest[sh.id] || ranked[0].p.id;
    const opts = ranked.slice(0, 24).map(r =>
      `<option value="${r.p.id}" ${r.p.id===chosen?'selected':''}>${r.p.name} – ${r.profit>0?'+':''}${fmtMoney(r.profit)} · ${r.days.toFixed(1)}T</option>`).join('');
    const top = ranked[0];
    return `<div class="muted">Top-Ziel: <b>${top.p.name}</b> (${fmtMoney(top.profit)} geschätzt)</div>
      <select data-act="destsel" data-id="${sh.id}">${opts}</select>
      <div class="btnrow">
        <button data-act="sail" data-id="${sh.id}" class="primary">⚓ Auslaufen</button>
        <button data-act="autoloop" data-id="${sh.id}">${sh.autoLoop?'⏹ Schleife stoppen':'🔁 Dauerschleife'}</button>
      </div>`;
  }

  _ports() {
    const s = this.state;
    const regions = ['all', ...Object.keys(REGIONS)];
    const filt = this.portRegionFilter;
    const shown = PORTS.filter(p => filt === 'all' || p.region === filt);
    const open = this._openPortId ? PORTS_BY_ID[this._openPortId] : shown[0];
    const tabs = regions.map(r => `<button data-act="regionfilter" data-r="${r}" class="chip ${r===filt?'on':''}">${r==='all'?'Alle':REGIONS[r]}</button>`).join('');
    const list = shown.map(p => {
      const stake = s.assets.portStakes[p.id]?.stake ?? 0;
      return `<button class="portrow ${open&&p.id===open.id?'on':''}" data-act="openport" data-id="${p.id}">
        <b>${flagEmoji(p.country)} ${p.name}</b><small>${p.country}${stake>0?` · ${(stake*100).toFixed(0)}% Anteil`:''}</small></button>`;
    }).join('');
    return `<h2>Märkte & Häfen</h2>
      <div class="chips">${tabs}</div>
      <div class="fleetwrap">
        <div class="shiplist tall">${list}</div>
        <div class="shipdetail">${open ? this._portDetail(open) : ''}</div>
      </div>`;
  }

  _portDetail(port) {
    const s = this.state;
    const goods = Object.keys(s.economy.ports[port.id].goods);
    const stake = s.assets.portStakes[port.id];
    const shipsHere = s.fleet.playerShips().filter(sh => sh.atPortId === port.id);
    const rows = goods.map(pid => {
      const g = s.economy.good(port.id, pid);
      const prod = PRODUCTS_BY_ID[pid];
      const cat = CATEGORIES[prod.cat];
      const trend = g.price > g.eq * 1.05 ? '▲' : g.price < g.eq * 0.95 ? '▼' : '·';
      return `<tr>
        <td><i class="dot" style="background:${cat.color}"></i>${prod.name}</td>
        <td class="r">$${s.economy.buyPrice(port.id,pid).toFixed(0)}</td>
        <td class="r">$${s.economy.sellPrice(port.id,pid).toFixed(0)}</td>
        <td class="r ${trend==='▲'?'up':trend==='▼'?'down':''}">${trend}</td>
        <td class="r muted">${fmtTons(s.economy.buyableTons(port.id,pid))}</td>
      </tr>`;
    }).join('');
    // Komplex bauen
    const buildable = [...new Set(port.exports.filter(pid => PRODUCTS_BY_ID[pid]))];
    const cxsel = this._cxSel && buildable.includes(this._cxSel) ? this._cxSel : buildable[0];
    const myCx = s.assets.complexes.filter(c => c.portId === port.id);
    return `
      <div class="portscene">${portSceneSVG(port)}${photoOverlayHTML(port.id)}</div>
      <h3>${flagEmoji(port.country)} ${port.name} <small>${port.country} · ${REGIONS[port.region]}</small></h3>
      <div class="kv">
        <span>Anteil <b>${stake?(stake.stake*100).toFixed(0):0}%</b></span>
        <span>Ausbaustufe <b>${stake?.level ?? 1}</b></span>
        <span>Schiffe hier <b>${shipsHere.length}</b></span>
      </div>
      <div class="btnrow">
        <button data-act="portshare" data-id="${port.id}" data-pct="5">+5% Anteil (${fmtMoney(s.assets.portShareUnitCost(port.id)*5)})</button>
        <button data-act="portexpand" data-id="${port.id}">Ausbauen (${fmtMoney(s.assets.portExpandCost(port.id))})</button>
        <button data-act="followsel" title="Hinzoomen">🎯</button>
      </div>
      <div class="cxbuild">
        <select data-act="cxsel">${buildable.map(pid=>`<option value="${pid}" ${pid===cxsel?'selected':''}>${PRODUCTS_BY_ID[pid].name}</option>`).join('')}</select>
        <button data-act="buildcx" data-id="${port.id}" data-pid="${cxsel}">Komplex bauen (${fmtMoney(s.assets.complexBuildCost(port.id,cxsel))})</button>
      </div>
      ${myCx.length?`<div class="muted">Eigene Komplexe: ${myCx.map(c=>`${PRODUCTS_BY_ID[c.pid].name} (Stufe ${c.level})`).join(', ')}</div>`:''}
      <table class="goods"><thead><tr><th>Ware</th><th class="r">Kauf</th><th class="r">Verkauf</th><th></th><th class="r">Angebot</th></tr></thead><tbody>${rows}</tbody></table>
      ${shipsHere.length?`<div class="muted">Tipp: Schiffe hier im Reiter „Flotte“ beladen & auslaufen lassen.</div>`:''}`;
  }

  _market() {
    const s = this.state;
    const rows = s.market.list().map(f => {
      const hist = f.history;
      const chg = ((f.price - hist[Math.max(0, hist.length - 8)]) / hist[Math.max(0, hist.length - 8)]) * 100;
      const stake = s.market.playerStake(f.id) * 100;
      const ctrl = f.controlledBy === 'player';
      const qty10 = Math.max(1, Math.round(f.shares * 0.05));
      return `<tr class="${ctrl?'controlled':''}">
        <td><b>${f.ticker}</b><br><small class="muted">${f.name}</small></td>
        <td>${f.sector==='shipper'?'🚢 Reederei':f.sector==='producer'?'⛏️ Konzern':'💱 Handel'}</td>
        <td class="r">$${f.price.toFixed(2)}</td>
        <td class="r ${chg>=0?'up':'down'}">${chg>=0?'+':''}${chg.toFixed(1)}%</td>
        <td class="r">${stake.toFixed(1)}%${ctrl?' 👑':''}</td>
        <td class="r">${this._spark(hist,80,24)}</td>
        <td class="r">
          <button data-act="buyshares" data-id="${f.id}" data-qty="${qty10}" class="mini primary">+5%</button>
          <button data-act="sellshares" data-id="${f.id}" data-qty="${qty10}" class="mini">−</button>
        </td>
      </tr>`;
    }).join('');
    return `<h2>Börse</h2>
      <p class="muted">Kaufe Anteile an Reedereien & Konzernen. Ab 50 % übernimmst du das Unternehmen – Reedereiflotten gehen in deinen Besitz über, die Firmenkasse fließt dir zu.</p>
      <table class="market"><thead><tr><th>Ticker</th><th>Sektor</th><th class="r">Kurs</th><th class="r">Δ</th><th class="r">Anteil</th><th class="r">Verlauf</th><th></th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  _holdings() {
    const s = this.state;
    const stakes = Object.entries(s.assets.portStakes).filter(([,h])=>h.stake>0);
    const portRows = stakes.map(([id,h])=>{
      const p = PORTS_BY_ID[id];
      return `<tr><td><b>${p.name}</b> <small class="muted">${p.country}</small></td>
        <td class="r">${(h.stake*100).toFixed(0)}%</td><td class="r">Stufe ${h.level}</td>
        <td class="r"><button class="mini" data-act="portshare" data-id="${id}" data-pct="5">+5%</button>
        <button class="mini" data-act="portexpand" data-id="${id}">Ausbau</button></td></tr>`;
    }).join('') || '<tr><td colspan="4" class="muted">Noch keine Hafenanteile. Im Reiter „Märkte“ kaufen.</td></tr>';
    const cxRows = s.assets.complexes.map(c=>{
      const p = PORTS_BY_ID[c.portId];
      return `<tr><td>${c.type==='raw'?'⛏️':'🏭'} <b>${PRODUCTS_BY_ID[c.pid].name}</b> <small class="muted">${p.name}</small></td>
        <td class="r">Stufe ${c.level}</td><td class="r">${fmtTons(c.baseOutput*c.level)}/Tag</td>
        <td class="r"><button class="mini" data-act="expandcx" data-id="${c.id}">Ausbau (${fmtMoney(s.assets.complexExpandCost(c))})</button></td></tr>`;
    }).join('') || '<tr><td colspan="4" class="muted">Noch keine Komplexe. Im Reiter „Märkte“ bauen.</td></tr>';
    const controlled = s.market.list().filter(f=>f.controlledBy==='player');
    return `<h2>Beteiligungen</h2>
      <h3>Hafenanteile</h3>
      <table class="holdings"><thead><tr><th>Hafen</th><th class="r">Anteil</th><th class="r">Ausbau</th><th></th></tr></thead><tbody>${portRows}</tbody></table>
      <h3>Industrie & Rohstoffabbau</h3>
      <table class="holdings"><thead><tr><th>Komplex</th><th class="r">Stufe</th><th class="r">Ausstoß</th><th></th></tr></thead><tbody>${cxRows}</tbody></table>
      <h3>Übernommene Unternehmen</h3>
      <div class="log">${controlled.map(f=>`<div class="logline takeover">👑 ${f.name} (${f.ticker}) – ${(s.market.playerStake(f.id)*100).toFixed(0)}%</div>`).join('')||'<div class="muted">Noch keine Übernahmen.</div>'}</div>`;
  }

  _yard() {
    const s = this.state;
    const yp = this._yardPort || 'hamburg';
    const cards = SHIP_CLASSES.map(c=>{
      const afford = s.cash >= c.price;
      return `<div class="yardcard">
        <div class="shipart small">${shipProfileSVG(c.type)}</div>
        <b>${c.name}</b>
        <div class="kv2"><span>${c.type}</span><span>Tier ${c.tier}</span></div>
        <div class="kv2"><span>Kap. ${fmtTons(c.capacity)}</span><span>${c.speed} kn</span></div>
        <div class="kv2"><span>Verbr. ${c.fuel} t/T</span><span>Fix ${fmtMoney(c.upkeep)}/T</span></div>
        <button data-act="buyship" data-cls="${c.id}" data-port="${yp}" class="primary ${afford?'':'dim'}">Kaufen ${fmtMoney(c.price)}</button>
      </div>`;
    }).join('');
    return `<h2>Werft</h2>
      <div class="row">Liefer-/Heimathafen:
        <select data-act="yardport">${PORTS.map(p=>`<option value="${p.id}" ${p.id===yp?'selected':''}>${p.name}</option>`).join('')}</select></div>
      <div class="yardgrid">${cards}</div>`;
  }

  _events() {
    const s = this.state;
    return `<h2>Weltgeschehen</h2>
      <h3>Aktive Ereignisse</h3>${this._eventList(false)}
      <h3>Chronik</h3>
      <div class="log">${s.events.log.map(e=>`<div class="logline event">${e.icon} ${e.title}${e.day?` <span class="muted">– Tag ${e.day}</span>`:''}</div>`).join('')||'<div class="muted">Noch nichts passiert.</div>'}</div>`;
  }

  _eventList(compact) {
    const s = this.state;
    if (!s.events.active.length) return '<div class="muted">Keine aktiven Ereignisse.</div>';
    return `<div class="events">${s.events.active.map(e=>`
      <div class="evt sev${e.severity||1}">
        <div class="evt-h">${e.icon} <b>${e.title}</b><span class="muted">${e.daysLeft} Tage</span></div>
        ${compact?'':`<div class="muted">${e.desc}</div>`}
      </div>`).join('')}</div>`;
  }

  // kleines Sparkline-SVG
  _spark(arr, w = 120, h = 32) {
    if (!arr || arr.length < 2) return '';
    const a = arr.slice(-60);
    const min = Math.min(...a), max = Math.max(...a), rng = (max - min) || 1;
    const pts = a.map((v, i) => `${(i / (a.length - 1)) * w},${h - ((v - min) / rng) * h}`).join(' ');
    const up = a[a.length - 1] >= a[0];
    return `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><polyline points="${pts}" fill="none" stroke="${up?'#5effa5':'#ff6b6b'}" stroke-width="1.5"/></svg>`;
  }
}
