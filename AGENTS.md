# Personal Agent 预设 — Agent Guide

> 一个 DSH Agent 预设 bundle（不是应用、不是独立程序）：`cordis.patch.yml` 声明人格与工具面，`prompt/handbook.md` 是激活时注入的操作手册。
> 面向使用者的安装与排错见 [README.md](README.md)；设计参考资料索引见 [docs/INDEX.md](docs/INDEX.md)。

## 常用命令

| 命令 | 作用 |
|------|------|
| `node -e "import('./context.js').then(m=>console.log(m.name, m.inject))"` | 必跑：插件模块能加载、导出 `name`/`inject` |
| `node -e "const fs=require('fs');for(const f of ['locale/en.json','locale/zh.json'])JSON.parse(fs.readFileSync(f,'utf8'));console.log('locale ok')"` | 必跑：两份 locale 是合法 JSON |
| `[ "$(grep -c '^#' prompt/handbook.md)" = "$(grep -c '^#' prompt/handbook.zh.md)" ] && echo parity` | 必跑：中英手册章节数一致 |
| `node -e "const p=require('./package.json'),fs=require('fs');const miss=p.files.filter(f=>fs.globSync(f).length===0);console.log(miss.length?miss:'files ok')"` | 必跑：`files` 里的路径（含 glob）都存在 |
| DSH → 插件 → 添加插件 → 选 `C:\Code\super_agent` → **重载 DSH** → **新建会话** | 真机验证：重载 DSH 才会重读手册；重载后再新建会话，旧会话继续用旧预设 |

## 项目结构

| 路径 | 职责 |
|------|------|
| `cordis.patch.yml` | 预设声明：id、显示名、描述、`persona.prefix`、插件行与工具清单 |
| `context.js` | 预设插件：激活时读一份手册，注册 `personal:handbook` prompt 段；只用 `node:` 内置依赖 |
| `prompt/handbook.md` | 英文手册（`handbookPath` 未设时的默认，即当前生效的那份） |
| `prompt/handbook.zh.md` | 中文手册，章节必须与英文一一对应 |
| `locale/{en,zh}.json` | 插件市场显示名/描述、详情页路径 |
| `docs/DETAIL.md`、`docs/DETAIL.zh.md` | 插件详情页，随包安装（列在 `files` 里） |
| `docs/super-agent.md`、`docs/muse-*.md` | 设计参考资料，只留在仓库，不随包安装 |
| `README.md` | 面向使用者的安装、首次使用、故障排查 |

## 编辑地图：改什么去哪

| 想改 | 改这里 | 不要 |
|------|--------|------|
| 身份、名字、语气、回复语言 | `cordis.patch.yml` 的 `persona.prefix` | 不要在手册里复述人格（双份真相） |
| 工作方式、价值观、工具用法、交付规则 | `prompt/handbook.md` + `handbook.zh.md` | 不要只改英文那份 |
| 工具面：挂不挂哪个工具、超时、配置 | `cordis.patch.yml` 的 `plugins`，并同步 README 的「工具集」表与 `docs/DETAIL.md` 的 Mounted tools 段 | 不要重复挂 host/profile 已提供的工具；只改 YAML 不同步文档；手册写能力与机制、不列工具清单（机制必须点名时，如 worker 投递、定时校验、文件交付，可写工具名） |
| 市场文案与详情页 | `locale/*.json` + 对应 `docs/DETAIL*.md`（README 的工具表同样要同步） | 不要写在代码里会漂移的数字 |
| 改仓库的 Agent 该知道的事 | 本文件 | 不要塞进 `README.md`（受众是使用者） |

## 硬性规则

- **单一真相**：人格在 persona 行，程序在手册，工具在 `cordis.patch.yml`；同一句话只写一处。
- **中英成对**：手册两份章节一一对应，改一份必须同步另一份，跑章节数校验。
- **手册是注入资产**：`context.js` 在预设**挂载**时读一次；新建会话复用同一棵已挂载的树，不会重读。改完要**重载 DSH**（`link:` 安装无需重装），重载后再新建会话验证。
- **不重复挂载 profile 组件**：`memory_*`、worker 会话、`session_search`、`working_directory` 由 host 或 profile 提供，预设里再加一份就是重复工具。
- **工具面克制**：不挂 `read`/`write`/`edit`/`glob`/`grep`（shell 是文件接口），不挂 `subagent`/`workflow`（worker 会话走 `session-messaging`）。
- **手册长度 = 每个会话的常驻开销**：加一节前先问「是不是每次都要」，不是就放 skill 或 `docs/`。

## 提交前验证清单

1. 跑「常用命令」里 4 条 `node`/`grep` 校验，全部通过。
2. 动了手册：中英章节数一致，且新增段落在两份里都有。
3. 新增了随包文件：已加进 `package.json` 的 `files`。
4. 重载 DSH 后新建会话，问一句「你能做什么」，确认新段落真的注入（旧会话不会变）。
5. 动了工具面：重新加载 DSH 后新建会话，确认预设列表里仍是 **个人助理** 且工具齐全。

## 维护

- 本机安装方式是 `link:C:/Code/super_agent`（见 `~/.dsh/profiles/desktop/package.json`）：`link:` 只省掉重新安装这一步；重载 DSH 不能省，否则手册不会重读。若某处是复制安装，改完要先更新插件，再重载 DSH。
- 文档与代码同一次提交更新：过期的手册会被 Agent 当真，比没有更糟。
