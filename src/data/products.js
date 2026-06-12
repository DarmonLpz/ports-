// Produktkatalog der Wirtschaftssimulation.
// Jede Ware hat: id, Name, Kategorie, Basispreis ($/Tonne bzw. /Einheit),
// Volatilität (0..1, wie stark Angebot/Nachfrage den Preis bewegen),
// Wertdichte (Einfluss auf Frachtraten) und eine bevorzugte Schiffsklasse.

export const CATEGORIES = {
  energy:    { name: 'Energie',       color: '#f2a93b' },
  ore:       { name: 'Erze & Metalle', color: '#9aa7b2' },
  agri:      { name: 'Agrar',          color: '#6fcf63' },
  food:      { name: 'Lebensmittel',   color: '#e57f5b' },
  industry:  { name: 'Industrie',      color: '#5b9bd5' },
  consumer:  { name: 'Konsum & Luxus', color: '#c779e0' },
  chemical:  { name: 'Chemie',         color: '#4ec9b0' },
};

// carry: welche Frachtart -> bestimmt welche Schiffe transportieren können
// 'bulk' Massengut, 'container' Stückgut, 'liquid' Flüssigladung,
// 'gas' Flüssiggas, 'reefer' Kühlladung, 'roro' rollende Ladung
export const PRODUCTS = [
  // --- Energie ---
  { id: 'crude_oil',   name: 'Rohöl',           cat: 'energy',   base: 540,  vol: 0.55, carry: 'liquid' },
  { id: 'fuel_oil',    name: 'Schweröl',        cat: 'energy',   base: 480,  vol: 0.45, carry: 'liquid' },
  { id: 'diesel',      name: 'Diesel',          cat: 'energy',   base: 720,  vol: 0.40, carry: 'liquid' },
  { id: 'gasoline',    name: 'Benzin',          cat: 'energy',   base: 760,  vol: 0.42, carry: 'liquid' },
  { id: 'lng',         name: 'Flüssigerdgas',   cat: 'energy',   base: 610,  vol: 0.50, carry: 'gas' },
  { id: 'lpg',         name: 'Flüssiggas',      cat: 'energy',   base: 540,  vol: 0.46, carry: 'gas' },
  { id: 'coal',        name: 'Kohle',           cat: 'energy',   base: 130,  vol: 0.38, carry: 'bulk' },
  { id: 'uranium',     name: 'Uranerz',         cat: 'energy',   base: 9800, vol: 0.30, carry: 'container' },
  { id: 'ethanol',     name: 'Ethanol',         cat: 'energy',   base: 690,  vol: 0.35, carry: 'liquid' },

  // --- Erze & Metalle ---
  { id: 'iron_ore',    name: 'Eisenerz',        cat: 'ore',      base: 115,  vol: 0.40, carry: 'bulk' },
  { id: 'bauxite',     name: 'Bauxit',          cat: 'ore',      base: 75,   vol: 0.30, carry: 'bulk' },
  { id: 'copper_ore',  name: 'Kupfererz',       cat: 'ore',      base: 260,  vol: 0.42, carry: 'bulk' },
  { id: 'copper',      name: 'Kupfer',          cat: 'ore',      base: 8600, vol: 0.45, carry: 'container' },
  { id: 'aluminium',   name: 'Aluminium',       cat: 'ore',      base: 2300, vol: 0.38, carry: 'container' },
  { id: 'steel',       name: 'Stahl',           cat: 'ore',      base: 720,  vol: 0.34, carry: 'bulk' },
  { id: 'nickel',      name: 'Nickel',          cat: 'ore',      base: 16800,vol: 0.48, carry: 'container' },
  { id: 'zinc',        name: 'Zink',            cat: 'ore',      base: 2700, vol: 0.36, carry: 'bulk' },
  { id: 'lead',        name: 'Blei',            cat: 'ore',      base: 2100, vol: 0.33, carry: 'bulk' },
  { id: 'tin',         name: 'Zinn',            cat: 'ore',      base: 25500,vol: 0.44, carry: 'container' },
  { id: 'gold',        name: 'Gold',            cat: 'ore',      base: 62000000, vol: 0.50, carry: 'container' },
  { id: 'silver',      name: 'Silber',          cat: 'ore',      base: 780000,vol: 0.47, carry: 'container' },
  { id: 'lithium',     name: 'Lithium',         cat: 'ore',      base: 14500,vol: 0.62, carry: 'container' },
  { id: 'cobalt',      name: 'Kobalt',          cat: 'ore',      base: 33000,vol: 0.58, carry: 'container' },
  { id: 'rare_earths', name: 'Seltene Erden',   cat: 'ore',      base: 48000,vol: 0.66, carry: 'container' },
  { id: 'manganese',   name: 'Mangan',          cat: 'ore',      base: 320,  vol: 0.34, carry: 'bulk' },

  // --- Agrar ---
  { id: 'wheat',       name: 'Weizen',          cat: 'agri',     base: 260,  vol: 0.40, carry: 'bulk' },
  { id: 'corn',        name: 'Mais',            cat: 'agri',     base: 230,  vol: 0.38, carry: 'bulk' },
  { id: 'rice',        name: 'Reis',            cat: 'agri',     base: 420,  vol: 0.36, carry: 'bulk' },
  { id: 'soybeans',    name: 'Sojabohnen',      cat: 'agri',     base: 480,  vol: 0.42, carry: 'bulk' },
  { id: 'sugar',       name: 'Zucker',          cat: 'agri',     base: 410,  vol: 0.39, carry: 'bulk' },
  { id: 'coffee',      name: 'Kaffee',          cat: 'agri',     base: 4200, vol: 0.55, carry: 'container' },
  { id: 'cocoa',       name: 'Kakao',           cat: 'agri',     base: 7600, vol: 0.60, carry: 'container' },
  { id: 'cotton',      name: 'Baumwolle',       cat: 'agri',     base: 1700, vol: 0.44, carry: 'container' },
  { id: 'palm_oil',    name: 'Palmöl',          cat: 'agri',     base: 980,  vol: 0.43, carry: 'liquid' },
  { id: 'tea',         name: 'Tee',             cat: 'agri',     base: 3100, vol: 0.40, carry: 'container' },
  { id: 'tobacco',     name: 'Tabak',           cat: 'agri',     base: 5200, vol: 0.36, carry: 'container' },
  { id: 'rubber',      name: 'Naturkautschuk',  cat: 'agri',     base: 1900, vol: 0.46, carry: 'container' },
  { id: 'timber',      name: 'Holz',            cat: 'agri',     base: 240,  vol: 0.30, carry: 'bulk' },
  { id: 'spices',      name: 'Gewürze',         cat: 'agri',     base: 6400, vol: 0.50, carry: 'container' },

  // --- Lebensmittel (gekühlt / verarbeitet) ---
  { id: 'fish',        name: 'Fisch',           cat: 'food',     base: 3400, vol: 0.45, carry: 'reefer' },
  { id: 'beef',        name: 'Rindfleisch',     cat: 'food',     base: 5600, vol: 0.42, carry: 'reefer' },
  { id: 'bananas',     name: 'Bananen',         cat: 'food',     base: 900,  vol: 0.38, carry: 'reefer' },
  { id: 'wine',        name: 'Wein',            cat: 'food',     base: 2600, vol: 0.30, carry: 'container' },
  { id: 'olive_oil',   name: 'Olivenöl',        cat: 'food',     base: 4200, vol: 0.40, carry: 'container' },
  { id: 'fruit',       name: 'Frischobst',      cat: 'food',     base: 1100, vol: 0.41, carry: 'reefer' },
  { id: 'dairy',       name: 'Milchprodukte',   cat: 'food',     base: 3200, vol: 0.37, carry: 'reefer' },

  // --- Industrie ---
  { id: 'cars',        name: 'Automobile',      cat: 'industry', base: 21000,vol: 0.28, carry: 'roro' },
  { id: 'machinery',   name: 'Maschinen',       cat: 'industry', base: 14000,vol: 0.26, carry: 'container' },
  { id: 'cement',      name: 'Zement',          cat: 'industry', base: 95,   vol: 0.25, carry: 'bulk' },
  { id: 'fertilizer',  name: 'Düngemittel',     cat: 'industry', base: 480,  vol: 0.40, carry: 'bulk' },
  { id: 'paper',       name: 'Papier',          cat: 'industry', base: 880,  vol: 0.24, carry: 'container' },
  { id: 'glass',       name: 'Glas',            cat: 'industry', base: 620,  vol: 0.22, carry: 'container' },
  { id: 'textiles',    name: 'Textilien',       cat: 'industry', base: 3600, vol: 0.34, carry: 'container' },
  { id: 'furniture',   name: 'Möbel',           cat: 'industry', base: 4200, vol: 0.26, carry: 'container' },
  { id: 'turbines',    name: 'Turbinen',        cat: 'industry', base: 52000,vol: 0.30, carry: 'container' },

  // --- Chemie ---
  { id: 'plastics',    name: 'Kunststoffe',     cat: 'chemical', base: 1500, vol: 0.36, carry: 'container' },
  { id: 'chemicals',   name: 'Industriechemie', cat: 'chemical', base: 1800, vol: 0.42, carry: 'liquid' },
  { id: 'pharma',      name: 'Pharmazeutika',   cat: 'chemical', base: 86000,vol: 0.40, carry: 'reefer' },
  { id: 'paints',      name: 'Lacke & Farben',  cat: 'chemical', base: 2400, vol: 0.28, carry: 'liquid' },

  // --- Konsum & Luxus ---
  { id: 'electronics', name: 'Elektronik',      cat: 'consumer', base: 24000,vol: 0.34, carry: 'container' },
  { id: 'smartphones', name: 'Smartphones',     cat: 'consumer', base: 180000,vol: 0.40, carry: 'container' },
  { id: 'computers',   name: 'Computer',        cat: 'consumer', base: 95000,vol: 0.36, carry: 'container' },
  { id: 'clothing',    name: 'Bekleidung',      cat: 'consumer', base: 9800, vol: 0.30, carry: 'container' },
  { id: 'toys',        name: 'Spielwaren',      cat: 'consumer', base: 6200, vol: 0.28, carry: 'container' },
  { id: 'appliances',  name: 'Haushaltsgeräte', cat: 'consumer', base: 7400, vol: 0.27, carry: 'container' },
  { id: 'jewelry',     name: 'Schmuck',         cat: 'consumer', base: 480000,vol: 0.48, carry: 'container' },
  { id: 'watches',     name: 'Uhren',           cat: 'consumer', base: 320000,vol: 0.44, carry: 'container' },
  { id: 'perfume',     name: 'Parfum',          cat: 'consumer', base: 64000,vol: 0.32, carry: 'container' },
];

export const PRODUCTS_BY_ID = Object.fromEntries(PRODUCTS.map(p => [p.id, p]));

export function productName(id) {
  return PRODUCTS_BY_ID[id]?.name ?? id;
}
