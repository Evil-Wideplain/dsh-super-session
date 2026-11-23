/**
 * Browser half of the bundle: the sidebar panel row named "Super Session".
 *
 * There is exactly one super session. Selecting the row puts the user straight
 * into that conversation instead of offering a launcher: the page registered
 * for the panel id only resolves which Session the super session is — the one
 * a previous visit stored, an existing Session that already carries the title,
 * or a freshly created one on the `personal` preset — and then hands the
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

    /** Where the one super session's id is remembered between visits. */
    const POINTER_KEY = 'dsh.personal-agent.v1.super-session'

    /**
     * Titles that mark an existing Session as the super session. Creation
     * writes the localized one; the other lets a Session titled in a different
     * UI language be adopted instead of duplicated.
     */
    const TITLES = ['超级会话', 'Super Session']

    /** How long resolution may take before the page admits it is working. */
    const SLOW_OPEN_MS = 200

    /** Dictionaries; `zh` and `en` must carry the same keys. */
    const DICTIONARIES = {
      zh: {
        title: '超级会话',
        'status.opening': '正在打开超级会话…',
        'action.retry': '重试',
        'error.create': '创建会话失败：{message}',
        'error.open': '打开会话失败：{message}',
        'error.unavailable': '会话服务尚未就绪，请稍后再试。',
        'session.title': '超级会话',
      },
      en: {
        title: 'Super Session',
        'status.opening': 'Opening your super session…',
        'action.retry': 'Retry',
        'error.create': 'Could not create the session: {message}',
        'error.open': 'Could not open the session: {message}',
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

    /** The remembered super session id, when storage is readable. */
    function readPointer() {
      try {
        const value = window.localStorage.getItem(POINTER_KEY)
        return typeof value === 'string' && value.length > 0 ? value : undefined
      } catch (_reason) {
        return undefined
      }
    }

    /**
     * Remember the super session id; storage failures cost only the shortcut,
     * because the title marker and the list still identify the Session.
     * @param {string} sessionId - the Session this row stands for.
     */
    function writePointer(sessionId) {
      try {
        window.localStorage.setItem(POINTER_KEY, sessionId)
      } catch (_reason) {
        // Private mode or a full quota: the title marker still finds it.
      }
    }

    /**
     * Whether a Session title marks the super session.
     * @param {string | undefined} title - display title from the list.
     * @returns True for a title written by this plugin.
     */
    function markedTitle(title) {
      return typeof title === 'string' && TITLES.some((prefix) => title.startsWith(prefix))
    }

    /**
     * Resolve the Session this row stands for without creating one.
     *
     * The remembered id wins when the list still carries it and the user has
     * not archived it. Otherwise the newest listed Session carrying a super
     * session title is adopted, so an earlier one keeps its history. While the
     * list is still arriving its rows prove nothing, and the remembered id is
     * used as it stands.
     * @param {any} ctx - Client root context.
     * @returns A Session id, or undefined when the super session must be created.
     */
    function knownSuperSession(ctx) {
      const stored = readPointer()
      const list = sessionList(ctx)
      if (!list || list.phase !== 'ready' || !list.byId) return stored
      const archived = archivedSessions(ctx)
      if (stored !== undefined && list.byId[stored] !== undefined && !archived.has(stored)) return stored
      const ids = Array.isArray(list.ids) ? list.ids : []
      const adopted = ids
        .map((id) => list.byId[id])
        .filter((summary) => summary !== undefined && !archived.has(summary.id)
          && markedTitle(summary.displayTitle))
        .sort((left, right) => (right.updatedAt || 0) - (left.updatedAt || 0))[0]
      if (adopted === undefined) return undefined
      writePointer(adopted.id)
      return adopted.id
    }

    /** Parse a timestamp defensively for ordering. */
    function stamp(value) {
      const parsed = Date.parse(value || '')
      return Number.isNaN(parsed) ? 0 : parsed
    }

    /**
     * Find the Workspace for a first visit: the current Session's when one is
     * still retained, then the most recently updated Session's, then the
     * newest Workspace, else none (the Host default applies).
     * @param {any} ctx - Client root context.
     * @returns A Workspace id, or undefined.
     */
    function currentWorkspaceId(ctx) {
      try {
        const sessions = ctx.get('sessions')
        const workspaces = ctx.get('workspaces')
        const list = sessions && sessions.list && typeof sessions.list.getSnapshot === 'function'
          ? sessions.list.getSnapshot()
          : undefined
        const snapshot = workspaces && workspaces.list && typeof workspaces.list.getSnapshot === 'function'
          ? workspaces.list.getSnapshot()
          : undefined
        const items = snapshot && Array.isArray(snapshot.items) ? snapshot.items : []
        if (items.length === 0) return undefined
        const ids = list && Array.isArray(list.ids) ? list.ids : []
        const byId = (list && list.byId) || {}
        const ownerOf = (sessionId, summary) => items.find((item) => {
          if (Array.isArray(item.sessionIds) && item.sessionIds.includes(sessionId)) return true
          return summary !== undefined && typeof summary.cwd === 'string' && item.path === summary.cwd
        })
        const currentId = ids.find((id) => {
          const retained = byId[id] && byId[id].retainedBy
          return Boolean(retained && (retained.mainView || 0) > 0)
        })
        if (currentId !== undefined) {
          const owner = ownerOf(currentId, byId[currentId])
          if (owner !== undefined) return owner.workspaceId
        }
        const recent = ids
          .map((id) => byId[id])
          .filter((summary) => summary !== undefined)
          .sort((left, right) => (right.updatedAt || 0) - (left.updatedAt || 0))[0]
        if (recent !== undefined) {
          const owner = ownerOf(recent.id, recent)
          if (owner !== undefined) return owner.workspaceId
        }
        const newest = items
          .slice()
          .sort((left, right) => stamp(right.createdAt) - stamp(left.createdAt))[0]
        return newest === undefined ? undefined : newest.workspaceId
      } catch (_reason) {
        return undefined
      }
    }

    /**
     * Rename the new Session; the title is also the durable marker that lets
     * the row find this Session when the remembered id is gone, so it is the
     * one creation step allowed to fail without losing the session.
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
     * Create the super session on the personal preset, remember it, title it.
     * @param {any} sessions - Session Controller service.
     * @param {string | undefined} workspaceId - target Workspace, when known.
     * @param {(key: string, params?: Record<string, unknown>) => string} t - bound translate.
     * @returns The new Session id.
     */
    async function createSuperSession(sessions, workspaceId, t) {
      const target = workspaceId === undefined ? {} : { workspaceId }
      let sessionId
      try {
        sessionId = await sessions.create({ ...target, agentPreset: AGENT_PRESET })
      } catch (reason) {
        if (!unknownPreset(reason)) throw new Error(t('error.create', { message: messageOf(reason) }))
        try {
          sessionId = await sessions.create(target)
        } catch (fallbackReason) {
          throw new Error(t('error.create', { message: messageOf(fallbackReason) }))
        }
      }
      writePointer(sessionId)
      await renameSession(sessions, sessionId, t('session.title'))
      return sessionId
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
      let sessionId = knownSuperSession(ctx)
      if (sessionId === undefined) {
        sessionId = await createSuperSession(sessions, currentWorkspaceId(ctx), t)
        if (!stillHere()) return
      }
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
