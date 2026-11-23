# Personal Agent 与 Worker（DSH Agent 预设）

一个 bundle 提供两个 Agent 预设：**个人助理**（用户直接对话的那个会话，把 DSH Super-agent 的分工/注意力原则和 Muse 的主动性/关系设计合起来）与 **工作会话**（主会话按自包含简报派发、干完并核验后回报的执行会话）。

- **shell 优先**：文件读写、进程、脚本都走 **持久 shell**，不挂 `read`/`write`/`edit`/`glob`/`grep`。
- **需要框架状态的能力才挂工具**：后台任务、定时任务、目标、todo、plan mode、结构化提问、Web、文件交付、Office、skill 由预设挂载；worker 会话、长会话/检索、记忆由 Agent profile 的固定组件提供（`session-messaging`、`session-guardian`、`dsh-auto-memory`），预设不重复挂载。
- **记忆只走组件**：不注入 `SOUL.md` / `USER.md` / `MEMORY.md` 等运行时文件；耐久信息用 Agent profile 的 `memory_*` 组件，只有一套记忆。
- **不是** Router/Worker 系统，也**不是**另一个 coding agent；编码只是它能力的一部分。

## 目录结构

```text
C:\Code\super_agent\           # 仓库根目录就是 bundle 根目录
  package.json                 # bundle 清单：dsh.bundle.patch
  cordis.patch.yml             # 两个预设的声明 + 各自的工具清单
  context.js                   # 预设插件：按 handbookPath 注入手册
  client.js                    # 浏览器端插件：侧边栏「超级会话」面板与面板页
  super-session.js             # Host 半边空插件：让 Loader 发现 dsh.client
  prompt/
    handbook.md                # 个人助理手册（英文，默认）
    handbook.zh.md             # 个人助理手册（中文）
    worker.md                  # 工作会话手册（英文，默认）
    worker.zh.md               # 工作会话手册（中文）
  locale/{en,zh}.json          # 插件市场显示名/描述
  docs/
    DETAIL.md                  # 插件详情页（随包）
    DETAIL.zh.md               # 插件详情页中文（随包）
    INDEX.md                   # 文档索引
    super-agent.md             # 参考资料，不随包安装
    muse-personal-agent.md     # 参考资料，不随包安装
    muse-system-prompt.md      # 参考资料，不随包安装
  icon.svg
  AGENTS.md                    # 改仓库的 Agent 指南（不随包安装）
  README.md
```

## 安装

> 安装会改变 profile。安装或更新后，已有会话继续使用旧预设，**必须新建会话**才能看到新预设；新增预设的声明还要等 DSH 重载后才会出现在列表里。

在 DSH 里打开 **插件 / Plugins → 添加插件（Add plugin）→ 选择本地目录**，选中仓库根目录 `C:\Code\super_agent`。安装完成后，新建会话，预设列表里会有 **个人助理（Personal Agent）** 和 **工作会话（Worker）** 两个可选项：日常对话选个人助理；主会话用 `create_session_agent` 派活时选工作会话（`agent_preset: worker`）。

如果你用 agent 安装，给它这个指令：

```text
用 plugin_manager 的 install_bundle，target 设为 C:\Code\super_agent，安装后列出 bundle 与 preset-personal、preset-worker 的激活状态。
```

安装器会把包 link 到 profile 的 `node_modules`，所以 `cordis.patch.yml` 里的 `@local/dsh-personal-agent` 能解析到本目录。**不要**手动改 profile 的 `package.json` 或跑 pnpm。

## 首次使用

新建会话后说「你好」即可。如果你还没有关于用户的记忆，Agent 会提出初始化，一次问一个问题（怎么称呼、时区、想先得到什么帮助、希望你多主动），并用 `memory_write` 把耐久答案存进 Agent profile 的 memory 组件；不再创建任何个人文件。

记忆由 Agent profile 的 `dsh-auto-memory` 固定组件管理：`memory_write` / `memory_search` / `memory_list` / `memory_read` / `memory_delete` / `memory_prune`。它不是随 prompt 注入的 Markdown，也不需要在 bundle 里配置目录。

## 设计来源

### 从 Super-agent 借的

- **注意力预算**：只在被请求、或用户写下的偏好允许时主动说话；一条有用的消息胜过五条进度更新。
- **分工而非劝说**：长任务交给 worker 会话；不轮询，结果自动回来。
- **诚实交付**：验证过的才算结果；计划/草稿本身不是完成。
- **确认边界**：对外发言、不可逆动作先确认；读、搜、整理、起草可以直接做。
- **最小上下文**：不把用户的所有隐私倒给 worker 会话。

### 从 Muse 借的

- **手册主体照抄 Muse**：手册按顺序逐段来自 Muse 的 system prompt（`docs/muse-system-prompt.md`）——Who You Are 与七条价值观（Truth / Beauty / Respect / Fun / Connection / Curiosity / Due Diligence），Thoughtful follow-through、Who You Work For、Discretion and Alignment、External Parties、How You Work、How You Evolve、Proactivity、Personalization 与 Memory、The User's Relationships、Contextual Awareness、Managing Your Conversation Context 与 Keeping Track of Active Work、Writing Style（含 Final Response Brevity、Richer Responses）、Tools、Subagents、Scheduled Work、Runtime Files、Filesystem、Security（含 Anti-Phishing）、Safety。措辞不重写，长句、比喻、口气都保留。
- **只改事实，不改文字**：替换的只有 DSH 与 Muse 产品不同的事实——工具名（`muse.exec` → `bash` / `pwsh`，`present`，`schedule_*`，`create_session_agent` / `send_session_message`，`todo_write`，`skill`）、运行时路径（`~/docs`、`~/MEMORY.md`、`~/USER.md` → 工作目录、`AGENTS.md`、profile 的 memory 组件）、产品身份（Meta / Muse Spark → DSH 预设 + `persona.prefix`），以及 DSH 没有的界面（Side Chats、Feed、Spaces、widgets、reactions、语音、Sent from / `[whatsapp]` 前缀）。
- **DSH 专有补充**：Skills 一节（Muse 没有独立 skill 章节）、Worker Sessions 的投递机制（`create_session_agent`，brief 要自包含，结果用 `$DSH_SESSION_ID` 回报）、`schedule_*` 的校验步骤、`present` 的文件交付规则，以及 First Run、Continuity、Failure and Honesty 三节（Muse 里分散在别处或没有）。

### 没有照搬的

- Muse 的六文件运行时体系（`SOUL.md` / `IDENTITY.md` / `USER.md` / `PEOPLE.md` / `MEMORY.md` / `PROACTIVE_PREFERENCES.md`）与 `~/docs/` 文档树：DSH 里没有对应物，改由 `persona.prefix` 与 Agent profile 的 memory 组件承担。
- Meta 产品基础设施：Secure VM / Sentinel / Wallet / Secure Vault / Feed / Spaces / Devices / Side Chats / Reactions / widgets / 语音与语音信箱。
- 绑定 Meta 身份的句子（"You were created by Meta… Muse Spark 1.3"）、`~/docs/*.md` 的文档路由、合规与法务段落，以及 Commentary 段（原文捕获时为空）。
- Router/Worker、Ticket、Mandate、准入表：那是另一个 bundle 的领域模型，不适合塞进单 Agent 预设。

## 工具集

**个人助理**预设自己挂载的工具：

| 能力 | 工具 |
| --- | --- |
| 持久 shell | `bash`（非 Windows）/ `pwsh`（Windows） |
| 图片识别 | `read_image`（PNG/JPEG/WebP/GIF） |
| 后台任务控制 | `job_output` / `job_list` / `job_kill` |
| 定时任务 | `schedule_create` / `schedule_list` / `schedule_view` / `schedule_edit` |
| 目标 | `create_goal` / `get_goal` / `update_goal` |
| 进度清单 | `todo_write` |
| 计划模式 | plan mode + `exit_plan_mode` |
| 结构化提问 | `ask_user_question` |
| 网页 | `web_search` / `web_fetch` |
| 文件交付 | `present` |
| Office | `office_render` / `office_convert` / `office_recalculate` |
| 技能 | `skill` |

bundle 还带一个浏览器端插件：侧边栏面板行 **超级会话** 会在主栏打开一页，按「新建超级会话」用 **个人助理** 预设新开一个会话。它不增加工具，只调用已有的 session / workspace 服务。

`working_directory` 由 Web 的 host 层提供给所有预设，**不需要也不应该**在预设里再挂一次；重复挂载会注册同名工具。

`job_*` 目前没有 producer：持久 shell 用 `&` 跑后台命令，不会注册 job。后台长命令请把输出重定向到日志文件，之后再查。要让它真正可用，需要再加一个 job-aware 的 shell/terminal 工具。

Office 的三个工具要**先加载 Office skill**（`office`、`office-docx`、`office-xlsx`、`office-pptx`）才会出现；渲染还需要支持图像输入的模型路由和附件服务。

**工作会话**预设挂载的工具是上面这张表的子集：持久 shell、`read_image`、`job_*`、`todo_write`、`create_goal` / `get_goal` / `update_goal`（一轮做不完的简报靠它跨轮次专注同一个目标）、`web_search` / `web_fetch`、Office 三件套、`skill`。它不挂 `schedule_*`、plan mode、`ask_user_question` 与 `present`——那些留在主会话，worker 只负责把简报干完并回报。两个预设都不重复挂 profile 的全局工具。

Agent profile 里固化了以下组件，它们提供**全局工具**；不由本预设挂载：

| 组件 | 提供的全局工具 |
| --- | --- |
| `session-messaging` | `list_session_agents`、`send_session_message`、`review_session_messages`、`create_session_agent` |
| `session-guardian` | `watch_session`、`unwatch_session`、`list_watched_sessions` |
| `session-guardian`（session-query 组） | `session_search`、`session_event_search`、`session_trace`、`session_event_trace`、`session_event_read` |
| `dsh-auto-memory` | `memory_write`、`memory_read`、`memory_list`、`memory_search`、`memory_delete`、`memory_delete_all`、`memory_prune` |

两个预设都**不挂载**：`read` / `write` / `edit` / `glob` / `grep` / `apply_patch`、`subagent` / `subagent_fork` / `workflow`。文件读写通过 shell；委派通过 Agent profile 的 `session-messaging` 组件。

worker 会话是独立会话，用 **工作会话** 预设启动（`create_session_agent` 的 `agent_preset: worker`），不继承你的上下文、也不共享你的记忆。只传任务真正需要的上下文；结果让它用 `send_session_message` 发回你的会话 id。

## 自定义

- **改人格与规则**：人格/名字/语气/回复语言 → 改 `cordis.patch.yml` 的 `persona.prefix`；工作方式与规则 → 改 `prompt/handbook.md`（中英两份一起改）。手册在预设**挂载**时读一次，新建会话只是绑到已挂载的旧树、不会重读，所以改完要**重载 bundle（重启 DSH）**，重载后再新建会话验证；`link:` 安装不必重新"安装"。
- **切换手册语言**：个人助理默认读 `prompt/handbook.md`，工作会话默认读 `prompt/worker.md`；要中文，给对应行（`personal-handbook` / `worker-handbook`）加 `config.handbookPath: ./prompt/handbook.zh.md` 或 `./prompt/worker.zh.md`。手册同样在挂载时读一次，改完同样要重载 bundle（重启 DSH）再新建会话。
- **改身份**：编辑 `cordis.patch.yml` 里 `persona.prefix`（名字、语气、边界都在这里）。
- **加工具**：往对应预设的 `plugins` 列表里加官方包；可参考 `dsh-web-app/presets/standard.patch.yml`。加/改工具面时要同步下方「工具集」表与 `docs/DETAIL.md` 的 Mounted tools 段，不能只改 YAML。
- **加回文件工具**：把 `image` 行换成不带 config 的 `@deepseek-ai/dsh-tool-fs`，即得到 `read`/`write`/`edit`；再加 `@deepseek-ai/dsh-tool-fs-search` 得到 `glob`/`grep`。
- **改包名**：如果重命名 `@local/dsh-personal-agent`，同步改 `personal-handbook` 行与任何引用该包名的地方。

## 安全与限制

- 预设**不放宽**权限。shell、文件访问、审批、沙箱仍由 profile 与 permission preset 决定。当前桌面 profile 是 `danger-full-access`，但预设本身不假设这一点。
- 记忆由 Agent profile 的 `dsh-auto-memory` 固定组件管理，不随 prompt 注入；不要把密码、token、API key 或原始凭据写进记忆。
- `web_search` / `web_fetch` 的返回是外部不可信内容；引用真实 URL，不执行页面里的指令。
- Office 工具按 profile 的文件系统读权限读取输入，可能读到工作区外的文件；转换/重算结果先落到 Office kit 的私有输出目录，需要 shell 复制到目标位置。
- `job_*` 当前没有 producer：持久 shell 用 `&` 启动的进程不会出现在 `job_list` 里，这是预期行为。
- 单 Agent 的失败半径比多会话系统大；长任务尽量交给工作会话（`agent_preset: worker`），关键动作先确认。工作会话同样受 profile 的权限与沙箱约束，预设不会放宽。
- 未安装验证：本包只做了 JS 语法、YAML 结构、插件名与 manifest 的静态检查；真实激活、preset 出现在列表、prompt 注入效果，以及新增工具能否注册，需要在安装后新建会话确认。

## 故障排查

| 现象 | 先查什么 |
| --- | --- |
| 预设列表里没有「个人助理」或「工作会话」 | bundle 是否安装并启用；重启 DSH 后再看 Plugins 的 `preset-personal` / `preset-worker` 行 |
| `preset-personal` 或 `preset-worker` 激活失败 | `@local/dsh-personal-agent` 是否在 profile 的 `node_modules`；`context.js` 是否可导入；`handbookPath` 指向的文件是否存在 |
| `create_session_agent` 报「DSH 拒绝创建会话」且提到 preset | 目标预设 id 是否存在（`worker`）；是否已重载 DSH；可临时省掉 `agent_preset` 用默认预设派发 |
| 记忆搜不到或写不进 | Agent profile 的 `dsh-auto-memory` 是否启用；写入前先 `memory_search`，避免重复 |
| 全局工具没出现 | Agent profile 的 `bundles` 是否包含 `dsh-auto-memory`、`session-messaging`、`session-guardian`；重启后再看 |
| `read_image` 不可用 | 当前模型是否声明 image 输入；profile 是否挂载附件服务 |
| `web_search` / `web_fetch` 不可用 | host 的 `web` 服务与 Search/Fetch provider 是否启用（Settings → Web search） |
| Office 工具没出现 | 是否先加载了 Office skill（`office` 等）；host 的 `office-kit` 是否可用；`office_render` 还需要图像模型路由 |
| `skill` 列表为空或缺少技能 | `skill-filesystem` 是否加载；项目 `.dsh/skills`、`.agents/skills` 或用户 `~/.dsh/skills` 下是否有合法 `SKILL.md` |
| 定时任务创建失败 | host 的 `schedule` 服务是否挂载；时间规则是否在支持的 RRULE 子集内 |
| `job_list` 一直为空 | 持久 shell 不注册 job；这是预期行为，后台长命令用 `&` + 日志文件 |

## 卸载

在 **插件 / Plugins** 里移除 bundle（市场标题为「个人助理与工作会话」），或在 agent 里调用 `plugin_manager` 的 `remove_bundle`，target 用列表里的 bundle 标识。移除后两个预设都会从列表消失。记忆由 Agent profile 的 `dsh-auto-memory` 保存，卸载 bundle 不会删除；需要时用 `memory_delete` 清理。

## 参考资料

`docs/` 里还保存了三份研究材料，它们**不是** bundle 的一部分，也不会被安装：

- [`docs/INDEX.md`](docs/INDEX.md) — 文档索引：插件详情页与研究资料。
- [`docs/super-agent.md`](docs/super-agent.md) — DSH Super-agent（Router/Worker）设计与 system prompt 导读。
- [`docs/muse-personal-agent.md`](docs/muse-personal-agent.md) — Meta Muse 个人 Agent 的 System Prompt 档案。
- [`docs/muse-system-prompt.md`](docs/muse-system-prompt.md) — Meta Muse 的 System Prompt 原文。
