/** Warm distinct script URLs while interactions run. Preparation must have no gameplay side effects.
 * Failure is surfaced by the normal interaction when reached; cancelled batches schedule no more reads.
 */
export async function prefetchInteractionScripts(
  paths: readonly string[],
  load: (path: string) => Promise<unknown>,
  shouldStop: () => boolean,
): Promise<void> {
  const unique = [...new Set(paths)];
  let next = 0;
  const worker = async () => {
    while (next < unique.length && !shouldStop()) {
      const path = unique[next++];
      try { await load(path); }
      catch { /* Best-effort warmup; interactive loading retains error reporting. */ }
    }
  };
  await Promise.all(Array.from({ length: Math.min(6, unique.length) }, worker));
}

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
