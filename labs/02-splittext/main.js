// Verifies GSAP SplitText (free since 3.13): masked line reveal, aria handling,
// autoSplit re-splitting on resize, and revert() restoring the original DOM.
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { createLab } from '../_shared/lab.js';

gsap.registerPlugin(SplitText);
const lab = createLab('02-splittext');
const el = document.getElementById('title');
const originalHTML = el.innerHTML;

await document.fonts.ready;
let splits = 0;
const split = SplitText.create(el, {
  type: 'lines,words,chars',
  mask: 'lines',
  autoSplit: true,
  aria: 'auto',
  onSplit(self) {
    splits++;
    // Returning the tween lets SplitText keep its progress when it re-splits
    return gsap.from(self.lines, { yPercent: 110, stagger: 0.08, duration: 0.8, ease: 'expo.out' });
  },
});

lab.set('lines', split.lines.length);
lab.set('words', split.words.length);
lab.set('chars', split.chars.length);
lab.set('masks', split.masks.length);
lab.set('ariaLabelOnParent', el.getAttribute('aria-label'));
lab.set('charsAriaHidden', split.chars[0]?.closest('[aria-hidden="true"]') !== null);
lab.set('maskOverflow', getComputedStyle(split.masks[0]).overflow);

// Resize -> autoSplit should re-split and line count should change
const linesBefore = split.lines.length;
el.style.maxWidth = '6ch';
await new Promise((r) => setTimeout(r, 600));
lab.set('splitCallbacks', splits);
lab.set('linesAfterResize', split.lines.length);
lab.set('autoSplitReflowed', split.lines.length !== linesBefore);

split.revert();
el.style.maxWidth = '';
lab.set('revertRestoresDOM', el.innerHTML === originalHTML);
lab.finish();
