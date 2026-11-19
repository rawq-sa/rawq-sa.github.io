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
export const jAbs = (s, r) => (s * SIDE + r) % TRACK;
export const jSeats = g => Object.keys(g.pos).map(Number).sort((a, b) => a - b);

function at(g, cell) {
  for (const s of jSeats(g)) { const p = g.pos[s]; for (let i = 0; i < 4; i++) if (p[i] >= 0 && p[i] < TRACK && jAbs(s, p[i]) === cell) return [s, i]; }
  return null;
}
// لو خلّصت كوراتك كلها تلعب بكورات خويك
export function jCtrl(g, s) {
  const p = (s + 2) % 4;
  return g.pos[s].every(r => r >= TRACK) && g.pos[p] ? p : s;
}
function fwd(g, s, i, k) {
  const r = g.pos[s][i]; if (r < 0) return null;
  const nr = r + k; if (nr > END) return null;
  for (let x = Math.max(r + 1, TRACK); x <= nr; x++) if (g.pos[s].includes(x)) return null; // ما تتخطى كوراتك داخل الدار
  if (nr >= TRACK) return { nr, kill: null };
  const o = at(g, jAbs(s, nr));
  if (o && jTeam(o[0]) === jTeam(s)) return null;
  return { nr, kill: o };
}
function back(g, s, i, k) {
  const r = g.pos[s][i]; if (r < 0 || r >= TRACK) return null;
  const nr = (r - k + TRACK) % TRACK;
  const o = at(g, jAbs(s, nr));
  if (o && jTeam(o[0]) === jTeam(s)) return null;
  return { nr, kill: o };
}
function out(g, s) {
  const i = g.pos[s].indexOf(-1); if (i < 0) return null;
  const o = at(g, jAbs(s, 0));
  if (o && jTeam(o[0]) === jTeam(s)) return null;
  return { i, nr: 0, kill: o };
}
const clone = g => ({ pos: Object.fromEntries(Object.entries(g.pos).map(([k, v]) => [k, [...v]])) });
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
    jSeats(g).filter(x => jTeam(x) !== jTeam(c)).forEach(x => Q.forEach(j => { const q = g.pos[x][j]; if (q >= 0 && q < TRACK) L.push({ t: "s", a: [c, i], b: [x, j] }); }));
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
  for (const t of [0, 1]) { const ss = jSeats(g).filter(s => jTeam(s) === t); if (ss.length && ss.every(s => g.pos[s].every(r => r >= TRACK))) return t; }
  return null;
}
export const jHomeCount = (g, s) => (g.pos[s] || []).filter(r => r >= TRACK).length;

/* ================= الرسم ================= */
const CX = 210, CY = 210, R = 176;
const ang = (cell, rot) => Math.PI / 2 + ((cell - rot * SIDE) / TRACK) * Math.PI * 2;
const pt = (a, r) => [CX + r * Math.cos(a), CY + r * Math.sin(a)];
export function jSpot(s, i, r, rot) {
  if (r < 0) { const [x, y] = pt(ang(s * SIDE + 5, rot), R - 50); return [x + (i % 2 ? 9 : -9), y + (i < 2 ? -9 : 9)]; }
  if (r >= TRACK) return pt(ang(s * SIDE - 1, rot), R - 23 * (r - TRACK + 1));
  return pt(ang(jAbs(s, r), rot), R);
}
const f1 = n => n.toFixed(1);
const SUITP = {
  h: "M0 6C-8-1-6-8 0-3.6C6-8 8-1 0 6Z",
  d: "M0-7L5.2 0L0 7L-5.2 0Z",
  s: "M0-7C7-1 4.5 5 0 2C-4.5 5-7-1 0-7ZM0 1L2.4 7H-2.4Z",
  c: "M0-6.8a3.2 3.2 0 1 1 0 .01ZM-3.6-.6a3.2 3.2 0 1 1 0 .01ZM3.6-.6a3.2 3.2 0 1 1 0 .01ZM0 0L2.4 7H-2.4Z"
};
const SUITC = { h: "#d8283f", d: "#d8283f", s: "#1b1830", c: "#1b1830" };
export function jCardSVG(c, attrs = "") {
  if (!c) return `<svg viewBox="0 0 60 84" ${attrs}><rect x="1" y="1" width="58" height="82" rx="7" fill="#3a1d5e" stroke="#f7d77a" stroke-width="1.5"/><rect x="6" y="6" width="48" height="72" rx="4" fill="none" stroke="#f7d77a" stroke-opacity=".5"/><text x="30" y="50" text-anchor="middle" font-family="Lalezar,Tahoma,sans-serif" font-size="20" fill="#f7d77a">روق</text></svg>`;
  const r = jRank(c), su = jSuit(c), col = SUITC[su], p = SUITP[su], face = /[JQK]/.test(r);
  const mid = face
    ? `<rect x="13" y="22" width="34" height="40" rx="4" fill="${col}" fill-opacity=".08" stroke="#f7d77a" stroke-width="1.4"/><text x="30" y="52" text-anchor="middle" font-family="Georgia,serif" font-style="italic" font-weight="700" font-size="26" fill="${col}">${r}</text>`
    : `<path d="${p}" transform="translate(30 43) scale(2.3)" fill="${col}"/>`;
  return `<svg viewBox="0 0 60 84" direction="ltr" style="direction:ltr" ${attrs}><rect x="1" y="1" width="58" height="82" rx="7" fill="#fffdf6" stroke="#e2d7bd"/>
    <text x="6" y="17" font-family="Georgia,serif" font-weight="700" font-size="${r === "10" ? 12 : 15}" fill="${col}">${r}</text><path d="${p}" transform="translate(10.5 25) scale(.75)" fill="${col}"/>
    ${mid}
    <g transform="rotate(180 30 42)"><text x="6" y="17" font-family="Georgia,serif" font-weight="700" font-size="${r === "10" ? 12 : 15}" fill="${col}">${r}</text><path d="${p}" transform="translate(10.5 25) scale(.75)" fill="${col}"/></g></svg>`;
}
// اللوح: rot = مقعدي (عشان أكون تحت)، cand = الكورات اللي تنختار، pick = المختارة، prev = مواقع قبل للحركة
export function jBoard(g, { rot = 0, cand = new Set(), pick = null, prev = {}, top = null, turnSeat = null } = {}) {
  const seats = jSeats(g), now = {};
  let s = `<svg class="jsvg" viewBox="0 0 420 420" direction="ltr" style="direction:ltr" role="img" aria-label="لوح الجكارو">
  <defs>
    <radialGradient id="jWood" cx="50%" cy="45%" r="60%"><stop offset="0" stop-color="#8a5530"/><stop offset=".7" stop-color="#5e341a"/><stop offset="1" stop-color="#3a1f0e"/></radialGradient>
    <radialGradient id="jFelt" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="#2e1f55"/><stop offset="1" stop-color="#160f2c"/></radialGradient>
    <radialGradient id="jHole" cx="50%" cy="35%" r="65%"><stop offset="0" stop-color="#1a0c04"/><stop offset="1" stop-color="#3b2010"/></radialGradient>
    ${JCOL.map((c, k) => `<radialGradient id="jM${k}" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".25" stop-color="${c.fill}"/><stop offset="1" stop-color="${c.dark}"/></radialGradient>`).join("")}
    <pattern id="jGrain" width="40" height="8" patternUnits="userSpaceOnUse"><path d="M0 4 Q10 1 20 4 T40 4" fill="none" stroke="#2a1508" stroke-opacity=".18" stroke-width="1"/></pattern>
  </defs>
  <circle cx="${CX}" cy="${CY}" r="207" fill="url(#jWood)"/><circle cx="${CX}" cy="${CY}" r="207" fill="url(#jGrain)"/>
  <circle cx="${CX}" cy="${CY}" r="205" fill="none" stroke="#f7d77a" stroke-width="2.2" opacity=".85"/>
  <circle cx="${CX}" cy="${CY}" r="${R + 14}" fill="none" stroke="#2a1508" stroke-opacity=".35" stroke-width="1"/>
  <circle cx="${CX}" cy="${CY}" r="${R - 14}" fill="url(#jFelt)" stroke="#f7d77a" stroke-opacity=".35" stroke-width="1"/>`;
  // ظل الدور على قسم اللاعب
  if (turnSeat != null) { const a0 = ang(turnSeat * SIDE - 2, rot), a1 = ang(turnSeat * SIDE + SIDE - 2, rot), [x0, y0] = pt(a0, R), [x1, y1] = pt(a1, R); s += `<path d="M${f1(x0)} ${f1(y0)} A${R} ${R} 0 0 1 ${f1(x1)} ${f1(y1)}" fill="none" stroke="${JCOL[turnSeat].fill}" stroke-opacity=".28" stroke-width="20" stroke-linecap="round"/>`; }
  for (let c = 0; c < TRACK; c++) {
    const [x, y] = pt(ang(c, rot), R), st = c % SIDE === 0 ? c / SIDE : -1;
    s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="5" fill="url(#jHole)"/>`;
    if (st >= 0 && g.pos[st]) s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="9" fill="none" stroke="${JCOL[st].fill}" stroke-width="2"/>`;
  }
  for (const k of seats) {
    const col = JCOL[k].fill;
    for (let h = 0; h < 4; h++) { const [x, y] = jSpot(k, 0, TRACK + h, rot); s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="7" fill="${col}" fill-opacity=".14" stroke="${col}" stroke-opacity=".7" stroke-width="1.3"/>`; }
    const [bx, by] = pt(ang(k * SIDE + 5, rot), R - 50);
    s += `<rect x="${f1(bx - 19)}" y="${f1(by - 19)}" width="38" height="38" rx="11" fill="${col}" fill-opacity=".13" stroke="${col}" stroke-opacity=".55"/>`;
    for (let i = 0; i < 4; i++) { const [x, y] = jSpot(k, i, -1, rot); s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="5" fill="url(#jHole)"/>`; }
  }
  // الورقة اللي انلعبت آخر شي بالنص
  s += top ? `<g transform="translate(${CX - 24} ${CY - 34}) rotate(-6 24 34)">${jCardSVG(top, 'width="48" height="67"')}</g>` : `<text x="${CX}" y="${CY + 8}" text-anchor="middle" font-family="Lalezar,Tahoma,sans-serif" font-size="26" fill="#f7d77a" fill-opacity=".7">جكارو</text>`;
  const marbles = [];
  for (const k of seats) for (let i = 0; i < 4; i++) {
    const key = k + ":" + i, r = g.pos[k][i], [x, y] = jSpot(k, i, r, rot), p = prev[key];
    now[key] = [x, y];
    const dx = p ? p[0] - x : 0, dy = p ? p[1] - y : 0, moved = Math.abs(dx) + Math.abs(dy) > .5;
    const cl = `jm${cand.has(key) ? " can" : ""}${pick === key ? " pick" : ""}`;
    marbles.push({ z: cand.has(key) || pick === key ? 1 : 0, h: `<g class="${cl}" data-m="${key}" transform="translate(${f1(x)} ${f1(y)})"><g class="${moved ? "mv" : ""}" style="${moved ? `--dx:${f1(dx)}px;--dy:${f1(dy)}px` : ""}">
      ${cand.has(key) || pick === key ? `<circle r="12" class="ring" fill="none" stroke="#fff" stroke-width="2"/>` : ""}
      <circle r="13" fill="transparent"/><ellipse cx="1" cy="3" rx="6.5" ry="4.6" fill="#000" opacity=".35"/><circle r="6.8" fill="url(#jM${k})" stroke="${JCOL[k].dark}" stroke-width=".8"/></g></g>` });
  }
  s += marbles.sort((a, b) => a.z - b.z).map(m => m.h).join("") + `</svg>`;
  return { svg: s, now };
}
