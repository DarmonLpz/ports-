// Spielzeit & Sonnenstand. Eine Spielstunde wird in Echtzeit gerafft.
// Der subsolare Punkt (Ort, an dem die Sonne im Zenit steht) bestimmt
// die Tag/Nacht-Grenze auf dem Globus.

export class GameClock {
  constructor() {
    this.hours = 8;        // verstrichene Spielstunden seit Start
    this.speed = 1;        // Zeitraffer-Faktor (Spielstunden pro Echtsekunde)
    this.paused = false;
  }

  // dtSeconds = vergangene Echtzeit; gibt verstrichene Spielstunden zurück
  advance(dtSeconds) {
    if (this.paused) return 0;
    const dh = dtSeconds * this.speed;
    this.hours += dh;
    return dh;
  }

  get day() { return Math.floor(this.hours / 24) + 1; }
  get hourOfDay() { return this.hours % 24; }

  dateString() {
    const totalDays = Math.floor(this.hours / 24);
    const year = 1 + Math.floor(totalDays / 360);
    const dayOfYear = totalDays % 360;
    const month = Math.floor(dayOfYear / 30) + 1;
    const day = (dayOfYear % 30) + 1;
    const h = Math.floor(this.hourOfDay).toString().padStart(2, '0');
    const m = Math.floor((this.hourOfDay % 1) * 60).toString().padStart(2, '0');
    return `Jahr ${year} · ${day.toString().padStart(2,'0')}.${month.toString().padStart(2,'0')} · ${h}:${m}`;
  }

  // Subsolarer Punkt: Längengrad wandert mit der Tageszeit, Breitengrad
  // schwankt jahreszeitlich (Deklination ±23.4°).
  subsolarPoint() {
    const lon = 180 - (this.hourOfDay / 24) * 360;     // Mittag wandert westwärts
    const dayOfYear = (this.hours / 24) % 360;
    const decl = 23.44 * Math.sin((dayOfYear / 360) * 2 * Math.PI - Math.PI / 2);
    return { lat: decl, lon: ((lon + 180) % 360 + 360) % 360 - 180 };
  }
}
