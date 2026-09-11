# 简历工作台系统架构

状态：架构基线草案  
日期：2026-09-09  
职责：描述系统如何实现 [PRD](简历工作台-PRD.md) 已确认的产品能力，并将产品能力映射为前后端职责。

## 1. 架构目标与边界

架构需要支撑：具体工作内容长期沉淀、简历描述独立演进、简历方案引用、导出快照冻结和多用户数据隔离。

第一阶段采用前后端分离的模块化单体，围绕具体工作内容、简历描述、简历方案和导出快照组织模块。

## 2. 系统上下文

```text
浏览器
  ↓ HTTPS / JSON API
Web 前端（React + TypeScript + Vite）
  ↓
应用 API（Python + FastAPI，模块化单体）
  ├── 用户身份模块
  ├── 经历内容模块
  ├── 简历方案模块
  └── 导出模块
        ↓
      PostgreSQL
```

开发和本地原型使用 Docker PostgreSQL；正式在线版本部署在单台 2C-2G 云服务器上，由 Docker Compose 编排 API、PostgreSQL 和反向代理。

文件导出、对象存储和邮件等外部能力通过适配器接入，领域模块依赖稳定的抽象接口。

## 3. 领域对象与持久化映射

```text
User
├── ExperienceGroup[*]
│   └── WorkContent[*]
│       └── ResumeDescription[*]
└── ResumePlan[*]
    ├── ResumeItemReference[*] -> ResumeDescription
    └── ExportSnapshot[*]
```

建议的关系表边界：

| 领域对象 | 持久化集合 | 关键职责 |
| --- | --- | --- |
| User | `users` | 身份和数据隔离边界，账号即为个人唯一经历工作台 |
| ExperienceGroup | `experience_groups` | 一段实习或一个项目的元数据，直属于用户 |
| WorkContent | `work_contents` | 具体工作内容及其详细记录 |
| ResumeDescription | `resume_descriptions` | 可独立编辑、归档、恢复和回滚的简历描述 |
| ResumePlan | `resume_plans` | 一套可编辑的简历组合，直属于用户 |
| ResumeItemReference | `resume_items` | 具体工作内容与简历描述的引用及排序 |
| ExportSnapshot | `export_snapshots` | 导出时的不可变完整内容 |

字段级设计属于数据库迁移文档，不在本文件重复维护。

## 4. 后端职责

### 4.1 API 层

- 解析当前登录用户身份和资源 ID。
- 校验输入格式和并发版本。
- HTTP handler 调用应用服务，业务规则集中在应用服务和领域模块。
- 将领域错误映射为稳定的 API 错误码。

### 4.2 应用服务层

- `ExperienceGroupService`：经历分组和具体工作内容的创建、更新、排序、归档。
- `ResumeDescriptionService`：简历描述创建、复制、更新、归档、恢复和回滚。
- `ResumePlanService`：简历方案、描述引用、描述切换和排序。
- `ExportService`：解析引用、生成完整内容、写入不可变快照。

### 4.3 仓储与适配器

- 仓储接口按聚合或用例提供窄接口，SQL 由持久化适配器统一封装。
- PostgreSQL 是第一阶段的主要持久化实现。
- 导出渲染器实现独立接口，先支持 Markdown 或单一 PDF 模板。

## 5. 前端职责

前端采用 React + TypeScript + Vite 构建认证后的工作台 SPA，后端采用 Python + FastAPI 提供应用 API。

```text
app/
  ├── AppShell / 路由 / 全局错误
features/
  ├── experience-groups
  ├── work-contents
  ├── resume-descriptions
  └── resume-plans
lib/
  ├── api-client
  ├── domain-types
  └── mock-repository（原型阶段）
```

- 页面负责组合界面和用户操作，API 细节由数据访问层统一管理。
- `work-contents` 负责具体工作内容编辑和列表管理。
- `resume-descriptions` 负责简历描述选择、编辑、归档、恢复和回滚。
- `resume-plans` 负责引用、排序、预览、导出入口和方案内导出历史。
- 原型阶段允许使用 mock repository；接入 API 时替换数据适配层，不重写页面结构。

## 6. 关键业务边界

### 6.1 数据隔离

所有业务查询都直接以当前认证的登录用户（User）为上下文。系统按个人用户账号进行独立数据隔离，服务端同步校验资源归属。

### 6.2 简历描述与引用

- 简历条目保存 `work_content_id + resume_description_id + position`。
- 切换简历描述只更新引用关系。
- 被引用的简历描述进入归档流程，完成引用替换后再处理生命周期结束。

### 6.3 导出快照

导出在一个明确的应用服务操作内完成：读取方案、解析引用、生成完整内容、写入快照。快照保存渲染所需的完整文本和元数据，不依赖后续实时读取。

### 6.4 并发

编辑资源带 `revision` 或等价的乐观并发字段。版本冲突返回可识别错误，由前端提示用户重新加载或比较后再保存。

## 7. API 资源边界（草案）

```text
POST       /api/auth/register
POST       /api/auth/login
POST       /api/auth/logout
GET        /api/auth/me
GET/POST   /api/experience-groups
GET/PATCH  /api/experience-groups/:id
POST       /api/experience-groups/:id/archive
POST       /api/experience-groups/:id/restore
GET/POST   /api/experience-groups/:id/work-contents
POST       /api/experience-groups/:id/work-contents/reorder
PATCH      /api/work-contents/:id
POST       /api/work-contents/:id/archive
POST       /api/work-contents/:id/restore
POST       /api/work-contents/:id/resume-descriptions
PATCH      /api/resume-descriptions/:id
POST       /api/resume-plans
PATCH      /api/resume-plans/:id
POST       /api/resume-plans/:id/items
PATCH      /api/resume-plans/:id/items/:itemId
POST       /api/resume-plans/:id/exports
GET        /api/resume-plans/:id/exports
```

具体请求字段、分页和错误码进入 API 合同文档后再冻结。

## 8. 架构决策状态

| 决策 | 当前状态 | 说明 |
| --- | --- | --- |
| 前端框架 | React + TypeScript + Vite | 适合认证工作台和快速原型迭代 |
| 后端框架 | Python + FastAPI | 适合快速构建 API、文本处理和后续 AI 接入 |
| 后端形态 | 模块化单体 | 降低部署和跨服务协调成本 |
| 数据库 | PostgreSQL | 关系、引用和快照约束清晰 |
| 本地原型数据库 | Docker PostgreSQL | 让本地环境与在线数据库保持一致 |
| 部署形态 | 单台云服务器 + Docker Compose | 适配 100～1000 用户的小规模在线服务 |
| 导出 | 独立适配器 | 避免导出工具侵入简历领域 |
| 多用户隔离 | 第一阶段必须具备 | 所有用户数据按用户账号进行隔离 |

这些是架构建议，不会反向改变 PRD 的产品范围；最终技术选型需在项目初始化前单独确认。
