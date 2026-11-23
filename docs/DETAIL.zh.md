# 个人助理（Personal Agent）

一个 shell 优先、工具面克制的 DSH 个人助理预设。

## 它增加了什么

- 个人助理人设 + 操作手册（英文、中文各一份）。手册近乎逐段照抄 Meta Muse 的 system prompt（价值观、只服务一个用户、谨慎披露、对外联系人、工作方式、个性化与记忆、上下文感知、在手任务、写作风格、工具、委派、定时工作、运行时文件、安全），只把事实换成 DSH 的工具面，另加 DSH 专有的 skill、worker 会话投递、定时任务校验、文件交付、首次使用与连续性几节。
- 挂载工具：持久 shell（非 Windows 用 `bash`，Windows 用 `pwsh`）、`read_image`、`job_output` / `job_list` / `job_kill`、`schedule_*`、`create_goal` / `get_goal` / `update_goal`、`todo_write`、plan mode + `exit_plan_mode`、`ask_user_question`、`web_search` / `web_fetch`、`present`、Office 三件套、`skill`。
- 记忆只有一套：Agent profile 固定的 `dsh-auto-memory` 组件（`memory_*`）。预设不注入 `SOUL.md` / `USER.md` / `MEMORY.md` 等运行时文件；人格由 `persona.prefix` 与手册承载。
- 不挂载 `read` / `write` / `edit` / `glob` / `grep`（文件读写走 shell），也不挂 `subagent` / `workflow`（委派走 Agent profile 的 `session-messaging` 组件）。`working_directory` 由 host 提供给所有预设，不在预设内重复挂载。

## 首次使用

用 **个人助理** 预设新建会话，随便说句话。如果你还没有关于用户的记忆，Agent 会提出初始化，一次问一个问题，并用 `memory_write` 把耐久答案存进 Agent profile 的 memory 组件；不会创建个人文件。

## 数据与隐私

记忆由 Agent profile 固定的 `dsh-auto-memory` 组件管理，不随提示词注入。不要把密码、token、API key 或原始凭据写进记忆。人格与手册随 bundle 安装，不是用户数据文件。

## 限制

- 它是单 Agent，不是 Super-agent 的 Router/Worker 多 Agent 架构；长任务交给通过 Agent profile 的 `session-messaging` 组件创建的 worker 会话。
- 文件编辑通过 shell；网页用 `web_search` / `web_fetch`；后台长命令用 `&` + 日志文件。持久 shell 不注册 job，`job_*` 目前没有 producer。
- Office 的三个工具需要先加载 Office skill 才会出现；`office_render` 还需要支持图像输入的模型路由和附件服务。
- 记忆、worker 会话、长会话看护与检索来自 Agent profile 固定的 `dsh-auto-memory`、`session-messaging`、`session-guardian`（含 session-query 组）组件；换到没有这些组件的 profile，这些工具名不可用。
- `read_image` 需要支持图像输入的模型路由和附件服务。
- 权限模式与沙箱是 host/profile 设置，本预设不会放宽它们。
