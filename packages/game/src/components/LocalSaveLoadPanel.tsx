import { useState } from "react";
import type { WebSaveLoadPanelProps } from "./WebSaveLoadPanel";

/** Demo-only file saves use the same engine snapshot callbacks as cloud saves.
 * The envelope binds the snapshot to its game; no server or account is involved.
 */
export function LocalSaveLoadPanel({
  gameSlug,
  canSave,
  saveBlockedReason,
  onCollectSaveData,
  onLoadSaveData,
  onClose,
}: WebSaveLoadPanelProps) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  function download() {
    try {
      const snapshot = onCollectSaveData();
      if (!snapshot) throw new Error("当前无法保存，请稍后重试");
      const url = URL.createObjectURL(
        new Blob([JSON.stringify({ format: "miu2d-local-v1", gameSlug, data: snapshot.data })], {
          type: "application/json",
        })
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `${gameSlug}-${Date.now()}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage("存档已导出，请保留下载的文件。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "导出失败");
    }
  }
  async function load(file: File) {
    setBusy(true);
    setMessage("");
    try {
      if (file.size > 20 * 1024 * 1024) throw new Error("存档文件过大");
      const saved = JSON.parse(await file.text());
      if (saved?.format !== "miu2d-local-v1" || saved.gameSlug !== gameSlug)
        throw new Error("请选择当前游戏导出的存档");
      const data = saved.data;
      if (
        !data ||
        typeof data !== "object" ||
        !Number.isFinite(data.version) ||
        !data.player ||
        !data.state ||
        !data.snapshot
      )
        throw new Error("存档格式无效");
      if (!(await onLoadSaveData(data))) throw new Error("读档失败，请检查存档文件");
      onClose();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "读档失败");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="p-6 space-y-5 text-white/80 text-sm">
      <p>存档保存在你下载的文件中，可在这里导入继续游戏。</p>
      {saveBlockedReason && <p role="status">{saveBlockedReason}</p>}
      {canSave && (
        <button
          type="button"
          disabled={busy || !!saveBlockedReason}
          onClick={download}
          className="px-4 py-2 rounded bg-blue-500/60 disabled:opacity-40"
        >
          导出本地存档
        </button>
      )}
      <label className="block">
        导入本地存档
        <input
          type="file"
          accept=".json,application/json"
          disabled={busy || !!saveBlockedReason}
          className="block mt-3 max-w-full"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void load(file);
          }}
        />
      </label>
      {busy && <p role="status">正在读档…</p>}
      {message && <p role="status">{message}</p>}
    </div>
  );
}
