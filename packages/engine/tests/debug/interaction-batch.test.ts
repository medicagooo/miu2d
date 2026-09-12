import { describe, expect, it, vi } from "vitest";
import { prefetchInteractionScripts, runInteractionBatch } from "../../src/debug/interaction-batch";

describe("interaction script prefetch", () => {
  it("overlaps cold reads with execution: 12 one-second reads take 2s instead of 12s", async () => {
    vi.useFakeTimers();
    try {
      const paths = Array.from({ length: 12 }, (_, i) => `script${i}`);
      const cache = new Map<string, Promise<void>>();
      let active = 0;
      let maxActive = 0;
      const load = vi.fn((path: string) => {
        let value = cache.get(path);
        if (!value) {
          active++;
          maxActive = Math.max(maxActive, active);
          value = new Promise<void>((resolve) => setTimeout(() => { active--; resolve(); }, 1000));
          cache.set(path, value);
        }
        return value;
      });
      const started = Date.now();
      const warmup = prefetchInteractionScripts(paths, load, () => false);
      const executed: string[] = [];
      const batch = runInteractionBatch(paths, {
        signal: new AbortController().signal, shouldStop: () => false,
        isRunning: () => false, canInteract: () => true,
        interact: async (path) => { await load(path); executed.push(path); },
        onProgress: () => {},
      });
      expect(maxActive).toBe(6);
      expect(executed).toEqual([]);
      await vi.advanceTimersByTimeAsync(1000);
      expect(executed).toEqual(paths.slice(0, 6));
      await vi.advanceTimersByTimeAsync(1000);
      await Promise.all([warmup, batch]);
      expect(executed).toEqual(paths);
      expect(Date.now() - started).toBe(2000);
      expect(cache.size).toBe(12);
      expect(maxActive).toBe(6);
    } finally { vi.useRealTimers(); }
  });

  it("deduplicates URLs and stops scheduling when cancelled", async () => {
    let stop = false;
    const release: Array<() => void> = [];
    const load = vi.fn(() => new Promise<void>((resolve) => release.push(resolve)));
    const warmup = prefetchInteractionScripts(["a", "a", "b", "c", "d", "e", "f", "g"], load, () => stop);
    expect(load).toHaveBeenCalledTimes(6);
    stop = true;
    for (const resolve of release) resolve();
    await warmup;
    expect(load).toHaveBeenCalledTimes(6);
  });

  it("handles speculative failures without preventing later interactive error reporting", async () => {
    const load = vi.fn(async () => { throw new Error("not found"); });
    await expect(prefetchInteractionScripts(["a", "a", "b"], load, () => false)).resolves.toBeUndefined();
    expect(load).toHaveBeenCalledTimes(2);
  });
});

describe("debug interaction batch", () => {
  const setup = () => ({
    signal: new AbortController().signal,
    shouldStop: () => false,
    isRunning: () => false,
    canInteract: () => true,
    interact: vi.fn(async (_target: number) => {}),
    onProgress: vi.fn(),
  });

  it("waits for active interaction before starting another and skips removed objects", async () => {
    const options = setup();
    let finish!: () => void;
    options.interact.mockImplementationOnce(() => new Promise<void>((resolve) => { finish = resolve; }));
    options.canInteract = (target?: number) => target !== 2;
    const batch = runInteractionBatch([1, 2, 3], options);
    expect(options.interact.mock.calls).toEqual([[1]]);
    finish();
    await batch;
    expect(options.interact.mock.calls).toEqual([[1], [3]]);
    expect(options.onProgress).toHaveBeenLastCalledWith(3, 3);
  });

  it("stops remaining objects after cancellation without interrupting the active one", async () => {
    const options = setup();
    const controller = new AbortController();
    options.signal = controller.signal;
    options.interact.mockImplementationOnce(async () => { controller.abort(); });
    await runInteractionBatch([1, 2], options);
    expect(options.interact.mock.calls).toEqual([[1]]);
  });

  it("stops on scene change or interaction rejection", async () => {
    const options = setup();
    options.interact.mockImplementationOnce(async () => { options.shouldStop = () => true; });
    await runInteractionBatch([1, 2], options);
    expect(options.interact.mock.calls).toEqual([[1]]);
    const failed = setup();
    failed.interact.mockRejectedValueOnce(new Error("missing script"));
    await expect(runInteractionBatch([1, 2], failed)).rejects.toThrow("missing script");
    expect(failed.interact).toHaveBeenCalledTimes(1);
  });

  it("does not advance while the script debugger is paused after runScript resolves", async () => {
    vi.useFakeTimers();
    try {
      const options = setup();
      let running = false;
      options.isRunning = () => running;
      options.interact.mockImplementationOnce(async () => { running = true; });
      const batch = runInteractionBatch([1, 2], options);
      await vi.advanceTimersByTimeAsync(150);
      expect(options.interact.mock.calls).toEqual([[1]]);
      running = false;
      await vi.advanceTimersByTimeAsync(50);
      await batch;
      expect(options.interact.mock.calls).toEqual([[1], [2]]);
    } finally {
      vi.useRealTimers();
    }
  });
});
