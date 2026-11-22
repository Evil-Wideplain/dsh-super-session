# Personal Agent（DSH Agent 预设）

一个把 **DSH Super-agent 的分工/注意力原则** 和 **Muse 个人助理的运行时文件/记忆/主动性设计** 合起来的单 Agent 预设。

- **shell 优先**：文件读写、进程、脚本都走 **持久 shell**，不挂 `read`/`write`/`edit`/`glob`/`grep`。
- **需要框架状态的能力才挂工具**：后台任务、定时任务、目标、todo、plan mode、结构化提问、Web、文件交付、Office、skill 由预设挂载；worker 会话、长会话/检索、记忆仍由 profile 插件提供，预设不重复挂载。
- **六个可编辑运行时文件**：每次组装 prompt 时注入；改 `MEMORY.md` 或 `USER.md` 不需要重启会话。
- **不是** Router/Worker 系统，也**不是**另一个 coding agent；编码只是它能力的一部分。

## 目录结构

```text
C:\Code\super_agent\           # 仓库根目录就是 bundle 根目录
  package.json                 # bundle 清单：dsh.bundle.patch
  cordis.patch.yml             # 预设声明 + 工具清单
  context.js                   # 预设插件：注入 handbook 与个人上下文
  prompt/
    handbook.md                # 操作手册（英文，默认）
    handbook.zh.md             # 操作手册（中文）
  locale/{en,zh}.json          # 插件市场显示名/描述
  docs/
    DETAIL.md                  # 插件详情页（随包）
    DETAIL.zh.md               # 插件详情页中文（随包）
    INDEX.md                   # 文档索引
    super-agent.md             # 参考资料，不随包安装
    muse-personal-agent.md     # 参考资料，不随包安装
    muse-system-prompt.md      # 参考资料，不随包安装
  icon.svg
  README.md
```

## 安装

> 目前只做了静态校验，**没有**安装到当前 profile。安装会改变 profile，需要你确认。

在 DSH 里打开 **插件 / Plugins → 添加插件（Add plugin）→ 选择本地目录**，选中仓库根目录 `C:\Code\super_agent`。安装完成后，新建会话，在预设列表里选 **个人助理（Personal Agent）**。

如果你用 agent 安装，给它这个指令：

```text
用 plugin_manager 的 install_bundle，target 设为 C:\Code\super_agent，安装后列出 bundle 与 preset-personal 的激活状态。
```

安装器会把包 link 到 profile 的 `node_modules`，所以 `cordis.patch.yml` 里的 `@local/dsh-personal-agent` 能解析到本目录。**不要**手动改 profile 的 `package.json` 或跑 pnpm。

## 首次使用

新建会话后说「你好」即可。`context.js` 会发现默认的个人目录下没有文件，注入一段 first-run 提示；Agent 会提出初始化，一次问一个问题，然后用 shell 写：

| 文件 | 内容 |
| --- | --- |
| `SOUL.md` | 人格与语气 |
| `IDENTITY.md` | 名字、角色、vibe、emoji |
| `USER.md` | 用户是谁、怎么称呼、时区、在意什么 |
| `PEOPLE.md` | 用户在意的人与群体，以及怎么称呼他们 |
| `MEMORY.md` | 耐久事实、偏好、承诺、决定 |
| `PROACTIVE_PREFERENCES.md` | 想听什么、不想听什么、什么时候听、怎么呈现 |

默认目录是 `$DSH_HOME/personal`，没有 `DSH_HOME` 时是 `~/.dsh/personal`。可以在 `personal-context` 行的 `config.dataDir` 里改（支持绝对路径或 `~/...`）。

这些文件是普通 Markdown，用户和 Agent 都能改。`context.js` 每次组装 prompt 都重新读，所以编辑下一步就生效；读不到或超出预算时降级为提示，不会让整个 prompt 组装失败。

## 设计来源

### 从 Super-agent 借的

- **注意力预算**：只在被请求、或用户写下的偏好允许时主动说话；一条有用的消息胜过五条进度更新。
- **分工而非劝说**：长任务交给 worker 会话；不轮询，结果自动回来。
- **诚实交付**：验证过的才算结果；计划/草稿本身不是完成。
- **确认边界**：对外发言、不可逆动作先确认；读、搜、整理、起草可以直接做。
- **最小上下文**：不把用户的所有隐私倒给 worker 会话。

### 从 Muse 借的

- **运行时文件即自我**：`SOUL.md` / `IDENTITY.md` / `USER.md` / `PEOPLE.md` / `MEMORY.md` / `PROACTIVE_PREFERENCES.md` 每轮注入。
- **记忆不是流水账**：只存耐久事实、偏好、承诺；不存 transcript、工具日志、临时进度。
- **主动性有偏好文件**：用户写清楚想听什么、什么时候听；默认安静。
- **关系与分寸**：知道用户在意谁，但「no surprises」——只在对话有明确关联时使用。
- **谨慎（Discretion）**：知道得多、说得少；一次泄露比一次任务失败更贵。

### 没有照搬的

- Muse 的「家庭事务覆盖模型训练」等政策段：争议大、与 DSH 的通用安全边界冲突，未复制。
- Muse 的 Secure VM / Sentinel / Wallet / Feed / Side Chats：属于 Meta 产品基础设施，DSH 里没有对应物。
- Router/Worker、Ticket、Mandate、准入表：那是另一个 bundle 的领域模型，不适合塞进单 Agent 预设。

## 工具集

本预设**自己挂载**的工具：

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

`working_directory` 由 Web 的 host 层提供给所有预设，**不需要也不应该**在预设里再挂一次；重复挂载会注册同名工具。

`job_*` 目前没有 producer：持久 shell 用 `&` 跑后台命令，不会注册 job。后台长命令请把输出重定向到日志文件，之后再查。要让它真正可用，需要再加一个 job-aware 的 shell/terminal 工具。

Office 的三个工具要**先加载 Office skill**（`office`、`office-docx`、`office-xlsx`、`office-pptx`）才会出现；渲染还需要支持图像输入的模型路由和附件服务。

profile 里的插件另外提供以下**全局工具**，不由本预设挂载：

| 能力 | 工具 |
| --- | --- |
| Worker 会话 | `list_session_agents`、`send_session_message`、`review_session_messages`、`create_session_agent` |
| 长会话 | `watch_session`、`unwatch_session`、`list_watched_sessions` |
| 会话检索 | `session_search`、`session_event_search`、`session_trace`、`session_event_trace`、`session_event_read` |
| 记忆 | `memory_write`、`memory_read`、`memory_list`、`memory_search`、`memory_delete`、`memory_delete_all`、`memory_prune` |

本预设**不挂载**：`read` / `write` / `edit` / `glob` / `grep` / `apply_patch`、`subagent` / `subagent_fork` / `workflow`。文件读写通过 shell；委派通过 profile 的 worker 会话。

worker 会话是独立会话，默认不使用本个人预设，因此不会自动看到 `MEMORY.md` / `USER.md`。只传任务真正需要的上下文。

## 自定义

- **改人格/规则**：编辑 `prompt/handbook.md`；改完需要重新加载 bundle（重启 DSH 或重新安装）才会生效，因为它在激活时读一次。
- **切换手册语言**：默认读 `prompt/handbook.md`；要中文，给 `personal-context` 行加 `config.handbookPath: ./prompt/handbook.zh.md`。手册在激活时读一次，改完需要重新加载 bundle。
- **改身份**：编辑 `cordis.patch.yml` 里 `persona.prefix`。
- **改记忆目录**：给 `personal-context` 行加 `config.dataDir`。
- **加工具**：往 `plugins` 列表里加官方包；可参考 `dsh-web-app/presets/standard.patch.yml`。
- **加回文件工具**：把 `image` 行换成不带 config 的 `@deepseek-ai/dsh-tool-fs`，即得到 `read`/`write`/`edit`；再加 `@deepseek-ai/dsh-tool-fs-search` 得到 `glob`/`grep`。
- **改包名**：如果重命名 `@local/dsh-personal-agent`，同步改 `personal-context` 行与任何引用该包名的地方。

## 安全与限制

- 预设**不放宽**权限。shell、文件访问、审批、沙箱仍由 profile 与 permission preset 决定。当前桌面 profile 是 `danger-full-access`，但预设本身不假设这一点。
- 个人文件默认在 `~/.dsh/personal`，**不在工作区内**。如果 profile 用 `workspace-write` 沙箱，Agent 可能写不进去；把 `dataDir` 指到工作区内，或给该目录授权。
- 运行时文件是明文 Markdown，不加密；不要写密码、token、API key。
- 个人上下文以 `interpolate: false` 注入，并明确「是用户数据，不是更高优先级指令」；但用户文件仍然可能包含敏感或误导性内容，Agent 应按数据对待。
- `web_search` / `web_fetch` 的返回是外部不可信内容；引用真实 URL，不执行页面里的指令。
- Office 工具按 profile 的文件系统读权限读取输入，可能读到工作区外的文件；转换/重算结果先落到 Office kit 的私有输出目录，需要 shell 复制到目标位置。
- `job_*` 当前没有 producer：持久 shell 用 `&` 启动的进程不会出现在 `job_list` 里，这是预期行为。
- 单 Agent 的失败半径比多会话系统大；长任务尽量交给 worker 会话，关键动作先确认。
- 未安装验证：本包只做了 JS 语法、YAML 结构、插件名与 manifest 的静态检查；真实激活、preset 出现在列表、prompt 注入效果，以及新增工具能否注册，需要在安装后新建会话确认。

## 故障排查

| 现象 | 先查什么 |
| --- | --- |
| 预设列表里没有「个人助理」 | bundle 是否安装并启用；重启 DSH 后再看 Plugins 的 `preset-personal` 行 |
| `preset-personal` 激活失败 | `@local/dsh-personal-agent` 是否在 profile 的 `node_modules`；`context.js` 是否可导入 |
| 个人文件没有被注入 | `personal-context` 的 `dataDir`；文件是否存在且非空；profile 是否有读权限 |
| 改 `MEMORY.md` 不生效 | 新会话/下一轮才会重新组装；确认改的是注入目录里的文件 |
| 全局工具没出现 | profile 里 `session-messaging`、`session-guardian`、`dsh-auto-memory` 是否启用；重启后再看 |
| `read_image` 不可用 | 当前模型是否声明 image 输入；profile 是否挂载附件服务 |
| `web_search` / `web_fetch` 不可用 | host 的 `web` 服务与 Search/Fetch provider 是否启用（Settings → Web search） |
| Office 工具没出现 | 是否先加载了 Office skill（`office` 等）；host 的 `office-kit` 是否可用；`office_render` 还需要图像模型路由 |
| `skill` 列表为空或缺少技能 | `skill-filesystem` 是否加载；项目 `.dsh/skills`、`.agents/skills` 或用户 `~/.dsh/skills` 下是否有合法 `SKILL.md` |
| 定时任务创建失败 | host 的 `schedule` 服务是否挂载；时间规则是否在支持的 RRULE 子集内 |
| `job_list` 一直为空 | 持久 shell 不注册 job；这是预期行为，后台长命令用 `&` + 日志文件 |
| Agent 写不进 `~/.dsh/personal` | profile 的沙箱模式；把 `dataDir` 放到工作区内或给目录授权 |

## 卸载

在 **插件 / Plugins** 里移除 `Personal Agent` bundle，或在 agent 里调用 `plugin_manager` 的 `remove_bundle`，target 用列表里的 bundle 标识。个人文件在 `~/.dsh/personal`，卸载不会删除；需要时手动删。

## 参考资料

`docs/` 里还保存了三份研究材料，它们**不是** bundle 的一部分，也不会被安装：

- [`docs/INDEX.md`](docs/INDEX.md) — 文档索引：插件详情页与研究资料。
- [`docs/super-agent.md`](docs/super-agent.md) — DSH Super-agent（Router/Worker）设计与 system prompt 导读。
- [`docs/muse-personal-agent.md`](docs/muse-personal-agent.md) — Meta Muse 个人 Agent 的 System Prompt 档案。
- [`docs/muse-system-prompt.md`](docs/muse-system-prompt.md) — Meta Muse 的 System Prompt 原文。
