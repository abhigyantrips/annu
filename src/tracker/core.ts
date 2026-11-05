export const IDLE_MS = 15 * 60_000;
/** Accrues only visible time before the inactivity deadline; silent readers get 15 minutes. */
export class ReadingClock {
  total = 0;
  lastActivity: number;
  private checkpoint: number;
  constructor(now: number) {
    this.checkpoint = now;
    this.lastActivity = now;
  }
  tick(now: number, visible: boolean) {
    if (visible)
      this.total += Math.max(
        0,
        Math.min(now, this.lastActivity + IDLE_MS) - this.checkpoint,
      );
    this.checkpoint = now;
    return Math.round(this.total);
  }
  interact(now: number, visible: boolean) {
    this.tick(now, visible);
    this.lastActivity = now;
  }
  reset(now: number) {
    this.total = 0;
    this.checkpoint = now;
    this.lastActivity = now;
  }
}
