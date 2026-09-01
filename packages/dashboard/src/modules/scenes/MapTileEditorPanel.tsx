/**
 * MMF 三层瓦片绘制控制面板。
 *
 * AI trace:
 * - `SceneDetailPage` owns map arrays, dirty/history state and save mutation, then passes
 *   commands into this presentational component.
 * - `MapViewer.onTileResourcesLoaded` supplies already-decoded MSF atlas canvases; this panel
 *   only crops frame previews and returns the one-based `{msfIndex, frame}` selection.
 * - Pointer painting itself remains in `MapViewer` so screen/world/tile conversion has one
 *   authoritative implementation.
 */
import type { MapTileResource } from "@miu2d/viewer";
import { useEffect, useMemo, useRef, useState } from "react";

export type MapTileLayer = "layer1" | "layer2" | "layer3";
export type MapTileTool = "pan" | "brush" | "eraser" | "eyedropper";

export interface MapTileSelection {
  msfIndex: number;
  frame: number;
}

export interface MapTileEditorControls {
  resources: readonly MapTileResource[];
  activeLayer: MapTileLayer;
  tool: MapTileTool;
  selectedTile: MapTileSelection | null;
  dirty: boolean;
  saving: boolean;
  saveMessage: string;
  canUndo: boolean;
  canRedo: boolean;
  onLayerChange: (layer: MapTileLayer) => void;
  onToolChange: (tool: MapTileTool) => void;
  onTileSelect: (tile: MapTileSelection) => void;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onDiscard: () => void;
}

function TileFramePreview({ resource, frame }: { resource: MapTileResource; frame: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const rect = resource.frames[frame];
    if (!canvas || !rect) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const size = 52;
    canvas.width = size;
    canvas.height = size;
    ctx.clearRect(0, 0, size, size);
    ctx.imageSmoothingEnabled = false;
    const scale = Math.min(size / rect.width, size / rect.height, 1);
    const width = Math.max(1, Math.round(rect.width * scale));
    const height = Math.max(1, Math.round(rect.height * scale));
    ctx.drawImage(
      resource.atlas,
      rect.x,
      rect.y,
      rect.width,
      rect.height,
      Math.floor((size - width) / 2),
      size - height,
      width,
      height
    );
  }, [resource, frame]);

  return <canvas ref={canvasRef} className="block h-[52px] w-[52px]" />;
}

const layerLabels: { value: MapTileLayer; label: string; title: string }[] = [
  { value: "layer1", label: "L1", title: "地面层" },
  { value: "layer2", label: "L2", title: "主体层" },
  { value: "layer3", label: "L3", title: "遮挡层" },
];

const toolLabels: { value: MapTileTool; label: string; title: string }[] = [
  { value: "pan", label: "✋", title: "平移地图" },
  { value: "brush", label: "✎", title: "瓦片画笔" },
  { value: "eraser", label: "⌫", title: "擦除瓦片" },
  { value: "eyedropper", label: "⌾", title: "吸取瓦片" },
];

export function MapTileEditorPanel({ controls }: { controls: MapTileEditorControls }) {
  const [resourceIndex, setResourceIndex] = useState<number | null>(null);
  const selectedMsfIndex = controls.selectedTile?.msfIndex;

  useEffect(() => {
    if (controls.resources.length === 0) {
      setResourceIndex(null);
      return;
    }
    const selectedResource = selectedMsfIndex
      ? controls.resources.findIndex((resource) => resource.msfIndex === selectedMsfIndex)
      : -1;
    setResourceIndex(selectedResource >= 0 ? selectedResource : 0);
  }, [controls.resources, selectedMsfIndex]);

  const resource = useMemo(
    () => (resourceIndex === null ? null : (controls.resources[resourceIndex] ?? null)),
    [controls.resources, resourceIndex]
  );

  return (
    <div className="rounded border border-[#3c3c3c] bg-[#252526] p-2 space-y-2">
      <div className="flex items-center gap-1">
        <span className="text-xs font-medium text-zinc-300 flex-1">
          瓦片绘制{controls.dirty ? <span className="ml-1 text-yellow-400">●</span> : null}
        </span>
        <button
          type="button"
          className="rounded bg-[#3c3c3c] px-2 py-1 text-xs text-zinc-300 disabled:opacity-40"
          disabled={!controls.dirty || controls.saving}
          onClick={controls.onDiscard}
        >
          放弃
        </button>
        <button
          type="button"
          className="rounded bg-[#0e639c] px-2 py-1 text-xs text-white disabled:opacity-40"
          disabled={!controls.dirty || controls.saving}
          onClick={controls.onSave}
        >
          {controls.saving ? "保存中" : "保存"}
        </button>
      </div>

      {controls.saveMessage ? (
        <div className="text-[11px] text-zinc-400">{controls.saveMessage}</div>
      ) : null}

      <div className="flex items-center gap-1">
        {layerLabels.map((layer) => (
          <button
            key={layer.value}
            type="button"
            title={layer.title}
            className={`rounded px-2 py-1 text-xs ${
              controls.activeLayer === layer.value
                ? "bg-[#0e639c] text-white"
                : "bg-[#3c3c3c] text-zinc-300"
            }`}
            onClick={() => controls.onLayerChange(layer.value)}
          >
            {layer.label}
          </button>
        ))}
        <span className="mx-1 h-5 w-px bg-[#454545]" />
        {toolLabels.map((tool) => (
          <button
            key={tool.value}
            type="button"
            title={tool.title}
            className={`h-7 w-7 rounded text-sm ${
              controls.tool === tool.value
                ? "bg-[#0e639c] text-white"
                : "bg-[#3c3c3c] text-zinc-300"
            }`}
            onClick={() => controls.onToolChange(tool.value)}
          >
            {tool.label}
          </button>
        ))}
        <span className="flex-1" />
        <button
          type="button"
          title="撤销"
          className="h-7 w-7 rounded bg-[#3c3c3c] text-xs text-zinc-300 disabled:opacity-30"
          disabled={!controls.canUndo}
          onClick={controls.onUndo}
        >
          ↶
        </button>
        <button
          type="button"
          title="重做"
          className="h-7 w-7 rounded bg-[#3c3c3c] text-xs text-zinc-300 disabled:opacity-30"
          disabled={!controls.canRedo}
          onClick={controls.onRedo}
        >
          ↷
        </button>
      </div>

      {controls.resources.length === 0 ? (
        <div className="py-3 text-center text-xs text-zinc-500">正在加载 MSF 图块…</div>
      ) : (
        <>
          <select
            className="w-full rounded border border-[#454545] bg-[#1e1e1e] px-2 py-1 text-xs text-zinc-300"
            value={resourceIndex ?? 0}
            onChange={(event) => setResourceIndex(Number(event.target.value))}
          >
            {controls.resources.map((entry, index) => (
              <option key={`${entry.msfIndex}-${entry.name}`} value={index}>
                [{entry.msfIndex}] {entry.name} ({entry.frames.length}帧)
              </option>
            ))}
          </select>

          {resource ? (
            <div className="grid max-h-52 grid-cols-4 gap-1 overflow-y-auto pr-1">
              {resource.frames.map((_, frame) => {
                const selected =
                  controls.selectedTile?.msfIndex === resource.msfIndex &&
                  controls.selectedTile.frame === frame;
                return (
                  <button
                    key={frame}
                    type="button"
                    title={`${resource.name} / frame ${frame}`}
                    className={`relative overflow-hidden rounded border bg-[#1e1e1e] ${
                      selected ? "border-[#0098ff] ring-1 ring-[#0098ff]" : "border-[#3c3c3c]"
                    }`}
                    onClick={() => {
                      controls.onTileSelect({ msfIndex: resource.msfIndex, frame });
                      controls.onToolChange("brush");
                    }}
                  >
                    <TileFramePreview resource={resource} frame={frame} />
                    <span className="absolute bottom-0 right-0 bg-black/70 px-1 text-[9px] text-zinc-300">
                      {frame}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
