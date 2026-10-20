/** @file DOM overlay: install button, "new version" button, offline note (page elements above the canvas). */
import { PWA } from '../config/pwa';
import { FONT } from '../config/style';
import { PWA_TEXT } from '../content/lines';
import { applyUpdate, installMode, onInstallModeChange, onOfflineReady, onUpdateReady, promptInstall, updateReady } from '../core/pwa';

/** Page elements (not Phaser objects): they sit above the canvas, so the menu's "tap anywhere to start" must not see their taps. */
const UI_CLASS = 'pwa-ui';
const STYLE_ID = 'pwa-ui-style';
/** The browser events a tap on the button must keep to itself (Phaser also listens on the whole window). */
const OWN_EVENTS = ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'touchstart', 'touchend', 'touchcancel', 'keydown', 'keyup'] as const;

/** True when a browser event came from the install button or the offline note (the menu uses it to not start the game). */
export function isPwaUiEvent(event: Event | undefined): boolean {
  const target = event?.target;
  return target instanceof Element && target.closest(`.${UI_CLASS}`) !== null;
}

function addStyle(): void {
  if (document.getElementById(STYLE_ID)) return;
  const U = PWA.ui;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .${UI_CLASS} { position: fixed; z-index: ${U.zIndex}; font-family: ${FONT}; color: ${U.text}; }
    .${UI_CLASS}[hidden] { display: none; }
    .pwa-install { top: calc(env(safe-area-inset-top, 0px) + ${U.margin}px); left: calc(env(safe-area-inset-left, 0px) + ${U.margin}px); }
    .pwa-install button { display: flex; align-items: center; gap: ${U.gap}px; padding: 4px ${U.paddingX}px 4px 4px; font: ${U.fontSize}px ${FONT}; color: ${U.text};
      background: ${U.background}; border: ${U.border}px solid ${U.outline}; border-radius: 999px; box-shadow: 0 ${U.shadow}px 0 ${U.outline}; cursor: pointer; touch-action: manipulation; }
    .pwa-install button[hidden] { display: none; }
    .pwa-install .pwa-update { display: block; margin-top: 10px; padding: 8px 18px; background: ${U.toastBackground}; }
    .pwa-install button:active { transform: translateY(${U.shadow}px); box-shadow: none; }
    .pwa-install img { width: ${U.iconSize}px; height: ${U.iconSize}px; border-radius: 50%; display: block; }
    .pwa-hint { margin-top: 10px; width: ${U.hintWidth}px; padding: 10px 14px; font-size: ${U.hintSize}px; line-height: 1.3; background: ${U.background};
      border: ${U.border}px solid ${U.outline}; border-radius: 16px; }
    .pwa-toast { left: 50%; bottom: calc(env(safe-area-inset-bottom, 0px) + ${U.toastBottom}px); transform: translateX(-50%); padding: 10px 22px; font-size: ${U.toastSize}px; white-space: nowrap;
      background: ${U.toastBackground}; border: ${U.border}px solid ${U.outline}; border-radius: 999px; box-shadow: 0 ${U.shadow}px 0 ${U.outline}; pointer-events: none; animation: pwa-toast ${U.toastMs}ms ease forwards; }
    @keyframes pwa-toast { 0% { opacity: 0; } 8% { opacity: 1; } 85% { opacity: 1; } 100% { opacity: 0; } }
  `;
  document.head.appendChild(style);
}

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/**
 * The "Instalează jocul" button on the main menu, with the orange-cat logo. It only shows when installing is possible
 * (one tap on Chrome / Android, a short hint on iPhone) and never inside the installed app.
 * Also the "new version" button when an update is waiting (the menu is the safe place to restart the game).
 * Returns the function that removes it again (call it when the menu closes).
 */
export function mountInstallButton(): () => void {
  addStyle();
  const root = element('div', `${UI_CLASS} pwa-install`);
  const button = element('button', '');
  button.type = 'button';
  const icon = new Image();
  icon.src = `${import.meta.env.BASE_URL}${PWA.iconPath}`;
  icon.alt = '';
  icon.draggable = false;
  button.append(icon, element('span', '', PWA_TEXT.install));
  const hint = element('div', 'pwa-hint', PWA_TEXT.iosHint);
  hint.hidden = true;
  const update = element('button', 'pwa-update', PWA_TEXT.update);
  update.type = 'button';
  update.hidden = true;
  update.addEventListener('click', () => {
    update.disabled = true;
    applyUpdate();
  });
  root.append(button, hint, update);
  for (const name of OWN_EVENTS) root.addEventListener(name, (event) => event.stopPropagation());

  button.addEventListener('click', () => {
    if (installMode() === 'native') void promptInstall();
    else hint.hidden = !hint.hidden; // iPhone: show how to do it by hand
    button.blur(); // so a later Enter / Space does not press it again
  });

  const refresh = (): void => {
    button.hidden = installMode() === 'none';
    update.hidden = !updateReady();
    root.hidden = button.hidden && update.hidden;
    if (button.hidden) hint.hidden = true;
  };
  refresh();
  const stopInstall = onInstallModeChange(refresh);
  const stopUpdate = onUpdateReady(refresh);
  document.body.appendChild(root);
  return () => {
    stopInstall();
    stopUpdate();
    root.remove();
  };
}

/** One short note ("ready for offline") the first time the whole game has been saved on the device. Call once at start. */
export function mountOfflineToast(): void {
  onOfflineReady(() => {
    addStyle();
    const toast = element('div', `${UI_CLASS} pwa-toast`, PWA_TEXT.offlineReady);
    document.body.appendChild(toast);
    window.setTimeout(() => toast.remove(), PWA.ui.toastMs);
  });
}
