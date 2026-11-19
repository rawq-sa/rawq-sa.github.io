// جكارو روق: منطق اللعبة (المضيف يتحقق فيه، والجوالات تلمّح فيه) + رسم اللوح والأوراق
// موقع الكورة نسبةً لصاحبها: -1 بالبيت، 0..75 على المسار (0 = خانة الطلعة)، 76..79 داخل الدار
export const SIDE = 19, TRACK = 76, END = 79;
export const JCOL = [
  { fill: "#d42a3c", light: "#ff8a8a", dark: "#6e0c18", name: "الأحمر" },
  { fill: "#2266d8", light: "#8ec0ff", dark: "#0b2a6b", name: "الأزرق" },
  { fill: "#f0b21c", light: "#ffe38a", dark: "#8a5a00", name: "الأصفر" },
  { fill: "#1f9a5a", light: "#86e3ad", dark: "#0a4a2a", name: "الأخضر" }
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
// اللوح الثماني الخشب: ٤ أذرع على الأقطار، الخانات على شبكة مرتبة (صفين بكل ذراع + ٣ خانات بالرأس)
// كل ذراع: الرأس (خانة الطلعة) → ينزل للنص على صف → يلف للذراع اللي بعده ويطلع لرأسه… ١٩ خانة لكل لاعب
// الدار: ٤ خانات بنص الذراع تحت خانة الطلعة مباشرة
const CX = 220, CY = 220, U = 19;
const armAng = d => Math.PI / 4 + d * Math.PI / 2; // تحت-يمين، تحت-يسار، فوق-يسار، فوق-يمين
const P2 = (r, off, a) => [CX + r * Math.cos(a) - off * Math.sin(a), CY + r * Math.sin(a) + off * Math.cos(a)];
const CELLS = (() => {
  const out = [];
  for (let d = 0; d < 4; d++) {
    const a = armAng(d), b = armAng(d + 1);
    out.push(P2(10 * U, 0, a), P2(10 * U, U, a));
    for (let k = 9; k >= 2; k--) out.push(P2(k * U, U, a));
    for (let k = 2; k <= 9; k++) out.push(P2(k * U, -U, b));
    out.push(P2(10 * U, -U, b));
  }
  return out;
})();
const rotIdx = (cell, rot) => ((cell - rot * SIDE) % TRACK + TRACK) % TRACK;
const baseC = d => P2(158, 0, armAng(d) + Math.PI / 4);
export function jSpot(s, i, r, rot) {
  const d = ((s - rot) % 4 + 4) % 4;
  if (r < 0) { const [bx, by] = baseC(d); return [bx + (i % 2 ? 9.5 : -9.5), by + (i < 2 ? -9.5 : 9.5)]; }
  if (r >= TRACK) return P2((9 - (r - TRACK)) * U, 0, armAng(d));
  return CELLS[rotIdx(jAbs(s, r), rot)];
}
const f1 = n => n.toFixed(1);
// أوراق لعب كلاسيك: أبيض، الرقم بالزاوية، الشكل كبير بالنص (♥♦ أحمر، ♠♣ أسود)
const SUIT = { h: "M0 6C-8-1-6-8 0-3.6C6-8 8-1 0 6Z", d: "M0-7L5.2 0L0 7L-5.2 0Z", s: "M0-7C7-1 4.5 5 0 2C-4.5 5-7-1 0-7ZM0 1L2.4 7H-2.4Z", c: "M0-6.8a3.2 3.2 0 1 1 0 .01ZM-3.6-.6a3.2 3.2 0 1 1 0 .01ZM3.6-.6a3.2 3.2 0 1 1 0 .01ZM0 0L2.4 7H-2.4Z" };
let cardN = 0;
export function jCardSVG(c, attrs = "") {
  const id = "jc" + (++cardN);
  if (!c) return `<svg ${attrs} viewBox="0 0 60 90" direction="ltr" style="direction:ltr" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2a2a2e"/><stop offset="1" stop-color="#0b0b0d"/></linearGradient></defs>
    <rect x=".5" y=".5" width="59" height="89" rx="6" fill="url(#${id})" stroke="#e6c06a" stroke-width="1"/><rect x="4.5" y="4.5" width="51" height="81" rx="4" fill="none" stroke="#e6c06a" stroke-opacity=".5"/>
    <text x="30" y="45" text-anchor="middle" dominant-baseline="central" font-family="RawqRuqaa,Amiri,serif" font-weight="700" font-size="20" fill="#e6c06a">روق</text></svg>`;
  const R = jRank(c), S = jSuit(c), red = S === "h" || S === "d", col = red ? "#d0202f" : "#16161a";
  const face = R === "J" || R === "Q" || R === "K", ten = R === "10";
  const corner = (x, y, rot) => `<g transform="translate(${x} ${y}) rotate(${rot})"><text x="0" y="0" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-weight="700" font-size="${ten ? 11 : 13}" fill="${col}" letter-spacing="${ten ? -1 : 0}">${R}</text><path d="${SUIT[S]}" transform="translate(0 8) scale(.62)" fill="${col}"/></g>`;
  const mid = face
    ? `<rect x="13" y="20" width="34" height="50" rx="3" fill="${red ? "#fff1f1" : "#f1f1f5"}" stroke="${col}" stroke-opacity=".35"/><text x="30" y="46" text-anchor="middle" dominant-baseline="central" font-family="Georgia,'Times New Roman',serif" font-weight="700" font-size="30" fill="${col}">${R}</text><path d="${SUIT[S]}" transform="translate(30 62) scale(.7)" fill="${col}"/><path d="M22 27l3 3 5-5 5 5 3-3v5H22Z" fill="#e0a92a"/>`
    : `<path d="${SUIT[S]}" transform="translate(30 47) scale(${R === "A" ? 2.6 : 2.1})" fill="${col}"/>`;
  return `<svg ${attrs} viewBox="0 0 60 90" direction="ltr" style="direction:ltr" aria-label="${R}"><rect x=".5" y=".5" width="59" height="89" rx="6" fill="#fffdf8" stroke="#d8d2c4"/>${mid}${corner(9, 14, 0)}${corner(51, 76, 180)}</svg>`;
}
// اللوح: rot = مقعدي، cand = الكورات اللي تنختار، pick = المختارة، prev = مواقع قبل للحركة
// dests = وين بتوصل الكورة [[مقعد، موقع]]، left = مقعد اللي نوريه كم باقي له للدار
const D = P => "M" + P.map(p => f1(p[0]) + " " + f1(p[1])).join("L") + "Z";
const OCT = (r, cx = CX, cy = CY) => Array.from({ length: 8 }, (_, k) => { const a = Math.PI / 8 + k * Math.PI / 4, q = r / Math.cos(Math.PI / 8); return [cx + q * Math.cos(a), cy + q * Math.sin(a)]; });
export function jBoard(g, { rot = 0, cand = new Set(), pick = null, prev = {}, turnSeat = null, dests = [], left = null } = {}) {
  const seats = jSeats(g), now = {}, AR = n => String(n).replace(/\d/g, d => "٠١٢٣٤٥٦٧٨٩"[d]);
  const GOLD = "#e6c06a";
  let s = `<svg class="jsvg" viewBox="0 0 440 440" direction="ltr" style="direction:ltr" role="img" aria-label="لوح الجكارو">
  <defs>
    <linearGradient id="jBlk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9a5f30"/><stop offset=".5" stop-color="#7a4520"/><stop offset="1" stop-color="#4f2a10"/></linearGradient>
    <pattern id="jGrain" width="14" height="160" patternUnits="userSpaceOnUse"><path d="M4 0 Q7 40 3.5 80 T4.5 160" fill="none" stroke="#2a1205" stroke-opacity=".22" stroke-width="1.2"/><path d="M10 0 Q12 50 9 95 T10.5 160" fill="none" stroke="#c48a55" stroke-opacity=".12"/></pattern>
    <radialGradient id="jHole" cx="50%" cy="35%" r="62%"><stop offset="0" stop-color="#1e0d03"/><stop offset=".78" stop-color="#3a1d09"/><stop offset="1" stop-color="#b47a46"/></radialGradient>
    <linearGradient id="jGold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff1b8"/><stop offset=".45" stop-color="#e6b54a"/><stop offset="1" stop-color="#a8761c"/></linearGradient>
    ${JCOL.map((c, k) => `<radialGradient id="jM${k}" cx="36%" cy="30%" r="80%"><stop offset="0" stop-color="${c.light}"/><stop offset=".38" stop-color="${c.fill}"/><stop offset=".88" stop-color="${c.dark}"/><stop offset="1" stop-color="${c.dark}"/></radialGradient>`).join("")}
  </defs>
  <path d="${D(OCT(212, CX, CY + 5))}" fill="#000" opacity=".45"/>
  <path d="${D(OCT(212))}" fill="url(#jBlk)"/><path d="${D(OCT(212))}" fill="url(#jGrain)"/>
  <path d="${D(OCT(205))}" fill="none" stroke="${GOLD}" stroke-opacity=".55" stroke-width="1.2"/>`;
  // دور مين: توهج ذهبي خفيف على ذراعه
  if (turnSeat != null) { const d0 = ((turnSeat - rot) % 4 + 4) % 4, a = armAng(d0), p0 = P2(2 * U, 0, a), p1 = P2(10 * U, 0, a); s += `<line x1="${f1(p0[0])}" y1="${f1(p0[1])}" x2="${f1(p1[0])}" y2="${f1(p1[1])}" stroke="#ffe7a3" stroke-opacity=".14" stroke-width="66" stroke-linecap="round"/>`; }
  // خط المسار: خيط ذهبي خفيف يوصل الخانات بالترتيب عشان الطريق يبان
  s += `<path d="${D(CELLS)}" fill="none" stroke="${GOLD}" stroke-opacity=".28" stroke-width="1.4" stroke-linejoin="round"/>`;
  for (let d = 0; d < 4; d++) {
    const a = armAng(d), t0 = P2(10 * U, 0, a), h1 = P2(6 * U, 0, a);
    // الدار: خط ذهبي من خانة الطلعة لآخر الدار
    s += `<line x1="${f1(t0[0])}" y1="${f1(t0[1])}" x2="${f1(h1[0])}" y2="${f1(h1[1])}" stroke="${GOLD}" stroke-opacity=".5" stroke-width="1.4"/>`;
    for (let h = 0; h < 4; h++) { const [x, y] = P2((9 - h) * U, 0, a); s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="5.6" fill="url(#jHole)" stroke="${GOLD}" stroke-opacity=".75" stroke-width="1"/>`; }
    const [bx, by] = baseC(d), ba = (armAng(d) + Math.PI / 4) * 180 / Math.PI;
    s += `<rect x="${f1(bx - 21)}" y="${f1(by - 21)}" width="42" height="42" rx="6" fill="none" stroke="${GOLD}" stroke-width="1.4"/>`;
    for (let i = 0; i < 4; i++) s += `<circle cx="${f1(bx + (i % 2 ? 9.5 : -9.5))}" cy="${f1(by + (i < 2 ? -9.5 : 9.5))}" r="5.3" fill="url(#jHole)"/>`;
  }
  CELLS.forEach(([x, y]) => s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="5.3" fill="url(#jHole)"/>`);
  // خانة الطلعة: حلقة ذهبية
  for (let d = 0; d < 4; d++) { const [x, y] = CELLS[d * SIDE]; s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="9.6" fill="none" stroke="${GOLD}" stroke-width="1.8"/>`; }
  // النص: ثماني أسود وروق ذهبي
  s += `<path d="${D(OCT(27))}" fill="#000" stroke="url(#jGold)" stroke-width="2.2"/><path d="${D(OCT(23))}" fill="none" stroke="${GOLD}" stroke-opacity=".35"/>
    <text x="${CX}" y="${CY}" text-anchor="middle" dominant-baseline="central" font-family="RawqRuqaa,Amiri,Lalezar,serif" font-weight="700" font-size="23" fill="url(#jGold)">روق</text>`;
  // وين بتوصل: حلقة ذهبية متقطعة
  for (const [ds, dr] of dests) { const [x, y] = jSpot(ds, 0, dr, rot); s += `<circle class="jdest" cx="${f1(x)}" cy="${f1(y)}" r="9" fill="#ffe7a3" fill-opacity=".18" stroke="#ffe7a3" stroke-width="2" stroke-dasharray="3 2.4"/>`; }
  const marbles = [];
  for (const k of seats) for (let i = 0; i < 4; i++) {
    const key = k + ":" + i, r = g.pos[k][i], [x, y] = jSpot(k, i, r, rot), p = prev[key];
    now[key] = [x, y];
    const dx = p ? p[0] - x : 0, dy = p ? p[1] - y : 0, moved = Math.abs(dx) + Math.abs(dy) > .5;
    const cl = `jm${cand.has(key) ? " can" : ""}${pick === key ? " pick" : ""}`;
    // كم باقي للدار (لكوراتي اللي على المسار)
    const rem = k === left && r >= 0 && r < TRACK ? TRACK - r : 0;
    const badge = rem ? `<g transform="translate(0 -13.5)"><rect x="-8.5" y="-6" width="17" height="11" rx="5.5" fill="#000" fill-opacity=".82" stroke="${GOLD}" stroke-width=".8"/><text y="2.6" text-anchor="middle" font-family="Tajawal,system-ui,sans-serif" font-weight="800" font-size="8.5" fill="#ffe7a3">${AR(rem)}</text></g>` : "";
    marbles.push({ z: cand.has(key) || pick === key ? 2 : rem ? 1 : 0, h: `<g class="${cl}" data-m="${key}" transform="translate(${f1(x)} ${f1(y)})"><g class="${moved ? "mv" : ""}" style="${moved ? `--dx:${f1(dx)}px;--dy:${f1(dy)}px` : ""}">
      ${cand.has(key) || pick === key ? `<circle r="10.5" class="ring" fill="none" stroke="#fff" stroke-width="2"/>` : ""}
      <circle r="12" fill="transparent"/><ellipse cx="1" cy="3.2" rx="5.6" ry="2.5" fill="#000" opacity=".5"/><circle cy="-.5" r="6.6" fill="url(#jM${k})"/><ellipse cx="-2.2" cy="-3.2" rx="2.2" ry="1.4" fill="#fff" opacity=".85" transform="rotate(-30 -2.2 -3.2)"/>${badge}</g></g>` });
  }
  s += marbles.sort((a, b) => a.z - b.z).map(m => m.h).join("") + `</svg>`;
  return { svg: s, now };
}
