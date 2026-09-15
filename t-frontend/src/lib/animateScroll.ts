/** Slow to start, long gentle settle: reads as a glide rather than a jump. */
function easeInOutQuint(progress: number): number {
  return progress < 0.5 ? 16 * progress ** 5 : 1 - (-2 * progress + 2) ** 5 / 2;
}

const MIN_DURATION_MS = 700;
const MAX_DURATION_MS = 1400;

/** Longer threads take a little longer, so the speed feels the same whatever the distance. */
function durationFor(distancePx: number): number {
  return Math.min(MAX_DURATION_MS, Math.max(MIN_DURATION_MS, distancePx * 0.9));
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Glides a scroll container to its bottom. The target is re-read every frame,
 * so images or cards that finish loading mid-animation are still reached.
 * Any wheel, touch or key input hands control back to the user immediately.
 *
 * @param onFinish told whether the glide reached the bottom or the user took over.
 * @returns a function that stops the animation early, without calling `onFinish`.
 */
export function animateScrollToBottom(container: HTMLElement, onFinish: (completed: boolean) => void): () => void {
  const startTop = container.scrollTop;
  const startTime = performance.now();
  const duration = durationFor(container.scrollHeight - container.clientHeight - startTop);
  let frameId = 0;
  let stopped = false;

  const stop = () => {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(frameId);
    container.removeEventListener("wheel", interrupt);
    container.removeEventListener("touchstart", interrupt);
    window.removeEventListener("keydown", interrupt);
  };

  const finish = (completed: boolean) => {
    if (stopped) return;
    stop();
    onFinish(completed);
  };

  function interrupt() {
    finish(false);
  }

  const step = (now: number) => {
    const progress = Math.min(1, (now - startTime) / duration);
    const targetTop = container.scrollHeight - container.clientHeight;
    container.scrollTop = startTop + (targetTop - startTop) * easeInOutQuint(progress);

    if (progress < 1) frameId = requestAnimationFrame(step);
    else finish(true);
  };

  container.addEventListener("wheel", interrupt, { passive: true });
  container.addEventListener("touchstart", interrupt, { passive: true });
  window.addEventListener("keydown", interrupt);
  frameId = requestAnimationFrame(step);

  return stop;
}
