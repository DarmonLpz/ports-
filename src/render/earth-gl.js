// WebGL-Renderer der texturierten Erde (orthographisch) mit Tag/Nacht, Sternen
// und Atmosphären-Ring. Eine optionale Detailtextur (Esri-Tiles, siehe
// earth-tiles.js) wird über die Basistextur geblendet. Fällt der WebGL-Kontext
// aus, signalisiert create() null und der Aufrufer nutzt den prozeduralen Globus.

const VERT = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2  u_res;        // Canvas-Größe in Gerätepixeln
uniform vec2  u_center;     // Globusmitte in Gerätepixeln (y von oben)
uniform float u_R;          // Globusradius in Gerätepixeln
uniform float u_lon0;       // Kamera-Längengrad (rad)
uniform float u_lat0;       // Kamera-Breitengrad (rad)
uniform vec3  u_sun;        // Sonnenrichtung (Einheitsvektor, Weltkoord.)
uniform sampler2D u_base;   // Blue-Marble (equirect)
uniform sampler2D u_detail; // Detailtextur (Esri), in equirect-UV vorgerendert
uniform vec4  u_detRect;    // Detail-Bounds als UV: (u0, v0, u1, v1); leer wenn u1<=u0
uniform float u_detMix;     // Blend-Stärke 0..1
uniform float u_night;      // 1 = Tag/Nacht-Beleuchtung, 0 = gleichmäßiger Tag

const float PI = 3.14159265358979;

void main() {
  // Pixel relativ zur Globusmitte (y nach unten positiv wie im 2D-Canvas)
  float px = gl_FragCoord.x;
  float py = u_res.y - gl_FragCoord.y;
  float X = (px - u_center.x) / u_R;
  float Y = (u_center.y - py) / u_R;   // nach oben positiv
  float rho2 = X*X + Y*Y;
  if (rho2 > 1.0) {
    // außerhalb der Kugel: Weltraum (sanfter blauer Verlauf) + Sterne
    float star = fract(sin(dot(floor(gl_FragCoord.xy/1.5), vec2(12.9898,78.233))) * 43758.5453);
    float s = step(0.997, star);
    float vy = gl_FragCoord.y / u_res.y;
    vec3 space = mix(vec3(0.03,0.05,0.10), vec3(0.06,0.08,0.14), vy) + s * vec3(0.85);
    // weicher Atmosphären-Ring knapp außerhalb R
    float rr = sqrt(rho2);
    float rim = smoothstep(1.0, 0.985, rr) * smoothstep(1.12, 1.0, rr);
    space += rim * vec3(0.35, 0.66, 1.0) * 0.7;
    gl_FragColor = vec4(space, 1.0);
    return;
  }
  float rho = sqrt(rho2);
  float c = asin(clamp(rho, 0.0, 1.0));
  float sinc = sin(c), cosc = cos(c);
  float lat, lon;
  if (rho < 1e-6) { lat = u_lat0; lon = u_lon0; }
  else {
    lat = asin(cosc * sin(u_lat0) + (Y * sinc * cos(u_lat0)) / rho);
    lon = u_lon0 + atan(X * sinc, rho * cosc * cos(u_lat0) - Y * sinc * sin(u_lat0));
  }
  // equirect-UV
  float u = fract((lon + PI) / (2.0 * PI));
  float v = (PI/2.0 - lat) / PI;        // 0 = Nordpol
  vec3 col = texture2D(u_base, vec2(u, v)).rgb;
  // Detailtextur überblenden, falls Pixel innerhalb der Bounds
  if (u_detRect.z > u_detRect.x) {
    if (u > u_detRect.x && u < u_detRect.z && v > u_detRect.y && v < u_detRect.w) {
      vec2 duv = vec2((u - u_detRect.x) / (u_detRect.z - u_detRect.x),
                      (v - u_detRect.y) / (u_detRect.w - u_detRect.y));
      vec3 det = texture2D(u_detail, duv).rgb;
      // weiche Ränder, damit kein hartes Rechteck sichtbar wird
      float f = smoothstep(0.0, 0.14, duv.x) * smoothstep(1.0, 0.86, duv.x)
              * smoothstep(0.0, 0.14, duv.y) * smoothstep(1.0, 0.86, duv.y);
      col = mix(col, det, u_detMix * f);
    }
  }
  // Tag/Nacht (abschaltbar über u_night)
  vec3 n = vec3(cos(lat)*cos(lon), cos(lat)*sin(lon), sin(lat));
  float l = dot(n, u_sun);                 // -1..1
  float day = smoothstep(-0.12, 0.18, l);
  vec3 night = col * 0.12 + vec3(0.012, 0.022, 0.045);
  vec3 dn = mix(night, col * (0.6 + 0.6 * day), day);   // mit Tag/Nacht
  vec3 evenDay = col * 1.02;                             // gleichmäßiger Tag
  col = mix(evenDay, dn, u_night);
  // Randverdunklung
  col *= mix(1.0, 0.82, smoothstep(0.7, 1.0, rho));
  gl_FragColor = vec4(col, 1.0);
}
`;

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src); gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.warn('Shader-Fehler', gl.getShaderInfoLog(sh)); return null;
  }
  return sh;
}

export class EarthGL {
  static create(canvas) {
    const gl = canvas.getContext('webgl', { antialias: true, alpha: false })
            || canvas.getContext('experimental-webgl');
    if (!gl) return null;
    const e = new EarthGL();
    if (!e._init(gl)) return null;
    return e;
  }

  _init(gl) {
    this.gl = gl;
    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return false;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn('Link-Fehler', gl.getProgramInfoLog(prog)); return false;
    }
    this.prog = prog;
    this.buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    this.aPos = gl.getAttribLocation(prog, 'a_pos');
    this.u = {};
    for (const name of ['u_res','u_center','u_R','u_lon0','u_lat0','u_sun','u_base','u_detail','u_detRect','u_detMix','u_night'])
      this.u[name] = gl.getUniformLocation(prog, name);
    // Platzhalter-Texturen (1x1), bis das Bild geladen ist
    this.baseTex = this._tex1(gl, [9, 26, 48]);
    this.detailTex = this._tex1(gl, [0, 0, 0]);
    this.baseReady = false;
    this._loadBase('assets/earth/bluemarble-8k.jpg');
    return true;
  }

  _tex1(gl, rgb) {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array(rgb));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return t;
  }

  _loadBase(url) {
    const gl = this.gl;
    const img = new Image();
    img.onload = () => {
      // WebGL1 verlangt für REPEAT-Wrap + Mipmaps Power-of-Two-Texturen. Das
      // Equirect-Bild ist 2:1, daher in eine POT-Canvas (W×W/2) zeichnen.
      const max = gl.getParameter(gl.MAX_TEXTURE_SIZE);
      const W = Math.min(max, 8192);
      const cv = document.createElement('canvas');
      cv.width = W; cv.height = W / 2;
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      gl.bindTexture(gl.TEXTURE_2D, this.baseTex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, cv);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.generateMipmap(gl.TEXTURE_2D);
      this.baseReady = true;
    };
    img.onerror = () => { /* offline: Platzhalter bleibt */ };
    img.src = url;
  }

  glContext() { return this.gl; }

  // detail: {tex, rect:[u0,v0,u1,v1], mix} oder null; night: bool (Tag/Nacht an)
  render({ resW, resH, cx, cy, R, lon0, lat0, sun, detail, night = true }) {
    const gl = this.gl;
    gl.viewport(0, 0, resW, resH);
    gl.useProgram(this.prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.enableVertexAttribArray(this.aPos);
    gl.vertexAttribPointer(this.aPos, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(this.u.u_res, resW, resH);
    gl.uniform2f(this.u.u_center, cx, cy);
    gl.uniform1f(this.u.u_R, R);
    gl.uniform1f(this.u.u_lon0, lon0);
    gl.uniform1f(this.u.u_lat0, lat0);
    gl.uniform3f(this.u.u_sun, sun[0], sun[1], sun[2]);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.baseTex);
    gl.uniform1i(this.u.u_base, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, detail?.tex || this.detailTex);
    gl.uniform1i(this.u.u_detail, 1);
    const r = detail?.rect || [0, 0, 0, 0];
    gl.uniform4f(this.u.u_detRect, r[0], r[1], r[2], r[3]);
    gl.uniform1f(this.u.u_detMix, detail?.mix ?? 0);
    gl.uniform1f(this.u.u_night, night ? 1 : 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}
