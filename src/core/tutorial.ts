/** @file Does this run show the first-run tutorial? (campaign only, first time on this device, or `?tutorial=1`.) Shared by GameScene (holds the first wave) and UIScene (shows the card). */
import { TUTORIAL } from '../config/tutorial';
import { forcesTutorial } from './device';
import type { RunMode } from './run';
import { loadTutorialDone } from './storage';

export function tutorialWanted(mode: RunMode): boolean {
  return mode === 'campaign' && TUTORIAL.enabled && (forcesTutorial() || !loadTutorialDone());
}
