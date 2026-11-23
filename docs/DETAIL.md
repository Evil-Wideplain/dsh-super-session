# Personal Agent and Worker

Two DSH agent presets shipped by one bundle: a shell-first personal assistant, and a worker session for briefed delegation. Both keep a deliberately small tool surface.

## What it adds

- A **personal** preset (`personal`, "Personal Agent"): a personal-agent persona and an operating handbook, in English and Chinese. The handbook is a near-verbatim port of Meta Muse's system prompt (values, one-user loyalty, discretion, external parties, design of work, personalization and memory, context awareness, active work, writing style, tools, delegation, scheduled work, runtime files, security, safety), with facts swapped for DSH's tool surface, plus DSH-specific sections on skills, worker-session delivery, scheduled-task verification, file delivery, first run and continuity.
- A **worker** preset (`worker`, "Worker"): the standard preset's coding-agent persona line plus a worker handbook, in English and Chinese. The handbook is a DSH-style operating prompt adapted to a persistent single-task worker: the brief is the objective, the session keeps going across rounds instead of asking permission between steps, work is explored before it is changed and verified before it is reported, and the result goes back to the lead with `send_session_message`. It deliberately does not repeat the personal handbook.
- A sidebar panel row **Super Session** (above the workspace list): it is your one standing session, and selecting it opens that conversation directly with no intermediate page. It has its own fixed workspace, `<Host home>/super-agent`: the first visit registers that directory as a workspace and creates a session on the `personal` preset titled `Super Session`; later visits open the newest unarchived session of the same workspace. It adds no tools; it calls the existing session and workspace services.
- Mounted tools for the personal preset: a persistent shell (`bash` on non-Windows, `pwsh` on Windows), `schedule_*`, `create_goal` / `get_goal` / `update_goal`, `todo_write`, plan mode + `exit_plan_mode`, `ask_user_question`, `present`, and `skill`. It mounts none of the tools that execute: no `read_image`, no `job_*`, no `web_search` / `web_fetch`, no Office tools. The personal preset dispatches that work to a worker session instead of doing it. Its skill discovery runs with `includeDefaultRoots: false`, so the catalog holds only `dsh-doc` from the agent-preset package; the four Office skills still appear because their provider is mounted on the profile plane and cannot be dropped per preset.
- Mounted tools for the worker preset: the same persistent shell and `read_image`, `job_output` / `job_list` / `job_kill`, `todo_write`, `create_goal` / `get_goal` / `update_goal` (a long brief stays one objective across rounds), `web_search` / `web_fetch`, the three Office tools, and `skill`. It omits schedules, plan mode, `ask_user_question` and `present`: the lead session owns those.
- One memory system: the Agent profile's fixed `dsh-auto-memory` component (`memory_*`). Neither preset injects `SOUL.md` / `USER.md` / `MEMORY.md` runtime files; persona comes from `persona.prefix` and the handbook.
- No local `read` / `write` / `edit` / `glob` / `grep` (the shell is the file interface), and no `subagent` / `workflow` (delegation goes through the Agent profile's `session-messaging` component). `working_directory` is supplied by the host for every preset and is not mounted here.

## Choosing a preset

- **Personal Agent**: the session the user talks to. It holds the conversation, the user's preferences, and every outward-facing action.
- **Worker**: a session a lead creates with `create_session_agent` and `agent_preset: worker`, passing a self-contained brief. It does the bounded work, verifies the result, and messages the result back; it does not address the user and does not ask for confirmation.

## First run

Start a new session with the **Personal Agent** preset and say hello. If there is no memory of the user yet, the agent offers setup, asks one question at a time, and saves durable answers with `memory_write` into the Agent profile's memory component; it creates no personal files.

## Data and privacy

Memory is managed by the Agent profile's fixed `dsh-auto-memory` component and is not injected into the prompt. Do not put passwords, tokens, API keys, or raw credentials in memory. The persona and handbooks ship with the bundle; they are not user data files.

## Limitations

- Each preset is a single agent, not the multi-agent Router/Worker Super-agent design. Long work goes to a worker session started from the worker preset through the Agent profile's `session-messaging` component.
- In the worker preset, file edits go through the shell, the web uses `web_search` / `web_fetch`, and long shell commands run with `&` and a log file. The persistent shell does not register jobs, so the `job_*` tools currently have no producer. The personal preset mounts none of these; it hands the work to a worker.
- The three Office tools (worker preset) appear only after an Office skill loads; `office_render` also needs an image-capable model route and an attachments service.
- Memory, worker sessions, long-session watching and search come from fixed Agent-profile components: `dsh-auto-memory`, `session-messaging`, and `session-guardian` (including its session-query group). A profile without them exposes no such tools.
- `read_image` (worker preset) needs an image-capable model route and an attachments service.
- The permission mode and sandbox are host/profile settings. Neither preset weakens them.
