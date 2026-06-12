// Börsennotierte Unternehmen der Welt.
// 'shipper'  = Reederei / KI-Gegner, besitzt eigene Schiffe und handelt
// 'producer' = Rohstoff-/Industriekonzern, Aktienkurs hängt an Leitwaren
// 'trader'   = Handelshaus, profitiert von hohem Welt-Handelsvolumen
//
// exposure: Liste von Produkt-IDs, deren Preis den Aktienkurs beeinflusst.
// ai: Verhaltensprofil der KI-Reedereien (Aggressivität, Risiko).

export const COMPANIES = [
  // --- Reedereien / KI-Gegner ---
  { id: 'oceanus',   name: 'Oceanus Lines',        sector: 'shipper',  ticker: 'OCN', shares: 2_000_000, price: 84,  exposure: ['crude_oil','iron_ore','electronics'], ai: { aggression: 0.7, risk: 0.5 }, cash: 220_000_000 },
  { id: 'meridian',  name: 'Meridian Shipping',    sector: 'shipper',  ticker: 'MRD', shares: 1_500_000, price: 122, exposure: ['electronics','cars','machinery'],     ai: { aggression: 0.5, risk: 0.4 }, cash: 180_000_000 },
  { id: 'kraken',    name: 'Kraken Maritime',      sector: 'shipper',  ticker: 'KRK', shares: 3_000_000, price: 47,  exposure: ['coal','iron_ore','grain'],            ai: { aggression: 0.9, risk: 0.8 }, cash: 140_000_000 },
  { id: 'polaris',   name: 'Polaris Carriers',     sector: 'shipper',  ticker: 'PLS', shares: 1_200_000, price: 156, exposure: ['lng','crude_oil','chemicals'],        ai: { aggression: 0.4, risk: 0.3 }, cash: 260_000_000 },
  { id: 'tradewind', name: 'Tradewind Freight',    sector: 'shipper',  ticker: 'TWF', shares: 2_400_000, price: 63,  exposure: ['soybeans','wheat','coffee'],          ai: { aggression: 0.6, risk: 0.6 }, cash: 120_000_000 },
  { id: 'hanseatic', name: 'Hanseatic Reederei',   sector: 'shipper',  ticker: 'HAN', shares: 1_800_000, price: 98,  exposure: ['cars','machinery','chemicals'],       ai: { aggression: 0.45,risk: 0.35}, cash: 200_000_000 },

  // --- Rohstoff- & Industriekonzerne ---
  { id: 'petroglobe',name: 'PetroGlobe Energy',    sector: 'producer', ticker: 'PGE', shares: 5_000_000, price: 210, exposure: ['crude_oil','gasoline','diesel','lng'], cash: 600_000_000 },
  { id: 'ferromax',  name: 'FerroMax Mining',      sector: 'producer', ticker: 'FMX', shares: 4_000_000, price: 175, exposure: ['iron_ore','steel','manganese','coal'], cash: 420_000_000 },
  { id: 'cuprum',    name: 'Cuprum Resources',     sector: 'producer', ticker: 'CPR', shares: 3_200_000, price: 138, exposure: ['copper','copper_ore','zinc','nickel'], cash: 300_000_000 },
  { id: 'agriworld', name: 'AgriWorld Corp',       sector: 'producer', ticker: 'AGW', shares: 3_600_000, price: 92,  exposure: ['wheat','corn','soybeans','sugar'],     cash: 280_000_000 },
  { id: 'voltaic',   name: 'Voltaic Materials',    sector: 'producer', ticker: 'VLT', shares: 2_800_000, price: 264, exposure: ['lithium','cobalt','rare_earths','nickel'], cash: 350_000_000 },
  { id: 'sunbelt',   name: 'Sunbelt Agro',         sector: 'producer', ticker: 'SBA', shares: 2_600_000, price: 71,  exposure: ['coffee','cocoa','palm_oil','sugar'],   cash: 160_000_000 },
  { id: 'novachem',  name: 'NovaChem Industries',  sector: 'producer', ticker: 'NVC', shares: 3_000_000, price: 119, exposure: ['chemicals','plastics','fertilizer','pharma'], cash: 380_000_000 },
  { id: 'autozenith',name: 'AutoZenith Group',     sector: 'producer', ticker: 'AZG', shares: 3_400_000, price: 188, exposure: ['cars','machinery','electronics'],      cash: 440_000_000 },

  // --- Handelshäuser ---
  { id: 'gilthouse', name: 'Gilt House Trading',   sector: 'trader',   ticker: 'GHT', shares: 2_200_000, price: 145, exposure: ['gold','silver','jewelry','watches'],   cash: 320_000_000 },
  { id: 'orientex',  name: 'Orientex Holdings',    sector: 'trader',   ticker: 'ORX', shares: 2_700_000, price: 103, exposure: ['electronics','textiles','clothing','toys'], cash: 240_000_000 },
];

export const COMPANY_BY_ID = Object.fromEntries(COMPANIES.map(c => [c.id, c]));
