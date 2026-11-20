// بلوت روق: منطق اللعبة (المضيف يتحقق فيه، والجوالات تلمّح فيه)
// الورقة نص: الرقم + الشكل، مثل "As" "10h" "Jd"
const RANKS = ["7", "8", "9", "10", "J", "Q", "K", "A"], SUITS = ["s", "h", "d", "c"];
export const bDeck = () => SUITS.flatMap(s => RANKS.map(r => r + s));
export const bRank = c => String(c).slice(0, -1);
export const bSuit = c => String(c).slice(-1);
export const SUIT_AR = { s: "♠️ سبيت", h: "♥️ هاص", d: "♦️ ديمن", c: "♣️ شريحة" };
export const SUIT_IC = { s: "♠️", h: "♥️", d: "♦️", c: "♣️" };
// الترتيب والأبناط: الصن، والحكم (للشكل اللي حكم)
const ORD_SUN = ["7", "8", "9", "J", "Q", "K", "10", "A"], ORD_TRUMP = ["7", "8", "Q", "K", "10", "A", "9", "J"];
const AB_SUN = { A: 11, "10": 10, K: 4, Q: 3, J: 2, "9": 0, "8": 0, "7": 0 };
const AB_TRUMP = { J: 20, "9": 14, A: 11, "10": 10, K: 4, Q: 3, "8": 0, "7": 0 };
export const isTrump = (g, c) => g.mode === "hokm" && bSuit(c) === g.trump;
export const bAbnat = (g, c) => isTrump(g, c) ? AB_TRUMP[bRank(c)] : AB_SUN[bRank(c)];
const power = (g, c) => isTrump(g, c) ? 100 + ORD_TRUMP.indexOf(bRank(c)) : ORD_SUN.indexOf(bRank(c));
export const teamOf = k => k % 2;

// مين ماسك اللمّة الحين (رقم الكرسي)
export function trickWinner(g, trick) {
  if (!trick.length) return null;
  const lead = bSuit(trick[0].c);
  let best = trick[0];
  for (const t of trick.slice(1)) {
    const tb = isTrump(g, best.c), tt = isTrump(g, t.c);
    if (tt && !tb) best = t;
    else if (tt === tb && (tt || bSuit(t.c) === lead) && power(g, t.c) > power(g, best.c)) best = t;
  }
  return best.k;
}
// الأوراق اللي يحق لك تلعبها
export function legal(g, k, hand) {
  const tr = g.trick || [];
  if (!tr.length) return [...hand];
  const lead = bSuit(tr[0].c), same = hand.filter(c => bSuit(c) === lead);
  const topTrump = Math.max(-1, ...tr.filter(t => isTrump(g, t.c)).map(t => power(g, t.c)));
  if (same.length) {
    // الحكم انلعب: لازم تكبّر لو تقدر
    if (g.mode === "hokm" && lead === g.trump) { const up = same.filter(c => power(g, c) > topTrump); return up.length ? up : same; }
    return same;
  }
  if (g.mode !== "hokm") return [...hand];
  const trumps = hand.filter(c => isTrump(g, c));
  if (!trumps.length) return [...hand];
  // خويك ماسكها: العب اللي تبي
  if (teamOf(trickWinner(g, tr)) === teamOf(k)) return [...hand];
  const up = trumps.filter(c => power(g, c) > topTrump);
  return up.length ? up : (topTrump >= 0 ? [...hand] : trumps);
}
// المشاريع: سرا (٣ ورا بعض)، خمسين (٤)، مية (٥ أو ٤ من نفس الصورة)، أربعمية (٤ إكك بالصن)، بلوت (شايب وبنت الحكم)
const SEQ = ["7", "8", "9", "10", "J", "Q", "K", "A"];
export function projects(g, hand) {
  const out = [];
  for (const s of SUITS) {
    const idx = hand.filter(c => bSuit(c) === s).map(c => SEQ.indexOf(bRank(c))).sort((a, b) => a - b);
    let run = 1;
    for (let i = 1; i <= idx.length; i++) {
      if (i < idx.length && idx[i] === idx[i - 1] + 1) { run++; continue; }
      if (run >= 3) out.push(run >= 5 ? { t: "100", v: 100, hi: idx[i - 1] } : run === 4 ? { t: "50", v: 50, hi: idx[i - 1] } : { t: "sira", v: 20, hi: idx[i - 1] });
      run = 1;
    }
  }
  for (const r of ["A", "K", "Q", "J", "10"]) {
    if (hand.filter(c => bRank(c) === r).length < 4) continue;
    if (r === "A") out.push(g.mode === "sun" ? { t: "400", v: 400, hi: 9 } : { t: "100", v: 100, hi: 9 });
    else out.push({ t: "100", v: 100, hi: SEQ.indexOf(r) });
  }
  return out;
}
export const PRJ_AR = { sira: "سرا", "50": "خمسين", "100": "مية", "400": "أربعمية", baloot: "بلوت" };
const PRJ_PTS = { sun: { sira: 4, "50": 10, "100": 20, "400": 40 }, hokm: { sira: 2, "50": 5, "100": 10, "400": 10, baloot: 2 } };
// حساب الجولة: يرجع نقاط الفريقين (٠ و ١)
export function scoreHand(g) {
  const B = teamOf(g.buyer), O = 1 - B, P = PRJ_PTS[g.mode];
  const ab = [g.ab[0], g.ab[1]];
  const prj = [0, 0]; (g.prj || []).forEach(p => prj[p.team] += P[p.t] || 0);
  let pts = [0, 0], note = "";
  if (g.won[B] === 8 || g.won[O] === 8) {
    const w = g.won[B] === 8 ? B : O; pts[w] = g.mode === "sun" ? 44 : 25; note = "كبّوت 💥";
  } else if (g.mode === "sun") { pts = ab.map(a => Math.round(a / 5)); }
  else { pts[O] = Math.round(ab[O] / 10); pts[B] = 16 - pts[O]; }
  pts = [pts[0] + prj[0], pts[1] + prj[1]];
  // المشتري لازم يجيب أكثر من الخصم، وإلا ينقهر وتروح كلها للخصم
  if (!note && pts[B] <= pts[O]) { pts[O] += pts[B]; pts[B] = 0; note = "انقهر المشتري 😬"; }
  return { pts, note };
}
