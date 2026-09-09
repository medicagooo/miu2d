import {
  clampPlayerLevel,
  getPlayerGrowthDetail,
  getPlayerGrowthProfile,
  getPlayerLevelCost,
  getPlayerLevelStartExp,
  PLAYER_GROWTH_PARAMETERS,
  PLAYER_MAX_LEVEL,
} from "@miu2d/types";
import { useState } from "react";

/** Read-only player curves: shares exact runtime integer math, never saves preview rows.
 * Existing level records remain available to partners and older clients via the old API.
 */
export function PlayerGrowthPreview({
  gameSlug,
  initialDifficulty,
}: {
  gameSlug: string;
  initialDifficulty: "easy" | "hard";
}) {
  const [difficulty, setDifficulty] = useState(initialDifficulty);
  const [level, setLevel] = useState(1);
  const [count, setCount] = useState(20);
  const profile = getPlayerGrowthProfile(gameSlug, difficulty);
  if (!profile) return null;
  const params = PLAYER_GROWTH_PARAMETERS[profile];
  const rows = Array.from({ length: Math.min(count, PLAYER_MAX_LEVEL - level + 1) }, (_, i) =>
    getPlayerGrowthDetail(profile, level + i)
  );
  const { k, q, r } = params.experience;
  return (
    <div className="h-full overflow-auto p-6 text-[#cccccc] space-y-5">
      <div className="flex items-center gap-4 flex-wrap">
        <h2 className="text-xl font-semibold text-white">玩家成长 · 最高1000级</h2>
        <select
          aria-label="成长难度"
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value as "easy" | "hard")}
          className="bg-[#333] rounded px-3 py-2"
        >
          <option value="easy">简单</option>
          <option value="hard">困难</option>
        </select>
      </div>
      <p className="text-sm">
        玩家属性与经验统一由公式计算，等级行仅供预览。1级保持原基础值，{params.originalMaxLevel}
        级基础属性为原版的105%（向上取整）。旧等级表继续供伙伴及旧客户端使用。
      </p>
      <details className="text-sm bg-[#252526] p-4 rounded">
        <summary className="cursor-pointer">查看成长公式与参数</summary>
        <p className="mt-3">属性 A(L) = floor(a + b × ((1 + (L−1)/10)^p − 1))</p>
        <p>
          每级经验 C(L) = ceil({k} × L^{q} × exp({r} × (1 − exp(−((L−1)/40)²))))
        </p>
        <p>累计经验为各级经验之和；1000级停止获得角色经验，武功经验照常。</p>
        <table className="mt-3 text-right">
          <thead>
            <tr>
              <th className="pr-5">属性</th>
              <th className="pr-5">a</th>
              <th className="pr-5">b</th>
              <th>p</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(params.attributes).map(([name, v]) => (
              <tr key={name}>
                <td className="pr-5">
                  {
                    {
                      lifeMax: "生命",
                      thewMax: "体力",
                      manaMax: "内力",
                      attack: "攻击",
                      defend: "防御",
                      evade: "身法",
                    }[name]
                  }
                </td>
                <td className="pr-5">{v.a}</td>
                <td className="pr-5">{v.b}</td>
                <td>{v.p}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
      <div className="flex items-center gap-3 flex-wrap text-sm">
        <label>
          起始等级{" "}
          <input
            aria-label="预览起始等级"
            type="number"
            min={1}
            max={1000}
            value={level}
            onChange={(e) => setLevel(clampPlayerLevel(Number(e.target.value)))}
            className="ml-2 w-24 bg-[#333] rounded px-2 py-1"
          />
        </label>
        <button
          type="button"
          onClick={() => setLevel(Math.max(1, level - count))}
          disabled={level === 1}
          className="px-3 py-1 bg-[#333] disabled:opacity-40 rounded"
        >
          上一页
        </button>
        <button
          type="button"
          onClick={() => setLevel(Math.min(1000, level + count))}
          disabled={level + count > 1000}
          className="px-3 py-1 bg-[#333] disabled:opacity-40 rounded"
        >
          下一页
        </button>
        <button
          type="button"
          onClick={() => setCount(Math.min(1000, count + 1))}
          disabled={level + count > 1000}
          className="px-3 py-1 bg-[#0e639c] disabled:opacity-40 rounded"
        >
          添加一级预览
        </button>
        <span>只读预览，无需保存</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-right tabular-nums">
          <thead className="bg-[#333]">
            <tr>
              {[
                "等级",
                "生命",
                "体力",
                "内力",
                "攻击",
                "防御",
                "身法",
                "升下一级经验",
                "到达本级累计经验",
              ].map((label) => (
                <th key={label} className="p-3 whitespace-nowrap">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.level} className="border-b border-[#333]">
                {[
                  row.level,
                  row.lifeMax,
                  row.thewMax,
                  row.manaMax,
                  row.attack,
                  row.defend,
                  row.evade,
                ].map((value, i) => (
                  <td key={i} className="p-3">
                    {value.toLocaleString()}
                  </td>
                ))}
                <td className="p-3">
                  {row.level === 1000
                    ? "满级"
                    : getPlayerLevelCost(profile, row.level).toLocaleString()}
                </td>
                <td className="p-3">
                  {getPlayerLevelStartExp(profile, row.level).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
