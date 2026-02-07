import type { ParticlePool } from './ParticlePool.ts';
import {
  QUALITY_FPS_THRESHOLD,
  QUALITY_SCALE_DELAY,
  QUALITY_MIN_PARTICLES,
  MAX_PARTICLES,
} from '../core/constants.ts';

/**
 * Adaptive quality scaler that monitors FPS and adjusts particle count
 * to maintain smooth performance.
 *
 * When FPS drops below QUALITY_FPS_THRESHOLD for QUALITY_SCALE_DELAY seconds,
 * the scaler reduces the pool's max active particle count by 20%.
 * When FPS recovers above threshold + 5 (hysteresis) for QUALITY_SCALE_DELAY
 * seconds, it increases max active by 10% (capped at MAX_PARTICLES).
 *
 * Creates a small DOM indicator in the bottom-left corner that appears
 * when quality has been reduced and hides when fully recovered.
 */
export class QualityScaler {
  /** Number of frames to average for FPS calculation. */
  private static readonly ROLLING_WINDOW = 30;

  /** Hysteresis buffer above threshold before scaling back up. */
  private static readonly HYSTERESIS = 5;

  private readonly pool: ParticlePool;

  /** Rolling buffer of frame times (in seconds). */
  private readonly frameTimes: number[] = [];

  /** Current max active particles (may be reduced from MAX_PARTICLES). */
  private currentMax: number = MAX_PARTICLES;

  /** Duration (seconds) FPS has been below threshold continuously. */
  private belowDuration = 0;

  /** Duration (seconds) FPS has been above threshold + hysteresis continuously. */
  private aboveDuration = 0;

  /** DOM indicator element. */
  private indicator: HTMLDivElement | null = null;

  constructor(pool: ParticlePool) {
    this.pool = pool;
    this.createIndicator();
  }

  /**
   * Feed a frame time and check if quality scaling is needed.
   *
   * @param dt - Delta time in seconds for this frame.
   */
  update(dt: number): void {
    // Track frame time in rolling buffer
    this.frameTimes.push(dt);
    if (this.frameTimes.length > QualityScaler.ROLLING_WINDOW) {
      this.frameTimes.shift();
    }

    // Need at least a few frames before making decisions
    if (this.frameTimes.length < 5) return;

    const avgFps = this.getAverageFPS();

    if (avgFps < QUALITY_FPS_THRESHOLD) {
      // FPS is below threshold
      this.belowDuration += dt;
      this.aboveDuration = 0;

      if (this.belowDuration >= QUALITY_SCALE_DELAY) {
        // Scale down: reduce by 20%
        const newMax = Math.max(
          QUALITY_MIN_PARTICLES,
          Math.floor(this.currentMax * 0.8),
        );
        if (newMax < this.currentMax) {
          this.currentMax = newMax;
          this.pool.setMaxActive(this.currentMax);
        }
        this.belowDuration = 0; // Reset timer for next potential reduction
      }
    } else if (avgFps > QUALITY_FPS_THRESHOLD + QualityScaler.HYSTERESIS) {
      // FPS is comfortably above threshold (with hysteresis)
      this.aboveDuration += dt;
      this.belowDuration = 0;

      if (this.aboveDuration >= QUALITY_SCALE_DELAY && this.currentMax < MAX_PARTICLES) {
        // Scale up: increase by 10%
        const newMax = Math.min(
          MAX_PARTICLES,
          Math.ceil(this.currentMax * 1.1),
        );
        if (newMax > this.currentMax) {
          this.currentMax = newMax;
          this.pool.setMaxActive(this.currentMax);
        }
        this.aboveDuration = 0; // Reset timer for next potential increase
      }
    } else {
      // In hysteresis zone -- reset both timers
      this.belowDuration = 0;
      this.aboveDuration = 0;
    }

    // Update DOM indicator visibility
    this.updateIndicator();
  }

  /** Returns true if the current max is below MAX_PARTICLES (quality reduced). */
  isScaled(): boolean {
    return this.currentMax < MAX_PARTICLES;
  }

  /** Get the current max active particle count. */
  getCurrentMax(): number {
    return this.currentMax;
  }

  /** Remove DOM element. */
  dispose(): void {
    if (this.indicator) {
      this.indicator.remove();
      this.indicator = null;
    }
  }

  /** Compute average FPS from rolling frame time buffer. */
  private getAverageFPS(): number {
    if (this.frameTimes.length === 0) return 60;
    const avgDt =
      this.frameTimes.reduce((sum, t) => sum + t, 0) / this.frameTimes.length;
    return avgDt > 0 ? 1 / avgDt : 60;
  }

  /** Create the quality indicator DOM element (initially hidden). */
  private createIndicator(): void {
    this.indicator = document.createElement('div');
    this.indicator.className = 'quality-indicator';
    this.indicator.textContent = 'Quality: reduced';
    this.indicator.style.opacity = '0';
    document.body.appendChild(this.indicator);
  }

  /** Show/hide the indicator based on current scaling state. */
  private updateIndicator(): void {
    if (!this.indicator) return;
    this.indicator.style.opacity = this.isScaled() ? '1' : '0';
  }
}
