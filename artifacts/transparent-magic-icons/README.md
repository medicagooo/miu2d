# 武功图标透明化

2026-09-09 用户确认：此前65张生成图和剑侠2后续24张，共89个已采用文件去黑底转透明。27个同文件复用项同步生效。原始图、旧备用图、弃用稿不处理；路径、尺寸、技能数据和映射不变。本次本地修改未推送、未部署。

使用用户确认的程序去黑底方案，无重新生成或重绘。`targets.json` 固定原始89项路径和SHA256；`process.mjs` 从图像边缘查找暗背景，对大块封闭背景同样处理，保留小块封闭阴影。边缘采用软透明度，并反解黑色混合后的RGB，减少浅底黑边。去除强度≤5的背景噪点；发光颜色强度≥160的像素不变。射箭人物所在的材质区域单独降低阈值，保留头发和衣服暗色；残阳如血使用经原图核对的内部遮罩保留黑衣人物，剑与铁鞭的灰色材质也单独保护。形状含义不从颜色自动推断，必须配合视觉检查。

原始输入在处理前按完整路径和哈希备份于本仓库 `.git/codex-artifact-backups/0909-transparent-magic-icons/`，也可从基准提交 `9a280cac4e83297274247998802d1713c3d82bb1` 恢复。脚本总是从原始备份处理，拒绝覆盖不属于本次输入或输出的文件；中断后可重跑，避免重复去底。备份不提交。

- `node artifacts/transparent-magic-icons/process.mjs`：先生成14张代表样本；样本单图忽略提交。
- `node artifacts/transparent-magic-icons/preview.mjs`：生成代表图原始/浅底/深底/灰底对比。
- `node artifacts/transparent-magic-icons/process.mjs --apply`：处理已锁定89项。
- `node artifacts/transparent-magic-icons/verify.mjs`：校验89项尺寸、哈希、透明/半透明/不透明覆盖、高亮像素及人物材质保持，检查原始/备用图哈希，生成浅底总览。需要本地原始备份。
- `node artifacts/transparent-magic-icons/gallery.mjs`：重建可搜索和切换背景的预览。
- `node artifacts/transparent-magic-icons/preview-server.mjs`：打开本地8767预览服务。

`report.json` 保留原始/结果SHA256、透明度统计和重合成黑底的误差；`verification.json` 保留批量验证结果。半透明光晕在浅底上的亮度观感会随背景变化；验证以形状、色相、无黑底和黑底重合成一致性为依据。透明图重合成到黑底后，单通道误差不超过5/255（包含主动去除的背景噪点）。

相关调用无需改动：共享图标解析器继续返回相同PNG路径，游戏与后台使用其原有PNG透明通道显示。两个原资产清单中的文件哈希和复用项记录随此次修改更新。
