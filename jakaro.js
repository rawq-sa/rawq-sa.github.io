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
// اللوح الثماني الأسود (مثل الطاولة الخشب المعروفة): ٤ أذرع على الأقطار، كل لاعب له ذراع
// المسار: من رأس الذراع يرجع للنص، يلف للذراع اللي بعده ويطلع لرأسه… ٧٦ خانة متساوية
const CX = 210, CY = 210, R0 = 60, R1 = 158, AW = 18;
const armAng = d => Math.PI / 4 + d * Math.PI / 2; // تحت-يمين، تحت-يسار، فوق-يسار، فوق-يمين
const P2 = (r, off, a) => [CX + r * Math.cos(a) - off * Math.sin(a), CY + r * Math.sin(a) + off * Math.cos(a)];
const TRACK_PTS = (() => {
  const P = [];
  for (let d = 0; d < 4; d++) {
    const a = armAng(d), b = armAng(d + 1);
    // نص اللفة → الصف (+AW) نازل للنص
    for (let t = 0; t <= 1; t += .02) { const th = Math.PI / 2 * t; P.push(P2(R1 + AW * Math.cos(th), AW * Math.sin(th), a)); }
    for (let t = 0; t <= 1; t += .01) P.push(P2(R1 + (R0 - R1) * t, AW, a));
    // وصلة بين الذراعين قريبة من النص (قوس)
    const p0 = P2(R0, AW, a), p1 = P2(R0, -AW, b), mid = (a + b) / 2, cr = R0 * 1.18;
    const cm = [CX + cr * Math.cos(mid), CY + cr * Math.sin(mid)];
    for (let t = 0; t <= 1; t += .02) { const u = 1 - t; P.push([u * u * p0[0] + 2 * u * t * cm[0] + t * t * p1[0], u * u * p0[1] + 2 * u * t * cm[1] + t * t * p1[1]]); }
    for (let t = 0; t <= 1; t += .01) P.push(P2(R0 + (R1 - R0) * t, -AW, b));
    for (let t = 0; t <= 1; t += .02) { const th = -Math.PI / 2 * (1 - t); P.push(P2(R1 + AW * Math.cos(th), AW * Math.sin(th), b)); }
  }
  return P;
})();
const CELLS = (() => {
  const P = [...TRACK_PTS, TRACK_PTS[0]], L = [0];
  for (let i = 1; i < P.length; i++) L.push(L[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  const tot = L[L.length - 1], out = []; let j = 0;
  for (let k = 0; k < TRACK; k++) { const dd = (k + .5) * tot / TRACK; while (L[j + 1] < dd) j++; const t = (dd - L[j]) / (L[j + 1] - L[j] || 1); out.push([P[j][0] + (P[j + 1][0] - P[j][0]) * t, P[j][1] + (P[j + 1][1] - P[j][1]) * t]); }
  return out;
})();
const rotIdx = (cell, rot) => ((cell - rot * SIDE) % TRACK + TRACK) % TRACK;
const baseAt = d => { const a = armAng(d) + Math.PI / 4; return [CX + Math.cos(a) * 168 + Math.cos(armAng(d)) * 0, CY + Math.sin(a) * 168]; };
export function jSpot(s, i, r, rot) {
  const d = ((s - rot) % 4 + 4) % 4;
  if (r < 0) { const a = armAng(d) + Math.PI / 4, [bx, by] = P2(170, 34, a); return [bx + (i % 2 ? 8.5 : -8.5), by + (i < 2 ? -8.5 : 8.5)]; }
  if (r >= TRACK) return P2(R1 - 6 - (r - TRACK + 1) * 19, 0, armAng(d));
  return CELLS[rotIdx(jAbs(s, r), rot)];
}
const f1 = n => n.toFixed(1);
// الأوراق بنفس شكل أونو روق: كل شكل بلون (♥ أحمر، ♦ أصفر، ♣ أخضر، ♠ بنفسجي)
const SUITK = { h: "r", d: "y", c: "g", s: "b" };
export function jCardSVG(c, attrs = "") {
  const svg = c ? cardSVG(SUITK[jSuit(c)] + jRank(c)) : cardSVG(null);
  return attrs ? svg.replace("<svg ", `<svg ${attrs} `) : svg;
}
// اللوح: rot = مقعدي، cand = الكورات اللي تنختار، pick = المختارة، prev = مواقع قبل للحركة
const D = P => "M" + P.map(p => f1(p[0]) + " " + f1(p[1])).join("L") + "Z";
const OCT = (r, cx = CX, cy = CY) => Array.from({ length: 8 }, (_, k) => { const a = Math.PI / 8 + k * Math.PI / 4, q = r / Math.cos(Math.PI / 8); return [cx + q * Math.cos(a), cy + q * Math.sin(a)]; });
const SUIT = { h: "M0 6C-8-1-6-8 0-3.6C6-8 8-1 0 6Z", d: "M0-7L5.2 0L0 7L-5.2 0Z", s: "M0-7C7-1 4.5 5 0 2C-4.5 5-7-1 0-7ZM0 1L2.4 7H-2.4Z", c: "M0-6.8a3.2 3.2 0 1 1 0 .01ZM-3.6-.6a3.2 3.2 0 1 1 0 .01ZM3.6-.6a3.2 3.2 0 1 1 0 .01ZM0 0L2.4 7H-2.4Z" };
export function jBoard(g, { rot = 0, cand = new Set(), pick = null, prev = {}, turnSeat = null } = {}) {
  const seats = jSeats(g), now = {}, AR = n => String(n).replace(/\d/g, d => "٠١٢٣٤٥٦٧٨٩"[d]);
  const GOLD = "#e6c06a";
  let s = `<svg class="jsvg" viewBox="0 0 420 420" direction="ltr" style="direction:ltr" role="img" aria-label="لوح الجكارو">
  <defs>
    <linearGradient id="jBlk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9a5f30"/><stop offset=".5" stop-color="#7a4520"/><stop offset="1" stop-color="#4f2a10"/></linearGradient>
    <pattern id="jGrain" width="14" height="160" patternUnits="userSpaceOnUse"><path d="M4 0 Q7 40 3.5 80 T4.5 160" fill="none" stroke="#2a1205" stroke-opacity=".22" stroke-width="1.2"/><path d="M10 0 Q12 50 9 95 T10.5 160" fill="none" stroke="#c48a55" stroke-opacity=".12"/></pattern>
    <radialGradient id="jHole" cx="50%" cy="35%" r="62%"><stop offset="0" stop-color="#1e0d03"/><stop offset=".78" stop-color="#3a1d09"/><stop offset="1" stop-color="#b47a46"/></radialGradient>
    <linearGradient id="jGold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff1b8"/><stop offset=".45" stop-color="#e6b54a"/><stop offset="1" stop-color="#a8761c"/></linearGradient>
    ${JCOL.map((c, k) => `<radialGradient id="jM${k}" cx="34%" cy="28%" r="78%"><stop offset="0" stop-color="#fff"/><stop offset=".22" stop-color="${c.fill}" stop-opacity=".9"/><stop offset=".6" stop-color="${c.fill}"/><stop offset="1" stop-color="${c.dark}"/></radialGradient>`).join("")}
  </defs>
  <path d="${D(OCT(205, CX, CY + 5))}" fill="#000" opacity=".45"/>
  <path d="${D(OCT(205))}" fill="url(#jBlk)"/><path d="${D(OCT(205))}" fill="url(#jGrain)"/>
  <path d="${D(OCT(198))}" fill="none" stroke="${GOLD}" stroke-opacity=".55" stroke-width="1.2"/>`;
  // دور مين: توهج ذهبي خفيف على ذراعه
  if (turnSeat != null) { const d0 = ((turnSeat - rot) % 4 + 4) % 4, a = armAng(d0), p0 = P2(R0 - 4, 0, a), p1 = P2(R1 + AW, 0, a); s += `<line x1="${f1(p0[0])}" y1="${f1(p0[1])}" x2="${f1(p1[0])}" y2="${f1(p1[1])}" stroke="#ffe7a3" stroke-opacity=".13" stroke-width="64" stroke-linecap="round"/>`; }
  // الدار (بدون ألوان) + البيوت
  for (let d = 0; d < 4; d++) {
    for (let h = 0; h < 4; h++) { const [x, y] = P2(R1 - 6 - (h + 1) * 19, 0, armAng(d)); s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="5.6" fill="url(#jHole)"/>`; }
    const a = armAng(d) + Math.PI / 4, [bx, by] = P2(170, 34, a);
    s += `<rect x="${f1(bx - 19)}" y="${f1(by - 19)}" width="38" height="38" rx="5" fill="none" stroke="${GOLD}" stroke-width="1.4"/>`;
    for (let i = 0; i < 4; i++) s += `<circle cx="${f1(bx + (i % 2 ? 8.5 : -8.5))}" cy="${f1(by + (i < 2 ? -8.5 : 8.5))}" r="5.6" fill="url(#jHole)"/>`;
  }
  // خانات المسار + أرقام صغيرة للعد (من خانة طلعة كل لاعب)
  const placed = [], HOLES = [...CELLS, ...[0, 1, 2, 3].flatMap(d => [0, 1, 2, 3].map(h => P2(R1 - 6 - (h + 1) * 19, 0, armAng(d))))];
  CELLS.forEach(([x, y]) => s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="5.6" fill="url(#jHole)"/>`);
  CELLS.forEach(([x, y], c) => {
    const n = c % SIDE; // رقم الخانة من بداية الربع
    const L = Math.hypot(x - CX, y - CY), dd = ((Math.floor(c / SIDE)) % 4), a = armAng(dd), ax = Math.cos(a), ay = Math.sin(a);
    const along = (x - CX) * ax + (y - CY) * ay, px = CX + ax * along, py = CY + ay * along; let ox = x - px, oy = y - py, ol = Math.hypot(ox, oy);
    if (along > R1 - 2) { ox = CX - x; oy = CY - y; ol = L; } // عند راس الذراع الرقم يروح لجهة النص عشان ما يطلع برا
    else if (ol < 6 || along < R0 + 4) { ox = x - CX; oy = y - CY; ol = L; }
    const tx = x + ox / ol * 11, ty = y + oy / ol * 11;
    // نرتّبها: ما نكتب رقم لو بيركب على خانة ثانية أو رقم ثاني
    if (HOLES.some(([hx, hy]) => Math.hypot(hx - tx, hy - ty) < 9) || placed.some(([px2, py2]) => Math.hypot(px2 - tx, py2 - ty) < 11)) return;
    placed.push([tx, ty]);
    s += `<text x="${f1(tx)}" y="${f1(ty)}" text-anchor="middle" dominant-baseline="central" font-family="'IBM Plex Sans Arabic',Tahoma,sans-serif" font-weight="600" font-size="7.5" fill="#f6dc9a">${AR(n + 1)}</text>`;
  });
  // خانة الطلعة: حلقة ذهبية (بدون ألوان)
  for (let d = 0; d < 4; d++) { const [x, y] = CELLS[d * SIDE]; s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="9.8" fill="none" stroke="${GOLD}" stroke-width="1.8"/>`; }
  // النص: ثماني أسود وروق ذهبي
  s += `<path d="${D(OCT(44))}" fill="#000" stroke="url(#jGold)" stroke-width="2.4"/><path d="${D(OCT(39))}" fill="none" stroke="${GOLD}" stroke-opacity=".35"/>
    <text x="${CX}" y="${CY}" text-anchor="middle" dominant-baseline="central" font-family="RawqRuqaa,Amiri,Lalezar,serif" font-weight="700" font-size="38" fill="url(#jGold)">روق</text>`;
  const marbles = [];
  for (const k of seats) for (let i = 0; i < 4; i++) {
    const key = k + ":" + i, r = g.pos[k][i], [x, y] = jSpot(k, i, r, rot), p = prev[key];
    now[key] = [x, y];
    const dx = p ? p[0] - x : 0, dy = p ? p[1] - y : 0, moved = Math.abs(dx) + Math.abs(dy) > .5;
    const cl = `jm${cand.has(key) ? " can" : ""}${pick === key ? " pick" : ""}`;
    marbles.push({ z: cand.has(key) || pick === key ? 1 : 0, h: `<g class="${cl}" data-m="${key}" transform="translate(${f1(x)} ${f1(y)})"><g class="${moved ? "mv" : ""}" style="${moved ? `--dx:${f1(dx)}px;--dy:${f1(dy)}px` : ""}">
      ${cand.has(key) || pick === key ? `<circle r="11" class="ring" fill="none" stroke="#fff" stroke-width="2"/>` : ""}
      <circle r="12" fill="transparent"/><ellipse cx="1" cy="3.4" rx="6.2" ry="2.8" fill="#000" opacity=".5"/><circle cy="-.5" r="7.2" fill="url(#jM${k})" stroke="${JCOL[k].dark}" stroke-width=".6"/></g></g>` });
  }
  s += marbles.sort((a, b) => a.z - b.z).map(m => m.h).join("") + `</svg>`;
  return { svg: s, now };
}
