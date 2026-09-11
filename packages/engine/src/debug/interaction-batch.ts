/** Sequential debug interactions. Stop cancels only remaining work, never an active story script. */
export async function runInteractionBatch<T>(targets: readonly T[], options: {
  signal: AbortSignal;
  shouldStop: () => boolean;
  isRunning: () => boolean;
  canInteract: (target: T) => boolean;
  interact: (target: T) => Promise<void>;
  onProgress: (done: number, total: number) => void;
}): Promise<void> {
  const stopped = () => options.signal.aborted || options.shouldStop();
  options.onProgress(0, targets.length);
  for (const [index, target] of targets.entries()) {
    // A debugger pause can resolve runScript before the interpreter becomes idle.
    while (options.isRunning() && !stopped()) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    if (stopped()) return;
    if (options.canInteract(target)) await options.interact(target);
    while (options.isRunning() && !stopped()) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    options.onProgress(index + 1, targets.length);
  }
}
