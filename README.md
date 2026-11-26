# Super Session（个人助理 / 工作会话 / Coordinator 预设）

一个 bundle 提供三个 Agent 预设：**个人助理**（用户直接对话的那个会话，把 DSH Super-agent 的分工/注意力原则和 Muse 的主动性/关系设计合起来）、**工作会话**（主会话按自包含简报派发、干完并核验后回报的执行会话），以及 **Coordinator**（只对派它的 lead 负责、管一份目标、拆解并派 worker、看证据验收的 coordinator 会话）。

- **shell 优先**：文件读写、进程、脚本都走 **持久 shell**，不挂 `read`/`write`/`edit`/`glob`/`grep`。
- **需要框架状态的能力才挂工具**：后台任务、定时任务、目标、todo、plan mode、结构化提问、Web、文件交付、Office、skill 由预设挂载；worker 会话、长会话/检索由本 bundle 的依赖 `session-messaging` / `session-guardian` 提供（bundle 自带它们的装载行，profile 已单独启用时让位），记忆仍由 profile 的 `dsh-auto-memory` 提供。
- **记忆只走组件**：不注入 `SOUL.md` / `USER.md` / `MEMORY.md` 等运行时文件；耐久信息用 Agent profile 的 `memory_*` 组件，只有一套记忆。
- **不是** Router/Worker 系统，也**不是**另一个 coding agent；编码只是它能力的一部分。

## 目录结构

```text
C:\Code\super_agent\           # 仓库根目录就是 bundle 根目录
  package.json                 # bundle 清单：dsh.bundle.patch
  cordis.patch.yml             # 三个预设的声明 + 各自的工具清单
  context.js                   # 预设插件：按 handbookPath 注入手册
  client.js                    # 浏览器端插件：侧边栏「超级会话」入口，直接进固定 id 的那个常驻会话（挂在内置 Super Workspace 里，该工作区分组在侧边栏隐藏）
  index.js                     # Host 半边：开机建好并注册 <Documents>/deepseek-harness/super-workspace、把固定 id 的会话 attach 进去，让 Loader 发现 dsh.client
  guard.js                     # Host 插件：coordinator 作用域隐藏 create_session_agent，提供固定 agent_preset: worker 的 dispatch_worker（cwd 必填，拒绝 Super Workspace 空壳目录）
  team.js                      # Host 插件：worker 会话创建时打开 Team 模式（team_task_* 与 team:policy），personal / coordinator 保持默认关闭
  prompt/
    handbook.md                # 个人助理手册（英文，默认）
    handbook.zh.md             # 个人助理手册（中文）
    worker.md                  # 工作会话手册（英文，默认）
    worker.zh.md               # 工作会话手册（中文）
    coordinator.md             # coordinator 手册（英文，默认）
    coordinator.zh.md          # coordinator 手册（中文）
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

在 DSH 里打开 **插件 / Plugins → 添加插件（Add plugin）→ 选择本地目录**，选中仓库根目录 `C:\Code\super_agent`。安装完成后，新建会话，预设列表里会有 **Super Session**、**Worker** 和 **Coordinator** 三个可选项（依次是个人助理、工作会话与协调者）：日常对话选 Super Session；主会话用 `create_session_agent` 派活时选 Worker（`agent_preset: worker`）；一个目标要拆给多个 worker 时派一个 Coordinator（`agent_preset: coordinator`）。

### 依赖插件：装一个 bundle，带上两个插件

`package.json` 的 `dependencies` 已经 pin 了 `session-messaging` 与 `session-guardian`（与当前 profile 运行的 commit 一致）。bundle 自己也复制了它们的装载行（id 前缀 `bundled-`）：profile 没有单独启用同名 bundle 时由这些行挂载，已单独启用时它们按 `profileContext.startedBundles` 自动禁用，**不会重复注册服务**。装好依赖后，`send_session_message`、`create_session_agent`、`dispatch_worker`、`session_search` 等工具就直接可用（临时 profile 已端到端验证）。

三个必须知道的前提：

- **git 依赖在当前 DSH（pnpm 11）上不能自动安装**：pnpm 11 默认拒绝"依赖的依赖"里出现 git 源（`ERR_PNPM_EXOTIC_SUBDEP`），并且 git 包的 `prepare` 需要 `allowBuilds` 放行（`ERR_PNPM_GIT_DEP_PREPARE_NOT_ALLOWED`）。实测必须在 profile 的 `pnpm-workspace.yaml` 里手工加两样：

  ```yaml
  blockExoticSubdeps: false
  allowBuilds:
    "session-messaging@git+https://github.com/Evil-Wideplain/session-messaging.git": true
    "session-guardian@git+https://github.com/Evil-Wideplain/session-guardian.git": true
  ```

  注意：pnpm 报错里示例的 `...@https://codeload.github.com/...tar.gz/<commit>` 键实测**不生效**，要用上面这种仓库形式；GUI 的构建审批写入的是报错示例那种键，所以也救不了 `blockExoticSubdeps`（它没有任何自动开关）。因此 **"装一次就全自动"用 git 依赖做不到**。真正的零手工只有两条路：把两个插件发布到 npm（tarball 带 `lib/`、去掉 `prepare`），或把成品以 `file:` 目录随本包 vendoring（实测 `file:` 子依赖不被 `blockExoticSubdeps` 拦）。只把 `lib/` 提交进那两个仓库但保留 `prepare`，仍然会要求 `allowBuilds`。
- **本地目录安装是 `link:`，不会装依赖**：GUI 选本地目录时安装器 link 本包，`dependencies` 不会落地。本机自用没问题（两个插件本来就在 profile 里）；换一台干净机器请用 Git / 市场安装，或先单独安装这两个插件。
- **单独装那两个插件也可以**：`bundled-` 行会把自己禁用，profile 里那一份继续生效。改配置时，覆盖原 id（`session-messaging`、`session-guardian*`）影响独立安装的那份；覆盖 `bundled-*` id 影响 bundle 自带的那份。

如果你用 agent 安装，给它这个指令：

```text
用 plugin_manager 的 install_bundle，target 设为 C:\Code\super_agent，安装后列出 bundle 与 preset-personal、preset-worker、preset-coordinator 的激活状态。
```

安装器会把包 link 到 profile 的 `node_modules`，所以 `cordis.patch.yml` 里的 `@evil-wideplain/dsh-super-session` 能解析到本目录。**不要**手动改 profile 的 `package.json` 或跑 pnpm；唯一需要手改的是上面「依赖插件」里那两行 `pnpm-workspace.yaml` 设置（仅 git 安装时需要）。

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
- **DSH 专有补充**：Skills 一节（Muse 没有独立 skill 章节）、Worker 会话的投递与分发纪律（`create_session_agent`，brief 要自包含，结果用 `$DSH_SESSION_ID` 回报，派活 `cwd` 必须是任务仓库）、`schedule_*` 的校验步骤、`present` 的文件交付规则，以及 First Run、Continuity、Failure and Honesty 三节（Muse 里分散在别处或没有）。

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
| 定时任务 | `schedule_create` / `schedule_list` / `schedule_view` / `schedule_edit` |
| 目标 | `create_goal` / `get_goal` / `update_goal` |
| 进度清单 | `todo_write` |
| 计划模式 | plan mode + `exit_plan_mode` |
| 结构化提问 | `ask_user_question` |
| 文件交付 | `present` |
| 技能 | `skill`（项目级与用户级技能都默认加载） |

**执行面的工具不在个人助理这里**：`read_image`、`job_output` / `job_list` / `job_kill`、`web_search` / `web_fetch`、Office 三件套都归**工作会话**预设。lead 不亲自看图、跑长命令、查网页、做文档——这些活派 worker 去干，自己只留判断、简报和验收。skill 目录不设限制：全局用户技能和项目级 `.dsh/skills` / `.agents/skills` 都默认加载，项目根按会话当时的 cwd 现算，换工作区就换一套技能；`office` / `office-docx` / `office-xlsx` / `office-pptx` 那四个来自 profile 级的 `dsh-skill-office`，三个预设都有。 `subagent` / `subagent_fork` 与 `send_message` / `list_agents` / `wait_agent` 这套派生工具也只在 worker：lead 不自己派生，跨会话的活走 worker。

bundle 还带一个浏览器端插件：侧边栏面板行 **超级会话** 就是你那一个常驻会话，点它直接进对话，没有中间页、也没有「新建」按钮。它按一个**固定的会话 id**（`session-super-session`，DSH 接受任意字符串 id）认这个会话，并把它**挂在内置工作区**里。挂工作区是硬性前提：一个还没发过消息的空白会话如果不属于任何工作区，DSH 的对话界面会把输入框换成「选择一个工作区开始」，根本不能打字；所以第一次点传的是 `workspaceId`（`workspaceId` 与 `cwd` 不能同时传，Host 会拒），Host 在同一次调用里把它 attach 进工作区。这个工作区是 `<Documents>\deepseek-harness\super-workspace`（`Documents` 默认是用户主目录下的 `Documents`，被重定向时按系统设置解析），标题 `Super Workspace`，与 DSH 自己的 `default-workspace` 同级；目录、工作区注册，以及旧版本用 `cwd` 建出来的那个固定 id 会话的一次性 attach，都在 **DSH 启动时**由 Host 半边完成（幂等，失败只记一条警告）。这个工作区**不在侧边栏的工作区列表里显示**：DSH 没有「隐藏工作区」的字段或命令，工作区列表又是共享 store（改它会动到真实状态），所以 client 半边只在**展示层**注入一条按树行 `data-row-key="workspace:<id>"` 定位的样式，把这一组连同它的会话行一起去掉，插件卸载时移除样式即恢复；它仍然必须存在，否则空白会话的输入框会变成「选择一个工作区」。面板按路径尾部 `deepseek-harness/super-workspace` 或标题恰好是 `Super Workspace` 认这个工作区，取它的 id 当 attach 目标、取它的路径判断成员身份。第一次点用 **个人助理** 预设把这个固定 id 的会话建出来（标题 `超级会话`），以后每次点都回到它；归档后再点会先取消归档再打开；它还是空白、而记录的预设不是 `personal` 时，会用同一个 id 再 `create` 一次改回 `personal`（已经发过第一轮的会话不动）。

**残留风险**：它现在是 `Super Workspace` 的普通成员，所以在它还是空白（一轮都没发过）的这段时间里，如果你在那个工作区里点普通「新建会话」，DSH 会**复用它**并改挂当前默认预设（`standard`）。点开面板会改回 `personal`，但只在那第一轮还没发出去时有效；一旦那一轮发出去了，预设就锁死了。这个窗口没有更干净的关法：DSH 只把 `turn/start` 当作「不再是空白」，没有别的接口能让它提前脱离可复用状态。旧版本在同一工作区里用别的 id 建过的会话不再被这个入口打开，它作为那个工作区的普通会话留着，历史不丢。找不到工作区时它不猜路径，直接提示「重启 DSH 后会自动建好」并给一个重试按钮；固定会话存在但还没挂进工作区时提示「重启 DSH 后会自动挂好」。

面板要出现在侧边栏，`cordis.patch.yml` 里那条 client 行的 `name` 必须写成**裸包名** `@evil-wideplain/dsh-super-session`：客户端扫描器只认包名（或 `@scope/名`），它把名字解析到包根，再读包根旁边的 `./client` 导出。写成子路径（例如 `@evil-wideplain/dsh-super-session/context.js`）或 `file:` URL 都会被当成非 client 行静默跳过，侧边栏什么都不显示，也不会报错。

`working_directory` 由 Web 的 host 层提供给所有预设，**不需要也不应该**在预设里再挂一次；重复挂载会注册同名工具。

工作会话侧的 `job_*` 目前没有 producer：持久 shell 用 `&` 跑后台命令，不会注册 job。后台长命令请把输出重定向到日志文件，之后再查。要让它真正可用，需要再加一个 job-aware 的 shell/terminal 工具。

工作会话侧的 Office 三个工具要**先加载 Office skill**（`office`、`office-docx`、`office-xlsx`、`office-pptx`）才会出现；渲染还需要支持图像输入的模型路由和附件服务。个人助理不挂这三个工具，文档的读取、转换、渲染一律派 worker。

**工作会话**预设挂的是**执行面**，不是个人助理那张表的子集：持久 shell、`read_image`、`job_*`、`todo_write`、`create_goal` / `get_goal` / `update_goal`（一轮做不完的简报靠它跨轮次专注同一个目标）、`web_search` / `web_fetch`、Office 三件套、`skill`（扫描全部默认根，`~/.agents/skills` 与仓库自带技能都看得到），以及 **delegation 三条**：`subagent`（spawn）、`subagent_fork`（fork）与 subagent control（`send_message` / `list_agents` / `wait_agent`）。它不挂 `schedule_*`、plan mode、`ask_user_question` 与 `present`——那些留在个人助理，worker 只负责把简报干完并回报。三个预设都不重复挂 profile 的全局工具。

**Coordinator** 预设只挂协调面：持久 shell（只用来核对 worker 改了什么、跑它说通过的检查）、`create_goal` / `get_goal` / `update_goal`、`todo_write`、`skill`（默认根，与另外两个预设一致）。它不挂 plan mode、`ask_user_question`、`present`、定时任务、`web_*`、`read_image`、`job_*`、Office；`send_session_message` 来自本 bundle 声明并挂载的 `session-messaging`（profile 已单独启用同名 bundle 时让位）。派 worker 用本 bundle 的 `guard.js` 在 coordinator 作用域注册的 `dispatch_worker`：它的 Agent 预设固定为 `worker`；profile 的全局 `create_session_agent` 在 coordinator 作用域被隐藏，不能用来创建 `personal` 或第二个 `coordinator`。这两步都是运行时拦截，不是手册约定。 而 `dispatch_worker` 的 `cwd` 是必填参数：每次派活都要显式给出任务所属仓库的绝对路径（例如 `C:\Code\super_agent`），Super Workspace 空壳目录会被直接拒绝。

以下**全局工具**由 `session-messaging` / `session-guardian` 提供。本 bundle 声明它们为依赖并自带装载行（profile 已单独启用同名 bundle 时让位）；`dsh-auto-memory` 仍由 profile 提供：

| 组件 | 提供的全局工具 |
| --- | --- |
| `session-messaging` | `list_session_agents`、`send_session_message`、`review_session_messages`、`create_session_agent` |
| `session-guardian` | `watch_session`、`unwatch_session`、`list_watched_sessions` |
| `session-guardian`（session-query 组） | `session_search`、`session_event_search`、`session_trace`、`session_event_trace`、`session_event_read` |
| `dsh-auto-memory` | `memory_write`、`memory_read`、`memory_list`、`memory_search`、`memory_delete`、`memory_delete_all`、`memory_prune` |

> 唯一的例外是 coordinator：`guard.js` 在 `coordinator` 作用域隐藏上面这张表里的 `create_session_agent`，换成固定 `agent_preset: worker` 的 `dispatch_worker`；profile 里的原工具本身不改，personal / worker 仍照常使用。 `dispatch_worker` 与 `create_session_agent` 的区别还有一点：`dispatch_worker` 强制显式 `cwd`，不再回落到调用方的工作目录。

三个预设都**不挂载**：`read` / `write` / `edit` / `glob` / `grep` / `apply_patch`、`subagent` / `subagent_fork` / `workflow`。文件读写通过 shell；委派通过 Agent profile 的 `session-messaging` 组件。

worker 会话是独立会话，用 **工作会话** 预设启动（`create_session_agent` 的 `agent_preset: worker`），不继承你的上下文、也不共享你的记忆。只传任务真正需要的上下文；结果让它用 `send_session_message` 发回你的会话 id。 worker 自己还能再派生 subagent（`subagent` / `subagent_fork`），并用共享任务板（`team_task_*`）协调队友：bundle 的 `team.js` 在 worker 会话创建时把 Team 模式打开，personal / coordinator 不受影响。深度受 Host 的 `subagent.maxDepth` 限制，默认 1 层——队友不能再往下派生。

coordinator 会话也走 `create_session_agent`，`agent_preset: coordinator`：给它一份目标、约束和你的会话 id，它自己拆解、派 worker、验收证据，再把结果报回你。一个目标只派一个 coordinator；它不找用户，也只往下派一层 worker——这一步由 `guard.js` 在运行时强制：coordinator 的工具面没有 `create_session_agent`，只有固定 `agent_preset: worker` 的 `dispatch_worker`。

**派活的落点**：建 worker 或 coordinator 会话时，`cwd` 必须是任务所属的仓库（改这套预设就是 `C:\Code\super_agent`）。**禁止**把 `Super Workspace` 空壳目录（`<Documents>\deepseek-harness\super-workspace`）当作派活目录：它只是常驻会话的注册锚点，里面没有仓库，在那里的工作落在虚空里。跨仓库任务选拥有这次改动的仓库作 `cwd`，其余仓库在简报里写绝对路径；唯一例外是只读地测绘「哪里有哪几个仓库」。

## 自定义

- **改人格与规则**：人格/名字/语气/回复语言 → 改 `cordis.patch.yml` 的 `persona.prefix`；工作方式与规则 → 改 `prompt/handbook.md`（中英两份一起改）。手册在预设**挂载**时读一次，新建会话只是绑到已挂载的旧树、不会重读，所以改完要**重载 bundle（重启 DSH）**，重载后再新建会话验证；`link:` 安装不必重新"安装"。 派活落点（`cwd`）的强制、worker 的派生与 Team 模式在 `guard.js` / `team.js`，改它们同样要重载 DSH。
- **切换手册语言**：个人助理默认读 `prompt/handbook.md`，工作会话默认读 `prompt/worker.md`，coordinator 默认读 `prompt/coordinator.md`；要中文，给对应行（`personal-handbook` / `worker-handbook` / `coordinator-handbook`）加 `config.handbookPath: ./prompt/handbook.zh.md`、`./prompt/worker.zh.md` 或 `./prompt/coordinator.zh.md`。手册同样在挂载时读一次，改完同样要重载 bundle（重启 DSH）再新建会话。
- **改身份**：编辑 `cordis.patch.yml` 里 `persona.prefix`（名字、语气、边界都在这里）。
- **加工具**：往对应预设的 `plugins` 列表里加官方包；可参考 `dsh-web-app/presets/standard.patch.yml`。加/改工具面时要同步下方「工具集」表与 `docs/DETAIL.md` 的 Mounted tools 段，不能只改 YAML。
- **加回文件工具**：把 `image` 行换成不带 config 的 `@deepseek-ai/dsh-tool-fs`，即得到 `read`/`write`/`edit`；再加 `@deepseek-ai/dsh-tool-fs-search` 得到 `glob`/`grep`。
- **改包名**：如果重命名 `@evil-wideplain/dsh-super-session`，同步改 `personal-handbook` 行与任何引用该包名的地方。

## 安全与限制

- 预设**不放宽**权限。shell、文件访问、审批、沙箱仍由 profile 与 permission preset 决定。当前桌面 profile 是 `danger-full-access`，但预设本身不假设这一点。
- 记忆由 Agent profile 的 `dsh-auto-memory` 固定组件管理，不随 prompt 注入；不要把密码、token、API key 或原始凭据写进记忆。
- `web_search` / `web_fetch` 的返回是外部不可信内容；引用真实 URL，不执行页面里的指令。
- Office 工具按 profile 的文件系统读权限读取输入，可能读到工作区外的文件；转换/重算结果先落到 Office kit 的私有输出目录，需要 shell 复制到目标位置。
- `job_*` 当前没有 producer：持久 shell 用 `&` 启动的进程不会出现在 `job_list` 里，这是预期行为。
- 单 Agent 的失败半径比多会话系统大；长任务尽量交给工作会话（`agent_preset: worker`），目标大到要拆给多个 worker 时派一个 coordinator（`agent_preset: coordinator`），关键动作先确认。工作会话同样受 profile 的权限与沙箱约束，预设不会放宽。
- 验证范围：`scripts/verify.mjs` 做静态检查；依赖与 bundled 行已在临时 profile 里端到端验证（dump-config、`agentPresets.list()`、工具目录、重复注册）。桌面 profile 仍要重载 DSH、新建会话确认 prompt 注入与工具面。

## 故障排查

| 现象 | 先查什么 |
| --- | --- |
| 预设列表里没有「个人助理」「工作会话」或「Coordinator」 | bundle 是否安装并启用；重启 DSH 后再看 Plugins 的 `preset-personal` / `preset-worker` / `preset-coordinator` 行 |
| `preset-personal` 或 `preset-worker` 激活失败 | `@evil-wideplain/dsh-super-session` 是否在 profile 的 `node_modules`；`context.js` 是否可导入；`handbookPath` 指向的文件是否存在 |
| `create_session_agent` 报「DSH 拒绝创建会话」且提到 preset | 目标预设 id 是否存在（`worker`）；是否已重载 DSH；可临时省掉 `agent_preset` 用默认预设派发 |
| 记忆搜不到或写不进 | Agent profile 的 `dsh-auto-memory` 是否启用；写入前先 `memory_search`，避免重复 |
| 全局工具没出现 | 本 bundle 的依赖是否装好（`node_modules/session-messaging`、`session-guardian` 有 `lib/`）；git 安装是否放行了构建；`bundled-*` 行是否被 profile 覆盖成 disabled；`dsh-auto-memory` 是否在 profile 的 `bundles` 里；重启后再看 |
| coordinator 显示 `waiting for sessionMessaging` | 两个依赖没装或没有 `lib/`（git 构建未放行）；本地目录安装是 `link:`，不会装依赖；先按上面的依赖段处理 |
| 个人助理里没有 `read_image` / `web_*` / `job_*` / Office 工具 | 预期行为：这些工具只挂在**工作会话**预设，派个 worker 去做 |
| 工作会话里 `read_image` 不可用 | 当前模型是否声明 image 输入；profile 是否挂载附件服务 |
| `web_search` / `web_fetch` 不可用 | host 的 `web` 服务与 Search/Fetch provider 是否启用（Settings → Web search） |
| Office 工具没出现 | 是否先加载了 Office skill（`office` 等）；host 的 `office-kit` 是否可用；`office_render` 还需要图像模型路由 |
| `skill` 列表为空或缺少技能 | `skill-filesystem` 是否加载；项目 `.dsh/skills`、`.agents/skills` 或用户 `~/.dsh/skills`、`~/.agents/skills` 下是否有合法 `SKILL.md`（项目根按会话 cwd 现算，先确认当前工作区） |
| 定时任务创建失败 | host 的 `schedule` 服务是否挂载；时间规则是否在支持的 RRULE 子集内 |
| `job_list` 一直为空 | 持久 shell 不注册 job；这是预期行为，后台长命令用 `&` + 日志文件 |

## 卸载

在 **插件 / Plugins** 里移除 bundle（市场标题为「个人助理、工作会话与 Coordinator」），或在 agent 里调用 `plugin_manager` 的 `remove_bundle`，target 用列表里的 bundle 标识。移除后三个预设都会从列表消失。记忆由 Agent profile 的 `dsh-auto-memory` 保存，卸载 bundle 不会删除；需要时用 `memory_delete` 清理。

## 参考资料

`docs/` 里还保存了三份研究材料，它们**不是** bundle 的一部分，也不会被安装：

- [`docs/INDEX.md`](docs/INDEX.md) — 文档索引：插件详情页与研究资料。
- [`docs/super-agent.md`](docs/super-agent.md) — DSH Super-agent（Router/Worker）设计与 system prompt 导读。
- [`docs/muse-personal-agent.md`](docs/muse-personal-agent.md) — Meta Muse 个人 Agent 的 System Prompt 档案。
- [`docs/muse-system-prompt.md`](docs/muse-system-prompt.md) — Meta Muse 的 System Prompt 原文。
