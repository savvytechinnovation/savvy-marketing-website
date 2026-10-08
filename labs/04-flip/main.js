// Shared-element transition with GSAP Flip: a grid thumbnail moves into a
// fullscreen "detail" container (the same idea used for route transitions).
import { gsap } from 'gsap';
import { Flip } from 'gsap/Flip';
import { createLab } from '../_shared/lab.js';

gsap.registerPlugin(Flip);
const lab = createLab('04-flip');
const item = document.querySelector('[data-flip-id="a"]');
const detail = document.querySelector('.detail');

const before = item.getBoundingClientRect();
const state = Flip.getState(item);
detail.appendChild(item);
const tl = Flip.from(state, { duration: 0.6, ease: 'power3.inOut', absolute: true });

// Right after Flip.from the element must still *look* where it was
await new Promise((r) => requestAnimationFrame(r));
const firstFrame = item.getBoundingClientRect();
lab.set('startsAtOriginalPositionPx', Math.round(Math.abs(firstFrame.left - before.left)));
await tl.then();
const after = item.getBoundingClientRect();
const target = detail.getBoundingClientRect();
lab.set('endsAtTargetErrorPx', Math.round(Math.abs(after.width - target.width) + Math.abs(after.left - target.left)));
lab.set('inlineStylesCleanedUp', !item.style.transform || item.style.transform === 'none' || item.style.transform === 'translate(0px, 0px)');
lab.finish();
