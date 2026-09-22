# Issue Tracker：本地 Markdown

本仓库使用 `.scratch/` 下的 Markdown 文件管理需求规格和开发任务。

`.scratch/` **不入版本库**（已在 `.gitignore` 中），定位等同 GitHub 的 issue / PR：它记录开发过程的规格、工单、执行证据与验收结论，只服务本地协作，不随代码发布。本文提到的路径均为仓库外或本地的相对位置。

## 文件约定

- 每个功能使用一个目录：`.scratch/<feature-slug>/`
- 需求规格文件：`.scratch/<feature-slug>/spec.md`
- 开发任务文件：`.scratch/<feature-slug>/issues/<NN>-<slug>.md`
- 任务编号从 `01` 开始，使用一个文件对应一个任务
- 每个任务文件顶部使用 `Status:` 记录 triage 状态
- 评论和补充讨论追加在文件底部的 `## Comments` 标题下

## 发布到 issue tracker

当 skill 要求“发布到 issue tracker”时，在 `.scratch/<feature-slug>/` 下创建对应文件。

## 获取任务

当 skill 要求“获取相关任务”时，读取指定路径下的任务文件。

## Wayfinding 操作

- 地图文件：`.scratch/<effort>/map.md`
- 子任务文件：`.scratch/<effort>/issues/NN-<slug>.md`
- 阻塞关系：使用 `Blocked by: NN, NN`
- 可执行任务：选择已开放、未阻塞、未认领且编号最小的任务
- 认领任务：将 `Status:` 修改为 `claimed`
- 解决任务：追加 `## Answer`，将 `Status:` 修改为 `resolved`，然后更新地图文件
