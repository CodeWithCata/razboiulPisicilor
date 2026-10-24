/** @file The "what's new" card: is one due on this device, and marking it seen. */
import { WHATS_NEW, type WhatsNewEntry } from '../content/whatsNew';
import { forcesWhatsNew } from './device';
import { loadAlmanacSeen, loadBest, loadLifetime, loadTutorialDone, loadWhatsNewSeen, saveWhatsNewSeen } from './storage';

/**
 * Due when the newest entry is newer than the last one seen. A device that never saved anything only gets a card if it has played before
 * (a returning player: the update is news to them); a brand-new player just starts counting from today's version.
 */
export function whatsNewIsDue(lastSeen: number | null, latestId: number, returning: boolean): boolean {
  return lastSeen === null ? returning : latestId > lastSeen;
}

/** The card to show now, or null. Never shows twice for the same id (`markWhatsNewSeen` on close). `?whatsnew=1` forces it. */
export function pendingWhatsNew(): WhatsNewEntry | null {
  const latest = WHATS_NEW[0];
  if (!latest) return null;
  if (forcesWhatsNew()) return latest;
  const lastSeen = loadWhatsNewSeen();
  const returning = loadLifetime().runs > 0 || loadTutorialDone() || loadBest() > 0 || loadAlmanacSeen().length > 0;
  if (whatsNewIsDue(lastSeen, latest.id, returning)) return latest;
  if (lastSeen === null) saveWhatsNewSeen(latest.id);
  return null;
}

/** Remember the card was seen (never goes backwards, so a forced card does not bring an old one back). */
export function markWhatsNewSeen(entry: WhatsNewEntry): void {
  saveWhatsNewSeen(Math.max(entry.id, loadWhatsNewSeen() ?? 0));
}
