// 64 reale Welthäfen mit echten Koordinaten (lat, lon), Region, Größe (1-3)
// und Handelsprofil: exports = was der Hafen produziert/billig anbietet,
// imports = was der Hafen nachfragt. Die Wirtschaftssimulation leitet daraus
// Angebot, Nachfrage und Preise ab.

export const REGIONS = {
  n_america:  'Nordamerika',
  s_america:  'Südamerika',
  n_europe:   'Nordeuropa',
  s_europe:   'Südeuropa',
  africa:     'Afrika',
  mideast:    'Naher Osten',
  s_asia:     'Südasien',
  e_asia:     'Ostasien',
  se_asia:    'Südostasien',
  oceania:    'Ozeanien',
};

export const PORTS = [
  // --- Ostasien ---
  { id: 'shanghai',   name: 'Shanghai',     country: 'China',        lat: 31.23, lon: 121.47, region: 'e_asia',   size: 3, exports: ['electronics','smartphones','machinery','textiles','steel','plastics'], imports: ['crude_oil','iron_ore','soybeans','copper_ore'] },
  { id: 'ningbo',     name: 'Ningbo',       country: 'China',        lat: 29.87, lon: 121.55, region: 'e_asia',   size: 3, exports: ['machinery','appliances','furniture','plastics','clothing'], imports: ['crude_oil','iron_ore','coal','timber'] },
  { id: 'shenzhen',   name: 'Shenzhen',     country: 'China',        lat: 22.54, lon: 114.06, region: 'e_asia',   size: 3, exports: ['smartphones','computers','electronics','toys','watches'], imports: ['copper','rare_earths','lithium','plastics'] },
  { id: 'hongkong',   name: 'Hongkong',     country: 'China',        lat: 22.32, lon: 114.17, region: 'e_asia',   size: 3, exports: ['electronics','jewelry','watches','clothing'], imports: ['gold','wine','cars','pharma'] },
  { id: 'qingdao',    name: 'Qingdao',      country: 'China',        lat: 36.07, lon: 120.38, region: 'e_asia',   size: 2, exports: ['steel','appliances','tires','machinery'], imports: ['iron_ore','crude_oil','soybeans','rubber'] },
  { id: 'busan',      name: 'Busan',        country: 'Südkorea',     lat: 35.10, lon: 129.04, region: 'e_asia',   size: 3, exports: ['cars','smartphones','electronics','steel','machinery'], imports: ['crude_oil','iron_ore','coal','lng'] },
  { id: 'tokyo',      name: 'Tokio',        country: 'Japan',        lat: 35.65, lon: 139.84, region: 'e_asia',   size: 3, exports: ['cars','machinery','electronics','turbines'], imports: ['crude_oil','lng','coal','wheat','beef'] },
  { id: 'yokohama',   name: 'Yokohama',     country: 'Japan',        lat: 35.45, lon: 139.64, region: 'e_asia',   size: 2, exports: ['cars','machinery','turbines','chemicals'], imports: ['crude_oil','iron_ore','lng','soybeans'] },
  { id: 'nagoya',     name: 'Nagoya',       country: 'Japan',        lat: 35.09, lon: 136.82, region: 'e_asia',   size: 2, exports: ['cars','machinery','appliances'], imports: ['iron_ore','crude_oil','coal','aluminium'] },
  { id: 'kaohsiung',  name: 'Kaohsiung',    country: 'Taiwan',       lat: 22.61, lon: 120.30, region: 'e_asia',   size: 2, exports: ['smartphones','computers','electronics','plastics'], imports: ['crude_oil','copper','rare_earths','iron_ore'] },
  { id: 'tianjin',    name: 'Tianjin',      country: 'China',        lat: 38.98, lon: 117.70, region: 'e_asia',   size: 3, exports: ['machinery','steel','cars','chemicals'], imports: ['iron_ore','crude_oil','coal','corn'] },
  { id: 'guangzhou',  name: 'Guangzhou',    country: 'China',        lat: 23.10, lon: 113.25, region: 'e_asia',   size: 3, exports: ['appliances','furniture','textiles','toys'], imports: ['iron_ore','crude_oil','timber','cotton'] },

  // --- Südostasien ---
  { id: 'singapore',  name: 'Singapur',     country: 'Singapur',     lat: 1.29,  lon: 103.85, region: 'se_asia',  size: 3, exports: ['fuel_oil','gasoline','diesel','chemicals','electronics'], imports: ['crude_oil','palm_oil','rubber','iron_ore'] },
  { id: 'portklang',  name: 'Port Klang',   country: 'Malaysia',     lat: 3.00,  lon: 101.39, region: 'se_asia',  size: 2, exports: ['palm_oil','rubber','tin','electronics'], imports: ['crude_oil','machinery','steel','cars'] },
  { id: 'tanjung',    name: 'Tanjung Pelepas',country: 'Malaysia',   lat: 1.36,  lon: 103.55, region: 'se_asia',  size: 2, exports: ['palm_oil','rubber','plastics'], imports: ['machinery','cars','steel'] },
  { id: 'jakarta',    name: 'Jakarta',      country: 'Indonesien',   lat: -6.10, lon: 106.88, region: 'se_asia',  size: 2, exports: ['palm_oil','coal','rubber','nickel','textiles'], imports: ['crude_oil','machinery','rice','cars'] },
  { id: 'laemchabang',name: 'Laem Chabang', country: 'Thailand',     lat: 13.08, lon: 100.88, region: 'se_asia',  size: 2, exports: ['rice','rubber','cars','electronics','spices'], imports: ['crude_oil','machinery','steel','iron_ore'] },
  { id: 'manila',     name: 'Manila',       country: 'Philippinen',  lat: 14.58, lon: 120.97, region: 'se_asia',  size: 2, exports: ['electronics','bananas','nickel','copper_ore'], imports: ['crude_oil','rice','machinery','wheat'] },
  { id: 'hochiminh',  name: 'Ho-Chi-Minh-Stadt',country: 'Vietnam', lat: 10.76, lon: 106.70, region: 'se_asia',  size: 2, exports: ['clothing','coffee','rice','electronics','furniture'], imports: ['machinery','cotton','steel','plastics'] },

  // --- Südasien ---
  { id: 'mumbai',     name: 'Mumbai (JNPT)',country: 'Indien',       lat: 18.95, lon: 72.95,  region: 's_asia',   size: 3, exports: ['textiles','pharma','spices','tea','chemicals'], imports: ['crude_oil','gold','machinery','coal'] },
  { id: 'chennai',    name: 'Chennai',      country: 'Indien',       lat: 13.10, lon: 80.30,  region: 's_asia',   size: 2, exports: ['cars','textiles','machinery','spices'], imports: ['crude_oil','coal','machinery','copper_ore'] },
  { id: 'colombo',    name: 'Colombo',      country: 'Sri Lanka',    lat: 6.95,  lon: 79.84,  region: 's_asia',   size: 2, exports: ['tea','spices','textiles','rubber'], imports: ['crude_oil','wheat','machinery','cars'] },
  { id: 'karachi',    name: 'Karatschi',    country: 'Pakistan',     lat: 24.84, lon: 66.99,  region: 's_asia',   size: 2, exports: ['cotton','textiles','rice','clothing'], imports: ['crude_oil','machinery','steel','palm_oil'] },
  { id: 'chittagong', name: 'Chittagong',   country: 'Bangladesch',  lat: 22.32, lon: 91.81,  region: 's_asia',   size: 2, exports: ['clothing','textiles','jute','tea'], imports: ['crude_oil','machinery','wheat','cotton'] },

  // --- Naher Osten ---
  { id: 'jebelali',   name: 'Jebel Ali',    country: 'VAE',          lat: 25.01, lon: 55.06,  region: 'mideast',  size: 3, exports: ['crude_oil','gasoline','aluminium','gold'], imports: ['cars','electronics','machinery','wheat'] },
  { id: 'jeddah',     name: 'Dschidda',     country: 'Saudi-Arabien',lat: 21.48, lon: 39.18,  region: 'mideast',  size: 2, exports: ['crude_oil','plastics','chemicals','fertilizer'], imports: ['cars','rice','machinery','wheat'] },
  { id: 'dammam',     name: 'Dammam',       country: 'Saudi-Arabien',lat: 26.43, lon: 50.10,  region: 'mideast',  size: 2, exports: ['crude_oil','lpg','chemicals','plastics'], imports: ['machinery','cars','steel','wheat'] },
  { id: 'bandarabbas',name: 'Bandar Abbas', country: 'Iran',         lat: 27.16, lon: 56.21,  region: 'mideast',  size: 2, exports: ['crude_oil','lpg','copper','spices'], imports: ['wheat','machinery','rice','cars'] },
  { id: 'kuwait',     name: 'Kuwait-Stadt', country: 'Kuwait',       lat: 29.37, lon: 47.98,  region: 'mideast',  size: 2, exports: ['crude_oil','fuel_oil','lpg'], imports: ['cars','machinery','wheat','electronics'] },

  // --- Südeuropa ---
  { id: 'piraeus',    name: 'Piräus',       country: 'Griechenland', lat: 37.94, lon: 23.64,  region: 's_europe', size: 2, exports: ['olive_oil','wine','cement','fish'], imports: ['crude_oil','machinery','cars','electronics'] },
  { id: 'valencia',   name: 'Valencia',     country: 'Spanien',      lat: 39.45, lon: -0.32,  region: 's_europe', size: 2, exports: ['cars','wine','olive_oil','fruit','textiles'], imports: ['crude_oil','machinery','electronics','soybeans'] },
  { id: 'barcelona',  name: 'Barcelona',    country: 'Spanien',      lat: 41.35, lon: 2.16,   region: 's_europe', size: 2, exports: ['cars','wine','pharma','machinery'], imports: ['crude_oil','electronics','soybeans','coal'] },
  { id: 'algeciras',  name: 'Algeciras',    country: 'Spanien',      lat: 36.13, lon: -5.45,  region: 's_europe', size: 2, exports: ['fuel_oil','olive_oil','fruit'], imports: ['crude_oil','electronics','machinery','cars'] },
  { id: 'genoa',      name: 'Genua',        country: 'Italien',      lat: 44.41, lon: 8.93,   region: 's_europe', size: 2, exports: ['machinery','wine','furniture','pharma'], imports: ['crude_oil','iron_ore','coal','soybeans'] },
  { id: 'gioiatauro', name: 'Gioia Tauro',  country: 'Italien',      lat: 38.43, lon: 15.90,  region: 's_europe', size: 2, exports: ['olive_oil','wine','fruit'], imports: ['electronics','machinery','crude_oil'] },
  { id: 'marseille',  name: 'Marseille',    country: 'Frankreich',   lat: 43.30, lon: 5.37,   region: 's_europe', size: 2, exports: ['wine','perfume','chemicals','machinery'], imports: ['crude_oil','machinery','coal','soybeans'] },
  { id: 'lisbon',     name: 'Lissabon',     country: 'Portugal',     lat: 38.70, lon: -9.16,  region: 's_europe', size: 1, exports: ['wine','olive_oil','fish','cork'], imports: ['crude_oil','machinery','cars','wheat'] },

  // --- Nordeuropa ---
  { id: 'rotterdam',  name: 'Rotterdam',    country: 'Niederlande',  lat: 51.95, lon: 4.14,   region: 'n_europe', size: 3, exports: ['gasoline','diesel','chemicals','machinery','dairy'], imports: ['crude_oil','iron_ore','coal','soybeans'] },
  { id: 'antwerp',    name: 'Antwerpen',    country: 'Belgien',      lat: 51.26, lon: 4.40,   region: 'n_europe', size: 3, exports: ['chemicals','pharma','plastics','cars','diamonds'], imports: ['crude_oil','iron_ore','coffee','cocoa'] },
  { id: 'hamburg',    name: 'Hamburg',      country: 'Deutschland',  lat: 53.54, lon: 9.97,   region: 'n_europe', size: 3, exports: ['machinery','cars','chemicals','turbines','pharma'], imports: ['crude_oil','iron_ore','coffee','electronics'] },
  { id: 'bremerhaven',name: 'Bremerhaven',  country: 'Deutschland',  lat: 53.54, lon: 8.58,   region: 'n_europe', size: 2, exports: ['cars','machinery','turbines'], imports: ['cars','coffee','fruit','electronics'] },
  { id: 'felixstowe', name: 'Felixstowe',   country: 'Großbritannien',lat: 51.96,lon: 1.32,   region: 'n_europe', size: 2, exports: ['machinery','pharma','whisky','cars'], imports: ['electronics','clothing','crude_oil','wine'] },
  { id: 'lehavre',    name: 'Le Havre',     country: 'Frankreich',   lat: 49.49, lon: 0.11,   region: 'n_europe', size: 2, exports: ['cars','perfume','wine','machinery'], imports: ['crude_oil','coal','electronics','coffee'] },
  { id: 'gdansk',     name: 'Danzig',       country: 'Polen',        lat: 54.40, lon: 18.66,  region: 'n_europe', size: 2, exports: ['coal','furniture','machinery','steel'], imports: ['crude_oil','iron_ore','electronics','cars'] },
  { id: 'gothenburg', name: 'Göteborg',     country: 'Schweden',     lat: 57.69, lon: 11.87,  region: 'n_europe', size: 2, exports: ['cars','paper','timber','machinery'], imports: ['crude_oil','electronics','coal','fruit'] },
  { id: 'stpetersburg',name:'St. Petersburg',country: 'Russland',    lat: 59.92, lon: 30.27,  region: 'n_europe', size: 2, exports: ['crude_oil','timber','fertilizer','steel','coal'], imports: ['machinery','cars','electronics','fruit'] },

  // --- Nordamerika ---
  { id: 'losangeles', name: 'Los Angeles',  country: 'USA',          lat: 33.74, lon: -118.27,region: 'n_america',size: 3, exports: ['machinery','electronics','pharma','cotton','fruit'], imports: ['electronics','smartphones','cars','furniture'] },
  { id: 'longbeach',  name: 'Long Beach',   country: 'USA',          lat: 33.75, lon: -118.21,region: 'n_america',size: 3, exports: ['ethanol','chemicals','machinery','soybeans'], imports: ['electronics','clothing','toys','cars'] },
  { id: 'newyork',    name: 'New York',     country: 'USA',          lat: 40.67, lon: -74.04, region: 'n_america',size: 3, exports: ['machinery','pharma','chemicals','paper'], imports: ['cars','wine','electronics','clothing'] },
  { id: 'savannah',   name: 'Savannah',     country: 'USA',          lat: 32.08, lon: -81.10, region: 'n_america',size: 2, exports: ['cotton','paper','machinery','soybeans'], imports: ['clothing','furniture','electronics','tiles'] },
  { id: 'houston',    name: 'Houston',      country: 'USA',          lat: 29.73, lon: -95.27, region: 'n_america',size: 3, exports: ['crude_oil','gasoline','chemicals','plastics','corn'], imports: ['steel','machinery','electronics','cars'] },
  { id: 'neworleans', name: 'New Orleans',  country: 'USA',          lat: 29.94, lon: -90.06, region: 'n_america',size: 2, exports: ['corn','soybeans','wheat','chemicals'], imports: ['steel','coffee','crude_oil','rubber'] },
  { id: 'vancouver',  name: 'Vancouver',    country: 'Kanada',       lat: 49.29, lon: -123.11,region: 'n_america',size: 2, exports: ['timber','coal','wheat','copper_ore','paper'], imports: ['electronics','cars','machinery','fruit'] },
  { id: 'montreal',   name: 'Montreal',     country: 'Kanada',       lat: 45.55, lon: -73.54, region: 'n_america',size: 2, exports: ['wheat','timber','aluminium','paper'], imports: ['crude_oil','electronics','cars','wine'] },
  { id: 'manzanillo', name: 'Manzanillo',   country: 'Mexiko',       lat: 19.05, lon: -104.31,region: 'n_america',size: 2, exports: ['cars','silver','fruit','copper_ore'], imports: ['electronics','machinery','corn','plastics'] },
  { id: 'veracruz',   name: 'Veracruz',     country: 'Mexiko',       lat: 19.20, lon: -96.13, region: 'n_america',size: 2, exports: ['crude_oil','coffee','cars','sugar'], imports: ['corn','machinery','steel','electronics'] },

  // --- Südamerika ---
  { id: 'santos',     name: 'Santos',       country: 'Brasilien',    lat: -23.96,lon: -46.30, region: 's_america',size: 3, exports: ['soybeans','coffee','sugar','iron_ore','cars'], imports: ['crude_oil','machinery','electronics','fertilizer'] },
  { id: 'paranagua',  name: 'Paranaguá',    country: 'Brasilien',    lat: -25.52,lon: -48.51, region: 's_america',size: 2, exports: ['soybeans','corn','sugar','timber'], imports: ['fertilizer','machinery','crude_oil','steel'] },
  { id: 'itaqui',     name: 'Itaqui',       country: 'Brasilien',    lat: -2.57, lon: -44.37, region: 's_america',size: 2, exports: ['iron_ore','soybeans','aluminium','manganese'], imports: ['machinery','fertilizer','crude_oil','wheat'] },
  { id: 'buenosaires',name: 'Buenos Aires', country: 'Argentinien',  lat: -34.58,lon: -58.37, region: 's_america',size: 2, exports: ['soybeans','beef','wheat','corn','wine'], imports: ['crude_oil','machinery','electronics','cars'] },
  { id: 'callao',     name: 'Callao',       country: 'Peru',         lat: -12.05,lon: -77.15, region: 's_america',size: 2, exports: ['copper_ore','fish','silver','zinc','coffee'], imports: ['crude_oil','machinery','wheat','cars'] },
  { id: 'valparaiso', name: 'Valparaíso',   country: 'Chile',        lat: -33.04,lon: -71.63, region: 's_america',size: 2, exports: ['copper','copper_ore','wine','fruit','lithium'], imports: ['crude_oil','machinery','cars','electronics'] },
  { id: 'cartagena',  name: 'Cartagena',    country: 'Kolumbien',    lat: 10.40, lon: -75.51, region: 's_america',size: 2, exports: ['crude_oil','coffee','coal','bananas'], imports: ['machinery','corn','cars','electronics'] },

  // --- Afrika ---
  { id: 'durban',     name: 'Durban',       country: 'Südafrika',    lat: -29.87,lon: 31.03,  region: 'africa',   size: 2, exports: ['coal','iron_ore','manganese','fruit','gold'], imports: ['crude_oil','machinery','cars','electronics'] },
  { id: 'lagos',      name: 'Lagos',        country: 'Nigeria',      lat: 6.45,  lon: 3.38,   region: 'africa',   size: 2, exports: ['crude_oil','lng','cocoa','rubber'], imports: ['wheat','machinery','cars','electronics'] },
  { id: 'mombasa',    name: 'Mombasa',      country: 'Kenia',        lat: -4.04, lon: 39.67,  region: 'africa',   size: 2, exports: ['tea','coffee','spices','fruit'], imports: ['crude_oil','wheat','machinery','steel'] },
  { id: 'tangermed',  name: 'Tanger Med',   country: 'Marokko',      lat: 35.88, lon: -5.50,  region: 'africa',   size: 2, exports: ['fertilizer','cars','fruit','textiles'], imports: ['crude_oil','machinery','wheat','electronics'] },
  { id: 'alexandria', name: 'Alexandria',   country: 'Ägypten',      lat: 31.20, lon: 29.92,  region: 'africa',   size: 2, exports: ['cotton','fertilizer','spices','fruit'], imports: ['crude_oil','wheat','machinery','cars'] },
  { id: 'abidjan',    name: 'Abidjan',      country: 'Elfenbeinküste',lat: 5.30, lon: -4.01,  region: 'africa',   size: 1, exports: ['cocoa','coffee','rubber','palm_oil'], imports: ['crude_oil','rice','machinery','wheat'] },

  // --- Ozeanien ---
  { id: 'sydney',     name: 'Sydney',       country: 'Australien',   lat: -33.85,lon: 151.23, region: 'oceania',  size: 2, exports: ['coal','wheat','beef','wine','wool'], imports: ['crude_oil','cars','electronics','machinery'] },
  { id: 'melbourne',  name: 'Melbourne',    country: 'Australien',   lat: -37.84,lon: 144.92, region: 'oceania',  size: 2, exports: ['wheat','beef','dairy','wine','wool'], imports: ['crude_oil','cars','machinery','electronics'] },
  { id: 'porthedland',name: 'Port Hedland', country: 'Australien',   lat: -20.31,lon: 118.58, region: 'oceania',  size: 2, exports: ['iron_ore','lng','manganese','lithium'], imports: ['machinery','diesel','steel','cars'] },
  { id: 'auckland',   name: 'Auckland',     country: 'Neuseeland',   lat: -36.84,lon: 174.77, region: 'oceania',  size: 1, exports: ['dairy','beef','wine','timber','wool'], imports: ['crude_oil','cars','machinery','electronics'] },
];

export const PORTS_BY_ID = Object.fromEntries(PORTS.map(p => [p.id, p]));

export function portName(id) {
  return PORTS_BY_ID[id]?.name ?? id;
}
