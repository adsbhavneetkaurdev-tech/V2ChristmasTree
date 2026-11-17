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

/** Five boxes under the tree, in logical 1920×1080 units. Varied sizes, papers and ribbons. */
export const GIFT_LAYOUT: GiftSpec[] = [
  { cx: 629, bottom: 1014, w: 128, h: 108, paper: ["#b8404a", "#8e1f2a", "#561018"], ribbon: "#f0cf86", ribbonDark: "#a87d32" },
  { cx: 785, bottom: 1030, w: 150, h: 124, paper: ["#2f7356", "#1d4d3a", "#0d281d"], ribbon: "#f4e4bc", ribbonDark: "#b3a070" },
  { cx: 962, bottom: 1018, w: 164, h: 146, paper: ["#fbf5e6", "#ebdfc1", "#b9a780"], ribbon: "#a8303a", ribbonDark: "#681520" },
  { cx: 1139, bottom: 1030, w: 146, h: 118, paper: ["#ecc87a", "#c9993f", "#7f5a1c"], ribbon: "#fbf6ea", ribbonDark: "#c8bb9c" },
  { cx: 1296, bottom: 1014, w: 128, h: 104, paper: ["#8a3446", "#5a1a28", "#320b15"], ribbon: "#e2b866", ribbonDark: "#93692a" },
];

type LabelMode = "opaque" | "light" | "dark";

/**
 * Decide how to present a logo: logos with their own solid background are
 * shown as-is; transparent dark logos get a light label, light ones a dark label.
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
    return weight > 0 && lum / weight > 0.62 ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function renderGift(spec: GiftSpec, gift: PartnerGift, px: number, serif: string): GiftSprite {
  const { w, h } = spec;
  const dx = w * 0.12, dy = h * 0.15;
  const lidH = h * 0.17;
  const rib = Math.max(9, w * 0.075);
  const bowW = w * 0.2, bowH = h * 0.16;
  const pad = 14;
  // Sprite bounds (logical)
  const sx = spec.cx - w / 2 - pad;
  const sy = spec.bottom - h - dy - bowH * 1.3 - pad;
  const sw = w + dx + pad * 2;
  const sh = spec.bottom + 16 - sy;
  const canvas = makeCanvas(sw * px, sh * px);
  const x = ctx2d(canvas);
  x.scale(px, px);
  x.translate(-sx, -sy);

  const L = spec.cx - w / 2, R = spec.cx + w / 2, B = spec.bottom, T = B - h;
  const [light, base, dark] = spec.paper;

  // Floor shadow
  const sh0 = x.createRadialGradient(spec.cx + dx / 2, B + 2, 2, spec.cx + dx / 2, B + 2, w * 0.7);
  sh0.addColorStop(0, "rgba(0,0,0,0.6)");
  sh0.addColorStop(1, "rgba(0,0,0,0)");
  x.save();
  x.translate(spec.cx + dx / 2, B + 2);
  x.scale(1, 0.14);
  x.translate(-(spec.cx + dx / 2), -(B + 2));
  x.fillStyle = sh0;
  x.fillRect(L - w * 0.3, B - w, w * 1.6, w * 2);
  x.restore();

  const poly = (pts: [number, number][], fill: string | CanvasGradient) => {
    x.fillStyle = fill;
    x.beginPath();
    pts.forEach(([px_, py], i) => (i ? x.lineTo(px_, py) : x.moveTo(px_, py)));
    x.closePath();
    x.fill();
  };

  // Right side face
  poly([[R, T], [R + dx, T - dy], [R + dx, B - dy], [R, B]], dark);
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
  // Fine diagonal paper texture
  x.save();
  x.beginPath();
  x.rect(L, T, w, h);
  x.clip();
  x.strokeStyle = "rgba(255,255,255,0.06)";
  x.lineWidth = 1.2;
  for (let k = -h; k < w; k += 9) {
    x.beginPath();
    x.moveTo(L + k, B);
    x.lineTo(L + k + h, T);
    x.stroke();
  }
  // Warm glow from the tree on the upper front
  const glow = x.createRadialGradient(spec.cx, T - 30, 4, spec.cx, T - 30, h * 1.1);
  glow.addColorStop(0, "rgba(255, 200, 120, 0.22)");
  glow.addColorStop(1, "rgba(255, 200, 120, 0)");
  x.fillStyle = glow;
  x.fillRect(L, T, w, h);
  x.restore();

  // Lid (slightly proud of the box) on front and side
  const lidFront = x.createLinearGradient(0, T - 2, 0, T + lidH);
  lidFront.addColorStop(0, light);
  lidFront.addColorStop(1, base);
  x.fillStyle = lidFront;
  x.fillRect(L - 3, T - 2, w + 6, lidH + 2);
  poly([[R + 3, T - 2], [R + 3 + dx, T - 2 - dy], [R + 3 + dx, T + lidH - dy], [R + 3, T + lidH]], dark);
  x.fillStyle = "rgba(0,0,0,0.28)";
  x.fillRect(L - 3, T + lidH, w + 6, 2.5);

  // Ribbons: around the lid and across the top, leaving the front clear for the logo
  const ribGrad = (y0: number, y1: number) => {
    const g = x.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, spec.ribbon);
    g.addColorStop(1, spec.ribbonDark);
    return g;
  };
  const ry = T + lidH / 2 - rib * 0.4;
  x.fillStyle = ribGrad(ry, ry + rib * 0.8);
  x.fillRect(L - 3, ry, w + 6, rib * 0.8);
  poly([[R + 3, ry], [R + 3 + dx, ry - dy], [R + 3 + dx, ry - dy + rib * 0.8], [R + 3, ry + rib * 0.8]], spec.ribbonDark);
  x.fillStyle = ribGrad(T - 2, T + lidH);
  x.fillRect(spec.cx - rib / 2, T - 2, rib, lidH + 2);
  poly([[spec.cx - rib / 2, T - 2], [spec.cx - rib / 2 + dx, T - 2 - dy], [spec.cx + rib / 2 + dx, T - 2 - dy], [spec.cx + rib / 2, T - 2]], spec.ribbon);
  const my = T - 2 - dy / 2;
  poly([[L - 3 + dx / 2, my - rib * 0.3], [R + 3 + dx / 2, my - rib * 0.3], [R + 3 + dx / 2, my + rib * 0.3], [L - 3 + dx / 2, my + rib * 0.3]], spec.ribbon);

  // Bow
  const bx = spec.cx + dx / 2, by = my - 2;
  x.lineWidth = 1.2;
  x.strokeStyle = spec.ribbonDark;
  for (const side of [-1, 1]) {
    // tails
    x.fillStyle = spec.ribbonDark;
    x.beginPath();
    x.moveTo(bx, by);
    x.lineTo(bx + side * bowW * 0.55, by + bowH * 0.75);
    x.lineTo(bx + side * bowW * 0.38, by + bowH * 0.8);
    x.closePath();
    x.fill();
    // loops
    x.save();
    x.translate(bx + side * bowW * 0.42, by - bowH * 0.42);
    x.rotate(side * -0.45);
    const lg = x.createLinearGradient(0, -bowH / 2, 0, bowH / 2);
    lg.addColorStop(0, spec.ribbon);
    lg.addColorStop(1, spec.ribbonDark);
    x.fillStyle = lg;
    x.beginPath();
    x.ellipse(0, 0, bowW * 0.5, bowH * 0.42, 0, 0, Math.PI * 2);
    x.fill();
    x.stroke();
    x.fillStyle = "rgba(0,0,0,0.22)";
    x.beginPath();
    x.ellipse(side * -bowW * 0.08, bowH * 0.05, bowW * 0.22, bowH * 0.16, 0, 0, Math.PI * 2);
    x.fill();
    x.restore();
  }
  x.fillStyle = spec.ribbon;
  x.beginPath();
  x.ellipse(bx, by - bowH * 0.18, bowW * 0.15, bowH * 0.24, 0, 0, Math.PI * 2);
  x.fill();
  x.stroke();

  // Logo label on the front, centred below the lid
  const ax0 = L + w * 0.08, ax1 = R - w * 0.08;
  const ay0 = T + lidH + 8, ay1 = B - 8;
  const aw = ax1 - ax0, ah = ay1 - ay0;
  const lp = 7; // label padding
  const cx = (ax0 + ax1) / 2, cy = (ay0 + ay1) / 2;
  const img = gift.image && gift.image.naturalWidth > 0 ? gift.image : null;
  const mode: LabelMode = img ? analyse(img) : "light";

  let lw: number, lh: number, iw = 0, ih = 0;
  if (img) {
    const s = Math.min((aw - lp * 2) / img.naturalWidth, (ah - lp * 2) / img.naturalHeight);
    iw = img.naturalWidth * s;
    ih = img.naturalHeight * s;
    lw = mode === "opaque" ? iw : iw + lp * 2;
    lh = mode === "opaque" ? ih : ih + lp * 2;
  } else {
    lw = aw;
    lh = Math.min(ah, 46);
  }
  const lx = cx - lw / 2, ly = cy - lh / 2;

  x.save();
  x.shadowColor = "rgba(0,0,0,0.45)";
  x.shadowBlur = 8;
  x.shadowOffsetY = 2;
  x.beginPath();
  x.roundRect(lx, ly, lw, lh, 6);
  if (mode === "dark") {
    x.fillStyle = "rgba(6, 20, 15, 0.9)";
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
    x.beginPath();
    x.roundRect(lx, ly, lw, lh, 6);
    x.clip();
    x.imageSmoothingQuality = "high";
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
  x.roundRect(lx + 0.5, ly + 0.5, lw - 1, lh - 1, 6);
  x.stroke();

  return { canvas, x: sx, y: sy, w: sw, h: sh, bottom: spec.bottom };
}
