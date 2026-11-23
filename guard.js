/**
 * Host-side guard for the coordinator preset: a manager may dispatch workers
 * and nothing else.
 *
 * The preset-scoped tool layer shadows global registrations, so registering a
 * same-named definition from this row hides `session-messaging`'s
 * `create_session_agent` from every agent bound to the `manager` preset. The
 * shadow carries `when: () => false`, so it is never admitted to a model step
 * and a direct call resolves as an unknown tool; its `execute` exists only to
 * give a deliberate error if some future caller resolves the definition
 * outside a model step.
 *
 * `dispatch_worker` replaces it with the same creation semantics minus the
 * preset choice: the Agent preset is always `worker`. The call goes through
 * `session-messaging`'s public cross-row service (`ctx.sessionMessaging.creation`),
 * so the first message frame, sender identity, workspace authorization, rate
 * limit, and error mapping stay exactly those of `create_session_agent`.
 *
 * This file is mounted only by the `preset-manager` plugin list; it has no
 * effect on the personal or worker presets. Plain JavaScript, no imports.
 *
 * @module @local/dsh-personal-agent/guard
 */

/** Plugin name shown by the Loader. */
export const name = 'dispatch-guard'

/** Host services this row needs before it can register the replacement tool. */
export const inject = ['tools', 'sessionMessaging']

/** The global tool hidden inside the manager scope. */
export const DENIED_TOOL = 'create_session_agent'

/** The manager-facing replacement tool. */
export const DISPATCH_TOOL = 'dispatch_worker'

/** The only Agent preset a manager may dispatch. */
export const WORKER_PRESET = 'worker'

/** Largest tool-render text for dynamic values, in code points. */
const RENDER_LIMIT = 120

/**
 * Reject a non-plain argument object.
 * @param args - raw tool arguments.
 * @returns the argument record.
 */
function asObject(args) {
  if (typeof args !== 'object' || args === null || Array.isArray(args)) {
    throw new Error('dispatch_worker: arguments must be an object')
  }
  return args
}

/**
 * Reject top-level names the schema does not declare.
 * @param args - argument record.
 * @param allowed - declared names.
 */
function rejectUnknown(args, allowed) {
  const unknown = Object.keys(args).filter((key) => !allowed.includes(key)).sort()
  if (unknown.length > 0) throw new Error(`dispatch_worker: unknown argument "${unknown[0]}"`)
}

/**
 * Read a required string, leaving blankness to the application service.
 * @param args - argument record.
 * @param key - field name.
 * @returns the value.
 */
function requiredText(args, key) {
  const value = args[key]
  if (typeof value !== 'string') throw new Error(`dispatch_worker: "${key}" must be a string`)
  return value
}

/**
 * Read an optional string.
 * @param args - argument record.
 * @param key - field name.
 * @returns the value, or undefined.
 */
function optionalString(args, key) {
  const value = args[key]
  if (value === undefined) return undefined
  if (typeof value !== 'string') throw new Error(`dispatch_worker: "${key}" must be a string`)
  return value
}

/**
 * Read an optional boolean.
 * @param args - argument record.
 * @param key - field name.
 * @returns the value, or undefined.
 */
function optionalBoolean(args, key) {
  const value = args[key]
  if (value === undefined) return undefined
  if (typeof value !== 'boolean') throw new Error(`dispatch_worker: "${key}" must be a boolean`)
  return value
}

/**
 * Flatten dynamic text into one render line.
 * @param value - source text.
 * @returns a single trimmed line, clipped to {@link RENDER_LIMIT}.
 */
function line(value) {
  const text = String(value ?? '').replace(/\s+/gu, ' ').trim()
  const points = [...text]
  return points.length <= RENDER_LIMIT ? text : `${points.slice(0, RENDER_LIMIT - 1).join('')}…`
}

/**
 * The hidden shadow that replaces `create_session_agent` in the manager scope.
 * @returns a tool definition registered with `when: () => false`.
 */
function deniedTool() {
  return {
    name: DENIED_TOOL,
    description: 'Disabled for coordinator sessions. Use dispatch_worker to start a worker session.',
    parameters: { type: 'object', additionalProperties: false, properties: {} },
    output: {
      schema: { type: 'object', additionalProperties: false, properties: {} },
      render: () => [{ type: 'text', text: `${DENIED_TOOL} is disabled in coordinator sessions; use ${DISPATCH_TOOL}.` }],
    },
    async execute() {
      throw new Error(`${DENIED_TOOL} is disabled in coordinator sessions; use ${DISPATCH_TOOL}`)
    },
  }
}

/**
 * Build the manager-facing dispatch tool over session-messaging's creation
 * service.
 * @param creation - `ctx.sessionMessaging.creation`.
 * @returns the tool definition.
 */
export function createDispatchTool(creation) {
  return {
    name: DISPATCH_TOOL,
    description:
      'Create a worker session for one piece of the goal and deliver the first message into it. '
      + 'The new session always runs the `worker` Agent preset; a coordinator cannot create a personal '
      + 'or another coordinator session. The first message is framed as a session message from you and '
      + 'starts the worker asynchronously; the call returns once the message is admitted. '
      + 'Statuses: accepted (created and admitted), refused (creation disabled, caller ineligible, '
      + 'location not allowed, rate limit, empty or oversized prompt), failed (the Host rejected the '
      + 'creation or the first message could not be admitted; session_id may still be returned so you '
      + 'can retry with send_session_message).',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        prompt: {
          type: 'string',
          description: 'First message the worker receives, framed as a session message from you. '
            + 'An empty or whitespace-only prompt is refused; prompts over the profile limit are refused too.',
        },
        cwd: {
          type: 'string',
          description: 'Absolute working directory for the worker. Defaults to your own working directory; '
            + 'another directory requires the profile to allow cross-workspace creation.',
        },
        workspace: {
          type: 'string',
          description: 'Target workspace id or registered workspace path. Cannot be combined with a '
            + 'different cwd; cross-workspace creation follows the profile policy.',
        },
        ensure_workspace: {
          type: 'boolean',
          description: 'Only with cwd or a workspace path: create and register the directory first. '
            + 'Requires the profile to allow workspace creation.',
        },
        title: {
          type: 'string',
          description: 'Optional worker session title, written before the first turn starts.',
        },
      },
      required: ['prompt'],
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          status: { type: 'string', enum: ['accepted', 'refused', 'failed'] },
          session_id: { type: 'string' },
          short_id: { type: 'string' },
          cwd: { type: 'string' },
          workspace_id: { type: 'string' },
          title: { type: 'string' },
          message_id: { type: 'string' },
          detail: { type: 'string' },
        },
        required: ['status', 'session_id', 'short_id', 'cwd', 'message_id', 'detail'],
      },
      render: (_args, value) => {
        if (value.status === 'refused') {
          return [{ type: 'text', text: `Refused to dispatch a worker: ${line(value.detail)}` }]
        }
        if (value.session_id === '') {
          return [{ type: 'text', text: line(value.detail) }]
        }
        const label = line(value.title ?? value.short_id)
        const head = value.status === 'accepted'
        const lines = [`${head} (session_id: ${line(value.session_id)}, cwd: ${line(value.cwd)})`]
        if (value.workspace_id !== undefined) lines.push(`workspace_id: ${line(value.workspace_id)}`)
        if (value.detail !== '') lines.push(line(value.detail))
        return [{ type: 'text', text: lines.join('\n') }]
      },
    },
    async execute(args, exec) {
      const parsed = asObject(args)
      rejectUnknown(parsed, ['prompt', 'cwd', 'workspace', 'ensure_workspace', 'title'])
      const prompt = requiredText(parsed, 'prompt')
      const cwd = optionalString(parsed, 'cwd')
      const workspace = optionalString(parsed, 'workspace')
      const ensureWorkspace = optionalBoolean(parsed, 'ensure_workspace')
      const title = optionalString(parsed, 'title')
      const agent = exec.agent
      if (agent === undefined) throw new Error('dispatch_worker requires an agent caller')
      const callerCwd = agent.session.header.cwd
      const caller = {
        agent,
        identity: { id: agent.id, ...(callerCwd === undefined ? {} : { cwd: callerCwd }) },
      }
      let result
      try {
        result = await creation.create(caller, {
          prompt,
          ...(cwd === undefined ? {} : { cwd }),
          ...(workspace === undefined ? {} : { workspace }),
          ...(ensureWorkspace === undefined ? {} : { ensureWorkspace }),
          ...(title === undefined ? {} : { title }),
          agentPreset: WORKER_PRESET,
        }, exec.signal)
      } catch (reason) {
        const message = reason instanceof Error ? reason.message : String(reason)
        return {
          status: 'failed',
          session_id: '',
          short_id: '',
          cwd: cwd ?? callerCwd ?? '',
          message_id: '',
          detail: `Could not dispatch a worker: ${message}`,
        }
      }
      return {
        status: result.status,
        session_id: result.sessionId,
        short_id: result.shortId,
        cwd: result.cwd,
        ...(result.workspaceId === undefined ? {} : { workspace_id: result.workspaceId }),
        ...(result.title === undefined ? {} : { title: result.title }),
        message_id: result.messageId,
        detail: result.detail,
      }
    },
  }
}

/**
 * Install the manager guard: hide `create_session_agent`, expose
 * `dispatch_worker` with its Agent preset fixed to `worker`.
 * @param {any} ctx - preset-scoped Cordis context with `tools` and `sessionMessaging`.
 */
export function apply(ctx) {
  const runtime = ctx.get('sessionMessaging')
  const creation = runtime && runtime.creation
  if (creation === undefined || typeof creation.create !== 'function') {
    throw new Error('dispatch-guard: ctx.sessionMessaging.creation is unavailable')
  }
  // The scoped shadow wins over the global tool and is never admitted to a step.
  ctx.tools.register(deniedTool(), { when: () => false })
  ctx.tools.register(createDispatchTool(creation))
}
