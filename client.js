/**
 * Browser half of the bundle: the sidebar panel row named "Super Session".
 *
 * There is exactly one super session, and its identity is the built-in
 * Workspace the Host creates at startup: `<Documents>/deepseek-harness/
 * super-workspace`, titled "Super Workspace". This half only finds that
 * Workspace in the registry — by path tail or by title — then opens the newest
 * unarchived Session in it, creating one on the `personal` preset when the
 * Workspace is empty. It never registers a Workspace and never guesses a path.
 * The page registered for the panel id only resolves that Session and hands the
 * navigation to ui-workspace, which returns the main column to the
 * Conversation. Nothing is painted on the successful path; a status line
 * appears only when resolution is slow, and failures stay on this page with a
 * retry action.
 *
 * Constraints (see AGENTS.md): this file is plain JavaScript loaded by
 * `window.__ModuleLoader__` — no build step, no imports. React is the only
 * module it may request; every other DSH client package is off limits, so all
 * styling is local CSS built from host theme tokens and the icon is inline SVG.
 *
 * @module @local/dsh-personal-agent/client
 */

window.__ModuleLoader__.load({
  id: '@local/dsh-personal-agent',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    /** Panel id: the `main` key and the `sidebar.panellist` id must agree. */
    const PANEL_ID = 'super-session'

    /** Locale namespace owned by this plugin. */
    const NS = 'super-session'

    /** Agent preset the super session runs. The profile default is the same. */
    const AGENT_PRESET = 'personal'

    /**
     * Title of the built-in Workspace. The Host registers it with this title at
     * startup; matching it is a second way to recognize the Workspace when its
     * path spelling differs.
     */
    const WORKSPACE_TITLE = 'Super Workspace'

    /**
     * Path tail that identifies the Workspace, folded to forward slashes and
     * lower case. The Host creates it under `<Documents>/deepseek-harness`.
     */
    const WORKSPACE_PATH_TAIL = 'deepseek-harness/super-workspace'

    /** How long resolution may take before the page admits it is working. */
    const SLOW_OPEN_MS = 200

    /**
     * The Session and Workspace this run opened last. The Workspace list can
     * lag a creation, and a second click while it lags would otherwise create
     * a second Session; memory only, nothing is persisted.
     */
    let openedThisRun
    let openedWorkspaceId

    /** Dictionaries; `zh` and `en` must carry the same keys. */
    const DICTIONARIES = {
      zh: {
        title: '超级会话',
        'status.opening': '正在打开超级会话…',
        'action.retry': '重试',
        'error.create': '创建会话失败：{message}',
        'error.open': '打开会话失败：{message}',
        'error.notReady': '超级会话的工作区还没准备好：重启 DSH 后它会自动建好',
        'error.unavailable': '会话服务尚未就绪，请稍后再试。',
        'session.title': '超级会话',
      },
      en: {
        title: 'Super Session',
        'status.opening': 'Opening your super session…',
        'action.retry': 'Retry',
        'error.create': 'Could not create the session: {message}',
        'error.open': 'Could not open the session: {message}',
        'error.notReady': 'The super session workspace is not ready yet: restart DSH and it will be created automatically.',
        'error.unavailable': 'The session service is not ready yet; try again shortly.',
        'session.title': 'Super Session',
      },
    }

    /** Scoped page styles: only host theme tokens, no literal colors. */
    const STYLES = `
.dss-super-page {
  box-sizing: border-box;
  display: flex;
  flex: 1;
  min-height: 0;
  align-items: center;
  justify-content: center;
  overflow: auto;
  padding: calc(28px + var(--dsh-frame-top-clearance, 0px)) clamp(24px, 4vw, 48px) 40px;
  color: var(--dsw-alias-label-primary);
}
.dss-super-card {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  max-width: 420px;
  margin: auto;
  text-align: center;
}
.dss-super-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: var(--dsw-radius-md);
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-state-business-primary);
}
.dss-super-status {
  margin: 0;
  color: var(--dsw-alias-label-secondary);
  font-size: 14px;
  line-height: 22px;
}
.dss-super-error {
  margin: 0;
  color: var(--dsw-alias-state-error-primary, var(--dsw-alias-label-secondary));
  font-size: 13px;
  line-height: 20px;
  overflow-wrap: anywhere;
}
.dss-super-button {
  height: 32px;
  padding: 0 14px;
  border: 0.5px solid var(--dsw-alias-border-l2);
  border-radius: var(--dsw-radius-md);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}
@media (hover: hover) {
  .dss-super-button:hover {
    background: var(--dsw-alias-interactive-bg-hover);
  }
}
.dss-super-button:focus-visible {
  outline: var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color);
  outline-offset: 2px;
}
`
    /**
     * Draw the panel icon.
     * @param {{ size?: number }} props - square edge supplied by the host row.
     * @returns The inline SVG icon.
     */
    function SuperSessionIcon({ size }) {
      const edge = typeof size === 'number' && size > 0 ? size : 18
      return h('svg', {
        width: edge,
        height: edge,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.6,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': 'true',
        focusable: 'false',
        style: { display: 'block' },
      },
      h('rect', { x: 3.5, y: 4, width: 17, height: 12.5, rx: 3.5 }),
      h('path', { d: 'M8 16.5v3l3.2-3' }),
      h('path', { d: 'M16.5 7v3M15 8.5h3' }))
    }

    /**
     * Read one error as a display string.
     * @param {unknown} reason - thrown value.
     * @returns The message text.
     */
    function messageOf(reason) {
      if (reason instanceof Error && reason.message) return reason.message
      if (typeof reason === 'string' && reason) return reason
      try {
        const encoded = JSON.stringify(reason)
        if (typeof encoded === 'string') return encoded
      } catch (_error) {
        // Fall through to String() for cyclic values.
      }
      return String(reason)
    }

    /**
     * Whether a create failure says the Host does not know the preset.
     * @param {unknown} reason - value rejected by `sessions.create`.
     * @returns True when retrying without `agentPreset` can succeed.
     */
    function unknownPreset(reason) {
      const code = reason && reason.rpcError && reason.rpcError.code
      if (code === 'agent-preset/not-found' || code === 'agent-preset/invalid') return true
      const text = messageOf(reason)
      return /agent[\s_-]?preset/i.test(text) && /(not[\s_-]?found|unknown|invalid|unrecogni[sz]ed)/i.test(text)
    }

    /** The Session list snapshot, or undefined while the controller is absent. */
    function sessionList(ctx) {
      try {
        const sessions = ctx.get('sessions')
        const list = sessions && sessions.list
        return list && typeof list.getSnapshot === 'function' ? list.getSnapshot() : undefined
      } catch (_reason) {
        return undefined
      }
    }

    /** Session ids the user archived; archived rows are not resumable entries. */
    function archivedSessions(ctx) {
      try {
        const workspaces = ctx.get('workspaces')
        const list = workspaces && workspaces.list
        const snapshot = list && typeof list.getSnapshot === 'function' ? list.getSnapshot() : undefined
        const ids = snapshot && Array.isArray(snapshot.archivedSessionIds) ? snapshot.archivedSessionIds : []
        return new Set(ids)
      } catch (_reason) {
        return new Set()
      }
    }

    /** The Workspace snapshot, or undefined while the controller is absent. */
    function workspaceSnapshot(ctx) {
      try {
        const workspaces = ctx.get('workspaces')
        const list = workspaces && workspaces.list
        return list && typeof list.getSnapshot === 'function' ? list.getSnapshot() : undefined
      } catch (_reason) {
        return undefined
      }
    }

    /**
     * Fold a Host path for comparison: one separator style, no trailing
     * separators, lower case.
     * @param {string} value - a path spelling.
     * @returns The folded key.
     */
    function foldPath(value) {
      return value
        .split('\\')
        .join('/')
        .replace(/\/{2,}/g, '/')
        .replace(/\/+$/, '')
        .toLowerCase()
    }

    /**
     * Whether one Workspace row is the built-in Super Workspace. The title match
     * catches a redirected or differently spelled path; the path tail catches a
     * Workspace whose title was changed.
     * @param {any} item - a Workspace view from the list snapshot.
     * @returns True for the Super Workspace.
     */
    function isSuperWorkspace(item) {
      if (item === undefined || item === null) return false
      if (typeof item.title === 'string' && item.title.trim() === WORKSPACE_TITLE) return true
      if (typeof item.path !== 'string' || item.path === '') return false
      const folded = foldPath(item.path)
      return folded === WORKSPACE_PATH_TAIL || folded.endsWith('/' + WORKSPACE_PATH_TAIL)
    }

    /**
     * The built-in Workspace, when the Host has registered it.
     * @param {any} ctx - Client root context.
     * @returns The Workspace view, or undefined before the Host registers it.
     */
    function findSuperWorkspace(ctx) {
      const snapshot = workspaceSnapshot(ctx)
      const items = snapshot && Array.isArray(snapshot.items) ? snapshot.items : []
      return items.find((item) => isSuperWorkspace(item))
    }

    /**
     * The Session this run already opened, while the Workspace is still the
     * same and the user has not archived it. This run's own knowledge covers
     * the gap until the Workspace list carries the new Session.
     * @param {any} ctx - Client root context.
     * @param {any} workspace - resolved Workspace view.
     * @returns A Session id, or undefined.
     */
    function openedSessionIn(ctx, workspace) {
      if (workspace === undefined || workspace.workspaceId === undefined) return undefined
      if (openedThisRun === undefined || workspace.workspaceId !== openedWorkspaceId) return undefined
      return archivedSessions(ctx).has(openedThisRun) ? undefined : openedThisRun
    }

    /**
     * The super session inside the built-in Workspace: the one this run
     * opened, else the most recently updated unarchived member. Archived
     * Sessions keep their `sessionIds` slot so unarchiving restores the
     * position, which is why the archive set is what excludes them.
     * @param {any} ctx - Client root context.
     * @param {any} workspace - resolved Workspace view.
     * @returns A Session id, or undefined when the Workspace has none.
     */
    function superSessionIn(ctx, workspace) {
      const opened = openedSessionIn(ctx, workspace)
      if (opened !== undefined) return opened
      if (workspace === undefined) return undefined
      const archived = archivedSessions(ctx)
      const ids = Array.isArray(workspace.sessionIds) ? workspace.sessionIds : []
      const members = ids.filter((id) => !archived.has(id))
      if (members.length === 0) return undefined
      const list = sessionList(ctx)
      const byId = (list && list.byId) || {}
      const ranked = members
        .map((id) => byId[id])
        .filter((summary) => summary !== undefined)
        .sort((left, right) => (right.updatedAt || 0) - (left.updatedAt || 0))
      // The Host prepends the newest attachment, the best answer available
      // while the Session list has not caught up with the Workspace yet.
      return ranked.length > 0 ? ranked[0].id : members[0]
    }

    /**
     * Best-effort rename after the Session is open. The title is a readable
     * label, never identity, so a refusal (the `RemoteResult`) leaves the
     * default title in place and costs nothing.
     * @param {any} sessions - Session Controller service.
     * @param {string} sessionId - the Session to rename.
     * @param {string} title - the localized super session title.
     */
    async function renameSession(sessions, sessionId, title) {
      try {
        const binding = typeof sessions.binding === 'function' ? sessions.binding(sessionId) : undefined
        const session = binding && binding.session
        const rename = session && session.rename
        if (typeof rename !== 'function') return
        await rename.call(session, title)
      } catch (_reason) {
        // The Session is usable under its default title.
      }
    }

    /**
     * Create the super session on the personal preset.
     * @param {any} sessions - Session Controller service.
     * @param {string | undefined} workspaceId - target Workspace, when known.
     * @param {(key: string, params?: Record<string, unknown>) => string} t - bound translate.
     * @returns The new Session id.
     */
    async function createSuperSession(sessions, workspaceId, t) {
      const target = workspaceId === undefined ? {} : { workspaceId }
      try {
        return await sessions.create({ ...target, agentPreset: AGENT_PRESET })
      } catch (reason) {
        if (!unknownPreset(reason)) throw new Error(t('error.create', { message: messageOf(reason) }))
        try {
          return await sessions.create(target)
        } catch (fallbackReason) {
          throw new Error(t('error.create', { message: messageOf(fallbackReason) }))
        }
      }
    }

    /**
     * Open the one super session, creating it on the first visit.
     * @param {any} ctx - Client root context.
     * @param {(key: string, params?: Record<string, unknown>) => string} t - bound translate.
     * @param {() => boolean} stillHere - false once this page is gone, so a slow
     *   creation never steals a navigation the user started in the meantime.
     */
    async function openSuperSession(ctx, t, stillHere) {
      const sessions = ctx.get('sessions')
      if (!sessions || typeof sessions.create !== 'function' || typeof sessions.binding !== 'function') {
        throw new Error(t('error.unavailable'))
      }
      const workspace = findSuperWorkspace(ctx)
      if (workspace === undefined || workspace.workspaceId === undefined) {
        throw new Error(t('error.notReady'))
      }
      const workspaceId = workspace.workspaceId
      let sessionId = superSessionIn(ctx, workspace)
      if (sessionId === undefined) {
        sessionId = await createSuperSession(sessions, workspaceId, t)
        if (!stillHere()) return
      }
      openedThisRun = sessionId
      openedWorkspaceId = workspaceId
      // Navigation is owned by ui-workspace: `openSession` selects the Session
      // and returns the main column to the Conversation in one step.
      const navigation = ctx.get('uiWorkspace')
      if (!navigation || typeof navigation.openSession !== 'function') {
        throw new Error(t('error.unavailable'))
      }
      try {
        navigation.openSession(sessionId)
      } catch (reason) {
        throw new Error(t('error.open', { message: messageOf(reason) }))
      }
      // Only now does the Session have a binding: opening retained it. The
      // title is cosmetic, so a failed rename is ignored.
      await renameSession(sessions, sessionId, t('session.title'))
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, DICTIONARIES), 'dsh-super-session: dictionaries')
        const t = ctx.locale.bind(NS)

        /**
         * The page behind the panel id. It resolves and opens the Session in a
         * layout effect, so the usual path paints nothing at all; it stays on
         * screen only when resolution is slow or failed.
         */
        function SuperSessionPage() {
          const [failure, setFailure] = React.useState(null)
          const [slow, setSlow] = React.useState(false)
          const [attempt, setAttempt] = React.useState(0)
          React.useLayoutEffect(() => {
            let alive = true
            const timer = setTimeout(() => { if (alive) setSlow(true) }, SLOW_OPEN_MS)
            void openSuperSession(ctx, t, () => alive)
              .catch((reason) => { if (alive) setFailure(messageOf(reason)) })
              .finally(() => clearTimeout(timer))
            return () => {
              alive = false
              clearTimeout(timer)
            }
          }, [attempt])

          if (failure === null && !slow) return null
          return h('div', { className: 'dss-super-page' }, [
            h('style', { key: 'styles' }, STYLES),
            h('section', { key: 'card', className: 'dss-super-card', 'aria-label': t('title') }, [
              h('span', { key: 'mark', className: 'dss-super-mark', 'aria-hidden': 'true' },
                h(SuperSessionIcon, { size: 22 })),
              failure === null
                ? h('p', { key: 'status', className: 'dss-super-status', role: 'status' }, t('status.opening'))
                : h('p', { key: 'error', className: 'dss-super-error', role: 'alert' }, failure),
              failure === null ? null : h('button', {
                key: 'retry',
                type: 'button',
                className: 'dss-super-button',
                onClick: () => {
                  setSlow(false)
                  setFailure(null)
                  setAttempt((value) => value + 1)
                },
              }, t('action.retry')),
            ]),
          ])
        }

        // A panel row is only an icon; the shell switches the main column and
        // supplies the label used for its title and accessible name.
        ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
          name: 'sidebar.panellist',
          id: PANEL_ID,
          order: 20,
          label: () => t('title'),
          locale: NS,
        }, (props) => h(SuperSessionIcon, { size: props && props.size })))

        // The same id keys the `main` slot; selecting the row mounts this page,
        // which immediately turns the main column back into the Conversation.
        ctx.slots.inject('main', () => ctx.slots.register({
          name: 'main',
          key: PANEL_ID,
          locale: NS,
        }, SuperSessionPage))
      },
    }
  },
})
