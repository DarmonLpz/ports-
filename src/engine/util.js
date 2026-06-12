// Allgemeine Hilfsfunktionen: deterministischer RNG, Geo-Mathematik,
// Großkreis-Interpolation und Formatierung.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const DEG = Math.PI / 180;
export const R_EARTH_NM = 3440.065; // Erdradius in Seemeilen

// Großkreisdistanz in Seemeilen
export function gcDistance(lat1, lon1, lat2, lon2) {
  const φ1 = lat1 * DEG, φ2 = lat2 * DEG;
  const dφ = (lat2 - lat1) * DEG, dλ = (lon2 - lon1) * DEG;
  const a = Math.sin(dφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(dλ / 2) ** 2;
  return 2 * R_EARTH_NM * Math.asin(Math.min(1, Math.sqrt(a)));
}

// Punkt auf Großkreis bei Anteil f (0..1) zwischen zwei Geo-Punkten.
export function gcInterpolate(lat1, lon1, lat2, lon2, f) {
  const φ1 = lat1 * DEG, λ1 = lon1 * DEG, φ2 = lat2 * DEG, λ2 = lon2 * DEG;
  const d = 2 * Math.asin(Math.sqrt(
    Math.sin((φ2 - φ1) / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin((λ2 - λ1) / 2) ** 2));
  if (d === 0) return [lat1, lon1];
  const A = Math.sin((1 - f) * d) / Math.sin(d);
  const B = Math.sin(f * d) / Math.sin(d);
  const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2);
  const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2);
  const z = A * Math.sin(φ1) + B * Math.sin(φ2);
  const φ = Math.atan2(z, Math.sqrt(x * x + y * y));
  const λ = Math.atan2(y, x);
  return [φ / DEG, λ / DEG];
}

export function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
export function lerp(a, b, t) { return a + (b - a) * t; }

export function fmtMoney(v) {
  const sign = v < 0 ? '-' : '';
  v = Math.abs(v);
  if (v >= 1e9) return `${sign}$${(v / 1e9).toFixed(2)} Mrd`;
  if (v >= 1e6) return `${sign}$${(v / 1e6).toFixed(2)} Mio`;
  if (v >= 1e3) return `${sign}$${(v / 1e3).toFixed(1)}k`;
  return `${sign}$${v.toFixed(0)}`;
}

export function fmtNum(v) {
  return Math.round(v).toLocaleString('de-DE');
}

export function fmtTons(v) {
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)} Mt`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)} kt`;
  return `${Math.round(v)} t`;
}

export function uid(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}
