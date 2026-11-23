/**
 * Host half of the bundle's client declaration, plus the one directory the
 * client half cannot create itself.
 *
 * The sidebar panel ("Super Session") and the page it opens live in
 * `client.js`; this module gives the Loader a row to mount so that
 * `dsh-client-modules` discovers the package's `dsh.client` declaration, and
 * prepares `<Host home>/super-agent`. That directory is the super session's
 * fixed Workspace: the browser half registers it on the first click, and
 * `workspaces.create` requires the directory to exist already. Registration
 * stays browser-side; nothing else happens on the Host plane.
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

import { mkdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

/** Directory under the Host home that holds the super session's Workspace. */
const SUPER_WORKSPACE_LEAF = 'super-agent'

/**
 * Create the super session's directory. Idempotent: repeated activation only
 * re-ensures the directory exists. A failure costs the first click (the
 * browser half reports it and offers a retry), so it warns instead of failing
 * the plugin activation.
 * @returns Completion; never rejects.
 */
async function prepareSuperWorkspace() {
  const directory = join(homedir(), SUPER_WORKSPACE_LEAF)
  try {
    await mkdir(directory, { recursive: true })
  } catch (error) {
    console.warn(`[dsh-personal-agent] could not prepare the super session directory ${directory}:`, error)
  }
}

/**
 * Host plugin entry: prepare the fixed Workspace directory for the client half.
 * Awaiting it keeps activation complete before the browser half can click.
 * @returns Completion; `prepareSuperWorkspace` never rejects.
 */
export async function apply() {
  await prepareSuperWorkspace()
}
