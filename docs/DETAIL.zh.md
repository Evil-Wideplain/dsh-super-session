# 个人助理、工作会话与组长（Personal Agent, Worker and Coordinator）

一个 bundle 提供的三个 DSH Agent 预设：shell 优先的个人助理、按简报执行的工作会话，以及管一份目标、派发 worker 的组长。三者的工具面都刻意保持克制。

## 它增加了什么

- **个人助理**预设（`personal`）：个人助理人设 + 操作手册（英文、中文各一份）。手册近乎逐段照抄 Meta Muse 的 system prompt（价值观、只服务一个用户、谨慎披露、对外联系人、工作方式、个性化与记忆、上下文感知、在手任务、写作风格、工具、委派、定时工作、运行时文件、安全），只把事实换成 DSH 的工具面，另加 DSH 专有的 skill、worker 会话投递、定时任务校验、文件交付、首次使用与连续性几节。
- **工作会话**预设（`worker`）：沿用标准预设的 coding agent 人设行，加一份 worker 手册（英文、中文各一份）。手册是一份 DSH 风格的运行提示词，为「持久、专注做一件事」的 worker 改造过：简报就是目标，跨轮次推进而不是每步问许可，先探索再改、先核验再报告，结果用 `send_session_message` 发回主会话。它刻意不复述个人助理手册。
- **组长**预设（`manager`）：协调者人设 + 一份很短的协调者手册（英文、中文各一份）。它从 lead agent 那里接一份目标，用 goal 跨轮次守住，拆成给 worker 会话的简报，验收证据再回报。它只创建 worker 会话——绝不创建 `personal` 或另一个 `manager` 会话；它不面向用户，也不亲手干活。
- 侧边栏面板行 **超级会话**（在工作区列表上方）：它是你那一个常驻会话，点开直接进对话，没有中间页。它有**自己的内置工作区** `<Documents>/deepseek-harness/super-workspace`，标题 `Super Workspace`，与 DSH 自己的 `default-workspace` 同级。目录与工作区注册都由 Host 在 **DSH 启动时**完成，侧边栏一开始就能看到，不用先点一次；面板按路径尾部 `deepseek-harness/super-workspace` 或标题 `Super Workspace` 认它，在里面用 **个人助理** 预设建一个标题为 `超级会话` 的会话，之后每次都回到同一工作区里最新的那个未归档会话。工作区不存在时，面板直说「重启 DSH 后会自动建好」并给重试按钮。它不增加工具，只调用已有的 session / workspace 服务。
- 个人助理挂载的工具：持久 shell（非 Windows 用 `bash`，Windows 用 `pwsh`）、`schedule_*`、`create_goal` / `get_goal` / `update_goal`、`todo_write`、plan mode + `exit_plan_mode`、`ask_user_question`、`present`、`skill`。它**不挂执行面的工具**：没有 `read_image`、没有 `job_*`、没有 `web_search` / `web_fetch`、没有 Office 三件套——这些活一律派给工作会话，自己只做判断与验收。它的技能发现保留默认根：目录里有用户自己的技能、会话所在项目 `.dsh/skills` / `.agents/skills` 里的技能（按会话 cwd 每次现算）、agent-preset 自带的 `dsh-doc`，以及 profile 级 provider 提供的 Office 四个技能。
- 工作会话挂载的工具：同样的持久 shell 与 `read_image`、`job_output` / `job_list` / `job_kill`、`todo_write`、`create_goal` / `get_goal` / `update_goal`（长简报靠它跨轮次保持同一个目标）、`web_search` / `web_fetch`、Office 三件套、`skill`。它不挂定时任务、plan mode、`ask_user_question` 与 `present`：那些归主会话。
- 组长挂载的工具：同样的持久 shell（用来核对 worker 改了什么、跑它说通过了的检查）、`create_goal` / `get_goal` / `update_goal`、`todo_write`、`skill`。它不挂 plan mode、`ask_user_question`、`present`、定时任务、`web_*`、`read_image`、`job_*`、Office：这些活派出去。`send_session_message` 与 `create_session_agent` 来自 profile 的 `session-messaging` 组件。
- 记忆只有一套：Agent profile 固定的 `dsh-auto-memory` 组件（`memory_*`）。三个预设都不注入 `SOUL.md` / `USER.md` / `MEMORY.md` 等运行时文件；人格由 `persona.prefix` 与手册承载。
- 不挂载 `read` / `write` / `edit` / `glob` / `grep`（文件读写走 shell），也不挂 `subagent` / `workflow`（委派走 Agent profile 的 `session-messaging` 组件）。`working_directory` 由 host 提供给所有预设，不在预设内重复挂载。

## 选哪个预设

- **个人助理**：用户直接对话的那个会话。对话、用户的偏好，以及所有对外的动作都在它这里。
- **工作会话**：主会话用 `create_session_agent` 加 `agent_preset: worker` 创建，并把一份自包含的简报交给它。它有界地把活干完、核验结果，再用消息把结果发回；它不面向用户，也不找人确认。
- **组长**：目标要拆给多个 worker、或要跨很多轮时，主会话用 `agent_preset: manager` 起一个。它把目标拆开、派 worker、验收证据，再向主会话汇报。一个目标只派一个组长；它只对主会话负责，也只往下派一层。

## 首次使用

用 **个人助理** 预设新建会话，随便说句话。如果你还没有关于用户的记忆，Agent 会提出初始化，一次问一个问题，并用 `memory_write` 把耐久答案存进 Agent profile 的 memory 组件；不会创建个人文件。

## 数据与隐私

记忆由 Agent profile 固定的 `dsh-auto-memory` 组件管理，不随提示词注入。不要把密码、token、API key 或原始凭据写进记忆。人格与手册随 bundle 安装，不是用户数据文件。

## 限制

- 每个预设都是单 Agent，不是 Super-agent 的 Router/Worker 多 Agent 架构；长任务交给通过 Agent profile 的 `session-messaging` 组件创建、并从工作会话预设启动的 worker 会话。
- 工作会话侧：文件编辑通过 shell，网页用 `web_search` / `web_fetch`，后台长命令用 `&` + 日志文件；持久 shell 不注册 job，`job_*` 目前没有 producer。个人助理不挂这些工具，活交给 worker。
- Office 的三个工具（工作会话侧）需要先加载 Office skill 才会出现；`office_render` 还需要支持图像输入的模型路由和附件服务。
- 记忆、worker 会话、长会话看护与检索来自 Agent profile 固定的 `dsh-auto-memory`、`session-messaging`、`session-guardian`（含 session-query 组）组件；换到没有这些组件的 profile，这些工具名不可用。
- `read_image`（工作会话侧）需要支持图像输入的模型路由和附件服务。
- 权限模式与沙箱是 host/profile 设置，三个预设都不会放宽它们。
