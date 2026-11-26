/**
 * Handbook prompt section for the bundle's agent presets (`personal` and
 * `worker`).
 *
 * Each preset's persona row supplies identity and voice. This plugin adds the
 * operating handbook shipped with the bundle, chosen by the row's
 * `handbookPath` and read once when the preset activates. Durable user memory is
 * owned by the profile's memory plugin; no preset injects personal files or
 * keeps a second memory store.
 *
 * @module @evil-wideplain/dsh-super-session
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
 * Resolve the handbook file a preset row would read.
 *
 * `handbookPath` may point at another file relative to this package (for
 * example `prompt/handbook.zh.md`) or at an absolute path; unset falls back to
 * {@link DEFAULT_HANDBOOK}. Exported so `scripts/verify.mjs` prints the same
 * path the preset mounts, instead of a second guess at the rule.
 *
 * @param {{ handbookPath?: string }} [config]
 * @returns {string} Absolute path of the handbook file.
 */
export function handbookFile(config) {
  const requested = typeof config?.handbookPath === 'string' && config.handbookPath.trim()
    ? config.handbookPath.trim()
    : DEFAULT_HANDBOOK
  return isAbsolute(requested) ? requested : resolve(PACKAGE_DIR, requested)
}

/**
 * Read the handbook once at activation. A missing file degrades to the identity
 * line rather than failing the preset.
 *
 * @param {{ handbookPath?: string }} [config]
 * @returns {string} The handbook text injected as the `personal:handbook` section.
 */
export function loadHandbook(config) {
  try {
    const file = handbookFile(config)
    return readFileSync(file, 'utf8').trim()
  } catch {
    return 'Work the task you were given, verify before claiming success, and confirm before acting outside this conversation.'
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
