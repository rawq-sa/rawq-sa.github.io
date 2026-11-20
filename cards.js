// أوراق اللعب الكلاسيكية (جكارو + بلوت): أشكال مرسومة يدويًا ومتمركزة على (0,0)
const SU = {
  h: "M0 10.5C-2.4 7.6-12 1.8-12-4.2-12-8.6-8.8-11.2-5.4-11.2-2.9-11.2-1-9.7 0-7.6 1-9.7 2.9-11.2 5.4-11.2 8.8-11.2 12-8.6 12-4.2 12 1.8 2.4 7.6 0 10.5Z",
  d: "M0-12C2.2-7.4 5.4-3.4 9 0 5.4 3.4 2.2 7.4 0 12-2.2 7.4-5.4 3.4-9 0-5.4-3.4-2.2-7.4 0-12Z",
  s: "M0-12C-2.6-8.4-12-2.8-12 2.8-12 6.6-9.2 8.8-6 8.8-3.8 8.8-2 7.8-1 6.2-1.2 8.6-2.4 10.6-4.6 12H4.6C2.4 10.6 1.2 8.6 1 6.2 2 7.8 3.8 8.8 6 8.8 9.2 8.8 12 6.6 12 2.8 12-2.8 2.6-8.4 0-12Z",
  c: "M0-12A5.3 5.3 0 0 0-4.1-3.3 5.3 5.3 0 1 0-1.2 5.8C-1.4 8.6-2.6 10.6-4.6 12H4.6C2.6 10.6 1.4 8.6 1.2 5.8A5.3 5.3 0 1 0 4.1-3.3 5.3 5.3 0 0 0 0-12Z"
};
const PIPS = { 2: [[0, -1], [0, 1]], 3: [[0, -1], [0, 0], [0, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
  6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]], 7: [[-1, -1], [1, -1], [0, -.5], [-1, 0], [1, 0], [-1, 1], [1, 1]],
  8: [[-1, -1], [1, -1], [0, -.5], [-1, 0], [1, 0], [0, .5], [-1, 1], [1, 1]], 9: [[-1, -1], [1, -1], [-1, -.33], [1, -.33], [0, 0], [-1, .33], [1, .33], [-1, 1], [1, 1]],
  10: [[-1, -1], [1, -1], [0, -.67], [-1, -.33], [1, -.33], [-1, .33], [1, .33], [0, .67], [-1, 1], [1, 1]] };
const STAR = "M0-13L3.7-8.9 9.2-9.2 8.9-3.7 13 0 8.9 3.7 9.2 9.2 3.7 8.9 0 13-3.7 8.9-9.2 9.2-8.9 3.7-13 0-8.9-3.7-9.2-9.2-3.7-8.9Z";
let n = 0;
const pips = (r, sym) => PIPS[r].map(([dx, dy]) => `<g transform="translate(${30 + dx * 9.5} ${45 + dy * 21})${dy > 0 ? " rotate(180)" : ""} scale(.46)">${sym}</g>`).join("");
const wrap = (attrs, label, body) => `<svg ${attrs} viewBox="0 0 60 90" direction="ltr" style="direction:ltr" aria-label="${label}">${body}</svg>`;
export const SUIT_PATH = SU;
// جكارو: عاجي بلمسة الجوكر (معيّنات ذهبية خفيفة، أسود وذهبي)
export function jakFace(r, s, attrs = "") {
  const i = "jf" + (++n), red = s === "h" || s === "d", col = red ? "#b3122a" : "#121214";
  const sym = `<path d="${SU[s]}" fill="url(#${i}f)" stroke="#c9a24a" stroke-width=".7"/>`;
  const idx = `<text x="0" y="0" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-weight="700" font-size="${r === "10" ? 10 : 12}" fill="${col}">${r}</text><g transform="translate(0 7.5) scale(.3)">${sym}</g>`;
  const art = { K: "jK", Q: "jQ", J: "jJ" }[r];
  const mid = art ? `<clipPath id="${i}c"><rect x="12" y="13" width="36" height="64" rx="3"/></clipPath><rect x="12" y="13" width="36" height="64" rx="3" fill="#111"/><image href="img/cards/${art}.webp?v=1" x="-2" y="13" width="64" height="64" preserveAspectRatio="xMidYMid slice" clip-path="url(#${i}c)"/><rect x="12" y="13" width="36" height="64" rx="3" fill="none" stroke="#c9a24a" stroke-width="1.4"/>`
    : r === "A" ? `<path d="M30 25L44 45 30 65 16 45Z" fill="#111" stroke="#c9a24a" stroke-width="1.2"/><path d="M30 29L41 45 30 61 19 45Z" fill="none" stroke="#c9a24a" stroke-opacity=".55" stroke-width=".5"/><g transform="translate(30 45) scale(.62)"><path d="${SU[s]}" fill="${red ? "#e0283f" : "#f1d27a"}"/></g>`
    : pips(r, sym);
  return wrap(attrs, r, `<defs><linearGradient id="${i}f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${red ? "#e0283f" : "#3a3a40"}"/><stop offset="1" stop-color="${col}"/></linearGradient><pattern id="${i}p" width="10" height="14" patternUnits="userSpaceOnUse"><path d="M5 0L10 7 5 14 0 7Z" fill="none" stroke="#c9a24a" stroke-opacity=".16" stroke-width=".5"/></pattern></defs>
<rect x=".5" y=".5" width="59" height="89" rx="6" fill="#fffcf3" stroke="#111" stroke-width="1"/><rect x="2.6" y="2.6" width="54.8" height="84.8" rx="4.4" fill="url(#${i}p)" stroke="#c9a24a" stroke-width=".9"/>
${mid}<g transform="translate(8 12)">${idx}</g><g transform="translate(52 78) rotate(180)">${idx}</g>`);
}
// بلوت: كريمي نجدي، قوس للصور، نجمة ثمانية للإكة، الأسود ← أخضر غامق
export function balFace(r, s, attrs = "") {
  const i = "bf" + (++n), red = s === "h" || s === "d", col = red ? "#a8162b" : "#0d4a33";
  const sym = `<path d="${SU[s]}" fill="${col}"/><path d="${SU[s]}" transform="scale(.55)" fill="none" stroke="#f3e2b0" stroke-opacity=".55" stroke-width="1.2"/>`;
  const idx = `<text x="0" y="1" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-weight="700" font-size="${r === "10" ? 10 : 12}" fill="${col}">${r}</text><g transform="translate(0 9) scale(.3)">${sym}</g>`;
  const arch = "M13 77V28Q13 15 30 12 47 15 47 28V77Z", art = { K: "bK", Q: "bQ", J: "bJ" }[r];
  const mid = art ? `<clipPath id="${i}c"><path d="${arch}"/></clipPath><image href="img/cards/${art}.webp?v=1" x="-2" y="12" width="64" height="65" preserveAspectRatio="xMidYMid slice" clip-path="url(#${i}c)"/><path d="${arch}" fill="none" stroke="#b8923e" stroke-width="1.6"/>`
    : r === "A" ? `<g transform="translate(30 45)"><path d="${STAR}" transform="scale(1.35)" fill="#0d4a33" stroke="#c9a24a" stroke-width=".6"/><path d="${STAR}" transform="scale(1.12)" fill="none" stroke="#c9a24a" stroke-opacity=".6" stroke-width=".5"/><g transform="scale(.6)"><path d="${SU[s]}" fill="${red ? "#e23a4e" : "#f1d27a"}"/></g></g>`
    : pips(r, sym);
  const corners = [[52, 8], [8, 82]].map(([x, y]) => `<path d="${STAR}" transform="translate(${x} ${y}) scale(.17)" fill="#c9a24a" opacity=".8"/>`).join("");
  return wrap(attrs, r, `<defs><linearGradient id="${i}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbf3df"/><stop offset="1" stop-color="#f0e2c0"/></linearGradient></defs>
<rect x=".5" y=".5" width="59" height="89" rx="6" fill="url(#${i}g)" stroke="#0d4a33" stroke-width="1.6"/><rect x="3" y="3" width="54" height="84" rx="4" fill="none" stroke="#b8923e" stroke-width=".6" stroke-dasharray="2 1.2"/>
${mid}${corners}<g transform="translate(8 12)">${idx}</g><g transform="translate(52 78) rotate(180)">${idx}</g>`);
}
export const balBack = (attrs = "") => { const i = "bb" + (++n); return wrap(attrs, "", `<defs><clipPath id="${i}"><rect width="60" height="90" rx="6"/></clipPath></defs><rect width="60" height="90" rx="6" fill="#0d4a33"/><image href="img/cards/back_baloot.webp?v=1" width="60" height="90" clip-path="url(#${i})" preserveAspectRatio="xMidYMid slice"/>`); };
// الورق الكلاسيكي (الأساسي للبلوت): أبيض، أحمر وأسود، صور الشايب والبنت والولد التقليدية
export function classicFace(r, s, attrs = "") {
  const i = "cf" + (++n), red = s === "h" || s === "d", col = red ? "#d0202f" : "#16161a";
  const sym = `<path d="${SU[s]}" fill="${col}"/>`;
  const idx = `<text x="0" y="0" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-weight="700" font-size="${r === "10" ? 10 : 12}" fill="${col}">${r}</text><g transform="translate(0 7.5) scale(.3)">${sym}</g>`;
  const art = { K: "cK", Q: "cQ", J: "cJ" }[r];
  const mid = art ? `<image href="img/cards/${art}.webp?v=1" x="13" y="12" width="34" height="66" preserveAspectRatio="none"/><rect x="13" y="12" width="34" height="66" fill="none" stroke="${col}" stroke-width=".8"/>`
    : r === "A" ? `<g transform="translate(30 45) scale(.95)">${sym}</g>` : pips(r, sym);
  return wrap(attrs, r, `<rect x=".5" y=".5" width="59" height="89" rx="5" fill="#fff" stroke="#cfc8b8"/>${mid}<g transform="translate(7.5 12)">${idx}</g><g transform="translate(52.5 78) rotate(180)">${idx}</g>`);
}
