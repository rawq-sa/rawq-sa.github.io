import { cardSVG } from "./uno.js?v=38";
// جكارو روق: منطق اللعبة (المضيف يتحقق فيه، والجوالات تلمّح فيه) + رسم اللوح والأوراق
// موقع الكورة نسبةً لصاحبها: -1 بالبيت، 0..75 على المسار (0 = خانة الطلعة)، 76..79 داخل الدار
export const SIDE = 19, TRACK = 76, END = 79;
export const JCOL = [
  { fill: "#ff5a6e", dark: "#a3162f", name: "الأحمر" },
  { fill: "#4b9bff", dark: "#173f8f", name: "الأزرق" },
  { fill: "#ffc93d", dark: "#9a6a00", name: "الأصفر" },
  { fill: "#34d69a", dark: "#0c6b4a", name: "الأخضر" }
];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"], SUITS = ["s", "h", "d", "c"];
export const jDeck = () => SUITS.flatMap(s => RANKS.map(r => r + s));
export const jRank = c => String(c).slice(0, -1);
export const jSuit = c => String(c).slice(-1);
const AR = n => String(n).replace(/\d/g, d => "٠١٢٣٤٥٦٧٨٩"[d]);
const VAL = { A: 1, Q: 12, K: 13 };
export const jVal = c => VAL[jRank(c)] || +jRank(c);
export function jHelp(c) {
  const r = jRank(c);
  return { A: "طلّع أو ١", K: "طلّع أو ١٣", "4": "ورا ٤", "7": "قسّم ٧", J: "بدّل", "5": "أي كورة ٥" }[r] || `امشِ ${AR(jVal(c))}`;
}
export const jTeam = s => s % 2;
// الفريق داخل اللعبة: لو لاعبين بس (duo) كل واحد فريق لحاله
export const jTeamOf = (g, s) => g && g.duo ? s : s % 2;
export const jAbs = (s, r) => (s * SIDE + r) % TRACK;
export const jSeats = g => Object.keys(g.pos).map(Number).sort((a, b) => a - b);

function at(g, cell) {
  for (const s of jSeats(g)) { const p = g.pos[s]; for (let i = 0; i < 4; i++) if (p[i] >= 0 && p[i] < TRACK && jAbs(s, p[i]) === cell) return [s, i]; }
  return null;
}
// لو خلّصت كوراتك كلها تلعب بكورات خويك
export function jCtrl(g, s) {
  const p = (s + 2) % 4;
  return !g.duo && g.pos[s].every(r => r >= TRACK) && g.pos[p] ? p : s;
}
function fwd(g, s, i, k) {
  const r = g.pos[s][i]; if (r < 0) return null;
  const nr = r + k; if (nr > END) return null;
  for (let x = Math.max(r + 1, TRACK); x <= nr; x++) if (g.pos[s].includes(x)) return null; // ما تتخطى كوراتك داخل الدار
  if (nr >= TRACK) return { nr, kill: null };
  const o = at(g, jAbs(s, nr));
  if (o && jTeamOf(g, o[0]) === jTeamOf(g, s)) return null;
  return { nr, kill: o };
}
function back(g, s, i, k) {
  const r = g.pos[s][i]; if (r < 0 || r >= TRACK) return null;
  const nr = (r - k + TRACK) % TRACK;
  const o = at(g, jAbs(s, nr));
  if (o && jTeamOf(g, o[0]) === jTeamOf(g, s)) return null;
  return { nr, kill: o };
}
function out(g, s) {
  const i = g.pos[s].indexOf(-1); if (i < 0) return null;
  const o = at(g, jAbs(s, 0));
  if (o && jTeamOf(g, o[0]) === jTeamOf(g, s)) return null;
  return { i, nr: 0, kill: o };
}
const clone = g => ({ duo: g.duo, pos: Object.fromEntries(Object.entries(g.pos).map(([k, v]) => [k, [...v]])) });
function step(g, s, i, m, kills) { if (m.kill) { g.pos[m.kill[0]][m.kill[1]] = -1; kills.push(m.kill); } g.pos[s][i] = m.nr; }

// كل الحركات الممكنة بورقة: t = o طلعة، f قدّام، b ورا، s تبديل، 7 تقسيم السبعة
export function jMoves(g, s, card) {
  const R = jRank(card), c = jCtrl(g, s), L = [], Q = [0, 1, 2, 3];
  const go = k => Q.forEach(i => fwd(g, c, i, k) && L.push({ t: "f", a: [c, i], k }));
  if (R === "A" || R === "K") { const o = out(g, c); if (o) L.push({ t: "o", a: [c, o.i] }); go(R === "A" ? 1 : 13); }
  else if (R === "4") Q.forEach(i => back(g, c, i, 4) && L.push({ t: "b", a: [c, i], k: 4 }));
  else if (R === "5") jSeats(g).forEach(x => Q.forEach(i => fwd(g, x, i, 5) && L.push({ t: "f", a: [x, i], k: 5 })));
  else if (R === "J") Q.forEach(i => {
    const r = g.pos[c][i]; if (r < 0 || r >= TRACK) return;
    jSeats(g).filter(x => jTeamOf(g, x) !== jTeamOf(g, c)).forEach(x => Q.forEach(j => { const q = g.pos[x][j]; if (q >= 0 && q < TRACK) L.push({ t: "s", a: [c, i], b: [x, j] }); }));
  });
  else if (R === "7") Q.forEach(i => {
    if (fwd(g, c, i, 7)) L.push({ t: "f", a: [c, i], k: 7 });
    for (let k = 1; k < 7; k++) {
      const m = fwd(g, c, i, k); if (!m) continue;
      const g2 = clone(g); step(g2, c, i, m, []);
      Q.forEach(j => { if (j !== i && fwd(g2, c, j, 7 - k)) L.push({ t: "7", a: [c, i], k, b: [c, j] }); });
    }
  });
  else go(jVal(card));
  return L;
}
export const jKey = m => [m.t, m.a, m.b || "", m.k || ""].join("|");

// ينفّذ الحركة على g (لازم تكون من jMoves) ويرجع اللي انضربوا، أو null لو الحركة مو صحيحة
export function jApply(g, s, card, mv) {
  const L = jMoves(g, s, card), mk = jKey(mv), m = L.find(x => jKey(x) === mk);
  if (!m) return null;
  const kills = [];
  if (m.t === "o") { const o = out(g, m.a[0]); step(g, m.a[0], o.i, o, kills); }
  else if (m.t === "f") step(g, m.a[0], m.a[1], fwd(g, m.a[0], m.a[1], m.k), kills);
  else if (m.t === "b") step(g, m.a[0], m.a[1], back(g, m.a[0], m.a[1], m.k), kills);
  else if (m.t === "7") { step(g, m.a[0], m.a[1], fwd(g, m.a[0], m.a[1], m.k), kills); step(g, m.b[0], m.b[1], fwd(g, m.b[0], m.b[1], 7 - m.k), kills); }
  else if (m.t === "s") {
    const [a, i] = m.a, [b, j] = m.b, ca = jAbs(a, g.pos[a][i]), cb = jAbs(b, g.pos[b][j]);
    g.pos[a][i] = (cb - a * SIDE + TRACK * 2) % TRACK; g.pos[b][j] = (ca - b * SIDE + TRACK * 2) % TRACK;
  }
  return { m, kills };
}
// الفريق اللي دخّل كل كوراته (هو وخويه)
export function jWinner(g) {
  for (const t of g.duo ? jSeats(g) : [0, 1]) { const ss = jSeats(g).filter(s => jTeamOf(g, s) === t); if (ss.length && ss.every(s => g.pos[s].every(r => r >= TRACK))) return t; }
  return null;
}
export const jHomeCount = (g, s) => (g.pos[s] || []).filter(r => r >= TRACK).length;

/* ================= الرسم ================= */
// اللوح «المربع»: مسار بشكل مربع حوافه منفوخة شوي، ٧٦ خانة بمسافات متساوية
const CX = 210, CY = 210, A = 166, NSQ = 6;
const sqR = t => A / Math.pow(Math.pow(Math.abs(Math.cos(t)), NSQ) + Math.pow(Math.abs(Math.sin(t)), NSQ), 1 / NSQ);
const sqPath = (a, n = 360) => { const P = []; for (let i = 0; i < n; i++) { const t = Math.PI / 2 + i / n * Math.PI * 2, r = sqR(t) * a / A; P.push([CX + r * Math.cos(t), CY + r * Math.sin(t)]); } return P; };
const CELLS = (() => { // نبدأ من نص الجهة اللي تحت ونمشي يسار (مع اتجاه اللعب)
  const P = sqPath(A, 2000); P.push(P[0]); const L = [0];
  for (let i = 1; i < P.length; i++) L.push(L[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  const tot = L[L.length - 1], out = []; let j = 0;
  for (let k = 0; k < TRACK; k++) { const d = (k + .5) * tot / TRACK; while (L[j + 1] < d) j++; const t = (d - L[j]) / (L[j + 1] - L[j]); out.push([P[j][0] + (P[j + 1][0] - P[j][0]) * t, P[j][1] + (P[j + 1][1] - P[j][1]) * t]); }
  return out;
})();
const dirOf = d => { const a = Math.PI / 2 + d * Math.PI / 2; return [Math.cos(a), Math.sin(a)]; }; // تحت، يسار، فوق، يمين
const rotIdx = (cell, rot) => ((cell - rot * SIDE) % TRACK + TRACK) % TRACK;
export function jSpot(s, i, r, rot) {
  const d = ((s - rot) % 4 + 4) % 4;
  if (r < 0) { const a = Math.PI / 2 + d * Math.PI / 2 + Math.PI / 4, bx = CX + Math.cos(a) * 112, by = CY + Math.sin(a) * 112; return [bx + (i % 2 ? 9 : -9), by + (i < 2 ? -9 : 9)]; }
  if (r >= TRACK) { const [dx, dy] = dirOf(d), q = A - 28 - (r - TRACK) * 19; return [CX + dx * q, CY + dy * q]; }
  return CELLS[rotIdx(jAbs(s, r), rot)];
}
const f1 = n => n.toFixed(1);
// الأوراق بنفس شكل أونو روق: كل شكل بلون (♥ أحمر، ♦ أصفر، ♣ أخضر، ♠ بنفسجي)
const SUITK = { h: "r", d: "y", c: "g", s: "b" };
export function jCardSVG(c, attrs = "") {
  const svg = c ? cardSVG(SUITK[jSuit(c)] + jRank(c)) : cardSVG(null);
  return attrs ? svg.replace("<svg ", `<svg ${attrs} `) : svg;
}
// اللوح: rot = مقعدي (عشان أكون تحت)، cand = الكورات اللي تنختار، pick = المختارة، prev = مواقع قبل للحركة
const D = P => "M" + P.map(p => f1(p[0]) + " " + f1(p[1])).join("L") + "Z";
const PALM = (() => { // نخلة ذهبية: جذع بحلقات وسعف عريض
  const fr = (ang, len, bend) => `<path transform="rotate(${ang})" d="M0 0 C${len * .3} ${-bend} ${len * .7} ${-bend * .6} ${len} ${bend * .5} C${len * .7} ${bend * .15} ${len * .35} ${bend * .25} 0 0Z" fill="url(#jGold)" stroke="#7a5212" stroke-width=".7"/>`;
  return `<g><path d="M-3.5 40 Q-2 16 -1.6 0 L1.6 0 Q2 16 3.5 40Z" fill="url(#jGold)" stroke="#7a5212" stroke-width=".8"/>
  ${[6, 12, 18, 24, 30, 36].map(y => `<path d="M-3 ${y} Q0 ${y + 2} 3 ${y}" fill="none" stroke="#7a5212" stroke-width=".9"/>`).join("")}
  ${fr(12, 30, 11)}${fr(-15, 37, 11)}${fr(-45, 38, 9)}${fr(-75, 30, 6)}${fr(192, 30, -11)}${fr(-165, 37, -11)}${fr(-135, 38, -9)}${fr(-105, 30, -6)}
  <circle cx="-4" cy="4" r="3" fill="#b8862b"/><circle cx="3.5" cy="5" r="3" fill="#a87420"/><circle cx="0" cy="8.5" r="3" fill="#b8862b"/></g>`;
})();
export function jBoard(g, { rot = 0, cand = new Set(), pick = null, prev = {}, top = null, turnSeat = null } = {}) {
  const seats = jSeats(g), now = {}, AR = n => String(n).replace(/\d/g, d => "٠١٢٣٤٥٦٧٨٩"[d]);
  let s = `<svg class="jsvg" viewBox="0 0 420 420" direction="ltr" style="direction:ltr" role="img" aria-label="لوح الجكارو">
  <defs>
    <radialGradient id="jFelt" cx="50%" cy="45%" r="70%"><stop offset="0" stop-color="#3d2a72"/><stop offset="1" stop-color="#140f28"/></radialGradient>
    <radialGradient id="jWood" cx="50%" cy="38%" r="72%"><stop offset="0" stop-color="#f6e4c0"/><stop offset=".65" stop-color="#e2c38f"/><stop offset="1" stop-color="#c49a5c"/></radialGradient>
    <radialGradient id="jHole" cx="50%" cy="35%" r="62%"><stop offset="0" stop-color="#2a1606"/><stop offset=".8" stop-color="#4a2c12"/><stop offset="1" stop-color="#c89c62"/></radialGradient>
    <linearGradient id="jGold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff1b8"/><stop offset=".45" stop-color="#e6b54a"/><stop offset="1" stop-color="#a8761c"/></linearGradient>
    <pattern id="jGrain" width="70" height="10" patternUnits="userSpaceOnUse"><path d="M0 5 Q17 2 35 5 T70 5" fill="none" stroke="#3a1c06" stroke-opacity=".16"/></pattern>
    ${JCOL.map((c, k) => `<radialGradient id="jM${k}" cx="34%" cy="28%" r="78%"><stop offset="0" stop-color="#fff"/><stop offset=".22" stop-color="${c.fill}" stop-opacity=".9"/><stop offset=".6" stop-color="${c.fill}"/><stop offset="1" stop-color="${c.dark}"/></radialGradient>`).join("")}
  </defs>
  <rect width="420" height="420" rx="30" fill="url(#jFelt)"/><rect x="8" y="8" width="404" height="404" rx="24" fill="none" stroke="#f2cf72" stroke-opacity=".28" stroke-dasharray="3 5"/>
  <path d="${D(sqPath(A + 30))}" fill="#000" opacity=".45" transform="translate(0 7)"/><path d="${D(sqPath(A + 30))}" fill="url(#jGold)"/><path d="${D(sqPath(A + 25))}" fill="#8a5a2b"/>
  <path d="${D(sqPath(A + 21))}" fill="url(#jWood)"/><path d="${D(sqPath(A + 21))}" fill="url(#jGrain)"/>
  <path d="${D(sqPath(A))}" fill="none" stroke="#8a5a2b" stroke-width="15" stroke-linejoin="round" opacity=".22"/>`;
  // دور مين: نلوّن جهته
  if (turnSeat != null) { const d0 = ((turnSeat - rot) % 4 + 4) % 4, idx = Array.from({ length: SIDE }, (_, k) => CELLS[(d0 * SIDE + k - 1 + TRACK) % TRACK]); s += `<path d="M${idx.map(p => f1(p[0]) + " " + f1(p[1])).join("L")}" fill="none" stroke="${JCOL[turnSeat].fill}" stroke-opacity=".35" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>`; }
  for (const k of seats) {
    const d = ((k - rot) % 4 + 4) % 4, col = JCOL[k].fill, [dx, dy] = dirOf(d);
    // الدار: ممر ملوّن من المسار للنص
    const q0 = A - 28 + 10, q1 = A - 28 - 3 * 19 - 10;
    s += `<line x1="${f1(CX + dx * q0)}" y1="${f1(CY + dy * q0)}" x2="${f1(CX + dx * q1)}" y2="${f1(CY + dy * q1)}" stroke="${col}" stroke-opacity=".28" stroke-width="22" stroke-linecap="round"/>`;
    for (let h = 0; h < 4; h++) { const [x, y] = jSpot(k, 0, TRACK + h, rot); s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="6" fill="url(#jHole)"/>`; }
    // البيت بالزاوية
    const a = Math.PI / 2 + d * Math.PI / 2 + Math.PI / 4, bx = CX + Math.cos(a) * 112, by = CY + Math.sin(a) * 112;
    s += `<circle cx="${f1(bx)}" cy="${f1(by)}" r="27" fill="${col}" fill-opacity=".16" stroke="${col}" stroke-width="2"/>`;
    for (let i = 0; i < 4; i++) { const [x, y] = jSpot(k, i, -1, rot); s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="6" fill="url(#jHole)"/>`; }
  }
  // خانات المسار + خانة الطلعة لكل لاعب + أرقام تساعد على العد
  for (let c = 0; c < TRACK; c++) {
    const [x, y] = CELLS[c]; s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="5.3" fill="url(#jHole)"/>`;
  }
  for (const k of seats) {
    const [x, y] = jSpot(k, 0, 0, rot), col = JCOL[k].fill;
    s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="11" fill="${col}" fill-opacity=".25" stroke="${col}" stroke-width="2.6"/><circle cx="${f1(x)}" cy="${f1(y)}" r="5.3" fill="url(#jHole)"/>`;
    for (const n of [5, 10, 15]) { const [px, py] = jSpot(k, 0, n - 1, rot), L = Math.hypot(px - CX, py - CY), ox = CX + (px - CX) * (L + 15) / L, oy = CY + (py - CY) * (L + 15) / L; s += `<text x="${f1(ox)}" y="${f1(oy + 3)}" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="9" fill="#6b3f17">${AR(n)}</text>`; }
  }
  // النص: نخلة ذهبية وروق بخط رقعة
  s += `<circle cx="${CX}" cy="${CY}" r="58" fill="#1c1530" stroke="url(#jGold)" stroke-width="2.5"/><circle cx="${CX}" cy="${CY}" r="52" fill="none" stroke="#e6b54a" stroke-opacity=".4"/>
    <g transform="translate(${CX} ${CY - 18}) scale(.82)">${PALM}</g>
    <text x="${CX}" y="${CY + 42}" text-anchor="middle" font-family="RawqRuqaa,'Aref Ruqaa',Lalezar,serif" font-size="32" fill="url(#jGold)">روق</text>`;
  const marbles = [];
  for (const k of seats) for (let i = 0; i < 4; i++) {
    const key = k + ":" + i, r = g.pos[k][i], [x, y] = jSpot(k, i, r, rot), p = prev[key];
    now[key] = [x, y];
    const dx = p ? p[0] - x : 0, dy = p ? p[1] - y : 0, moved = Math.abs(dx) + Math.abs(dy) > .5;
    const cl = `jm${cand.has(key) ? " can" : ""}${pick === key ? " pick" : ""}`;
    marbles.push({ z: cand.has(key) || pick === key ? 1 : 0, h: `<g class="${cl}" data-m="${key}" transform="translate(${f1(x)} ${f1(y)})"><g class="${moved ? "mv" : ""}" style="${moved ? `--dx:${f1(dx)}px;--dy:${f1(dy)}px` : ""}">
      ${cand.has(key) || pick === key ? `<circle r="11.5" class="ring" fill="none" stroke="#fff" stroke-width="2"/>` : ""}
      <circle r="12" fill="transparent"/><ellipse cx="1" cy="3.6" rx="6.6" ry="3" fill="#000" opacity=".4"/><circle cy="-.6" r="7.4" fill="url(#jM${k})" stroke="${JCOL[k].dark}" stroke-width=".6"/></g></g>` });
  }
  s += marbles.sort((a, b) => a.z - b.z).map(m => m.h).join("") + `</svg>`;
  return { svg: s, now };
}
