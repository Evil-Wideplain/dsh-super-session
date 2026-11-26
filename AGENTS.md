# Super Session bundle（预设 `Super Session` / `Worker` / `Coordinator`）— Agent Guide

> 一个 DSH Agent 预设 bundle（不是应用、不是独立程序），声明三个预设：`personal`（用户对话的会话，读 `prompt/handbook.md`）、`worker`（按简报执行并回报的执行会话，读 `prompt/worker.md`）与 `coordinator`（只对派它的 lead 负责、管一份目标并派 worker 的 coordinator 会话，读 `prompt/coordinator.md`）。人格与工具面在 `cordis.patch.yml`，手册在激活时注入。
> 面向使用者的安装与排错见 [README.md](README.md)；设计参考资料索引见 [docs/INDEX.md](docs/INDEX.md)。

## 常用命令

| 命令 | 作用 |
|------|------|
| `node scripts/verify.mjs` | 必跑：插件可加载、两份 locale 合法、三对手册章节数各自一致、`files` 全存在、三个预设行与各自的 `handbookPath` 都解析得到，coordinator 的工具面没混进执行面工具，worker 挂上 delegation 三条而 personal / coordinator 没挂，`guard.js` 的 shadow / `dispatch_worker`（含 `cwd` 必填、空壳目录拒绝）与 `team.js` 的 Team 模式切换都做桩测 |
| `node scripts/verify.mjs --handbook` | 打印每个预设**真正会注入**的手册路径、字节数与 sha256：重载后拿它核对会话里的系统提示词，别靠猜 |
| DSH → 插件 → 添加插件 → 选 `C:\Code\super_agent` → **重载 DSH** → **新建会话** | 真机验证：重载 DSH 才会重读手册；重载后再新建会话，旧会话继续用旧预设 |

## 项目结构

| 路径 | 职责 |
|------|------|
| `cordis.patch.yml` | 三个预设的声明（`preset-personal`、`preset-worker`、`preset-coordinator`）：id、显示名、描述、`persona.prefix`、插件行与工具清单 |
| `context.js` | 预设插件：按该行的 `handbookPath` 读一份手册，注册 `personal:handbook` prompt 段；只用 `node:` 内置依赖 |
| `client.js` | Client（浏览器端）插件：侧边栏「超级会话」入口，选中后直接打开**固定会话 id** `session-super-session` 的那一个常驻会话，并把它**挂在内置工作区**里。挂工作区是硬性前提：空白会话不属于任何工作区时，DSH 的对话界面会把输入框换成「选择一个工作区」的选择器，根本不能打字。第一次点按 `{ workspaceId: 内置工作区 id, sessionId, agentPreset: 'personal' }` 创建（`workspaceId` 与 `cwd` 不能同时传），之后只认这个 id，归档了先取消归档，blank 期间记录预设不是 `personal` 就再用同一个 id `create` 一次改回来（已发过第一轮的不动）；内置工作区 `<Documents>\deepseek-harness\super-workspace`（标题 `Super Workspace`，Host 开机建好并注册）按路径尾部或标题识别，取它的 id 与路径，并把这个工作区的分组在侧边栏**展示层隐藏**（往 `document.head` 注入按树行 `data-row-key` 定位的样式，dispose 时移除；DSH 的工作区没有隐藏字段，共享 store 只读不改），会话仍只从面板入口靠固定 id 进入，认不到显示「重启 DSH」错误并可重试，固定会话未挂进工作区时显示「重启 DSH 后会自动挂好」；面板页只做解析与跳转；只 `require('react')`，不编译 |
| `index.js` | Host 半边：开机解析 Documents（先 `~/Documents`，不成立再走 powershell 的 `GetFolderPath`），幂等创建 `<Documents>\deepseek-harness\super-workspace` 并用 `workspaceRegistry.create(path, 'Super Workspace')` 注册（用 `ctx.inject(['workspaceRegistry', 'sessionPersistence'])` 等这两个服务就绪，失败只 warn），注册后把固定 id 的超级会话 `workspace.attachSession(SUPER_SESSION_ID)` 挂进去（旧版本用 `cwd` 建出来的会话靠这一步修好；会话不存在就跳过，已是成员就不动），同时让 Loader 挂载包、发现 `dsh.client` 声明；包的 `main` 与 `exports["."]` 都指向它 |
| `guard.js` | Host 插件（只挂在 `preset-coordinator`）：在 coordinator 作用域用一个 `when: false` 的同名 shadow 隐藏全局 `create_session_agent`，并注册 `dispatch_worker`，固定 `agent_preset: worker`，创建语义复用 `ctx.sessionMessaging.creation.create`；`cwd` 是必填参数，必须是任务所属仓库的绝对路径，Super Workspace 空壳目录直接拒绝 |
| `team.js` | Host 插件（bundle 级，只挂一次）：监听 `agent/created`，当会话记录的预设是 `worker`、且它是自己 subagent 树的根时，用 `ctx.agentTeams.setEnabled` 打开 Team 模式，让 `team_task_*` 与 `team:policy` 进入 worker 会话；personal / coordinator 保持默认关闭。写在 bundle 层而不是预设行，因为 Team 模式是会话选择、不是插件行 |
| `prompt/handbook.md` | 个人助理手册（英文；个人预设未设 `handbookPath` 时的默认） |
| `prompt/handbook.zh.md` | 个人助理手册（中文），章节与英文一一对应 |
| `prompt/worker.md` | 工作会话手册（英文），工作预设默认读它 |
| `prompt/worker.zh.md` | 工作会话手册（中文），章节与英文一一对应 |
| `prompt/coordinator.md` | coordinator 手册（英文），coordinator 预设默认读它 |
| `prompt/coordinator.zh.md` | coordinator 手册（中文），章节与英文一一对应 |
| `locale/{en,zh}.json` | 插件市场显示名/描述、详情页路径 |
| `icon.svg` | 插件图标：36×36 的自包含 SVG，透明、不画底板（Plugin Manager 自己画底衬）；`exports["./icon"]` 指它 |
| `docs/DETAIL.md`、`docs/DETAIL.zh.md` | 插件详情页：各自只有一行特性图，随包安装（列在 `files` 里） |
| `docs/preview.svg` | 详情页那张特性图：640×300、无文字、英中共用一张（列在 `files` 里） |
| `docs/super-agent.md`、`docs/muse-*.md` | 设计参考资料，只留在仓库，不随包安装 |
| `README.md` | 面向使用者的安装、首次使用、故障排查 |

## 编辑地图：改什么去哪

| 想改 | 改这里 | 不要 |
|------|--------|------|
| 身份、名字、语气、回复语言 | `cordis.patch.yml` 的 `persona.prefix` | 不要在手册里复述人格（双份真相） |
| 工作方式、价值观、工具用法、交付规则（个人助理） | `prompt/handbook.md` + `handbook.zh.md` | 不要只改英文那份 |
| 工作会话的简报/核验/回报规则 | `prompt/worker.md` + `worker.zh.md` | 不要把个人助理手册的内容复制过来（两套职责不同） |
| coordinator 的拆解/派发/汇报规则 | `prompt/coordinator.md` + `coordinator.zh.md` | 不要把它写成第二个 lead：它不找用户、不亲手干活、只往下派一层 |
| coordinator 只能派 worker 的运行时强制 | `guard.js` + `preset-coordinator` 的 `dispatch-guard` 行 | 不要只改手册当作限制；也不要在 `guard.js` 里改成别的预设 |
| 派活落点的运行时强制 | `guard.js` 的 `cwd` 必填与空壳目录拒绝 + 三份手册的「派活的落点 / Where a Worker Runs」 | 不要让 `cwd` 回落到调用方目录；不要把 Super Workspace 写进默认值 |
| worker 能不能派生 subagent / 用 team | worker 预设的三条 delegation 行 + bundle 级 `worker-team-mode` 行与 `team.js` | 不要在 personal / coordinator 挂 subagent；不要把 `agent-team` 服务挂进预设作用域 |
| 派发到哪个预设、预设 id、显示名 | `cordis.patch.yml` 的 `preset-worker` 行 + 手册的分发纪律段 | 不要在代码里硬编码另一份预设清单 |
| 工具面：挂不挂哪个工具、超时、配置 | `cordis.patch.yml` 的 `plugins`，并同步 README 的「工具集」表 | 不要重复挂 host/profile 已提供的工具；只改 YAML 不同步文档；手册写能力与机制、不列工具清单（机制必须点名时，如 worker 投递、定时校验、文件交付，可写工具名） |
| 市场文案与详情页 | 标题/描述在 `locale/*.json` 的 `meta`（`meta.detail` 指向对应语言的 DETAIL）；`docs/DETAIL*.md` 只留一行特性图，功能与用法一律写进 `meta.description`；README 的工具表同样要同步 | 不要把功能与用法写进 DETAIL（`plugin-details.md:19` 要求它恰好一行图）；不要写在代码里会漂移的数字 |
| 界面入口：侧边栏面板行、选中后跳转到哪一个会话 | `client.js` | 不要在 `index.js` 或 `context.js` 里写界面逻辑 |
| 改仓库的 Agent 该知道的事 | 本文件 | 不要塞进 `README.md`（受众是使用者） |

## 硬性规则

- **单一真相**：人格在 persona 行，程序在手册，工具在 `cordis.patch.yml`；同一句话只写一处。
- **中英成对**：三对手册（`handbook.*`、`worker.*`、`coordinator.*`）各自章节一一对应，改一份必须同步另一份，跑章节数校验。
- **手册是注入资产**：`context.js` 在预设**挂载**时读一次；新建会话复用同一棵已挂载的树，不会重读。改完要**重载 DSH**（`link:` 安装无需重装），重载后再新建会话验证。判断某个会话用的是哪一版：`node scripts/verify.mjs --handbook` 记下 sha256 与首行，再比对该会话系统提示词里手册的开头——对不上就是没重载，不要怀疑手册内容写错了。
- **不重复挂载 profile 组件**：`memory_*`、worker 会话、`session_search`、`working_directory` 由 host 或 profile 提供，预设里再加一份就是重复工具。 Team 服务与 `team_task_*` 同样由 host 的 `dsh-base` 提供，预设不重复挂；worker 的 Team 模式由 bundle 级 `team.js` 打开会话选择，而不是再挂一份插件。
- **工具面克制**：不挂 `read`/`write`/`edit`/`glob`/`grep`（shell 是文件接口）。`personal` 与 `coordinator` 不挂 `subagent`/`workflow`：跨会话的活走 `session-messaging`（`create_session_agent` / `dispatch_worker`）。执行面的工具只挂在 `worker`：`read_image`、`job_*`、`web_search`/`web_fetch`、Office 三件套，以及给长简报分身的 `subagent` / `subagent_fork` / `send_message` / `list_agents` / `wait_agent` 都不进 `personal`——lead 不亲自看图、跑长命令、查网页、做文档，这些一律派 worker，shell 只当验收探针。`workflow` 仍不挂。
- **三个预设各自成树**：交互面（定时任务、plan mode、结构化提问、`present`）只在 `personal`；`worker` 挂执行面（shell、图片、jobs、web、Office、目标、todo、skill，外加 delegation 三条：`subagent` / `subagent_fork` / subagent control）；`coordinator` 只挂协调面（shell 仅用于核对、`tool-goal`、`todo_write`、`skill`），不挂 plan mode、`ask_user_question`、`present`、定时任务、`web_*`、`read_image`、`job_*`、Office、subagent——coordinator 只派活和验收。coordinator 只能派 worker 是**运行时强制**：`guard.js` 在 coordinator 作用域隐藏 `create_session_agent`，只暴露固定 `agent_preset: worker` 的 `dispatch_worker`；worker 与 personal 不受影响。目标（`create_goal` / `tool-goal`）三个预设都有：worker 用它跨轮次守住一份简报，coordinator 用它守住一份目标。三个预设都默认加载全局与项目技能：`skill-filesystem` 开着默认根（项目级 `.dsh/skills`、`.agents/skills`，用户级 `<dshHome>/skills`、`<agentsHome>/skills`，以及设了 `$DSH_BUNDLED_SKILL_DIR` 时的 bundled 根），项目根按**会话当时的 cwd** 每次现算，所以不同工作区的会话看到各自项目的技能，`cd` 之后也会换根；`customSkillDirs` 只额外补 agent-preset 自带的 `dsh-doc`。`office` / `office-docx` / `office-xlsx` / `office-pptx` 来自 profile 级 `dsh-skill-office`，三个预设都有。三个预设都不重复挂 profile 的全局组件。
- **图标与特性图**：`icon.svg` 是 36×36（`width`/`height`/`viewBox` 都是 36）的自包含 SVG，透明、不画底板，也不用 `<text>`/`<style>`/`<script>`（`artwork.md:14,22`）；`docs/preview.svg` 是 640×300、无文字的特性图，英中两份 DETAIL 共用。`node scripts/verify.mjs` 校验尺寸与「DETAIL 只有一行图」。
- **手册长度 = 每个会话的常驻开销**：加一节前先问「是不是每次都要」，不是就放 skill 或 `docs/`。
- **client 行必须用裸包名**：`cordis.patch.yml` 里 `super-session-entry` 的 `name` 只能是 `@evil-wideplain/dsh-super-session`。`dsh-client-modules` 的扫描器（`exactPackageSpecifier`）只接受包名，解析到包根后读 `./client` 导出；子路径与 `file:` URL 会被静默当成非 client 行跳过，侧边栏什么都不显示，控制台也不报错。预设行反过来用子路径 `@evil-wideplain/dsh-super-session/context.js`，这样它们不会被误认成 client 行。`!!js` 只对 `config` 值生效，行元数据一律按字面量读，别拿它算 `name`。`node scripts/verify.mjs` 校验这一条。
- **Client 插件只碰浏览器半边**：`client.js` 随包加载；改它要**重载 DSH**，且只能 `require('react')`，不能 `require` 任何 `@deepseek-ai/dsh-client-*` 包（slot 与主题 token 由宿主注入）。

## 提交前验证清单

1. 跑 `node scripts/verify.mjs`，全部通过（它替代了原先 4 条一次性 `node`/`grep` 校验）。
2. 动了手册：中英章节数一致，且新增段落在两份里都有（三对手册分别校验）。
3. 新增了随包文件：已加进 `package.json` 的 `files`。
4. 重载 DSH 后新建会话，问一句「你能做什么」，确认新段落真的注入（旧会话不会变）。
5. 动了工具面：重新加载 DSH 后新建会话，确认预设列表里仍是 **Super Session** 且工具齐全。
6. 动了预设声明：重载后看 Plugins 里 `preset-personal`、`preset-worker`、`preset-coordinator` 都是 active；用 `create_session_agent` 带 `agent_preset: worker` 起一个会话确认它按 worker 手册回报、且 `subagent` / `team_task_*` 都在工具面里，再带 `agent_preset: coordinator` 起一个确认它只派 worker、只回报主会话，并确认 coordinator 的工具面里没有 `create_session_agent`、派 worker 走 `dispatch_worker`（且 `cwd` 必填、空壳目录被拒）。

## 维护

- 本机安装方式是 `link:C:/Code/super_agent`（见 `~/.dsh/profiles/desktop/package.json`）：`link:` 只省掉重新安装这一步；重载 DSH 不能省，否则手册不会重读。若某处是复制安装，改完要先更新插件，再重载 DSH。
- 文档与代码同一次提交更新：过期的手册会被 Agent 当真，比没有更糟。
