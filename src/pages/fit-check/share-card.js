// Shareable fit check result card: drawn on a 2D canvas (1200×630, social-card ratio), previewed in the result,
// downloadable as PNG and shared through the Web Share API when available (clipboard fallback).
// It contains the score, verdict and the six fit signs only — never the raw answers.
import { SIGNS, STRONG_FIT_MIN_SCORE } from '../../lib/fit-check.js';

const W = 1200;
const H = 630;
const FONT = "'Satoshi', 'Helvetica Neue', Arial, sans-serif";

const loadImg = (src) =>
  new Promise((res) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => res(null);
    i.src = src;
  });

export async function drawResultCard(r) {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  // background: brand navy → dark, cyan glow
  const bg = g.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0a0e2c');
  bg.addColorStop(0.55, '#141a40');
  bg.addColorStop(1, '#1f2f8f');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  const glow = g.createRadialGradient(900, 300, 10, 900, 300, 420);
  glow.addColorStop(0, r.outcome === 'not-yet' ? 'rgba(255,85,39,0.35)' : 'rgba(7,146,194,0.55)');
  glow.addColorStop(1, 'rgba(7,146,194,0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, W, H);
  // grid lines
  g.strokeStyle = 'rgba(255,255,255,0.05)';
  g.lineWidth = 1;
  for (let x = 0; x <= W; x += 60) {
    g.beginPath();
    g.moveTo(x + 0.5, 0);
    g.lineTo(x + 0.5, H);
    g.stroke();
  }
  for (let y = 0; y <= H; y += 60) {
    g.beginPath();
    g.moveTo(0, y + 0.5);
    g.lineTo(W, y + 0.5);
    g.stroke();
  }
  // isologo watermark + wordmark
  const [iso, logo] = await Promise.all([loadImg('/brand/isologo-gradient.svg'), loadImg('/brand/logo-white.svg')]);
  if (iso) {
    g.globalAlpha = 0.9;
    g.drawImage(iso, 760, 120, 300, 300);
    g.globalAlpha = 1;
  }
  if (logo) g.drawImage(logo, 64, 56, 126, 48);
  g.fillStyle = 'rgba(255,255,255,0.55)';
  g.font = `500 18px ${FONT}`;
  g.fillText('2-MINUTE FIT CHECK', 64, 150);
  // score
  g.fillStyle = '#fff';
  g.font = `700 168px ${FONT}`;
  g.fillText(String(r.score), 56, 320);
  const sw = g.measureText(String(r.score)).width;
  g.font = `500 36px ${FONT}`;
  g.fillStyle = 'rgba(255,255,255,0.6)';
  g.fillText('/100', 70 + sw, 320);
  // meter
  g.fillStyle = 'rgba(255,255,255,0.12)';
  g.fillRect(64, 352, 560, 8);
  const mg = g.createLinearGradient(64, 0, 624, 0);
  mg.addColorStop(0, '#293baa');
  mg.addColorStop(1, r.outcome === 'not-yet' ? '#ff5527' : '#38c6f4');
  g.fillStyle = mg;
  g.fillRect(64, 352, (560 * r.score) / 100, 8);
  g.fillStyle = 'rgba(255,255,255,0.8)';
  g.fillRect(64 + (560 * STRONG_FIT_MIN_SCORE) / 100, 344, 2, 24);
  // verdict
  g.fillStyle = r.outcome === 'not-yet' ? '#ff8a66' : r.outcome === 'strong' ? '#5fd3ff' : '#ffffff';
  g.font = `700 44px ${FONT}`;
  g.fillText(r.label, 64, 430);
  g.fillStyle = 'rgba(255,255,255,0.7)';
  g.font = `500 22px ${FONT}`;
  g.fillText(`${r.signs.length} of 6 strong-fit signs · ${r.requirements} requirement${r.requirements === 1 ? '' : 's'} to sort out`, 64, 470);
  // signs
  g.font = `500 17px ${FONT}`;
  SIGNS.forEach((s, i) => {
    const on = r.signs.includes(s.id);
    const x = 64 + (i % 2) * 400;
    const y = 520 + Math.floor(i / 2) * 30;
    g.fillStyle = on ? '#5fd3ff' : 'rgba(255,255,255,0.3)';
    g.fillText(on ? '●' : '○', x, y);
    g.fillStyle = on ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)';
    const label = s.label.length > 40 ? `${s.label.slice(0, 38)}…` : s.label;
    g.fillText(label, x + 24, y);
  });
  g.fillStyle = 'rgba(255,255,255,0.45)';
  g.font = `500 16px ${FONT}`;
  g.textAlign = 'right';
  g.fillText(`${location.host}/are-we-a-fit/`, W - 64, H - 40);
  return c;
}

/** Wire the share UI inside the rendered result. */
export async function wireShare(root, r) {
  const box = root.querySelector('[data-share]');
  if (!box) return;
  const status = box.querySelector('[data-share-status]');
  const img = box.querySelector('[data-share-img]');
  const canvas = await drawResultCard(r);
  img.src = canvas.toDataURL('image/png');
  const blob = () => new Promise((res) => canvas.toBlob(res, 'image/png'));
  const url = `${location.origin}/are-we-a-fit/`;
  const text = `My Savvy fit check: ${r.score}/100 · ${r.label}. ${r.signs.length} of 6 strong-fit signs.`;

  box.querySelector('[data-share-download]').addEventListener('click', async () => {
    const b = await blob();
    if (!b) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    a.download = 'savvy-fit-check.png';
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    status.textContent = 'Card downloaded.';
  });
  box.querySelector('[data-share-native]').addEventListener('click', async () => {
    try {
      const b = await blob();
      const file = b && new File([b], 'savvy-fit-check.png', { type: 'image/png' });
      if (file && navigator.canShare?.({ files: [file] })) await navigator.share({ title: 'My Savvy fit check', text, files: [file] });
      else if (navigator.share) await navigator.share({ title: 'My Savvy fit check', text, url });
      else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        status.textContent = 'Copied to your clipboard.';
        return;
      }
      status.textContent = 'Shared.';
    } catch (e) {
      if (e?.name === 'AbortError') return;
      try {
        await navigator.clipboard.writeText(`${text} ${url}`);
        status.textContent = 'Copied to your clipboard.';
      } catch {
        status.textContent = 'Sharing isn’t available in this browser. Use “Download card” instead.';
      }
    }
  });
}
