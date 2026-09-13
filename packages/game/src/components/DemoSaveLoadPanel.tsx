import { useRef, useState } from "react";
import { CloudSaveLoadPanel } from "./CloudSaveLoadPanel";
import { LocalSaveLoadPanel } from "./LocalSaveLoadPanel";
import type { WebSaveLoadPanelProps } from "./WebSaveLoadPanel";

/** Mode selection belongs to the public deployment only. Both panels use the
 * same GameScreen/GamePlaying snapshot callbacks and saveBlockedReason guard.
 */
export function DemoSaveLoadPanel(props: WebSaveLoadPanelProps) {
  const [mode, setMode] = useState<"local" | "cloud">("local");
  const [loading, setLoading] = useState(false);
  const loadLock = useRef(false);
  // Once the engine starts applying a snapshot it cannot be cancelled. Serialize
  // both sources and disable mode changes until that engine operation completes.
  const panelProps = {
    ...props,
    saveBlockedReason: loading ? "正在加载存档，请稍候" : props.saveBlockedReason,
    onLoadSaveData: async (data: Record<string, unknown>) => {
      if (loadLock.current) return false;
      loadLock.current = true;
      setLoading(true);
      try {
        return await props.onLoadSaveData(data);
      } finally {
        loadLock.current = false;
        setLoading(false);
      }
    },
  };
  if (!props.visible) return null;
  return (
    <>
      <div className="px-6 pt-5 text-sm text-white/70 space-y-4">
        <p>
          可将游戏进度保存到本地文件，或登录后保存到云端。导入本地存档或加载云端存档，即可继续游戏。
        </p>
        <fieldset className="flex gap-2" aria-label="存档位置">
          {(["local", "cloud"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              disabled={loading}
              onClick={() => setMode(value)}
              className={`px-4 py-2 rounded-lg ${mode === value ? "bg-blue-500/50 text-white" : "bg-white/10"}`}
            >
              {value === "local" ? "本地存档" : "云端存档"}
            </button>
          ))}
        </fieldset>
      </div>
      {/* Keep cloud operations mounted when switching to local; a pending login
        or save must not be duplicated by unmount/remount. */}
      <div hidden={mode !== "local"}>
        <LocalSaveLoadPanel key={props.gameSlug} {...panelProps} active={mode === "local"} />
      </div>
      <div hidden={mode !== "cloud"}>
        <CloudSaveLoadPanel key={props.gameSlug} {...panelProps} active={mode === "cloud"} />
      </div>
    </>
  );
}
