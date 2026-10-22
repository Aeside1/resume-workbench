# ADR 009: 采用 Pydantic AI 作为 Agent 引擎（进程内隐式循环）

- **状态（Status）**：Accepted（已确认）
- **日期（Date）**：2026-10-22
- **决策者（Deciders）**：用户 & AI Pair
- **关联文档**：[CONTEXT.md](../CONTEXT.md)、[ARCHITECTURE.md](../ARCHITECTURE.md)、issue #10、[ADR 005](005-resume-plan-reference-model-and-archive-boundary.md)

---

## 1. 背景与问题陈述（Context）

issue #10 的方向校准为：**Agent 主导撰写经历与亮点，用户只做审阅、微调与采纳**。产品需要一条「用户给种子材料 → Agent 整理成稿 → 提案 → 用户采纳 → 继续细化」的主路径，而不是让用户从零手写。

这条路径对技术栈提出七条硬约束：

1. **真 Agent**：带工具、支持多轮，而不是一次性文本补全。
2. **多协议供应商**：模型尚未锁定，需要同时支持 OpenAI 兼容接口（DeepSeek / 通义 / Kimi 等）、Anthropic、Gemini 等协议。
3. **会话持久化**：多轮上下文要能跨请求恢复，前端断开重连不能丢。
4. **流式输出**：文本增量、工具调用与提案事件要能映射到浏览器 SSE。
5. **结构化提案**：提案是强类型对象，不是自由文本；schema 校验失败要能重试。
6. **单进程自托管**：现有部署是单台 2C-2G、Docker Compose、Python + FastAPI 单体；不接受为 Agent 另起一个运行时或托管平台。
7. **低约束循环**：控制流由模型自己决定——读什么、调什么工具、何时收尾；代码只提供工具、预算与输出契约，不预先编排阶段、不写死流程。

另有两条来自现状的约束：仓库没有 Alembic（新增表由 `create_all` 建、数据搬运手写幂等 SQL）；产品规模是个人用户、低并发，不需要分布式编排。

## 2. 决策要点（Decisions）

### 2.1 唯一 Agent 引擎：Pydantic AI，跑在 FastAPI 进程内

- Agent 的循环（模型 → 工具 → 模型）由 Pydantic AI 的 `Agent.run()` 内部完成，**不自研循环**，也不引入图编排。
- **控制流归模型**：不定义阶段、不预置分支；约束只放在三个地方——工具面（只读）、预算（`UsageLimits`）、输出契约（提案 schema）。模型自己决定先读哪块材料、要不要再查一条已有亮点、什么时候收尾。
- 预算闸门使用 `UsageLimits`（请求数、工具调用数、token 上限），超限抛错而不是无限循环。
- 结构化交付使用 `output_type=ToolOutput(ProposalSet)`：强制模型通过工具调用产出提案，跨供应商行为一致，不依赖各家对 strict JSON schema 的支持。
- 提案的 Pydantic 模型就是领域契约，和 FastAPI 现有 schema 风格同构。

### 2.2 多协议：配置在模型层，业务层不写 provider 分支

- 模型以 `provider:model` 形式配置；OpenAI 兼容接口通过 base_url 覆盖接入。
- 跨供应商兜底使用 `FallbackModel`（注意其形态可能随主版本调整，升级时复核）。
- 维护一张能力表（`streaming` / `tool_call` / `strict_schema` / `context_window`），运行时按**能力**而不是按供应商名选择降级路径。
- 业务代码中出现 `if provider == ...` 即视为设计错误。

### 2.3 提案闸门：Agent 没有写库工具

- Agent 只挂读工具（v1 甚至一个都不挂，上下文由 FastAPI 装配后注入 prompt）；写入正式资产一律由前端「采纳」触发现有 REST。
- 因此不需要框架级的 durable interrupt：提案交付后就结束一轮，采纳是另一条独立请求。Pydantic AI 的 deferred tools 保留为将来「工具级审批」的可选项，本切片不用。
- 与 [CONTEXT.md](../CONTEXT.md)「AI 先生成待确认的内容提案，再进入正式内容」的既有边界一致。

### 2.4 会话与长任务：会话表 + 事件表，不引入第二个组件

- 会话消息用 `ModelMessagesTypeAdapter` 序列化，按 `session_id` 存一行（字段：用户、场景、消息 JSON、token 计数、过期时间），新建表由 `create_all` 建立。
- 单轮运行可能超过 HTTP 请求时长：在 FastAPI 内起 asyncio 后台任务跑 `agent.run_stream()`，事件追加到会话事件表；浏览器断开后按 `session_id` 重放事件恢复显示。
- 进程重启只丢「正在跑的那一轮」，按轮次边界恢复即可，**不引入 DBOS / Temporal / Redis** 等第二套基础设施。
- 会话与未采纳提案都是临时态：过期清理，不进资产表。

### 2.5 上下文压缩：自建，且必须有测试

- 截至选型时点，Pydantic AI 尚无上下文压缩的一等能力（上游仍是 open issue，社区有 summarization 包）。
- 采用最小策略：按 token 预算保留最近 N 轮 + 把更早轮次压成一段摘要；阈值与摘要 prompt 在实现票中定。
- 这是本决策明确接受的缺口，不做「以后再说」处理：没有压缩，未来 codebase 分析无法在长会话里工作。

### 2.6 工具面：只读，且与「代码仓库分析」解耦

- v1 不需要文件工具：材料由用户粘贴，FastAPI 装配后作为 prompt 上下文。
- 未来接入 codebase 分析时，新增 `list_dir` / `grep` / `read_file` 三个只读异步工具，每个会话一个隔离工作目录；**第一版不给 bash**，避免用户仓库中的代码在宿主机执行。
- 工具集合与模型选择都按场景配置，但循环只有一种。

## 3. 候选方案与取舍（Alternatives Considered）

| 方案 | 满足的约束 | 代价 / 不满足 | 结论 |
| --- | --- | --- | --- |
| **Pydantic AI** | 全部七条：进程内、多协议、`UsageLimits`、流式、Pydantic 结构化输出、低约束循环 | 会话持久化与压缩要自己拼装（两张表 + 一个小函数） | **采纳** |
| LangGraph | checkpointer 自带 Postgres/SQLite 持久化，`interrupt()` 原生支持中断恢复 | **图循环：控制流由代码预先定义，模型只能在节点内自主，约束力大**；`PostgresSaver.setup()` 自建 checkpoint 表，与「无 Alembic」现状相抵；抽象与调试成本更高 | 否决（见 §3.1）：我们的任务是开放式的，阶段不可预知 |
| pi SDK / RPC | 完整的 coding-agent harness：多协议、JSONL 会话、内置压缩、工具与扩展、MIT | Node ≥ 22 运行时，与 Python 后端割裂；每个会话一个进程，进程管理与线上运维成本高；`bash` 即任意代码执行，多用户下必须再做容器隔离；会话落在文件系统，多用户隔离与清理要自己做；版本迭代快，业务会被第三方 API 绑住 | 否决：用户明确不接受多进程；其余能力可用更小代价在 Python 内获得 |
| OpenAI Agents SDK | 自带 Session、工具审批、轻量 | 默认走 Responses API，非 OpenAI 供应商要靠 LiteLLM 适配，跨协议最脆 | 否决 |
| Agno | 自带 session 存储、human approval、多协议 | 生态与文档成熟度低于前两者，长期押注风险高 | 否决 |
| Claude Agent SDK | 工具循环与仓库探索能力最强 | 仅 Anthropic，与「多协议」硬约束冲突 | 否决 |
| Mastra | TS 生态完整 | 需要另起 Node 运行时 | 否决 |
| 自研最小循环 | 完全可控、无依赖 | 等于自己维护一套 Agent 框架：工具调用、重试、流式、结构化输出、预算、多协议适配全部自建 | 否决：与「不手搓框架」的前提冲突 |

### 3.1 不采用图循环：要的是低约束循环，不是控制流被写死的 loop

这一条不是「收益不匹配」的委婉说法，而是明确取舍：**我们要 pi 那种由模型自己决定下一步的低约束循环，不要 LangGraph 那种由代码预先定义控制流的图循环。**

先澄清一个常见误解：LangGraph 的 agent 节点内部仍然是模型自主的 ReAct，图约束的是**外层**。所以差别不是「模型会不会 plan」，而是**控制流写在哪一层、归谁所有**。

| 维度 | pi 式低约束循环（采纳的形态） | LangGraph 图循环（不采纳） |
| --- | --- | --- |
| 流程由谁决定 | 模型逐步决定：读什么、调什么工具、何时收尾 | 代码预先定义节点与边，模型只能在节点内自主 |
| 约束放在哪 | 工具白名单、`UsageLimits`、输出 schema | 控制流本身：阶段、顺序、分支 |
| 新增能力的改动面 | 加一个工具或改 prompt | 改图结构：节点、边、状态 schema |
| 失败恢复粒度 | 按轮次边界 | 按 super-step（更强，但这里用不上） |
| 调试对象 | 消息与工具调用轨迹 | 图状态与检查点 |
| 适用前提 | 步骤不可预知、开放式任务 | 阶段已知且稳定，需要并行、回放或多点审批 |

我们的两类任务——开放式写作与开放式仓库探索——都是**下一个动作取决于模型刚读到的内容**。提前画阶段，等于替模型做它更擅长的事；而且图一旦写死，新增能力就从「加一个工具」变成「改图结构」，迭代成本从内容层转移到结构层。

图带来的 durable 执行、并行扇出、time travel 都是真能力，但它们服务的是「阶段已知」的场景。我们这里是「阶段未知」，用不上，先付抽象税换不到收益。

真正需要护栏的地方只有三处，且都能在图之外表达：工具面（只读、无写库）、预算（`UsageLimits`）、输出契约（提案 schema）。把约束放在这三处，既保住模型自主，也保住可控性。

例外触发条件（出现才重新评估，且只对那条链路局部引入）：任务被外部要求切成固定阶段（例如合规审查、人工多级签字），或必须并行处理分片并汇总，而这些阶段不能由模型自行决定。写作主路径不受影响。

### 3.2 为什么最终不是 pi

pi 恰好证明了「单循环 + 好工具 + 会话记录」足够处理大仓库，本决策**沿用了它的架构判断**；但它作为 SDK 只能以 Node 运行时形态接入，带来的进程管理、文件会话、bash 安全与版本绑定四项成本，都超出这个产品的需要。我们只借它的形态，不借它的运行时。

### 3.3 为什么不是「一个 Agent 一把梭」或「每场景一个 Agent」

场景之间真正不同的只有四项：上下文装配、工具白名单、输出 schema、预算；相同的是一整套编排。用一份 prompt 覆盖多场景会让指令互相打架；为每个场景复制一套循环会让 bug 修复变成 N 份同步。因此用**场景配置（Profile）+ 共享循环**，路由由入口决定，不让模型猜意图。

## 4. 接受的缺口与对策

| 缺口 | 影响 | 对策 |
| --- | --- | --- |
| 无内置会话存储 | 重启丢会话 | 会话表 + 事件表（两张新表，`create_all` 建立）+ 消息序列化；过期清理 |
| 无内置压缩 | 长会话超上下文 | 预算裁剪 + 早期轮次摘要，必须有测试 |
| 无文件工具 | 不能直接读仓库 | 将来写三个只读工具；v1 不需要 |
| 无进程外隔离 | 长任务占用 API 进程 | `UsageLimits` + 后台任务 + 事件表；并发上限按 2C-2G 设定 |
| 供应商能力差异 | 同一 prompt 在不同模型上质量不同 | 能力表 + `ToolOutput` + 提案 schema 契约测试（多 provider smoke） |

## 5. 防腐边界（Guardrails）

1. **三份框架无关契约**：提案 schema、SSE 事件格式、会话表结构不依赖 Pydantic AI 类型；将来换引擎只动循环层。
2. **锁版本**：`pydantic-ai` 固定小版本；升级必须重跑本 ADR §7 的验收脚本。
3. **不引入第二个编排框架**：不叠 LangGraph、DBOS、Temporal；出现需求先回到本 ADR 复核。
4. **工具只读**：Agent 永不持有写库或执行 shell 的能力；写入只经前端采纳 → REST。
5. **测试不真调模型**：用 Pydantic AI 的测试模型注入固定响应，覆盖工具调用、schema 失败重试与流式事件；多 provider 只用 smoke 验证 schema 可通过。

## 6. 后果（Consequences）

**正面**

- 部署形态不变：仍然是一个 Python 进程、一个镜像，无新增基础设施组件。
- 结构化提案与 Pydantic 生态同构，前后端契约清晰。
- 多协议切换只改配置，业务代码零改动。
- 预算、重试、流式、工具循环都由成熟的库承担，避免自研框架的长期维护成本。

**负面**

- 压缩与会话这两块要自己写并长期维护，是相对 pi 的直接损失。
- 长任务跑在 API 进程内，需要并发上限与事件表；进程重启会中断正在跑的一轮。
- Pydantic AI 主版本仍在演进（如 `FallbackModel` 可能被 capability 取代），需要锁版本与升级复核。

**风险**

- 多供应商下提案质量差异可能很大：需要用同一组输入做 smoke，并在 prompt 与能力表上留出分档空间。
- 低约束循环的代价是「规划质量取决于模型」：没有确定性流程兜底，遇到模型乱试时要靠工具面收窄、预算上限和端到端评测兜住，而不是靠加节点。
- 如果将来代码分析确实需要强隔离、审计与配额到每层，执行器要单独拆出（容器化），届时与本 ADR 的「单进程」前提冲突，需要新 ADR。

## 7. 验证（Spike 验收脚本）

在现有 FastAPI 内完成，不新建服务：

1. 粘贴一段材料 → Agent 输出 3 条符合 schema 的提案。
2. 提案事件与文本增量通过 SSE 到浏览器。
3. 采纳 1 条 → 走现有 REST 写入 `resume_descriptions`，出现在亮点列表。
4. 杀掉 API 进程重启，同一 `session_id` 能继续下一轮（按轮次边界恢复）。
5. 把 `provider:model` 换成另一家协议的模型，业务代码零改动，同一条链路跑通。

以上五条全绿，才算选型落地。

## 8. 未决事项（Open Questions）

- 默认供应商与模型档位（写作场景 / 分析场景各一档），以及是否允许用户选择模型。
- 压缩阈值、摘要 prompt 与「哪些轮次必须保留」的规则。
- 会话表与事件表的具体字段（实现票中定，避免在 ADR 里冻结 schema）。
- 未来 codebase 分析的执行器形态（进程内 / 独立容器）——触发条件见 §6 风险。

## 9. 参考

- Pydantic AI 模型与供应商：<https://pydantic.dev/docs/ai/models/overview/>
- Pydantic AI 消息历史：<https://pydantic.dev/docs/ai/core-concepts/message-history/>
- Pydantic AI deferred tools：<https://pydantic.dev/docs/ai/tools-toolsets/deferred-tools/>
- LangGraph 持久化：<https://docs.langchain.com/oss/python/langgraph/persistence>
- OpenAI Agents SDK 模型页：<https://openai.github.io/openai-agents-python/models/>
- Agno 会话存储：<https://docs.agno.com/database/session-storage>
- pi SDK / RPC：`@earendil-works/pi-coding-agent` v1.3.0 文档（MIT）
