/**
 * 场景首页（未选中场景时显示）。
 * AI trace: scene list comes from `SceneService.list`; `CreateSceneDialog` uses one existing
 * scene as an MSF-only template and navigates directly to `SceneDetailPage` after creation.
 */
import { trpc } from "@miu2d/shared";
import { useState } from "react";
import { useDashboard } from "../../DashboardContext";
import { DashboardIcons } from "../../icons";
import { CreateSceneDialog } from "./CreateSceneDialog";

export function ScenesHomePage() {
  const { currentGame } = useDashboard();
  const gameId = currentGame?.id;
  const [createOpen, setCreateOpen] = useState(false);

  const { data: scenes, isLoading } = trpc.scene.list.useQuery(
    { gameId: gameId! },
    { enabled: !!gameId }
  );

  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4 opacity-20">{DashboardIcons.map}</div>
        <h2 className="text-lg font-medium text-[#cccccc] mb-2">场景编辑器</h2>
        <p className="text-sm text-[#858585] mb-4">
          {isLoading
            ? "加载中..."
            : scenes?.length
              ? `共 ${scenes.length} 个场景，选择左侧场景开始编辑`
              : "还没有场景数据，点击左侧「批量导入」开始"}
        </p>
        <button
          type="button"
          className="rounded bg-[#0e639c] px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!gameId || !scenes?.length}
          title={scenes?.length ? "创建空白 MMF 场景" : "请先批量导入一个场景作为图块模板"}
          onClick={() => setCreateOpen(true)}
        >
          新建场景
        </button>
        {!isLoading && !scenes?.length ? (
          <div className="mt-2 text-xs text-zinc-500">
            首次创建前需要导入一个带 MSF 图块的模板场景。
          </div>
        ) : null}
      </div>
      {gameId && scenes ? (
        <CreateSceneDialog
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          gameId={gameId}
          scenes={scenes}
        />
      ) : null}
    </div>
  );
}
