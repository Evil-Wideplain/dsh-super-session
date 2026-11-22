/**
 * Handbook prompt section for the `personal` agent preset.
 *
 * The preset's persona row supplies identity and voice. This plugin adds the
 * operating handbook shipped with the bundle, read once when the preset
 * activates. Durable user memory is owned by the profile's memory plugin; this
 * preset injects no personal files and keeps no second memory store.
 *
 * @module @local/dsh-personal-agent
 */

import { readFileSync } from 'node:fs'
import { dirname, isAbsolute, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Directory of this plugin package, used to resolve a configured handbook file. */
const PACKAGE_DIR = dirname(fileURLToPath(import.meta.url))

/** Handbook used when the preset row does not set `handbookPath`. */
const DEFAULT_HANDBOOK = 'prompt/handbook.md'

/** Cordis plugin name used by Loader diagnostics. */
export const name = 'personal-handbook'

/** The prompt registry this preset plugin contributes to. */
export const inject = ['systemPrompt']

/**
 * Read the handbook once at activation. `handbookPath` may point at another
 * file relative to this package (for example `prompt/handbook.zh.md`) or at an
 * absolute path. A missing file degrades to the identity line.
 */
function loadHandbook(config) {
  const requested = typeof config?.handbookPath === 'string' && config.handbookPath.trim()
    ? config.handbookPath.trim()
    : DEFAULT_HANDBOOK
  const file = isAbsolute(requested) ? requested : resolve(PACKAGE_DIR, requested)
  try {
    return readFileSync(file, 'utf8').trim()
  } catch {
    return 'You are the user\'s personal agent. Work on their behalf, verify before claiming success, and confirm before acting outside this conversation.'
  }
}

/**
 * Register the handbook section for the preset's agent scope.
 *
 * @param {import('@deepseek-ai/cordis').Context} ctx
 * @param {{ handbookPath?: string }} [config]
 */
export function apply(ctx, config) {
  const handbook = loadHandbook(config)

  ctx.effect(() => ctx.systemPrompt.section({
    name: 'personal:handbook',
    order: 1,
    text: handbook,
    interpolate: false,
  }), 'personal-handbook')
}
