import { describe, expect, it, vi } from "vitest";
import { runInteractionBatch } from "../../src/debug/interaction-batch";

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
