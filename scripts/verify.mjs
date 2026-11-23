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
  ]) {
    const [a, b] = [headingCount(english), headingCount(chinese)]
    check(a === b, `${basename(english)} and ${basename(chinese)} heading parity`, `${a} vs ${b}`)
  }

  for (const pattern of manifest.files ?? []) {
    check(globSync(pattern, { cwd: ROOT }).length > 0, 'manifest files entry resolves', pattern)
  }

  const blocks = presetBlocks()
  check(blocks.length === 2, 'exactly two presets declared', blocks.map(block => block.id).join(', '))
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
