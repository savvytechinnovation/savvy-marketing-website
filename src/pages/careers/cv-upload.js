// CV upload: drag-and-drop zone backed by a real (keyboard-accessible) <input type="file">,
// client-side checks (type/size via the shared validation module), file name/size preview and remove.
// Markup: see careers/index.html (.dropzone[data-dropzone] + .file-chip[data-file-chip] inside .field).
import { gsap, reduceMotion } from '../../ds/site.js';
import { formatBytes, validateCvMeta } from '../../lib/application-validation.js';

const $ = (s, r) => r.querySelector(s);

/** Read a File as base64 (without the data: prefix). */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).replace(/^data:[^,]*,/, ''));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

/**
 * @param {HTMLElement} field  the .field[data-field="cv"] wrapper
 * @param {{ onChange?: (file: File | null) => void, setError: (msg: string) => void }} opts
 */
export function createCvUpload(field, { onChange, setError }) {
  const zone = $('[data-dropzone]', field);
  const input = $('input[type="file"]', zone);
  const chip = $('[data-file-chip]', field);
  const text = $('[data-drop-text]', zone);
  const idleText = text.innerHTML;
  const icon = $('.dropzone__icon', zone);
  let file = null;

  const show = (f) => {
    file = f;
    if (f) {
      $('[data-file-name]', chip).textContent = f.name;
      $('[data-file-size]', chip).textContent = `${formatBytes(f.size)} · ready to send ✓`;
      $('[data-file-ext]', chip).textContent = (f.name.split('.').pop() || '').slice(0, 4);
      zone.hidden = true;
      chip.hidden = false;
      if (!reduceMotion) gsap.from(chip, { opacity: 0, y: 8, scale: 0.98, duration: 0.45, ease: 'back.out(1.6)' });
    } else {
      chip.hidden = true;
      zone.hidden = false;
      input.value = '';
    }
    onChange?.(file);
  };

  const accept = (f) => {
    if (!f) return;
    const err = validateCvMeta({ name: f.name, size: f.size, type: f.type });
    if (err) {
      // keep the zone visible, explain why, never keep an invalid file
      input.value = '';
      file = null;
      setError(err.startsWith('This file is') ? `${f.name}: ${err}` : err);
      if (!reduceMotion) gsap.fromTo(zone, { x: -6 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' });
      onChange?.(null);
      return;
    }
    setError('');
    show(f);
  };

  input.addEventListener('change', () => accept(input.files?.[0]));

  // Drag & drop (desktop). Counter avoids flicker when moving over children.
  let depth = 0;
  const over = (on) => {
    zone.classList.toggle('is-over', on);
    text.innerHTML = on ? 'Drop to upload' : idleText;
    if (!reduceMotion) gsap.to(icon, { y: on ? -6 : 0, scale: on ? 1.15 : 1, duration: 0.35, ease: 'back.out(2)' });
  };
  zone.addEventListener('dragenter', (e) => {
    e.preventDefault();
    if (depth++ === 0) over(true);
  });
  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  });
  zone.addEventListener('dragleave', () => {
    if (--depth <= 0) (depth = 0), over(false);
  });
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    depth = 0;
    over(false);
    const files = e.dataTransfer?.files;
    if (files && files.length > 1) return setError('Upload one file only.');
    accept(files?.[0]);
  });

  $('[data-file-remove]', chip).addEventListener('click', () => {
    show(null);
    setError('');
    input.focus();
  });

  return {
    get file() {
      return file;
    },
    input,
    clear: () => show(null),
    /** '' when valid */
    validate: () => (file ? validateCvMeta(file) : validateCvMeta(null)),
    disable(on) {
      input.disabled = on;
      $('[data-file-remove]', chip).disabled = on;
    },
  };
}
