/**
 * Host half of the super-session entry.
 *
 * The browser artifact (`client.js`) owns the sidebar panel and its page. This
 * row exists so the Loader mounts the package and discovers its `dsh.client`
 * declaration; there is deliberately no Host behavior to register.
 *
 * @module @local/dsh-personal-agent/super-session
 */

/** Host plugin entry: intentionally empty. */
export function apply() {}
