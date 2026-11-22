# Personal Agent

A shell-first DSH personal-agent preset with a deliberately small tool surface.

## What it adds

- A personal-agent persona and an operating handbook (~25 KB English, ~23 KB Chinese) covering identity, values, one-user loyalty, discretion, outside content, memory and relationships, context awareness, confirmation, proactivity, communication, tools, worker sessions, memory tools, security, safety, and failure.
- Six editable runtime files injected into every prompt assembly:
  `SOUL.md`, `IDENTITY.md`, `USER.md`, `PEOPLE.md`, `MEMORY.md`, `PROACTIVE_PREFERENCES.md`.
- Mounted tools: a persistent shell (`bash` on non-Windows, `pwsh` on Windows), `read_image`, `job_output` / `job_list` / `job_kill`, `schedule_*`, `create_goal` / `get_goal` / `update_goal`, `todo_write`, plan mode + `exit_plan_mode`, `ask_user_question`, `web_search` / `web_fetch`, `present`, the three Office tools, and `skill`.
- No local `read` / `write` / `edit` / `glob` / `grep` (the shell is the file interface), and no `subagent` / `workflow` (delegation goes through the profile's worker sessions). `working_directory` is supplied by the host for every preset and is not mounted here.

## First run

Start a new session with the **Personal Agent** preset and say hello. The injected context notices that the personal files are missing, offers setup, and asks one question at a time. The agent writes the files under `$DSH_HOME/personal` (default `~/.dsh/personal`) with the shell. The files are plain Markdown; you can edit them yourself at any time.

## Data and privacy

The runtime files are injected with interpolation disabled and framed as user context, not as a second system prompt. They never override permissions or safety rules. Do not put passwords, tokens, or API keys in them.

## Limitations

- It is a single agent, not the multi-agent Router/Worker Super-agent design. Long work goes to a worker session created through the profile's session-messaging tools.
- File edits go through the shell; the web uses `web_search` / `web_fetch`; long shell commands run with `&` and a log file. The persistent shell does not register jobs, so the `job_*` tools currently have no producer.
- The three Office tools appear only after an Office skill loads; `office_render` also needs an image-capable model route and an attachments service.
- Worker sessions, long-session watching and search, and memory depend on the profile's `session-messaging`, `session-guardian`, and `dsh-auto-memory` plugins. Without them, those tool names are unavailable.
- `read_image` needs an image-capable model route and an attachments service.
- The permission mode and sandbox are host/profile settings. This preset does not weaken them.
- The runtime files are not encrypted. Use the operating system's disk encryption and the profile's credential store for secrets.
