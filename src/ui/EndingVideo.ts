/** @file DOM video player for the ending clip: black fade, one clip with sound, "Sari peste" button, never hangs. */
import { ENDING_VIDEO } from '../config/endingVideo';
import { INTRO_VIDEO } from '../config/introVideo';
import { FONT } from '../config/style';
import { INTRO_TEXT } from '../content/lines';
import { bus, Events, listen, type MusicPayload } from '../core/events';
import { isMuted } from '../core/mute';

const ROOT_CLASS = 'ending-video';
const STYLE_ID = 'ending-video-style';
/** Events the overlay keeps to itself (Phaser also listens on the whole window). */
const OWN_EVENTS = ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'touchstart', 'touchend', 'touchcancel', 'click'] as const;
const SKIP_KEYS: readonly string[] = ['Escape', 'Space', 'Enter', 'NumpadEnter'];

function addStyle(): void {
  if (document.getElementById(STYLE_ID)) return;
  const V = ENDING_VIDEO;
  const S = INTRO_VIDEO.skip;
  const P = V.progress;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .${ROOT_CLASS} { position: absolute; inset: 0; z-index: ${V.zIndex}; background: ${V.background}; opacity: 0; transition: opacity ${V.fadeMs}ms ease; font-family: ${FONT}; touch-action: none; }
    .${ROOT_CLASS}.on { opacity: 1; }
    .${ROOT_CLASS} video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; background: ${V.background}; opacity: 0; transition: opacity ${V.clipFadeMs}ms ease-in-out; }
    .${ROOT_CLASS} video.on { opacity: 1; }
    .${ROOT_CLASS} button { position: absolute; top: ${S.margin}px; right: ${S.margin}px; padding: ${S.padY}px ${S.padX}px; font: ${S.size}px ${FONT}; color: ${S.text}; background: ${S.fill};
      border: ${S.border}px solid ${S.outline}; border-radius: 999px; box-shadow: 0 ${S.shadow}px 0 ${S.outline}; opacity: ${S.idleAlpha}; cursor: pointer; touch-action: manipulation; }
    .${ROOT_CLASS} button:active { transform: translateY(${S.shadow}px); box-shadow: none; }
    .${ROOT_CLASS} .bar { position: absolute; left: ${P.margin}px; right: ${P.margin}px; bottom: ${P.margin}px; height: ${P.height}px; border-radius: 3px; background: ${P.back}; overflow: hidden; pointer-events: none; }
    .${ROOT_CLASS} .bar b { display: block; height: 100%; width: 0; background: ${P.fill}; }
  `;
  document.head.appendChild(style);
}

/**
 * Plays the ending clip over the game, then calls `onDone` (ended, skipped or failed: the game always goes on).
 * The black overlay is STILL there when `onDone` runs, so the victory screen can start under it; it fades away `releaseMs` later.
 * On a phone that refuses sound for a clip not started by a tap, it plays silent and a tap on the picture turns the sound on.
 */
export function playEndingVideo(onDone: () => void): void {
  addStyle();
  const root = document.createElement('div');
  root.className = ROOT_CLASS;
  const skip = document.createElement('button');
  skip.type = 'button';
  skip.textContent = INTRO_TEXT.skip;
  const bar = document.createElement('div');
  bar.className = 'bar';
  const fill = document.createElement('b');
  bar.appendChild(fill);
  const video = document.createElement('video');
  video.playsInline = true;
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', '');
  video.preload = 'auto';
  video.disablePictureInPicture = true;
  video.controls = false;
  video.muted = isMuted();
  root.append(video, bar, skip);
  for (const name of OWN_EVENTS) root.addEventListener(name, (event) => event.stopPropagation());
  (document.getElementById('game') ?? document.body).appendChild(root);
  requestAnimationFrame(() => root.classList.add('on'));

  const silence: MusicPayload = { track: null };
  bus.emit(Events.MusicTrack, silence);

  let finished = false;
  let fadedOut = false;
  let silentFallback = false;
  const timers: number[] = [];
  const stallTimer = { id: 0 };
  const later = (fn: () => void, ms: number): void => {
    timers.push(window.setTimeout(fn, ms));
  };
  const offMute = listen(Events.MuteChanged, () => {
    video.muted = isMuted() || silentFallback;
  });
  const onKey = (event: KeyboardEvent): void => {
    if (!SKIP_KEYS.includes(event.code)) return;
    event.preventDefault();
    event.stopImmediatePropagation(); // Esc must not pause, Space / Enter must not start anything underneath
    if (!event.repeat) finish();
  };
  const onHidden = (): void => {
    if (finished) return;
    if (document.hidden) video.pause();
    else void video.play().catch(() => undefined);
  };
  window.addEventListener('keydown', onKey, true);
  document.addEventListener('visibilitychange', onHidden);
  skip.addEventListener('click', () => finish());
  video.addEventListener('click', () => {
    if (silentFallback && !isMuted()) {
      silentFallback = false;
      video.muted = false;
    }
  });

  function finish(): void {
    if (finished) return;
    finished = true;
    window.clearTimeout(stallTimer.id);
    for (const t of timers) window.clearTimeout(t);
    offMute();
    window.removeEventListener('keydown', onKey, true);
    document.removeEventListener('visibilitychange', onHidden);
    video.pause();
    video.removeAttribute('src');
    video.load(); // frees the download and the decoder
    for (const el of root.querySelectorAll('video, button, .bar')) el.remove(); // nothing but black is left
    onDone();
    window.setTimeout(() => {
      root.classList.remove('on');
      window.setTimeout(() => root.remove(), ENDING_VIDEO.fadeMs);
    }, ENDING_VIDEO.releaseMs);
  }

  later(() => {
    if (finished) return;
    video.addEventListener('playing', () => {
      window.clearTimeout(stallTimer.id);
      video.classList.add('on');
    }, { once: true });
    video.addEventListener('timeupdate', () => {
      if (!(video.duration > 0)) return;
      fill.style.width = `${Math.min(100, (video.currentTime / video.duration) * 100)}%`;
      if (!fadedOut && (video.duration - video.currentTime) * 1000 <= ENDING_VIDEO.clipFadeMs) {
        fadedOut = true;
        video.classList.remove('on');
      }
    });
    video.addEventListener('ended', () => finish(), { once: true });
    video.addEventListener('error', () => finish(), { once: true });
    stallTimer.id = window.setTimeout(() => finish(), ENDING_VIDEO.stallMs);
    video.src = `${import.meta.env.BASE_URL}${ENDING_VIDEO.clip}`;
    video.load();
    void video.play().catch(() => {
      silentFallback = true; // the browser wants a tap for sound: play silent, a tap on the picture turns it on
      video.muted = true;
      void video.play().catch(() => finish());
    });
  }, ENDING_VIDEO.startDelayMs);
}
