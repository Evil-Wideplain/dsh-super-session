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
 * It also attaches the fixed super session to that Workspace when a Session of
 * that id already exists on disk. The Conversation only enables its composer
 * for a blank Session that belongs to a Workspace, so a Session an earlier
 * version created from a bare `cwd` is openable but cannot be typed into; the
 * client half has no attach call (`archiveSession`, `unarchiveSession`,
 * `pinSession`, `insertSessionBefore` are the only Workspace verbs it can
 * reach), while the registry's `attachSession` is right here. The attachment is
 * idempotent, validates the Session's stored `cwd` against the Workspace path,
 * and only ever touches the one fixed id.
 *
 * The division is deliberate: the Host owns the directory, the registration
 * and that one repair, and the browser half only recognizes the Workspace by
 * its path or title, then opens or creates its Session there. The browser half
 * never invents a path and never registers anything.
 *
 * The row's name is the bare package specifier, and that is load-bearing: the
 * client scanner accepts an exact package name only (`exactPackageSpecifier`),
 * then resolves the package root through `exports["."]` and reads the
 * `./client` export beside it. A subpath such as this package's `./context.js`
 * or a `file:` URL is skipped as a non-client row, which leaves the panel
 * undiscovered. The presets mount `./context.js` by subpath for the same
 * reason: their rows must not be mistaken for the client row.
 *
 * @module @evil-wideplain/dsh-super-session
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
 * The one Session the sidebar panel opens, named by the browser half. It is a
 * plain string, not a UUID, and only this value ties the two halves together.
 */
const SUPER_SESSION_ID = 'session-super-session'

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
    console.warn('[dsh-super-session] could not ask Windows for the Documents directory:', error)
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
    console.warn('[dsh-super-session] the Documents directory is unknown; the super workspace was not prepared')
    return
  }
  const directory = join(documents, HARNESS_DIRECTORY, WORKSPACE_LEAF)
  try {
    await mkdir(directory, { recursive: true })
  } catch (error) {
    console.warn(`[dsh-super-session] could not create ${directory}:`, error)
    return
  }
  const registry = ctx.get('workspaceRegistry')
  if (!registry || typeof registry.create !== 'function') {
    console.warn('[dsh-super-session] the workspace registry is unavailable; the super workspace stays unregistered')
    return
  }
  let workspace
  try {
    workspace = await registry.create(directory, WORKSPACE_TITLE)
  } catch (error) {
    console.warn(`[dsh-super-session] could not register ${directory}:`, error)
    return
  }
  await attachSuperSession(ctx, workspace)
}

/**
 * Attach the fixed super session to the built-in Workspace when it already
 * exists outside it.
 *
 * Versions of the browser half that passed `cwd` only left the fixed Session in
 * "Ungrouped", and the Conversation refuses input in a blank Session that
 * belongs to no Workspace. Nothing in the client can attach it, so the Host
 * repairs it once here: after this run the Session is an ordinary member and
 * every later click reuses it through `workspaceId`.
 *
 * Idempotent on both ends: a Session already on the account is left alone, and
 * `attachSession` validates the stored `cwd` itself. A Session that does not
 * exist yet (fresh install) is skipped without a warning, because the browser
 * half creates it on the first click.
 * @param {any} ctx - Host context carrying the Session persistence service.
 * @param {any} workspace - the registry's Workspace entity for the directory.
 * @returns Completion; never rejects.
 */
async function attachSuperSession(ctx, workspace) {
  if (!workspace || typeof workspace.attachSession !== 'function') {
    console.warn('[dsh-super-session] the super workspace cannot attach sessions; the super session stays outside it')
    return
  }
  const members = Array.isArray(workspace.sessionIds) ? workspace.sessionIds : []
  if (members.includes(SUPER_SESSION_ID)) return
  const persistence = ctx.get('sessionPersistence')
  if (!persistence || typeof persistence.list !== 'function') {
    console.warn('[dsh-super-session] session storage is unavailable; the super session was not attached')
    return
  }
  let stored = false
  try {
    const snapshots = await persistence.list()
    stored = snapshots.some((snapshot) => snapshot && snapshot.header && snapshot.header.id === SUPER_SESSION_ID)
  } catch (error) {
    console.warn('[dsh-super-session] could not list stored sessions; the super session was not attached:', error)
    return
  }
  if (!stored) return
  try {
    await workspace.attachSession(SUPER_SESSION_ID)
  } catch (error) {
    console.warn(`[dsh-super-session] could not attach ${SUPER_SESSION_ID} to the super workspace:`, error)
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
  ctx.inject(['workspaceRegistry', 'sessionPersistence'], (registryCtx) => {
    prepareSuperWorkspace(registryCtx).catch((error) => {
      console.warn('[dsh-super-session] super workspace preparation failed:', error)
    })
  })
}
