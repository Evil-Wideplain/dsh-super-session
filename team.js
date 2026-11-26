/**
 * Worker-preset Team mode: a new worker Session starts with Agent Teams on.
 *
 * Agent Teams is a per-root-Session selection (`team/mode`), not a plugin row:
 * the host composition already mounts the Team service and its four task
 * tools, but every new Session defaults to off and the model has no tool that
 * flips it. A worker is dispatched headlessly and cannot open the model menu,
 * so without this row its shared task board stays unreachable even though the
 * tools are declared.
 *
 * The row is mounted once by the bundle (not by a preset). It listens for
 * `agent/created` — the same lifecycle hook `agent-team`'s own
 * `defaultEnabled` uses — and enables Team mode only when the recorded preset
 * for that Session is `worker`. Personal and coordinator Sessions keep the
 * default. The Agent must be its own subagent-tree root; a worker spawned as a
 * child inherits its root's mode and is skipped.
 *
 * Enabling Team mode adds the `team:policy` prompt section and the four
 * `team_task_*` tools to that worker's catalog; the Team task board is capped
 * by `agent-team`'s `maxTasks` (256). Delegation depth and concurrency are the
 * subagent Host settings (`maxDepth` 1, `maxActiveSubagents` 8 by default).
 *
 * Failures only warn: a worker that cannot enable Team mode must still be
 * created and do its brief.
 *
 * @module @evil-wideplain/dsh-super-session/team
 */

/** Plugin name shown by the Loader. */
export const name = 'worker-team-mode'

/** Host services this row needs before it can flip the Session selection. */
export const inject = ['agentPresets', 'agentTeams', 'subagents']

/** The only preset whose Sessions start with Agent Teams enabled. */
export const WORKER_PRESET = 'worker'

/**
 * Enable Team mode on a newly created worker root Session.
 *
 * @param {any} ctx - Host context carrying presets, Team, and subagents.
 */
export function apply(ctx) {
  ctx.on('agent/created', async ({ agent, signal }) => {
    try {
      if (ctx.subagents.rootOf(agent) !== agent) return
      if (ctx.agentPresets.presetForSession(agent.session) !== WORKER_PRESET) return
      if (ctx.agentTeams.isEnabled(agent)) return
      await ctx.agentTeams.setEnabled(agent, true, signal)
    } catch (error) {
      console.warn('[dsh-super-session] could not enable Agent Teams for a worker session:', error)
    }
  })
}
