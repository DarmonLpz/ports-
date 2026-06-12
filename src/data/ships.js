// Schiffskategorien (Vorschläge für unterschiedlichste Klassen).
// capacity = Ladekapazität in Tonnen (DWT-Näherung; bei Containern via TEU umgerechnet)
// speed    = Reisegeschwindigkeit in Knoten
// fuel     = Bunkerverbrauch t/Tag bei Reisegeschwindigkeit
// price    = Kaufpreis (neu) in $
// upkeep   = Fixkosten pro Tag (Crew, Versicherung, Wartung)
// carry    = welche Frachtarten geladen werden können
// tier     = grobe Größenklasse (1 klein .. 4 gigantisch) für Progression

export const SHIP_CLASSES = [
  // --- Containerschiffe ---
  { id: 'feeder',      name: 'Feeder-Containerschiff',  type: 'Container', carry: ['container'],            capacity: 18000,  speed: 18, fuel: 32,  price: 18_000_000,  upkeep: 7_200,  tier: 1 },
  { id: 'panamax_box', name: 'Panamax-Containerschiff', type: 'Container', carry: ['container'],            capacity: 52000,  speed: 22, fuel: 95,  price: 62_000_000,  upkeep: 16_500, tier: 2 },
  { id: 'postpanamax', name: 'Post-Panamax-Containerschiff', type: 'Container', carry: ['container'],       capacity: 110000, speed: 23, fuel: 165, price: 120_000_000, upkeep: 28_000, tier: 3 },
  { id: 'ulcv',        name: 'ULCV-Megacarrier',        type: 'Container', carry: ['container'],            capacity: 230000, speed: 23, fuel: 245, price: 215_000_000, upkeep: 46_000, tier: 4 },

  // --- Massengutfrachter ---
  { id: 'handysize',   name: 'Handysize-Bulker',        type: 'Bulker',    carry: ['bulk'],                 capacity: 35000,  speed: 14, fuel: 26,  price: 24_000_000,  upkeep: 6_400,  tier: 1 },
  { id: 'supramax',    name: 'Supramax-Bulker',         type: 'Bulker',    carry: ['bulk'],                 capacity: 58000,  speed: 14, fuel: 33,  price: 33_000_000,  upkeep: 8_600,  tier: 2 },
  { id: 'panamax_bulk',name: 'Panamax-Bulker',          type: 'Bulker',    carry: ['bulk'],                 capacity: 82000,  speed: 14, fuel: 40,  price: 41_000_000,  upkeep: 10_200, tier: 2 },
  { id: 'capesize',    name: 'Capesize-Bulker',         type: 'Bulker',    carry: ['bulk'],                 capacity: 180000, speed: 14, fuel: 58,  price: 64_000_000,  upkeep: 15_500, tier: 3 },
  { id: 'valemax',     name: 'Valemax-Erzfrachter',     type: 'Bulker',    carry: ['bulk'],                 capacity: 400000, speed: 13, fuel: 78,  price: 130_000_000, upkeep: 26_000, tier: 4 },

  // --- Tanker ---
  { id: 'product_tk',  name: 'Produktentanker (MR)',    type: 'Tanker',    carry: ['liquid'],               capacity: 50000,  speed: 15, fuel: 38,  price: 46_000_000,  upkeep: 11_000, tier: 2 },
  { id: 'aframax',     name: 'Aframax-Rohöltanker',     type: 'Tanker',    carry: ['liquid'],               capacity: 115000, speed: 15, fuel: 55,  price: 72_000_000,  upkeep: 16_800, tier: 3 },
  { id: 'suezmax',     name: 'Suezmax-Tanker',          type: 'Tanker',    carry: ['liquid'],               capacity: 160000, speed: 15, fuel: 65,  price: 88_000_000,  upkeep: 19_500, tier: 3 },
  { id: 'vlcc',        name: 'VLCC-Supertanker',        type: 'Tanker',    carry: ['liquid'],               capacity: 320000, speed: 15, fuel: 85,  price: 130_000_000, upkeep: 25_000, tier: 4 },

  // --- Gas ---
  { id: 'lpg_carrier', name: 'LPG-Tanker',              type: 'Gastanker', carry: ['gas'],                  capacity: 60000,  speed: 16, fuel: 48,  price: 78_000_000,  upkeep: 18_000, tier: 2 },
  { id: 'lng_carrier', name: 'LNG-Tanker',              type: 'Gastanker', carry: ['gas'],                  capacity: 95000,  speed: 19, fuel: 95,  price: 210_000_000, upkeep: 38_000, tier: 4 },

  // --- Spezial ---
  { id: 'reefer',      name: 'Kühlschiff (Reefer)',     type: 'Reefer',    carry: ['reefer','container'],   capacity: 14000,  speed: 20, fuel: 40,  price: 42_000_000,  upkeep: 12_500, tier: 2 },
  { id: 'carcarrier',  name: 'Autotransporter (PCTC)',  type: 'RoRo',      carry: ['roro'],                 capacity: 30000,  speed: 19, fuel: 52,  price: 86_000_000,  upkeep: 19_000, tier: 3 },
  { id: 'general',     name: 'Mehrzweckfrachter',       type: 'Stückgut',  carry: ['container','bulk','roro'],capacity: 22000, speed: 16, fuel: 24,  price: 26_000_000,  upkeep: 7_000,  tier: 1 },
  { id: 'heavylift',   name: 'Schwergutfrachter',       type: 'Heavy-Lift',carry: ['container','roro'],     capacity: 16000,  speed: 16, fuel: 30,  price: 58_000_000,  upkeep: 14_000, tier: 2 },
  { id: 'chemtanker',  name: 'Chemikalientanker',       type: 'Tanker',    carry: ['liquid'],               capacity: 45000,  speed: 15, fuel: 36,  price: 54_000_000,  upkeep: 13_500, tier: 2 },
];

export const SHIP_CLASS_BY_ID = Object.fromEntries(SHIP_CLASSES.map(s => [s.id, s]));

// Mögliche Schiffsnamen-Bausteine für die Welt-Flotte.
const PREFIX = ['MSC','Maersk','Ever','Cosco','ONE','Hapag','CMA','NYK','HMM','Pacific','Atlantic','Nordic','Star','Ocean','Global','Imperial','Royal','Northern','Southern','Eastern'];
const SUFFIX = ['Pioneer','Voyager','Horizon','Endeavour','Triumph','Sovereign','Mariner','Explorer','Trader','Spirit','Glory','Vanguard','Aurora','Meridian','Odyssey','Empire','Falcon','Tempest','Zenith','Polaris','Marlin','Albatross','Condor','Phoenix','Comet'];

export function randomShipName(rng, used) {
  for (let i = 0; i < 50; i++) {
    const n = `${PREFIX[Math.floor(rng() * PREFIX.length)]} ${SUFFIX[Math.floor(rng() * SUFFIX.length)]}`;
    if (!used.has(n)) { used.add(n); return n; }
  }
  const n = `Vessel ${used.size + 1}`;
  used.add(n);
  return n;
}

// Verfügbare Upgrades für Schiffe.
export const UPGRADES = [
  { id: 'eco_engine',   name: 'Sparmotor',          desc: '-18% Treibstoffverbrauch',        cost: 6_500_000,  effect: { fuel: -0.18 } },
  { id: 'bulbous_bow',  name: 'Wulstbug',           desc: '+8% Geschwindigkeit',             cost: 4_200_000,  effect: { speed: 0.08 } },
  { id: 'hull_coat',    name: 'Silikon-Rumpfbeschichtung', desc: '-30% Verschleiß',          cost: 3_800_000,  effect: { wear: -0.30 } },
  { id: 'capacity_opt', name: 'Laderaum-Optimierung',desc: '+12% Kapazität',                 cost: 5_500_000,  effect: { capacity: 0.12 } },
  { id: 'scrubber',     name: 'Abgaswäscher',       desc: 'Darf günstiges Schweröl bunkern (-15% Bunkerkosten)', cost: 4_800_000, effect: { fuelCost: -0.15 } },
  { id: 'auto_crew',    name: 'Teilautomatisierung',desc: '-22% Fixkosten/Tag',              cost: 7_200_000,  effect: { upkeep: -0.22 } },
];

export const UPGRADE_BY_ID = Object.fromEntries(UPGRADES.map(u => [u.id, u]));
