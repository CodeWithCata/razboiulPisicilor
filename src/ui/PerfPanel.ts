/** @file On-phone card with fps and screen numbers (pause-menu switch "Date debug"). */
import Phaser from 'phaser';
import { PERF } from '../config/perf';
import { PERF_TEXT } from '../content/lines';
import { Events, listen, type PerfStatsPayload } from '../core/events';
import { getDebugInfo } from '../core/settings';

/**
 * A small card with the fps and a few numbers about how smoothly the game runs (phones, pause-menu switch "Date debug").
 * Data only: GameScene measures (systems/PerfMonitor.ts) and sends `Events.PerfStats`; this just prints it. The screen line
 * (renderer, canvas size on the phone, pixel ratio, fullscreen) is read here, since it does not change every frame.
 */
export class PerfPanel {
  private readonly back: Phaser.GameObjects.Graphics;
  private readonly text: Phaser.GameObjects.Text;

  constructor(private readonly scene: Phaser.Scene) {
    const P = PERF.panel;
    this.back = scene.add.graphics().setDepth(P.depth);
    this.text = scene.add
      .text(P.x + P.padX, P.y + P.padY, PERF_TEXT.waiting, { fontFamily: 'monospace', fontSize: `${P.size}px`, color: P.color, lineSpacing: P.lineSpacing })
      .setDepth(P.depth + 1);
    this.refresh();

    const off = listen<PerfStatsPayload>(Events.PerfStats, (stats) => this.show(stats));
    scene.events.on(Phaser.Scenes.Events.RESUME, this.refresh, this); // the switch is changed in the pause menu
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      off();
      scene.events.off(Phaser.Scenes.Events.RESUME, this.refresh, this);
    });
  }

  /** Show or hide the card to match the switch. */
  refresh(): void {
    const on = getDebugInfo();
    this.back.setVisible(on);
    this.text.setVisible(on);
  }

  /** The canvas backing size in device pixels (not the CSS size on screen). */
  private canvasWidth(): number {
    return this.scene.game.canvas.width;
  }

  private canvasHeight(): number {
    return this.scene.game.canvas.height;
  }

  /** Whether the WebGL context really has MSAA on (the canvas keeps its context, so asking again returns the same one). */
  private antialias(): boolean {
    const canvas = this.scene.game.canvas;
    const gl = (canvas.getContext('webgl2') ?? canvas.getContext('webgl')) as WebGLRenderingContext | null;
    return gl?.getContextAttributes()?.antialias ?? false;
  }

  private show(s: PerfStatsPayload): void {
    if (!getDebugInfo()) return;
    const fill = (template: string, values: Record<string, string | number>): string =>
      template.replace(/\{(\w+)\}/g, (_m, key: string) => String(values[key] ?? ''));
    const f1 = (n: number): string => n.toFixed(1);
    const size = this.scene.scale.displaySize;
    const lines = [
      fill(PERF_TEXT.fps, { fps: Math.round(s.fps) }),
      fill(PERF_TEXT.frame, { avg: f1(s.frameAvgMs), min: Math.round(s.frameMinMs), max: Math.round(s.frameMaxMs) }),
      fill(PERF_TEXT.slow, { limit: PERF.slowFrameMs, slow: s.slowFrames, frames: s.frames }),
      fill(PERF_TEXT.walk, { stalled: s.stalledFrames, walk: s.walkFrames }),
      fill(PERF_TEXT.step, { avg: f1(s.stepAvg), max: f1(s.stepMax) }),
      fill(PERF_TEXT.world, { cats: s.cats, balls: s.balls }),
      fill(PERF_TEXT.screen, {
        renderer: this.scene.game.renderer.type === Phaser.WEBGL ? 'WebGL' : 'Canvas',
        w: Math.round(size.width),
        h: Math.round(size.height),
        dpr: f1(window.devicePixelRatio || 1),
        fullscreen: this.scene.scale.isFullscreen ? PERF_TEXT.fullscreenOn : PERF_TEXT.fullscreenOff,
      }),
      fill(PERF_TEXT.canvas, { cw: this.canvasWidth(), ch: this.canvasHeight(), aa: this.antialias() ? PERF_TEXT.aaOn : PERF_TEXT.aaOff }),
    ];
    this.text.setText(lines.join('\n'));
    const P = PERF.panel;
    this.back.clear();
    this.back.fillStyle(PERF.back, P.backAlpha).fillRoundedRect(P.x, P.y, this.text.width + P.padX * 2, this.text.height + P.padY * 2, P.radius);
  }
}
