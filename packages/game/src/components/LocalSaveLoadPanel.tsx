import { isSaveData, LOCAL_SAVE_FORMAT, MAX_SAVE_BYTES } from "@miu2d/types";
import { useEffect, useRef, useState } from "react";
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
  visible,
  active = true,
}: WebSaveLoadPanelProps & { active?: boolean }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const valid = useRef(true);
  const generation = useRef(0);
  useEffect(() => {
    valid.current = visible && active;
    generation.current += 1;
    return () => {
      valid.current = false;
      generation.current += 1;
    };
  }, [visible, active]);
  function download() {
    try {
      const snapshot = onCollectSaveData();
      if (!snapshot) throw new Error("当前无法保存，请稍后重试");
      const blob = new Blob(
        [JSON.stringify({ format: LOCAL_SAVE_FORMAT, gameSlug, data: snapshot.data })],
        { type: "application/json" }
      );
      if (blob.size > MAX_SAVE_BYTES) throw new Error("存档文件过大");
      const url = URL.createObjectURL(blob);
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
    const epoch = generation.current;
    setBusy(true);
    setMessage("");
    try {
      if (file.size > MAX_SAVE_BYTES) throw new Error("存档文件过大");
      const saved = JSON.parse(await file.text());
      if (!valid.current || epoch !== generation.current) return;
      if (saved?.format !== LOCAL_SAVE_FORMAT || saved.gameSlug !== gameSlug)
        throw new Error("请选择当前游戏导出的存档");
      const data = saved.data;
      if (!isSaveData(data)) throw new Error("存档格式无效");
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
      <p>本地存档无需登录。请保留下载的文件，以便下次导入。</p>
      {saveBlockedReason && <output>{saveBlockedReason}</output>}
      {canSave && (
        <button
          type="button"
          disabled={busy || !!saveBlockedReason}
          onClick={download}
          className="px-4 py-2 rounded bg-blue-500/60 disabled:opacity-40"
        >
          保存到本地
        </button>
      )}
      <label className="block">
        导入本地存档
        <input
          type="file"
          aria-label="导入本地存档"
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
      {busy && <output>正在读档…</output>}
      {message && <output>{message}</output>}
    </div>
  );
}
