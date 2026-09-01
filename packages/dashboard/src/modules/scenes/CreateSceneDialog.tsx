/**
 * 新建可绘制 MMF 场景向导。
 *
 * AI trace:
 * - `ScenesHomePage` opens this dialog with the current game's scene list.
 * - A template scene supplies only its MSF table; `scopeMsfEntryName` emits explicit
 *   `@miu2d-root/` references (including legacy subdirectories) while
 *   `createBlankMiuMapData` creates independent empty tile/property arrays.
 * - `SceneService.create(mapParsed)` serializes the draft to `scenes.mmfData`, after which
 *   `SceneDetailPage` becomes the sole editing/persistence owner.
 */
import { createBlankMiuMapData, miuMapDataToDto } from "@miu2d/engine/resource/format/mmf-dto";
import { trpc, useToast } from "@miu2d/shared";
import { type SceneListItem, scopeMsfEntryName } from "@miu2d/types";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export function CreateSceneDialog({
  open,
  onClose,
  gameId,
  scenes,
}: {
  open: boolean;
  onClose: () => void;
  gameId: string;
  scenes: readonly SceneListItem[];
}) {
  const navigate = useNavigate();
  const toast = useToast();
  const utils = trpc.useUtils();
  const createMutation = trpc.scene.create.useMutation();
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [sourceSceneId, setSourceSceneId] = useState("");
  const [columns, setColumns] = useState("80");
  const [rows, setRows] = useState("80");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open && !sourceSceneId && scenes[0]) setSourceSceneId(scenes[0].id);
  }, [open, scenes, sourceSceneId]);

  const { data: sourceScene, isLoading: sourceLoading } = trpc.scene.get.useQuery(
    { gameId, id: sourceSceneId || "00000000-0000-0000-0000-000000000000" },
    { enabled: open && !!sourceSceneId }
  );

  useEffect(() => {
    if (!sourceScene?.mapParsed) return;
    setColumns(String(sourceScene.mapParsed.mapColumnCounts));
    setRows(String(sourceScene.mapParsed.mapRowCounts));
  }, [sourceScene?.mapParsed]);

  if (!open) return null;

  const handleCreate = async () => {
    setError("");
    const trimmedName = name.trim();
    const trimmedKey = key.trim();
    const columnCount = Number(columns);
    const rowCount = Number(rows);
    if (!trimmedName) {
      setError("请输入场景名称");
      return;
    }
    if (!/^[A-Za-z0-9_-]+$/.test(trimmedKey)) {
      setError("场景 key 只能包含英文字母、数字、下划线和连字符");
      return;
    }
    if (!sourceScene?.mapParsed) {
      setError("请选择一个包含 MMF 数据的模板场景");
      return;
    }

    try {
      const sourceMapName = sourceScene.mapFileName.replace(/\.(map|mmf)$/i, "");
      const scopedEntries = sourceScene.mapParsed.msfEntries.map((entry) => {
        const scopedName = scopeMsfEntryName(sourceMapName, entry.name);
        if (!scopedName) throw new Error(`模板包含不安全的 MSF 引用: ${entry.name}`);
        return { ...entry, name: scopedName };
      });
      if (scopedEntries.length === 0) throw new Error("模板场景没有可用的 MSF 图块");

      const blankMap = createBlankMiuMapData(columnCount, rowCount, scopedEntries);
      const created = await createMutation.mutateAsync({
        gameId,
        key: trimmedKey,
        name: trimmedName,
        mapFileName: `${trimmedKey}.mmf`,
        mapParsed: miuMapDataToDto(blankMap),
        data: { scripts: {}, traps: {}, npc: {}, obj: {} },
      });
      await utils.scene.list.invalidate({ gameId });
      toast.success(`已创建空白场景「${trimmedName}」`);
      onClose();
      navigate(`/dashboard/${gameId}/scenes/${created.id}`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : String(createError));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-[520px] max-w-[calc(100vw-32px)] rounded border border-[#454545] bg-[#252526] shadow-2xl">
        <div className="border-b border-[#454545] px-5 py-3 text-sm font-medium text-white">
          新建可绘制场景
        </div>
        <div className="space-y-4 p-5 text-sm">
          <label className="block space-y-1">
            <span className="text-xs text-zinc-400">场景名称</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded border border-[#454545] bg-[#1e1e1e] px-3 py-2 text-white"
              placeholder="例如：试炼洞窟"
              autoFocus
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-zinc-400">场景 key / MMF 文件名</span>
            <input
              value={key}
              onChange={(event) => setKey(event.target.value)}
              className="w-full rounded border border-[#454545] bg-[#1e1e1e] px-3 py-2 font-mono text-white"
              placeholder="map_trial_cave"
            />
            <span className="text-[11px] text-zinc-500">保存为 {key.trim() || "<key>"}.mmf</span>
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-zinc-400">图块模板</span>
            <select
              value={sourceSceneId}
              onChange={(event) => setSourceSceneId(event.target.value)}
              className="w-full rounded border border-[#454545] bg-[#1e1e1e] px-3 py-2 text-white"
            >
              {scenes.map((scene) => (
                <option key={scene.id} value={scene.id}>
                  {scene.name} ({scene.mapFileName})
                </option>
              ))}
            </select>
            <span className="text-[11px] text-zinc-500">
              只复用模板的 MSF 美术图块；不会复制模板地图、障碍、陷阱或实体布局。
            </span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="text-xs text-zinc-400">列数</span>
              <input
                type="number"
                min={2}
                max={65535}
                value={columns}
                onChange={(event) => setColumns(event.target.value)}
                className="w-full rounded border border-[#454545] bg-[#1e1e1e] px-3 py-2 text-white"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-400">行数</span>
              <input
                type="number"
                min={3}
                max={65535}
                value={rows}
                onChange={(event) => setRows(event.target.value)}
                className="w-full rounded border border-[#454545] bg-[#1e1e1e] px-3 py-2 text-white"
              />
            </label>
          </div>
          {error ? (
            <div className="rounded bg-red-950/50 px-3 py-2 text-xs text-red-300">{error}</div>
          ) : null}
        </div>
        <div className="flex justify-end gap-2 border-t border-[#454545] px-5 py-3">
          <button
            type="button"
            className="rounded px-4 py-2 text-sm text-zinc-300 hover:bg-[#3c3c3c]"
            onClick={onClose}
          >
            取消
          </button>
          <button
            type="button"
            className="rounded bg-[#0e639c] px-4 py-2 text-sm text-white disabled:opacity-40"
            disabled={createMutation.isPending || sourceLoading || scenes.length === 0}
            onClick={() => void handleCreate()}
          >
            {createMutation.isPending ? "创建中…" : "创建并打开"}
          </button>
        </div>
      </div>
    </div>
  );
}
