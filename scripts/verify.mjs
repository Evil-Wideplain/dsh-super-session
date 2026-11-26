#!/usr/bin/env node
/**
 * Self-check for the preset bundle: one command that answers "is this repo
 * still shippable?" the way `AGENTS.md` means it.
 *
 * It replaces the four one-liners the guide used to list, and adds the two
 * checks that catch a real breakage instead of a typo: every `handbookPath` a
 * preset row names must resolve to a file on disk, and `--handbook` prints the
 * exact text the plugin would inject, with its fingerprint, so the running
 * session's system prompt can be diffed against the repo after a reload
 * instead of guessed at.
 *
 * Only `node:` built-ins: the bundle has no dependencies and this script must
 * not add any.
 *
 * Usage:
 *   node scripts/verify.mjs              # all checks, exit 1 on failure
 *   node scripts/verify.mjs --handbook   # fingerprints of every mounted handbook
 *
 * @module scripts/verify
 */

import { createHash } from 'node:crypto'
import { existsSync, globSync, readFileSync } from 'node:fs'
import { basename, dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

/** Repository root: the directory holding this script. */
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** Every failure found so far; printed at the end and decides the exit code. */
const failures = []

/**
 * Record a check result.
 *
 * @param {boolean} ok Whether the check passed.
 * @param {string} label What was checked, in the fewest words that identify it.
 * @param {string} [detail] What was found, when the label alone is not enough.
 */
function check(ok, label, detail = '') {
  if (!ok) failures.push(detail ? `${label}: ${detail}` : label)
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${detail ? ` — ${detail}` : ''}`)
}

/** Read and parse a JSON file from the repo. */
function readJson(relative) {
  return JSON.parse(readFileSync(resolve(ROOT, relative), 'utf8'))
}

/** Count the markdown headings of every level in a file. */
function headingCount(relative) {
  return readFileSync(resolve(ROOT, relative), 'utf8').split('\n').filter(line => line.startsWith('#')).length
}

/** Strip a matching pair of YAML quotes from a scalar. */
function unquote(value) {
  const trimmed = value.trim()
  const first = trimmed[0]
  if ((first === "'" || first === '"') && trimmed.endsWith(first)) return trimmed.slice(1, -1)
  return trimmed
}

/**
 * Split `cordis.patch.yml` into its preset blocks by their insert rows.
 *
 * This is a scan, not a YAML parse: the file is ours, the shape is fixed, and
 * a real parser would need a dependency. A row is recognised by its four-space
 * `- id: preset-…` key, which no nested plugin row uses.
 *
 * @returns {Array<{ id: string, body: string }>}
 */
function presetBlocks() {
  const text = readFileSync(resolve(ROOT, 'cordis.patch.yml'), 'utf8')
  const lines = text.split('\n')
  const blocks = []
  let current = null
  for (const line of lines) {
    const start = line.match(/^ {4}- id: (preset-[a-z-]+)$/)
    if (start) {
      current = { id: start[1], body: '' }
      blocks.push(current)
      continue
    }
    if (current) current.body += line + '\n'
  }
  return blocks
}

/**
 * Value of the first `key: value` line in a block, comments and quotes
 * stripped. A four-space `- id:` list key never matches, because the scan
 * works on the trimmed line and requires the key to open it.
 */
function field(body, key) {
  for (const raw of body.split('\n')) {
    const line = raw.split('#')[0].trim()
    if (!line.startsWith(key + ':')) continue
    const value = line.slice(key.length + 1)
    if (value.trim()) return unquote(value)
  }
  return ''
}

/**
 * The package name the client scanner accepts, mirroring
 * `exactPackageSpecifier` in `dsh-client-modules`: a bare name, or a scope
 * plus one segment. It rejects subpaths, relative paths, and `file:` URLs, and
 * a row whose name fails this test is never treated as a client row.
 */
function exactPackageName(specifier) {
  if (!specifier) return ''
  if (specifier.startsWith('@')) {
    const parts = specifier.split('/')
    return parts.length === 2 && parts.every(Boolean) ? specifier : ''
  }
  return specifier.includes('/') || specifier.includes(':') ? '' : specifier
}

/**
 * Name of the Loader row that mounts the package for the client scanner.
 *
 * Recognised by its id, so the row can move within the file without the check
 * drifting.
 */
function clientRowName() {
  const lines = readFileSync(resolve(ROOT, 'cordis.patch.yml'), 'utf8').split('\n')
  const start = lines.findIndex(line => line.trim() === '- id: super-session-entry')
  if (start < 0) return ''
  for (const line of lines.slice(start + 1)) {
    const named = line.match(/^\s*name: (.+)$/)
    if (named) return unquote(named[1])
  }
  return ''
}

async function main() {
  const manifest = readJson('package.json')
  const plugin = await import(pathToFileURL(resolve(ROOT, 'context.js')).href)
  const guard = await import(pathToFileURL(resolve(ROOT, 'guard.js')).href)
  const team = await import(pathToFileURL(resolve(ROOT, 'team.js')).href)

  check(plugin.name === 'personal-handbook', 'plugin exports a name', String(plugin.name))
  check(
    Array.isArray(plugin.inject) && plugin.inject.includes('systemPrompt'),
    'plugin injects systemPrompt',
    String(plugin.inject),
  )
  check(typeof plugin.loadHandbook === 'function', 'plugin exports loadHandbook')

  for (const locale of ['locale/en.json', 'locale/zh.json']) {
    let parsed
    try {
      parsed = readJson(locale)
    } catch (error) {
      check(false, `${locale} parses`, error.message)
      continue
    }
    const meta = parsed.meta ?? {}
    check(Boolean(meta.title && meta.description && meta.detail), `${locale} has title/description/detail`)
    check(existsSync(resolve(ROOT, meta.detail ?? '')), `${locale} detail page exists`, meta.detail ?? '(unset)')
  }

  for (const [english, chinese] of [
    ['prompt/handbook.md', 'prompt/handbook.zh.md'],
    ['prompt/worker.md', 'prompt/worker.zh.md'],
    ['prompt/coordinator.md', 'prompt/coordinator.zh.md'],
  ]) {
    const [a, b] = [headingCount(english), headingCount(chinese)]
    check(a === b, `${basename(english)} and ${basename(chinese)} heading parity`, `${a} vs ${b}`)
  }

  for (const pattern of manifest.files ?? []) {
    check(globSync(pattern, { cwd: ROOT }).length > 0, 'manifest files entry resolves', pattern)
  }

  const blocks = presetBlocks()
  check(blocks.length === 3, 'exactly three presets declared', blocks.map(block => block.id).join(', '))
  for (const block of blocks) {
    const pluginName = field(block.body, 'name')
    check(pluginName === '@deepseek-ai/dsh-agent-preset', `${block.id} uses the preset plugin`, pluginName)
    const presetId = field(block.body, 'id')
    check(Boolean(presetId), `${block.id} declares a preset id`, presetId)
    check(
      block.body.includes("name: '@local/dsh-personal-agent/context.js'"),
      `${block.id} mounts the handbook plugin`,
    )
    const configured = field(block.body, 'handbookPath')
    if (configured) {
      check(existsSync(plugin.handbookFile({ handbookPath: configured })), `${block.id} handbookPath resolves`, configured)
    }
    // The preset must not carry a handbook of its own: one path per preset.
    const paths = [field(block.body, 'handbookPath')]
    check(paths.length > 0, `${block.id} names one handbook`)
  }

  // The coordinator is the one preset that only dispatches: it must name its
  // own handbook, keep the coordination surface, and carry none of the work or
  // interaction tools, which belong to the worker and personal presets.
  const coordinator = blocks.find(block => block.id === 'preset-coordinator')
  check(Boolean(coordinator), 'preset-coordinator is declared')
  if (coordinator) {
    check(field(coordinator.body, 'id') === 'coordinator', 'preset-coordinator declares the coordinator id', field(coordinator.body, 'id'))
    check(
      field(coordinator.body, 'handbookPath') === './prompt/coordinator.md',
      'preset-coordinator names the coordinator handbook',
      field(coordinator.body, 'handbookPath'),
    )
    const required = [
      'dsh-tool-goal',
      'dsh-tool-todo',
      'dsh-skill-filesystem',
      'dsh-tool-skill',
      'dsh-tool-bash-persistent',
      'dsh-tool-pwsh-persistent',
    ]
    const missing = required.filter(name => !coordinator.body.includes(name))
    check(missing.length === 0, 'preset-coordinator mounts the coordination surface', missing.join(', '))
    const forbidden = [
      'dsh-tool-web',
      'dsh-tool-office',
      'dsh-tool-jobs',
      'dsh-tool-fs',
      'dsh-tool-present',
      'dsh-tool-ask-user',
      'dsh-plan-mode',
      'dsh-tool-schedule',
    ]
    const mounted = forbidden.filter(name => coordinator.body.includes(name))
    check(mounted.length === 0, 'preset-coordinator mounts no work or interaction tools', mounted.join(', '))
    check(
      coordinator.body.includes("name: '@local/dsh-personal-agent/guard.js'"),
      'preset-coordinator mounts the dispatch guard',
    )
  }

  // The guard row must be scoped to the coordinator alone: the personal preset
  // keeps the ordinary creation tool and the worker preset stays untouched.
  const guardBlocks = blocks.filter(block => block.body.includes("'@local/dsh-personal-agent/guard.js'"))
  check(
    guardBlocks.length === 1 && guardBlocks[0].id === 'preset-coordinator',
    'dispatch guard is mounted only by preset-coordinator',
    guardBlocks.map(block => block.id).join(', '),
  )

  // The guard hides the global creation tool with a scoped, never-admitted
  // shadow and replaces it with a dispatch tool whose Agent preset is fixed.
  // Exercised against a fake tool registry so a missing registration or a
  // passthrough `agent_preset` fails the bundle check instead of the coordinator at
  // runtime.
  check(guard.name === 'dispatch-guard', 'guard exports a plugin name', String(guard.name))
  check(
    Array.isArray(guard.inject) && guard.inject.includes('tools') && guard.inject.includes('sessionMessaging'),
    'guard injects tools and sessionMessaging',
    String(guard.inject),
  )
  check(guard.DENIED_TOOL === 'create_session_agent', 'guard hides create_session_agent', String(guard.DENIED_TOOL))
  check(guard.DISPATCH_TOOL === 'dispatch_worker', 'guard exposes dispatch_worker', String(guard.DISPATCH_TOOL))
  check(guard.WORKER_PRESET === 'worker', 'guard fixes the worker preset', String(guard.WORKER_PRESET))
  const guardCalls = []
  const guardRegistrations = []
  const fakeCreation = {
    async create(caller, input) {
      guardCalls.push({ caller, input })
      return {
        status: 'accepted', sessionId: 'session-w1', shortId: 'w1', cwd: input.cwd ?? '/work',
        workspaceId: 'ws-1', messageId: 'm1', detail: 'ok', title: input.title,
      }
    },
  }
  let guardError
  try {
    guard.apply({
      get: name => name === 'sessionMessaging' ? { creation: fakeCreation } : undefined,
      tools: { register(definition, options) { guardRegistrations.push({ definition, options }); return () => {} } },
    })
  } catch (error) {
    guardError = error
  }
  check(guardError === undefined, 'guard applies to a tools/sessionMessaging context', String(guardError))
  const hidden = guardRegistrations.find(entry => entry.definition.name === 'create_session_agent')
  check(Boolean(hidden), 'guard registers a create_session_agent shadow')
  check(hidden?.options?.when?.() === false, 'guard shadow is never admitted')
  const dispatch = guardRegistrations.find(entry => entry.definition.name === 'dispatch_worker')?.definition
  check(Boolean(dispatch), 'guard registers dispatch_worker')
  if (dispatch !== undefined) {
    const agent = { id: 'session-m', session: { header: { cwd: '/work' } } }
    const signal = new AbortController().signal
    const output = await dispatch.execute({ prompt: 'brief', cwd: '/repo', title: 'piece' }, { agent, signal })
    check(output.status === 'accepted' && output.session_id === 'session-w1', 'dispatch passes the creation result through', String(output.status))
    check(
      guardCalls.length === 1
        && guardCalls[0].input.agentPreset === 'worker'
        && guardCalls[0].input.agent_preset === undefined,
      'dispatch forces agentPreset worker and exposes no preset argument',
      JSON.stringify(guardCalls[0]?.input),
    )
    check(
      guardCalls[0]?.caller?.identity?.id === 'session-m' && guardCalls[0]?.caller?.identity?.cwd === '/work',
      'dispatch forwards the caller identity',
    )
    let rejectedPreset = false
    try {
      await dispatch.execute({ prompt: 'brief', cwd: '/repo', agent_preset: 'coordinator' }, { agent, signal })
    } catch (_error) {
      rejectedPreset = true
    }
    check(rejectedPreset, 'dispatch rejects a caller-supplied agent_preset')
    const rejection = async args => {
      try {
        await dispatch.execute(args, { agent, signal })
        return ''
      } catch (error) {
        return error instanceof Error ? error.message : String(error)
      }
    }
    check(
      (await rejection({ prompt: 'brief', title: 'piece' })).includes('must be a string'),
      'dispatch requires an explicit cwd',
    )
    check(
      (await rejection({ prompt: 'brief', cwd: 'repo' })).includes('absolute path'),
      'dispatch rejects a relative cwd',
    )
    check(
      (await rejection({ prompt: 'brief', cwd: '/work/deepseek-harness/super-workspace' })).includes('Super Workspace'),
      'dispatch refuses the Super Workspace shell as cwd',
    )
  }
  for (const file of ['prompt/coordinator.md', 'prompt/coordinator.zh.md']) {
    check(readFileSync(resolve(ROOT, file), 'utf8').includes('dispatch_worker'), `${file} names dispatch_worker`)
  }

  // Worker preset: the delegation rows are what let a worker fan a long brief
  // out to subagents; personal and coordinator must stay without them.
  const worker = blocks.find(block => block.id === 'preset-worker')
  check(Boolean(worker), 'preset-worker is declared')
  if (worker) {
    const needed = ['tool-subagent-control', 'tool-subagent', 'tool-subagent-fork']
    const missing = needed.filter(id => !worker.body.includes(`- id: ${id}`))
    check(
      missing.length === 0 && worker.body.includes('toolName: subagent_fork'),
      'preset-worker mounts the delegation group',
      missing.join(', '),
    )
  }
  for (const id of ['preset-personal', 'preset-coordinator']) {
    const block = blocks.find(candidate => candidate.id === id)
    check(block !== undefined && !block.body.includes('dsh-tool-subagent'), `${id} mounts no subagent tools`)
  }

  // Team mode is a per-Session selection, so the bundle flips it from a host
  // row, once, for worker Sessions only. Exercised against a stub context: a
  // missing flip leaves every worker task board closed, and a flip for the
  // wrong preset would turn Team tools on in the user-facing Session.
  check(team.name === 'worker-team-mode', 'team plugin exports a name', String(team.name))
  check(
    Array.isArray(team.inject) && ['agentPresets', 'agentTeams', 'subagents'].every(name => team.inject.includes(name)),
    'team injects agentPresets, agentTeams and subagents',
    String(team.inject),
  )
  check(team.WORKER_PRESET === 'worker', 'team targets the worker preset', String(team.WORKER_PRESET))
  const teamCalls = []
  let teamListener
  const teamCtx = {
    on(event, listener) {
      if (event === 'agent/created') teamListener = listener
    },
    subagents: { rootOf: agent => agent.root ?? agent },
    agentPresets: { presetForSession: session => session.preset },
    agentTeams: {
      isEnabled: () => false,
      async setEnabled(_agent, value) {
        teamCalls.push(value)
      },
    },
  }
  team.apply(teamCtx)
  check(typeof teamListener === 'function', 'team subscribes to agent/created')
  if (typeof teamListener === 'function') {
    const workerAgent = { id: 'session-w', session: { preset: 'worker' } }
    workerAgent.root = workerAgent
    await teamListener({ agent: workerAgent })
    check(
      teamCalls.length === 1 && teamCalls[0] === true,
      'team enables Team mode for a worker root Session',
      JSON.stringify(teamCalls),
    )
    const personalAgent = { id: 'session-p', session: { preset: 'personal' } }
    personalAgent.root = personalAgent
    await teamListener({ agent: personalAgent })
    const childAgent = { id: 'session-c', root: workerAgent, session: { preset: 'worker' } }
    await teamListener({ agent: childAgent })
    check(teamCalls.length === 1, 'team skips personal and child Sessions', JSON.stringify(teamCalls))
    let failedListener
    let rejected = false
    team.apply({
      on(event, listener) {
        if (event === 'agent/created') failedListener = listener
      },
      subagents: teamCtx.subagents,
      agentPresets: teamCtx.agentPresets,
      agentTeams: {
        isEnabled: () => false,
        async setEnabled() {
          throw new Error('denied')
        },
      },
    })
    const warn = console.warn
    console.warn = () => {}
    try {
      await failedListener({ agent: workerAgent })
    } catch (_error) {
      rejected = true
    } finally {
      console.warn = warn
    }
    check(!rejected, 'team warns instead of failing Session creation')
  }
  const yamlText = readFileSync(resolve(ROOT, 'cordis.patch.yml'), 'utf8')
  const teamRowCount = (yamlText.match(/name: '@local\/dsh-personal-agent\/team\.js'/gu) ?? []).length
  check(teamRowCount === 1, 'worker Team mode is mounted once at bundle level', String(teamRowCount))
  const nestedTeamRow = /^ {10}- id: worker-team-mode$/mu.test(yamlText)
  check(!nestedTeamRow, 'no preset mounts the worker Team mode row itself')

  for (const file of ['prompt/handbook.md', 'prompt/handbook.zh.md', 'prompt/coordinator.md', 'prompt/coordinator.zh.md']) {
    const text = readFileSync(resolve(ROOT, file), 'utf8')
    check(text.includes('super-workspace') && text.includes('cwd'), `${file} carries the dispatch cwd rule`)
  }
  for (const file of ['prompt/worker.md', 'prompt/worker.zh.md']) {
    const text = readFileSync(resolve(ROOT, file), 'utf8')
    check(text.includes('super-workspace') && text.includes('subagent'), `${file} carries its working-directory and subagent rules`)
  }

  // The sidebar panel only reaches the browser when the Loader row is named by
  // the bare package specifier: the client scanner resolves that name to the
  // package root and reads the `./client` export beside it. A subpath or a
  // `file:` URL is skipped as a non-client row, which is silent from here and
  // expensive to rediscover from the UI.
  const rowName = clientRowName()
  check(exactPackageName(rowName) === manifest.name, 'client row is named by the bare package', rowName || '(missing)')
  check(manifest.dsh?.client?.platform === 'web', 'manifest declares a web client half', String(manifest.dsh?.client?.platform))
  const clientExport = manifest.exports?.['./client']
  check(typeof clientExport === 'string' && existsSync(resolve(ROOT, clientExport)), 'manifest ./client export exists', clientExport ?? '(missing)')
  const guardExport = manifest.exports?.['./guard.js']
  check(typeof guardExport === 'string' && existsSync(resolve(ROOT, guardExport)), 'manifest ./guard.js export exists', guardExport ?? '(missing)')
  check((manifest.files ?? []).includes('guard.js'), 'manifest ships guard.js')
  const teamExport = manifest.exports?.['./team.js']
  check(typeof teamExport === 'string' && existsSync(resolve(ROOT, teamExport)), 'manifest ./team.js export exists', teamExport ?? '(missing)')
  check((manifest.files ?? []).includes('team.js'), 'manifest ships team.js')

  if (process.argv.includes('--handbook')) {
    for (const block of blocks) {
      const configured = field(block.body, 'handbookPath')
      const config = configured ? { handbookPath: configured } : {}
      const text = plugin.loadHandbook(config)
      const sha = createHash('sha256').update(text).digest('hex').slice(0, 16)
      console.log(
        `\n${block.id}\n  file  ${plugin.handbookFile(config)}\n  bytes ${Buffer.byteLength(text)}  sha256 ${sha}\n`
        + `  head  ${text.split('\n').slice(0, 2).join(' / ')}`,
      )
    }
  }

  if (failures.length > 0) {
    console.error(`\n${failures.length} check(s) failed:\n- ${failures.join('\n- ')}`)
    process.exitCode = 1
    return
  }
  console.log('\nall checks passed')
}

await main()
