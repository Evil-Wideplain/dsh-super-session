/**
 * Host half of the bundle's client declaration, plus the built-in Workspace
 * the sidebar entry lives in.
 *
 * The sidebar panel ("Super Session") and the page it opens live in
 * `client.js`; this module gives the Loader a row to mount so that
 * `dsh-client-modules` discovers the package's `dsh.client` declaration, and
 * prepares `<Documents>/deepseek-harness/super-workspace` — the same
 * `deepseek-harness` folder DSH keeps its own `default-workspace` in — then
 * registers it as a Workspace titled "Super Workspace". Both happen at
 * activation, so the Workspace is in the sidebar on startup instead of
 * appearing on the first click.
 *
 * The division is deliberate: the Host owns the directory and the
 * registration, and the browser half only recognizes the Workspace by its path
 * or title, then opens or creates its Session. The browser half never invents
 * a path and never registers anything.
 *
 * The row's name is the bare package specifier, and that is load-bearing: the
 * client scanner accepts an exact package name only (`exactPackageSpecifier`),
 * then resolves the package root through `exports["."]` and reads the
 * `./client` export beside it. A subpath such as this package's `./context.js`
 * or a `file:` URL is skipped as a non-client row, which leaves the panel
 * undiscovered. The presets mount `./context.js` by subpath for the same
 * reason: their rows must not be mistaken for the client row.
 *
 * @module @local/dsh-personal-agent
 */

import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { isAbsolute, join } from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

/** Folder DSH itself keeps its first-use Workspace under. */
const HARNESS_DIRECTORY = 'deepseek-harness'

/** Leaf directory of the super session's built-in Workspace. */
const WORKSPACE_LEAF = 'super-workspace'

/** Title the sidebar shows for it; the browser half also recognizes it. */
const WORKSPACE_TITLE = 'Super Workspace'

/**
 * Locate the account's Documents directory.
 *
 * The home-relative guess is the fast path and covers every normal install.
 * When it does not exist, ask Windows for the shell folder the way DSH resolves
 * it for its own default Workspace (`@deepseek-ai/dsh-api-workspace-controller`,
 * `src/default-directory.ts`): a `powershell.exe` probe with `GetFolderPath`,
 * because Documents can be redirected to another drive.
 * @returns The directory, or undefined when neither path works.
 */
async function resolveDocuments() {
  const guess = join(homedir(), 'Documents')
  if (existsSync(guess)) return guess
  if (process.platform !== 'win32') return undefined
  try {
    const { stdout } = await execFileAsync('powershell.exe', [
      '-NoLogo', '-NoProfile', '-NonInteractive', '-Command',
      '[Environment]::GetFolderPath([Environment+SpecialFolder]::MyDocuments, '
      + '[Environment+SpecialFolderOption]::DoNotVerify)',
    ], { windowsHide: true, timeout: 15000 })
    const resolved = stdout.replace(/[\r\n]+$/, '')
    return resolved !== '' && isAbsolute(resolved) ? resolved : undefined
  } catch (error) {
    console.warn('[dsh-personal-agent] could not ask Windows for the Documents directory:', error)
    return undefined
  }
}

/**
 * Create the built-in Workspace directory and register it.
 *
 * Idempotent: `mkdir` with `recursive` tolerates an existing directory, and the
 * registry's `create` returns the existing Workspace for a canonical path
 * without retitling it. The directory must exist first, because `create`
 * canonicalizes through `realpath` and rejects a missing path.
 *
 * Every failure warns instead of throwing: a missing Workspace costs the
 * sidebar entry, not plugin activation, and the browser half reports it with a
 * retry.
 * @param {any} ctx - Host context carrying the Workspace registry.
 * @returns Completion; never rejects.
 */
async function prepareSuperWorkspace(ctx) {
  const documents = await resolveDocuments()
  if (documents === undefined) {
    console.warn('[dsh-personal-agent] the Documents directory is unknown; the super workspace was not prepared')
    return
  }
  const directory = join(documents, HARNESS_DIRECTORY, WORKSPACE_LEAF)
  try {
    await mkdir(directory, { recursive: true })
  } catch (error) {
    console.warn(`[dsh-personal-agent] could not create ${directory}:`, error)
    return
  }
  const registry = ctx.get('workspaceRegistry')
  if (!registry || typeof registry.create !== 'function') {
    console.warn('[dsh-personal-agent] the workspace registry is unavailable; the super workspace stays unregistered')
    return
  }
  try {
    await registry.create(directory, WORKSPACE_TITLE)
  } catch (error) {
    console.warn(`[dsh-personal-agent] could not register ${directory}:`, error)
  }
}

/**
 * Host plugin entry.
 *
 * The registry can arrive after this row is mounted, so the preparation waits
 * for the service with `ctx.inject` instead of gating activation on it: a
 * delayed service must not keep the client row from being discovered.
 * @param {any} ctx - Host context.
 */
export function apply(ctx) {
  ctx.inject(['workspaceRegistry'], (registryCtx) => {
    prepareSuperWorkspace(registryCtx).catch((error) => {
      console.warn('[dsh-personal-agent] super workspace preparation failed:', error)
    })
  })
}
