/** @file DOM video player for the opening clips (backstory + intro): preloads the next clip, "Sari peste" button, never hangs. */
import { INTRO_VIDEO } from '../config/introVideo';
import { FONT } from '../config/style';
import { INTRO_TEXT } from '../content/lines';
import { bus, Events, listen, type MusicPayload } from '../core/events';
import { isMuted } from '../core/mute';
import { loadIntroSeen, saveIntroSeen } from '../core/storage';

const ROOT_CLASS = 'intro-video';
const STYLE_ID = 'intro-video-style';
/** Events the overlay keeps to itself (Phaser also listens on the whole window, the menu must not see them). */
const OWN_EVENTS = ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'touchstart', 'touchend', 'touchcancel', 'click'] as const;
const SKIP_KEYS: readonly string[] = ['Escape', 'Space', 'Enter', 'NumpadEnter'];

/** Should the videos play now? (enabled, and not yet seen on this device unless forced with ?intro). */
export function shouldPlayIntro(): boolean {
  if (!INTRO_VIDEO.enabled || INTRO_VIDEO.sequence.length === 0) return false;
  if (new URLSearchParams(window.location.search).has(INTRO_VIDEO.forceParam)) return true;
  return INTRO_VIDEO.repeat === 'always' || !loadIntroSeen();
}

function addStyle(): void {
  if (document.getElementById(STYLE_ID)) return;
  const V = INTRO_VIDEO;
  const S = V.skip;
  const P = V.progress;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .${ROOT_CLASS} { position: absolute; inset: 0; z-index: ${V.zIndex}; background: ${V.background}; opacity: 0; transition: opacity ${V.fadeMs}ms ease; font-family: ${FONT}; touch-action: none; }
    .${ROOT_CLASS}.on { opacity: 1; }
    .${ROOT_CLASS} video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; background: ${V.background}; opacity: 0; transition: opacity ${V.itemFadeMs}ms ease-in-out; }
    .${ROOT_CLASS} video.on { opacity: 1; }
    .${ROOT_CLASS} .card { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; text-align: center; padding: 0 9%; box-sizing: border-box; opacity: 0; transition: opacity ${V.itemFadeMs}ms ease-in-out; pointer-events: none; }
    .${ROOT_CLASS} .card.on { opacity: 1; }
    .${ROOT_CLASS} .card span { max-width: ${V.card.maxWidth}; font: ${V.card.size}/${V.card.lineHeight} ${FONT}; color: ${V.card.color}; text-shadow: 0 3px 0 ${V.card.outline}, 0 0 14px rgba(0,0,0,0.8); }
    .${ROOT_CLASS} button { position: absolute; top: ${S.margin}px; right: ${S.margin}px; padding: ${S.padY}px ${S.padX}px; font: ${S.size}px ${FONT}; color: ${S.text}; background: ${S.fill};
      border: ${S.border}px solid ${S.outline}; border-radius: 999px; box-shadow: 0 ${S.shadow}px 0 ${S.outline}; opacity: ${S.idleAlpha}; cursor: pointer; touch-action: manipulation; }
    .${ROOT_CLASS} button:active { transform: translateY(${S.shadow}px); box-shadow: none; }
    .${ROOT_CLASS} .bars { position: absolute; left: ${P.margin}px; right: ${P.margin}px; bottom: ${P.margin}px; display: flex; gap: ${P.gap}px; pointer-events: none; }
    .${ROOT_CLASS} .bars i { flex: 1; height: ${P.height}px; border-radius: 3px; background: ${P.back}; overflow: hidden; }
    .${ROOT_CLASS} .bars b { display: block; height: 100%; width: 0; background: ${P.fill}; }
  `;
  document.head.appendChild(style);
}

function makeVideo(src: string): HTMLVideoElement {
  const video = document.createElement('video');
  video.playsInline = true; // iPhone: play inside the page, not in the system player
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', '');
  video.preload = 'auto';
  video.disablePictureInPicture = true;
  video.controls = false;
  video.src = `${import.meta.env.BASE_URL}${src}`;
  return video;
}

function release(video: HTMLVideoElement): void {
  video.pause();
  video.removeAttribute('src');
  video.load(); // frees the download and the decoder
  video.remove();
}

/** Returned when the clips are over: the black overlay is STILL covering the screen; call `dismiss()` once the game underneath has drawn its first frame. */
export interface IntroHandle {
  dismiss: () => void;
}

/**
 * Plays the opening sequence (clips and title cards) one after another over the game (must be called from a tap / key, so sound is allowed).
 * Every item fades in, plays, fades out, then a black pause. Resolves when it ends, is skipped, or fails: the game always goes on.
 * The next clip downloads while the current one plays. The overlay lives INSIDE #game, so it still shows when the game is fullscreen.
 */
export function playIntroVideos(): Promise<IntroHandle> {
  addStyle();
  const items = INTRO_VIDEO.sequence;
  const root = document.createElement('div');
  root.className = ROOT_CLASS;
  const skip = document.createElement('button');
  skip.type = 'button';
  skip.textContent = INTRO_TEXT.skip;
  const bars = document.createElement('div');
  bars.className = 'bars';
  const fills = items.map(() => {
    const cell = document.createElement('i');
    const fill = document.createElement('b');
    cell.appendChild(fill);
    bars.appendChild(cell);
    return fill;
  });
  root.append(bars, skip);
  for (const name of OWN_EVENTS) root.addEventListener(name, (event) => event.stopPropagation());
  (document.getElementById('game') ?? document.body).appendChild(root);
  requestAnimationFrame(() => root.classList.add('on'));

  const silence: MusicPayload = { track: null };
  bus.emit(Events.MusicTrack, silence); // the menu music stops; the game starts its own track later

  return new Promise<IntroHandle>((resolve) => {
    let index = 0;
    let current: HTMLVideoElement | null = null;
    let upcoming: { index: number; video: HTMLVideoElement } | null = null;
    let stallTimer = 0;
    let finished = false;
    const timers: number[] = [];
    const intervals: number[] = [];
    const later = (fn: () => void, ms: number): void => {
      timers.push(window.setTimeout(fn, ms));
    };

    const offMute = listen(Events.MuteChanged, () => {
      if (current) current.muted = isMuted();
    });
    const onKey = (event: KeyboardEvent): void => {
      if (!SKIP_KEYS.includes(event.code)) return;
      event.preventDefault();
      event.stopImmediatePropagation(); // Esc must not pause, Space / Enter must not start anything underneath
      if (!event.repeat) finish();
    };
    const onHidden = (): void => {
      if (!current) return;
      if (document.hidden) current.pause();
      else void current.play().catch(() => undefined);
    };
    window.addEventListener('keydown', onKey, true);
    document.addEventListener('visibilitychange', onHidden);
    skip.addEventListener('click', () => finish());

    function finish(): void {
      if (finished) return;
      finished = true;
      saveIntroSeen();
      window.clearTimeout(stallTimer);
      for (const t of timers) window.clearTimeout(t);
      for (const t of intervals) window.clearInterval(t);
      offMute();
      window.removeEventListener('keydown', onKey, true);
      document.removeEventListener('visibilitychange', onHidden);
      if (current) release(current);
      if (upcoming) release(upcoming.video);
      current = null;
      upcoming = null;
      for (const el of root.querySelectorAll('video, .card, button, .bars')) el.remove(); // nothing but black is left
      // Do NOT fade out here: the menu is still underneath and would flash. The overlay stays black until the game is ready.
      resolve({
        dismiss: () => {
          root.classList.remove('on');
          window.setTimeout(() => root.remove(), INTRO_VIDEO.fadeMs);
        },
      });
    }

    /** Smooth sound fade (iPhone ignores `volume`: the picture still fades, the sound simply cuts). */
    function ramp(video: HTMLVideoElement, from: number, to: number): void {
      const start = performance.now();
      const tick = (now: number): void => {
        const t = Math.min(1, (now - start) / INTRO_VIDEO.itemFadeMs);
        try {
          video.volume = Math.max(0, Math.min(1, from + (to - from) * t));
        } catch {
          return;
        }
        if (t < 1 && video.isConnected) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }

    /** Start downloading the next clip while the current item plays (a title card in between is skipped over). */
    function prepareAhead(from: number): void {
      for (let j = from + 1; j < items.length; j += 1) {
        const item = items[j];
        if (!('clip' in item)) continue;
        if (upcoming?.index === j) return;
        if (upcoming) release(upcoming.video);
        const video = makeVideo(item.clip);
        video.muted = true;
        upcoming = { index: j, video };
        return;
      }
    }

    /** After an item: the black pause, then the next one (or the end). */
    function afterItem(): void {
      if (finished) return;
      if (index >= items.length) finish();
      else later(runItem, INTRO_VIDEO.pauseMs);
    }

    function runItem(): void {
      if (finished) return;
      if (index >= items.length) {
        finish();
        return;
      }
      const at = index;
      const item = items[at];
      index += 1;
      prepareAhead(at);
      if ('card' in item) showCard(item.card, item.ms, fills[at]);
      else playClip(item.clip, at, fills[at]);
    }

    function showCard(key: string, ms: number, fill: HTMLElement): void {
      const text = (INTRO_TEXT as Record<string, string>)[key];
      if (!text) {
        runItem();
        return;
      }
      const card = document.createElement('div');
      card.className = 'card';
      const span = document.createElement('span');
      span.textContent = text;
      card.appendChild(span);
      root.insertBefore(card, bars);
      requestAnimationFrame(() => requestAnimationFrame(() => card.classList.add('on')));
      const t0 = performance.now();
      const tick = window.setInterval(() => {
        fill.style.width = `${Math.min(100, ((performance.now() - t0) / ms) * 100)}%`;
      }, 60);
      intervals.push(tick);
      later(() => card.classList.remove('on'), Math.max(0, ms - INTRO_VIDEO.itemFadeMs));
      later(() => {
        window.clearInterval(tick);
        fill.style.width = '100%';
        card.remove();
        afterItem();
      }, ms);
    }

    function playClip(src: string, at: number, fill: HTMLElement): void {
      let video: HTMLVideoElement;
      if (upcoming?.index === at) {
        video = upcoming.video;
        upcoming = null;
      } else {
        video = makeVideo(src);
      }
      current = video;
      video.muted = isMuted();
      video.volume = 0; // fades up once it plays
      root.insertBefore(video, bars);
      let over = false;
      let fadedOut = false;
      const watch = window.setInterval(() => {
        if (current !== video || !(video.duration > 0)) return;
        // The last moments: picture and sound fade out into the black pause.
        if (!fadedOut && (video.duration - video.currentTime) * 1000 <= INTRO_VIDEO.itemFadeMs) {
          fadedOut = true;
          video.classList.remove('on');
          ramp(video, video.volume, 0);
        }
      }, 40);
      intervals.push(watch);
      const done = (pause: boolean): void => {
        if (over || finished) return;
        over = true;
        window.clearInterval(watch);
        window.clearTimeout(stallTimer);
        if (current === video) current = null;
        release(video);
        if (pause) afterItem();
        else runItem(); // a broken clip: straight on, no pause
      };
      // A clip that never starts (offline, broken file) is dropped after stallMs.
      window.clearTimeout(stallTimer);
      stallTimer = window.setTimeout(() => done(false), INTRO_VIDEO.stallMs);
      video.addEventListener('playing', () => {
        window.clearTimeout(stallTimer);
        video.classList.add('on');
        ramp(video, 0, 1);
      }, { once: true });
      video.addEventListener('timeupdate', () => {
        if (video.duration > 0) fill.style.width = `${Math.min(100, (video.currentTime / video.duration) * 100)}%`;
      });
      video.addEventListener('ended', () => {
        fill.style.width = '100%';
        done(true);
      }, { once: true });
      video.addEventListener('error', () => done(false), { once: true });
      // Sound is allowed (we are inside a tap). If a browser still refuses, try again silent rather than skipping the story.
      void video.play().catch(() => {
        video.muted = true;
        void video.play().catch(() => done(false));
      });
    }

    prepareAhead(-1); // the first clip starts downloading right away, during the black wait
    later(runItem, INTRO_VIDEO.startDelayMs);
  });
}
