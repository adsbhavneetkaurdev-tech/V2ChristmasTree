import { ctx2d, makeCanvas } from "./math";

/** A partner logo to show on a gift box. `image` is null when the file is missing. */
export interface PartnerGift {
  image: HTMLImageElement | null;
  name: string;
}

export interface GiftSpec {
  cx: number;
  bottom: number;
  w: number;
  h: number;
  paper: [string, string, string]; // light, base, dark
  ribbon: string;
  ribbonDark: string;
}

export interface GiftSprite {
  canvas: HTMLCanvasElement;
  x: number;
  y: number;
  w: number;
  h: number;
  bottom: number;
}

/** Horizontal centre of the tree, for perspective (side faces turn toward the centre). */
const CENTRE_X = 960;

/**
 * Five presents under the tree, in logical 1920×1080 units. The group fits within
 * the tree's base (x 592–1328): tallest box front and centre, mid boxes behind it,
 * outer boxes furthest back. Front boxes sit lower and overlap the ones behind.
 */
export const GIFT_LAYOUT: GiftSpec[] = [
  { cx: 676, bottom: 994, w: 116, h: 96, paper: ["#b8404a", "#8e1f2a", "#561018"], ribbon: "#f0cf86", ribbonDark: "#a87d32" },
  { cx: 796, bottom: 1010, w: 140, h: 118, paper: ["#2f7356", "#1d4d3a", "#0d281d"], ribbon: "#f4e4bc", ribbonDark: "#b3a070" },
  { cx: 960, bottom: 1040, w: 212, h: 190, paper: ["#fbf5e6", "#ebdfc1", "#b9a780"], ribbon: "#a8303a", ribbonDark: "#681520" },
  { cx: 1124, bottom: 1010, w: 140, h: 118, paper: ["#ecc87a", "#c9993f", "#7f5a1c"], ribbon: "#fbf6ea", ribbonDark: "#c8bb9c" },
  { cx: 1244, bottom: 994, w: 116, h: 96, paper: ["#8a3446", "#5a1a28", "#320b15"], ribbon: "#e2b866", ribbonDark: "#93692a" },
];

type LabelMode = "opaque" | "light" | "dark";

/**
 * Decide how to present a logo: logos with their own solid background are
 * framed as-is; transparent dark logos get a light label, light ones a dark label.
 */
function analyse(img: HTMLImageElement): LabelMode {
  try {
    const c = makeCanvas(64, 64);
    const x = ctx2d(c);
    x.drawImage(img, 0, 0, 64, 64);
    const d = x.getImageData(0, 0, 64, 64).data;
    let solid = 0, lum = 0, weight = 0;
    for (let i = 0; i < d.length; i += 4) {
      const a = d[i + 3] / 255;
      if (a > 0.8) solid++;
      lum += ((0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255) * a;
      weight += a;
    }
    if (solid / (64 * 64) > 0.92) return "opaque";
    return weight > 0 && lum / weight > 0.88 ? "dark" : "light"; // only near-white logos get a dark label
  } catch {
    return "light";
  }
}

/** A soft warm glow and contact shadow on the floor beneath the whole group. */
export function renderGiftGround(px: number): GiftSprite {
  const L = GIFT_LAYOUT.reduce((m, g) => Math.min(m, g.cx - g.w / 2), Infinity) - 60;
  const R = GIFT_LAYOUT.reduce((m, g) => Math.max(m, g.cx + g.w / 2), -Infinity) + 60;
  const floor = GIFT_LAYOUT.reduce((m, g) => Math.max(m, g.bottom), 0);
  const x0 = L, y0 = floor - 70, w = R - L, h = 110;
  const canvas = makeCanvas(w * px, h * px);
  const x = ctx2d(canvas);
  x.scale(px, px);
  x.translate(-x0, -y0);
  const cx = (L + R) / 2, cy = floor - 12;
  const ellipse = (rx: number, ry: number, stops: [number, string][]) => {
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, rx);
    stops.forEach(([o, c]) => g.addColorStop(o, c));
    x.save();
    x.translate(cx, cy);
    x.scale(1, ry / rx);
    x.translate(-cx, -cy);
    x.fillStyle = g;
    x.beginPath();
    x.arc(cx, cy, rx, 0, Math.PI * 2);
    x.fill();
    x.restore();
  };
  ellipse(w / 2, 46, [[0, "rgba(255, 196, 120, 0.22)"], [0.55, "rgba(255, 180, 100, 0.08)"], [1, "rgba(255, 180, 100, 0)"]]);
  ellipse(w * 0.42, 22, [[0, "rgba(0, 0, 0, 0.55)"], [0.7, "rgba(0, 0, 0, 0.25)"], [1, "rgba(0, 0, 0, 0)"]]);
  return { canvas, x: x0, y: y0, w, h, bottom: 0 };
}

export function renderGift(spec: GiftSpec, gift: PartnerGift, px: number, serif: string): GiftSprite {
  const { w, h } = spec;
  // Perspective: boxes left of centre show their right side, right of centre their left side.
  const side = Math.sign(spec.cx - CENTRE_X) * -1; // +1 → face on the right, -1 → on the left, 0 → none
  const dx = side * w * 0.1;
  const dy = Math.min(h, w) * 0.14;
  const lidH = Math.min(h * 0.16, 26);
  const rib = Math.max(5, w * 0.045);
  const bowW = w * 0.13, bowH = w * 0.075;
  const pad = 14;

  const L = spec.cx - w / 2, R = spec.cx + w / 2, B = spec.bottom, T = B - h;
  const sx = Math.min(L, L + dx) - pad - 4;
  const sy = T - dy - bowH * 1.6 - pad;
  const sw = w + Math.abs(dx) + pad * 2 + 8;
  const sh = B + 14 - sy;
  const canvas = makeCanvas(sw * px, sh * px);
  const x = ctx2d(canvas);
  x.scale(px, px);
  x.translate(-sx, -sy);
  const [light, base, dark] = spec.paper;

  // Grounding shadow directly under this box
  x.save();
  x.translate(spec.cx, B + 1);
  x.scale(1, 0.12);
  const sh0 = x.createRadialGradient(0, 0, 2, 0, 0, w * 0.62);
  sh0.addColorStop(0, "rgba(0,0,0,0.65)");
  sh0.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = sh0;
  x.beginPath();
  x.arc(0, 0, w * 0.62, 0, Math.PI * 2);
  x.fill();
  x.restore();

  const poly = (pts: [number, number][], fill: string | CanvasGradient) => {
    x.fillStyle = fill;
    x.beginPath();
    pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b)));
    x.closePath();
    x.fill();
  };
  // Edge the side face sits on (left or right edge of the front)
  const E = side >= 0 ? R : L;

  // Side face
  if (side !== 0) poly([[E, T], [E + dx, T - dy], [E + dx, B - dy], [E, B]], dark);
  // Top face
  const top = x.createLinearGradient(0, T - dy, 0, T);
  top.addColorStop(0, light);
  top.addColorStop(1, base);
  poly([[L, T], [L + dx, T - dy], [R + dx, T - dy], [R, T]], top);
  // Front face
  const front = x.createLinearGradient(0, T, 0, B);
  front.addColorStop(0, light);
  front.addColorStop(0.35, base);
  front.addColorStop(1, dark);
  x.fillStyle = front;
  x.fillRect(L, T, w, h);
  x.save();
  x.beginPath();
  x.rect(L, T, w, h);
  x.clip();
  // Fine diagonal paper texture
  x.strokeStyle = "rgba(255,255,255,0.06)";
  x.lineWidth = 1;
  for (let k = -h; k < w; k += 8) {
    x.beginPath();
    x.moveTo(L + k, B);
    x.lineTo(L + k + h, T);
    x.stroke();
  }
  // Warm light from the tree on the upper front
  const glow = x.createRadialGradient(spec.cx, T - 30, 4, spec.cx, T - 30, h * 1.1);
  glow.addColorStop(0, "rgba(255, 200, 120, 0.2)");
  glow.addColorStop(1, "rgba(255, 200, 120, 0)");
  x.fillStyle = glow;
  x.fillRect(L, T, w, h);
  x.restore();

  // Lid, slightly proud of the box
  const lidFront = x.createLinearGradient(0, T - 2, 0, T + lidH);
  lidFront.addColorStop(0, light);
  lidFront.addColorStop(1, base);
  x.fillStyle = lidFront;
  x.fillRect(L - 2, T - 2, w + 4, lidH + 2);
  const lE = side >= 0 ? R + 2 : L - 2;
  if (side !== 0) poly([[lE, T - 2], [lE + dx, T - 2 - dy], [lE + dx, T + lidH - dy], [lE, T + lidH]], dark);
  x.fillStyle = "rgba(0,0,0,0.25)";
  x.fillRect(L - 2, T + lidH, w + 4, 2);

  // Ribbons: around the lid and across the top, leaving the front clear for the logo
  const ribGrad = (y0: number, y1: number) => {
    const g = x.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, spec.ribbon);
    g.addColorStop(1, spec.ribbonDark);
    return g;
  };
  const ry = T + lidH / 2 - rib * 0.4;
  x.fillStyle = ribGrad(ry, ry + rib * 0.8);
  x.fillRect(L - 2, ry, w + 4, rib * 0.8);
  if (side !== 0) poly([[lE, ry], [lE + dx, ry - dy], [lE + dx, ry - dy + rib * 0.8], [lE, ry + rib * 0.8]], spec.ribbonDark);
  x.fillStyle = ribGrad(T - 2, T + lidH);
  x.fillRect(spec.cx - rib / 2, T - 2, rib, lidH + 2);
  poly([[spec.cx - rib / 2, T - 2], [spec.cx - rib / 2 + dx, T - 2 - dy], [spec.cx + rib / 2 + dx, T - 2 - dy], [spec.cx + rib / 2, T - 2]], spec.ribbon);
  const my = T - 2 - dy / 2;
  poly([[L - 2 + dx / 2, my - rib * 0.3], [R + 2 + dx / 2, my - rib * 0.3], [R + 2 + dx / 2, my + rib * 0.3], [L - 2 + dx / 2, my + rib * 0.3]], spec.ribbon);

  // Small, refined bow
  const bx = spec.cx + dx / 2, by = my - 1;
  x.lineWidth = 0.8;
  x.strokeStyle = spec.ribbonDark;
  for (const s of [-1, 1]) {
    x.fillStyle = spec.ribbonDark;
    x.beginPath();
    x.moveTo(bx, by);
    x.lineTo(bx + s * bowW * 0.5, by + bowH * 0.7);
    x.lineTo(bx + s * bowW * 0.34, by + bowH * 0.78);
    x.closePath();
    x.fill();
    x.save();
    x.translate(bx + s * bowW * 0.36, by - bowH * 0.36);
    x.rotate(s * -0.4);
    const lg = x.createLinearGradient(0, -bowH / 2, 0, bowH / 2);
    lg.addColorStop(0, spec.ribbon);
    lg.addColorStop(1, spec.ribbonDark);
    x.fillStyle = lg;
    x.beginPath();
    x.ellipse(0, 0, bowW * 0.42, bowH * 0.36, 0, 0, Math.PI * 2);
    x.fill();
    x.stroke();
    x.restore();
  }
  x.fillStyle = spec.ribbon;
  x.beginPath();
  x.ellipse(bx, by - bowH * 0.12, bowW * 0.11, bowH * 0.2, 0, 0, Math.PI * 2);
  x.fill();
  x.stroke();

  // Logo label on the front, below the lid. The whole logo is always shown
  // (contain, never cover), with padding inside the label.
  const ax0 = L + w * 0.07, ax1 = R - w * 0.07;
  const ay0 = T + lidH + 7, ay1 = B - 7;
  const aw = ax1 - ax0, ah = ay1 - ay0;
  const lp = Math.max(7, Math.min(aw, ah) * 0.07); // breathing room inside the label
  const cx = (ax0 + ax1) / 2, cy = (ay0 + ay1) / 2;
  const img = gift.image && gift.image.naturalWidth > 0 ? gift.image : null;
  const mode: LabelMode = img ? analyse(img) : "light";

  let lw: number, lh: number, iw = 0, ih = 0;
  if (img) {
    const s = Math.min((aw - lp * 2) / img.naturalWidth, (ah - lp * 2) / img.naturalHeight);
    iw = img.naturalWidth * s;
    ih = img.naturalHeight * s;
    lw = iw + lp * 2;
    lh = ih + lp * 2;
  } else {
    lw = aw;
    lh = Math.min(ah, 46);
  }
  const lx = cx - lw / 2, ly = cy - lh / 2;
  const radius = 7;

  x.save();
  x.shadowColor = "rgba(0,0,0,0.45)";
  x.shadowBlur = 8;
  x.shadowOffsetY = 2;
  x.beginPath();
  x.roundRect(lx, ly, lw, lh, radius);
  if (mode === "dark") {
    x.fillStyle = "rgba(6, 20, 15, 0.92)";
  } else {
    const lab = x.createLinearGradient(0, ly, 0, ly + lh);
    lab.addColorStop(0, "#fffdf7");
    lab.addColorStop(1, "#f3e7cb");
    x.fillStyle = lab;
  }
  x.fill();
  x.restore();

  if (img) {
    x.save();
    x.imageSmoothingQuality = "high";
    if (mode === "opaque") {
      // Logos with their own background keep crisp, slightly rounded corners.
      x.beginPath();
      x.roundRect(cx - iw / 2, cy - ih / 2, iw, ih, 3);
      x.clip();
    }
    x.drawImage(img, cx - iw / 2, cy - ih / 2, iw, ih);
    x.restore();
  } else {
    let size = 20;
    x.font = `italic 500 ${size}px ${serif}`;
    while (size > 10 && x.measureText(gift.name).width > lw - 12) {
      size--;
      x.font = `italic 500 ${size}px ${serif}`;
    }
    x.fillStyle = "#2a1d06";
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.fillText(gift.name, cx, cy + 1);
  }
  x.strokeStyle = "rgba(201, 153, 69, 0.85)";
  x.lineWidth = 1;
  x.beginPath();
  x.roundRect(lx + 0.5, ly + 0.5, lw - 1, lh - 1, radius);
  x.stroke();

  return { canvas, x: sx, y: sy, w: sw, h: sh, bottom: spec.bottom };
}
