/**
 * Host half of the bundle's client declaration.
 *
 * The sidebar panel ("Super Session") and the page it opens live in
 * `client.js`; this module only gives the Loader a row to mount so that
 * `dsh-client-modules` discovers the package's `dsh.client` declaration. There
 * is deliberately nothing to register on the Host plane.
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

/** Host plugin entry: intentionally empty. */
export function apply() {}
