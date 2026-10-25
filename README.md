# issue #19 验收截图（证据分支，不合并）

这个分支只放 `scripts/responsive.e2e.mjs` 在容器构建（`localhost:5174`，`/api` 打桩）上跑出来的四档截图，供 PR / issue 直接展示。**不合并进 `main`**，避免把二进制证据塞进主线。

跑法：

```powershell
cd frontend
$env:RESPONSIVE_BASE_URL="http://localhost:5174"
$env:RESPONSIVE_ARTIFACTS=".worktrees/responsive-artifacts"
npm run test:responsive:e2e
```

四档：390（手机竖屏）/ 768（手机横屏·平板竖屏）/ 1024（笔记本拖窄）/ 1440（桌面）。

文件名：`<窗口宽>-<序号>-<界面>.png`

| 序号 | 界面 |
|---|---|
| 01 | 经历列表 |
| 02 | 经历画布（正文 + 大纲栏落位） |
| 03 | 简历亮点抽屉 |
| 04 | 简历方案列表 |
| 05 | 方案编辑器 |
| 06 | 方案编辑器 + 历史版本面板 |
| 07 | 文稿预览 |
| 08 | 画布底部（390 档：滚到底可达） |
| 09 | 新建经历弹窗 |

`results.json` 是同一遍跑的原始断言结果（51 项）与 `scrollWidth / innerWidth / clientWidth` 实测值。
