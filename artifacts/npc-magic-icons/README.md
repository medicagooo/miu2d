# NPC 武功图标资产包

## 交付状态

- 已生成并校验 34 枚实际 NPC 武功图标，输出为 `icons/*.png`，尺寸统一为 128×128。
- `contact-sheet.png` 按本表顺序排列，用于快速视觉验收。
- `manifest.json` 提供配置键、显示名、运动/效果依据和 PNG 路径的机器可读映射。
- Web 运行资产复制到 `packages/web/public/npc-magic-icons/`；共享回退解析器按配置键接入游戏缓存、后台武功列表和武功选择器，已有 ASF/MSF 图标仍优先。
- 数据中的 `Relation.Ini` 没有 `moveKind`，也不是 `magic-*.ini` 武功配置，因此判定为误归类记录并排除；没有为它虚构图标。

## 映射清单

| # | 配置键 | 显示名 | 数据依据 | 图标设计 | 文件 |
|---:|---|---|---|---|---|
| 1 | `magic-百剑诀.ini` | 百剑诀 | `RegionBased`，附带 `AddThewOrPoison` | 中央主剑与环形百剑阵 | `icons/magic-百剑诀.png` |
| 2 | `magic-柳叶飞刀.ini` | 柳叶飞刀 | `SingleMove`，40 帧 | 柳叶形飞刀与青绿高速尾迹 | `icons/magic-柳叶飞刀.png` |
| 3 | `magic-月眉儿攻击.ini` | 月眉儿攻击 | `RegionBased`，23 帧 | 月牙刃组成的蓝紫区域旋风 | `icons/magic-月眉儿攻击.png` |
| 4 | `magic-弓箭.ini` | 弓箭 | `SingleMove`，40 帧 | 金弓与蓄力箭矢 | `icons/magic-弓箭.png` |
| 5 | `magic-蜂王毒刺.ini` | 蜂王毒刺 | `SingleMove`，附带 `AddThewOrPoison` | 蜂王尾针、蜂巢与毒液 | `icons/magic-蜂王毒刺.png` |
| 6 | `magic-孟知秋攻击.ini` | 孟知秋攻击 | `RegionBased`，20 帧 | 长剑劈出的蓝金区域剑气 | `icons/magic-孟知秋攻击.png` |
| 7 | `magic-两格长枪.ini` | 长枪 | `SingleMove`，4 帧 | 长枪突刺与红色命中火花 | `icons/magic-两格长枪.png` |
| 8 | `magic-金针攻击.ini` | 金针攻击 | `WallMove`，30 帧 | 成墙排列的金针与电光 | `icons/magic-金针攻击.png` |
| 9 | `magic-紫轩攻击.ini` | 花瓣攻击 | `SingleMove`，40 帧 | 紫红花瓣凝成的单体飞梭 | `icons/magic-紫轩攻击.png` |
| 10 | `magic-强盗飞刀.ini` | 飞刀 | `RandomSector`，24 帧 | 扇形散射的粗制飞刀 | `icons/magic-强盗飞刀.png` |
| 11 | `magic-刀.ini` | 刀 | `SingleMove`，2 帧 | 弯刀与赤红近战斩痕 | `icons/magic-刀.png` |
| 12 | `magic-毒液2.ini` | 毒液2 | `SectorMove`，20 帧 | 扇面喷发的酸绿毒液 | `icons/magic-毒液2.png` |
| 13 | `magic-符咒攻击.ini` | 符咒攻击 | `SectorMove` | 三道符纸扇形齐发 | `icons/magic-符咒攻击.png` |
| 14 | `magic-推山填海.ini` | 镇狱破天劲 | `RandomSector`，`effect=1000`，附带 `AddLifeOrFrozen` | 冰蓝真气重拳冲破岩环 | `icons/magic-推山填海.png` |
| 15 | `magic-土系攻击2.ini` | 土系攻击2 | `SpiralMove`，40 帧 | 螺旋卷起的巨岩与尘土 | `icons/magic-土系攻击2.png` |
| 16 | `magic-悲天悯人咒.ini` | 悲天悯人咒 | `RegionBased`，23 帧 | 净水白莲与宁静区域光环 | `icons/magic-悲天悯人咒.png` |
| 17 | `magic-火系攻击2.ini` | 火系攻击2 | `RegionBased`，40 帧 | 火球落入燃烧法阵 | `icons/magic-火系攻击2.png` |
| 18 | `magic-飞刀.ini` | 飞刀 | `SingleMove`，40 帧 | 单枚银色飞刀与蓝色直线尾迹 | `icons/magic-飞刀.png` |
| 19 | `magic-蔷薇攻击.ini` | 蔷薇攻击 | `FollowEnemy`，40 帧 | 带追踪准星的荆棘蔷薇 | `icons/magic-蔷薇攻击.png` |
| 20 | `magic-毒液.ini` | 毒液 | `SectorMove`，20 帧 | 倾倒毒瓶与紫绿毒液扇流 | `icons/magic-毒液.png` |
| 21 | `magic-暗器2.ini` | 暗器2 | `SingleMove`，100 帧 | 蓝黑十字暗器与长距离气流 | `icons/magic-暗器2.png` |
| 22 | `magic-小符咒攻击.ini` | 小符咒攻击 | `RandomSector`，40 帧 | 小型符纸与随机金紫电弧 | `icons/magic-小符咒攻击.png` |
| 23 | `magic-火系攻击3.ini` | 火系攻击3 | `SectorMove`，40 帧 | 扇面推进的烈焰掌风 | `icons/magic-火系攻击3.png` |
| 24 | `magic-冰刀攻击.ini` | 冰刀攻击 | `SingleMove`，40 帧 | 冰蓝刀刃与霜晶直线尾迹 | `icons/magic-冰刀攻击.png` |
| 25 | `magic-蝙蝠.ini` | 蝙蝠 | `SingleMove`，20 帧 | 紫绿妖蝠俯冲 | `icons/magic-蝙蝠.png` |
| 26 | `magic-纳兰潜凛攻击.ini` | 纳兰潜凛攻击 | `CircleMove`，40 帧 | 三道冰紫刃影绕心旋转 | `icons/magic-纳兰潜凛攻击.png` |
| 27 | `magic-水系攻击2.ini` | 水系攻击2 | `SingleMove`，40 帧 | 水龙形冰蓝弹体 | `icons/magic-水系攻击2.png` |
| 28 | `magic-毒烟攻击.ini` | 毒烟攻击 | `SingleMove`，80 帧 | 香炉吐出蛇形紫绿毒烟 | `icons/magic-毒烟攻击.png` |
| 29 | `magic-长剑.ini` | 长剑 | `SingleMove`，2 帧 | 银色长剑与冷蓝剑芒 | `icons/magic-长剑.png` |
| 30 | `magic-金刚电闪.ini` | 金刚电闪 | `RandomSector`，40 帧 | 金刚拳与分叉紫电 | `icons/magic-金刚电闪.png` |
| 31 | `magic-水系攻击1.ini` | 水系攻击1 | `SingleMove`，40 帧 | 紧凑水弹与青蓝飞行尾迹 | `icons/magic-水系攻击1.png` |
| 32 | `magic-沙暴攻击.ini` | 沙暴攻击 | `LineMove`，40 帧 | 沙金直线旋风刃 | `icons/magic-沙暴攻击.png` |
| 33 | `magic-金钱镖.ini` | 金钱镖 | `SectorMove`，40 帧 | 三枚方孔钱镖扇形齐射 | `icons/magic-金钱镖.png` |
| 34 | `magic-花瓣攻击.ini` | 花瓣攻击 | `CircleMove`，50 帧 | 粉白花瓣绕玉心环形旋转 | `icons/magic-花瓣攻击.png` |

## 生成规格

使用内置图像生成模式，以 `packages/web/public/screenshot/game-yuying.png` 右下角玩家武功图标为画风参考。共同提示词模板为：

> 1990 年代末中国武侠等距 RPG 的紧凑武功图标；手绘精灵质感，宝石色辉光，40×40 下仍清晰的主体轮廓，轻微像素边缘，克制细节，深色烟雾背景；居中单一徽记，方形安全留白；无文字、字母、数字、UI 边框、人物、水印或写实摄影。

各图标再叠加上表“数据依据”和“图标设计”对应的具体效果描述。生成原图为方形 PNG，本资产包使用高质量双三次缩放输出 128×128 版本。

## AI-TRACE

- 目的：为 `/game/:slug/api/data` 返回的 NPC 武功补齐可辨识的候选图标资产。
- 上游：`magics.npc` 中的 `key`、`name`、`moveKind`、`lifeFrame`、`specialKind` 和效果字段；玩家热栏图标仅作为画风参考。
- 下游：`packages/shared/src/lib/npc-magic-icons.ts` 解析已知 NPC 配置键；引擎缓存、后台列表/选择器和原生图片兼容组件消费 Web-public PNG，`contact-sheet.png` 仅用于审核。
- 相邻关系：已有 ASF/MSF 图标仍走原资源根目录、WASM 解码与 Canvas 动画；只有 `icon` 为空且配置键在显式清单内的 NPC 武功使用本地 PNG。
- 兼容约束：回退不会修改数据库、API 响应或 S3；新增 NPC 配置必须先提供同名 PNG 并加入共享显式清单，否则继续显示原占位图。
