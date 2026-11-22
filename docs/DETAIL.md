# Personal Agent

A shell-first DSH personal-agent preset with a deliberately small tool surface.

## What it adds

- A personal-agent persona and an operating handbook (~19 KB English, ~17 KB Chinese) covering identity, values, one-user loyalty, discretion, outside content, memory, context awareness, confirmation, proactivity, communication, tools, worker sessions, security, safety, and failure.
- Mounted tools: a persistent shell (`bash` on non-Windows, `pwsh` on Windows), `read_image`, `job_output` / `job_list` / `job_kill`, `schedule_*`, `create_goal` / `get_goal` / `update_goal`, `todo_write`, plan mode + `exit_plan_mode`, `ask_user_question`, `web_search` / `web_fetch`, `present`, the three Office tools, and `skill`.
- One memory system: the Agent profile's fixed `dsh-auto-memory` component (`memory_*`). The preset injects no `SOUL.md` / `USER.md` / `MEMORY.md` runtime files; persona comes from `persona.prefix` and the handbook.
- No local `read` / `write` / `edit` / `glob` / `grep` (the shell is the file interface), and no `subagent` / `workflow` (delegation goes through the Agent profile's `session-messaging` component). `working_directory` is supplied by the host for every preset and is not mounted here.

## First run

Start a new session with the **Personal Agent** preset and say hello. If there is no memory of the user yet, the agent offers setup, asks one question at a time, and saves durable answers with `memory_write` into the Agent profile's memory component; it creates no personal files.

## Data and privacy

Memory is managed by the Agent profile's fixed `dsh-auto-memory` component and is not injected into the prompt. Do not put passwords, tokens, API keys, or raw credentials in memory. The persona and handbook ship with the bundle; they are not user data files.

## Limitations

- It is a single agent, not the multi-agent Router/Worker Super-agent design. Long work goes to a worker session created through the Agent profile's `session-messaging` component.
- File edits go through the shell; the web uses `web_search` / `web_fetch`; long shell commands run with `&` and a log file. The persistent shell does not register jobs, so the `job_*` tools currently have no producer.
- The three Office tools appear only after an Office skill loads; `office_render` also needs an image-capable model route and an attachments service.
- Memory, worker sessions, long-session watching and search come from fixed Agent-profile components: `dsh-auto-memory`, `session-messaging`, and `session-guardian` (including its session-query group). A profile without them exposes no such tools.
- `read_image` needs an image-capable model route and an attachments service.
- The permission mode and sandbox are host/profile settings. This preset does not weaken them.
