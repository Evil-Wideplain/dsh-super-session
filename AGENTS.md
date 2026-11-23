# Personal Agent 与 Worker 预设 — Agent Guide

> 一个 DSH Agent 预设 bundle（不是应用、不是独立程序），声明两个预设：`personal`（用户对话的会话，读 `prompt/handbook.md`）与 `worker`（主会话按简报派发的执行会话，读 `prompt/worker.md`）。人格与工具面在 `cordis.patch.yml`，手册在激活时注入。
> 面向使用者的安装与排错见 [README.md](README.md)；设计参考资料索引见 [docs/INDEX.md](docs/INDEX.md)。

## 常用命令

| 命令 | 作用 |
|------|------|
| `node scripts/verify.mjs` | 必跑：插件可加载、两份 locale 合法、两对手册章节数各自一致、`files` 全存在、两个预设行与各自的 `handbookPath` 都解析得到 |
| `node scripts/verify.mjs --handbook` | 打印每个预设**真正会注入**的手册路径、字节数与 sha256：重载后拿它核对会话里的系统提示词，别靠猜 |
| DSH → 插件 → 添加插件 → 选 `C:\Code\super_agent` → **重载 DSH** → **新建会话** | 真机验证：重载 DSH 才会重读手册；重载后再新建会话，旧会话继续用旧预设 |

## 项目结构

| 路径 | 职责 |
|------|------|
| `cordis.patch.yml` | 两个预设的声明（`preset-personal`、`preset-worker`）：id、显示名、描述、`persona.prefix`、插件行与工具清单 |
| `context.js` | 预设插件：按该行的 `handbookPath` 读一份手册，注册 `personal:handbook` prompt 段；只用 `node:` 内置依赖 |
| `client.js` | Client（浏览器端）插件：侧边栏「超级会话」入口，选中后直接打开固定工作区 `<Host home>/super-agent` 里的那一个常驻会话（第一次点注册该工作区并建会话，面板页只做解析与跳转）；只 `require('react')`，不编译 |
| `index.js` | Host 半边：`apply()` 幂等地准备 `<Host home>/super-agent` 目录（浏览器端首次点击要把它注册成工作区），并让 Loader 挂载包、发现 `dsh.client` 声明；包的 `main` 与 `exports["."]` 都指向它 |
| `prompt/handbook.md` | 个人助理手册（英文；个人预设未设 `handbookPath` 时的默认） |
| `prompt/handbook.zh.md` | 个人助理手册（中文），章节与英文一一对应 |
| `prompt/worker.md` | 工作会话手册（英文），工作预设默认读它 |
| `prompt/worker.zh.md` | 工作会话手册（中文），章节与英文一一对应 |
| `locale/{en,zh}.json` | 插件市场显示名/描述、详情页路径 |
| `docs/DETAIL.md`、`docs/DETAIL.zh.md` | 插件详情页，随包安装（列在 `files` 里） |
| `docs/super-agent.md`、`docs/muse-*.md` | 设计参考资料，只留在仓库，不随包安装 |
| `README.md` | 面向使用者的安装、首次使用、故障排查 |

## 编辑地图：改什么去哪

| 想改 | 改这里 | 不要 |
|------|--------|------|
| 身份、名字、语气、回复语言 | `cordis.patch.yml` 的 `persona.prefix` | 不要在手册里复述人格（双份真相） |
| 工作方式、价值观、工具用法、交付规则（个人助理） | `prompt/handbook.md` + `handbook.zh.md` | 不要只改英文那份 |
| 工作会话的简报/核验/回报规则 | `prompt/worker.md` + `worker.zh.md` | 不要把个人助理手册的内容复制过来（两套职责不同） |
| 派发到哪个预设、预设 id、显示名 | `cordis.patch.yml` 的 `preset-worker` 行 + 手册 Worker Sessions 段 | 不要在代码里硬编码另一份预设清单 |
| 工具面：挂不挂哪个工具、超时、配置 | `cordis.patch.yml` 的 `plugins`，并同步 README 的「工具集」表与 `docs/DETAIL.md` 的 Mounted tools 段 | 不要重复挂 host/profile 已提供的工具；只改 YAML 不同步文档；手册写能力与机制、不列工具清单（机制必须点名时，如 worker 投递、定时校验、文件交付，可写工具名） |
| 市场文案与详情页 | `locale/*.json` + 对应 `docs/DETAIL*.md`（README 的工具表同样要同步） | 不要写在代码里会漂移的数字 |
| 界面入口：侧边栏面板行、选中后跳转到哪一个会话 | `client.js` | 不要在 `index.js` 或 `context.js` 里写界面逻辑 |
| 改仓库的 Agent 该知道的事 | 本文件 | 不要塞进 `README.md`（受众是使用者） |

## 硬性规则

- **单一真相**：人格在 persona 行，程序在手册，工具在 `cordis.patch.yml`；同一句话只写一处。
- **中英成对**：两对手册（`handbook.*`、`worker.*`）各自章节一一对应，改一份必须同步另一份，跑章节数校验。
- **手册是注入资产**：`context.js` 在预设**挂载**时读一次；新建会话复用同一棵已挂载的树，不会重读。改完要**重载 DSH**（`link:` 安装无需重装），重载后再新建会话验证。判断某个会话用的是哪一版：`node scripts/verify.mjs --handbook` 记下 sha256 与首行，再比对该会话系统提示词里手册的开头——对不上就是没重载，不要怀疑手册内容写错了。
- **不重复挂载 profile 组件**：`memory_*`、worker 会话、`session_search`、`working_directory` 由 host 或 profile 提供，预设里再加一份就是重复工具。
- **工具面克制**：不挂 `read`/`write`/`edit`/`glob`/`grep`（shell 是文件接口），不挂 `subagent`/`workflow`（worker 会话走 `session-messaging`）。执行面的工具只挂在 `worker`：`read_image`、`job_*`、`web_search`/`web_fetch`、Office 三件套都不进 `personal`——lead 不亲自看图、跑长命令、查网页、做文档，这些一律派 worker，shell 只当验收探针。
- **两个预设各自成树**：`worker` 只挂有界任务需要的工具，交互面（定时任务、plan mode、结构化提问、`present`）留在 `personal`；目标（`create_goal` / `tool-goal`）两边都有，worker 用它在多轮次里守住同一个任务。`personal` 的 `skill-filesystem` 写 `includeDefaultRoots: false`，只保留 agent-preset 自带的 `dsh-doc`——lead 只需要知道 DSH 自己怎么运作，执行类技能归 worker。代价：lead 看不到 `~/.agents/skills` 里的用户技能，也看不到仓库自带的 `.dsh/skills` / `.agents/skills`；`office` / `office-docx` / `office-xlsx` / `office-pptx` 来自 profile 级 `dsh-skill-office`，按预设摘不掉，两边都会出现。两个预设都不重复挂 profile 的全局组件。
- **手册长度 = 每个会话的常驻开销**：加一节前先问「是不是每次都要」，不是就放 skill 或 `docs/`。
- **client 行必须用裸包名**：`cordis.patch.yml` 里 `super-session-entry` 的 `name` 只能是 `@local/dsh-personal-agent`。`dsh-client-modules` 的扫描器（`exactPackageSpecifier`）只接受包名，解析到包根后读 `./client` 导出；子路径与 `file:` URL 会被静默当成非 client 行跳过，侧边栏什么都不显示，控制台也不报错。预设行反过来用子路径 `@local/dsh-personal-agent/context.js`，这样它们不会被误认成 client 行。`!!js` 只对 `config` 值生效，行元数据一律按字面量读，别拿它算 `name`。`node scripts/verify.mjs` 校验这一条。
- **Client 插件只碰浏览器半边**：`client.js` 随包加载；改它要**重载 DSH**，且只能 `require('react')`，不能 `require` 任何 `@deepseek-ai/dsh-client-*` 包（slot 与主题 token 由宿主注入）。

## 提交前验证清单

1. 跑 `node scripts/verify.mjs`，全部通过（它替代了原先 4 条一次性 `node`/`grep` 校验）。
2. 动了手册：中英章节数一致，且新增段落在两份里都有（两对手册分别校验）。
3. 新增了随包文件：已加进 `package.json` 的 `files`。
4. 重载 DSH 后新建会话，问一句「你能做什么」，确认新段落真的注入（旧会话不会变）。
5. 动了工具面：重新加载 DSH 后新建会话，确认预设列表里仍是 **个人助理** 且工具齐全。
6. 动了预设声明：重载后看 Plugins 里 `preset-personal` 与 `preset-worker` 都是 active；用 `create_session_agent` 带 `agent_preset: worker` 起一个会话，确认它按 worker 手册回报。

## 维护

- 本机安装方式是 `link:C:/Code/super_agent`（见 `~/.dsh/profiles/desktop/package.json`）：`link:` 只省掉重新安装这一步；重载 DSH 不能省，否则手册不会重读。若某处是复制安装，改完要先更新插件，再重载 DSH。
- 文档与代码同一次提交更新：过期的手册会被 Agent 当真，比没有更糟。
