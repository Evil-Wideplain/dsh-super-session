/**
 * Browser half of the bundle: a sidebar panel row named "Super Session" and
 * the page it opens in the main column.
 *
 * The row registers into `sidebar.panellist` (the same list as Plugins and
 * Context) and only draws an icon; the shell owns selection and navigation.
 * The page registers into the keyed `main` slot under the same id, so clicking
 * the row switches the centre column to it. Its single button creates a Session
 * on the `personal` preset, opens it, and renames it best-effort; every failure
 * is shown as one line under the button instead of a dialog.
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

    /** Agent preset the button starts. The profile default is the same. */
    const AGENT_PRESET = 'personal'

    /** Dictionaries; `zh` and `en` must carry the same keys. */
    const DICTIONARIES = {
      zh: {
        title: '超级会话',
        description: '用个人助理预设开一个会话：持久 shell、Web、Office、定时任务都在，长活可以直接派给工作会话。',
        'action.create': '新建超级会话',
        'action.creating': '正在创建…',
        'error.create': '创建失败：{message}',
        'error.open': '会话已创建，但打开失败：{message}',
        'error.unavailable': '会话服务尚未就绪，请稍后再试。',
        'session.title': '超级会话 · {time}',
      },
      en: {
        title: 'Super Session',
        description: 'Start a session on the personal preset: persistent shell, web, Office and schedules are all there, and long work can go straight to a worker session.',
        'action.create': 'New super session',
        'action.creating': 'Creating…',
        'error.create': 'Could not create the session: {message}',
        'error.open': 'The session was created but could not be opened: {message}',
        'error.unavailable': 'The session service is not ready yet; try again shortly.',
        'session.title': 'Super Session · {time}',
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
  align-items: flex-start;
  gap: 12px;
  width: 100%;
  max-width: 560px;
  margin: auto;
  padding: 28px;
  border: 0.5px solid var(--dsw-alias-border-l2);
  border-radius: var(--dsw-radius-lg);
  background: var(--dsw-alias-bg-layer-1);
}
.dss-super-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  margin-bottom: 2px;
  border-radius: var(--dsw-radius-md);
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-state-business-primary);
}
.dss-super-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  line-height: 28px;
}
.dss-super-description {
  margin: 0;
  color: var(--dsw-alias-label-secondary);
  font-size: 14px;
  line-height: 22px;
}
.dss-super-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}
.dss-super-button {
  height: 36px;
  padding: 0 18px;
  border: none;
  border-radius: var(--dsw-radius-md);
  background: var(--dsw-alias-button-primary-fill);
  color: var(--dsw-alias-label-on-color);
  font-family: inherit;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}
@media (hover: hover) {
  .dss-super-button:hover:not(:disabled) {
    background: var(--dsw-alias-button-primary-hover);
  }
}
.dss-super-button:focus-visible {
  outline: var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color);
  outline-offset: 2px;
}
.dss-super-button:disabled {
  opacity: 0.55;
  cursor: default;
}
.dss-super-error {
  margin: 0;
  color: var(--dsw-alias-state-error-primary, var(--dsw-alias-label-secondary));
  font-size: 12px;
  line-height: 18px;
  overflow-wrap: anywhere;
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

    /**
     * Create a Session, falling back to the Host default preset when the
     * named one is not recognised.
     * @param {any} sessions - Session Controller service.
     * @param {string | undefined} workspaceId - target Workspace, when known.
     * @returns The new Session id.
     */
    async function createSession(sessions, workspaceId) {
      const target = workspaceId === undefined ? {} : { workspaceId }
      try {
        return await sessions.create({ ...target, agentPreset: AGENT_PRESET })
      } catch (reason) {
        if (!unknownPreset(reason)) throw reason
        return await sessions.create(target)
      }
    }

    /** Parse a timestamp defensively for ordering. */
    function stamp(value) {
      const parsed = Date.parse(value || '')
      return Number.isNaN(parsed) ? 0 : parsed
    }

    /**
     * Find the Workspace to create in: the current Session's, then the most
     * recently updated Session's, then the newest Workspace, else none (the
     * Host default applies).
     *
     * The panel replaces the Conversation, so the Session that was open is no
     * longer retained by the main view and the first rule usually misses; the
     * recency fallbacks keep the button useful without asking the user.
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

    /** Local wall-clock `YYYY-MM-DD HH:mm`, the suffix of the titled Session. */
    function localTime() {
      const now = new Date()
      const pad = (value) => String(value).padStart(2, '0')
      return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} `
        + `${pad(now.getHours())}:${pad(now.getMinutes())}`
    }

    /**
     * Rename the new Session; a title is cosmetic and may fail silently.
     * @param {any} sessions - Session Controller service.
     * @param {string} sessionId - the Session to rename.
     * @param {(key: string, params?: Record<string, unknown>) => string} t - bound translate.
     */
    async function renameSession(sessions, sessionId, t) {
      try {
        const binding = typeof sessions.binding === 'function' ? sessions.binding(sessionId) : undefined
        const session = binding && binding.session
        const rename = session && session.rename
        if (typeof rename !== 'function') return
        await rename.call(session, t('session.title', { time: localTime() }))
      } catch (_reason) {
        // Opening the Session already succeeded; the default title is fine.
      }
    }

    /**
     * Create, open, and title one Session on the personal preset.
     * @param {any} ctx - Client root context.
     * @param {(key: string, params?: Record<string, unknown>) => string} t - bound translate.
     */
    async function startSuperSession(ctx, t) {
      const sessions = ctx.get('sessions')
      if (!sessions || typeof sessions.create !== 'function') {
        throw new Error(t('error.unavailable'))
      }
      const workspaceId = currentWorkspaceId(ctx)
      let sessionId
      try {
        sessionId = await createSession(sessions, workspaceId)
      } catch (reason) {
        throw new Error(t('error.create', { message: messageOf(reason) }))
      }
      // Navigation is owned by ui-workspace; the Session Controller itself has
      // no `open` verb. `sessions.open` is used only if a future build adds it.
      const navigation = ctx.get('uiWorkspace')
      try {
        if (navigation && typeof navigation.openSession === 'function') {
          await navigation.openSession(sessionId)
        } else if (typeof sessions.open === 'function') {
          sessions.open(sessionId)
        } else {
          throw new Error(t('error.unavailable'))
        }
      } catch (reason) {
        throw new Error(t('error.open', { message: messageOf(reason) }))
      }
      await renameSession(sessions, sessionId, t)
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, DICTIONARIES), 'dsh-super-session: dictionaries')
        const t = ctx.locale.bind(NS)

        /** Page shown in the main column for this panel id. */
        function SuperSessionPage() {
          const [error, setError] = React.useState(null)
          const [pending, setPending] = React.useState(false)
          const alive = React.useRef(true)
          const busy = React.useRef(false)
          React.useEffect(() => () => { alive.current = false }, [])
          const start = () => {
            if (busy.current) return
            busy.current = true
            setPending(true)
            setError(null)
            void startSuperSession(ctx, t)
              .catch((reason) => {
                if (alive.current) setError(messageOf(reason))
              })
              .finally(() => {
                busy.current = false
                if (alive.current) setPending(false)
              })
          }
          return h('div', { className: 'dss-super-page' }, [
            h('style', { key: 'styles' }, STYLES),
            h('section', { key: 'card', className: 'dss-super-card', 'aria-label': t('title') }, [
              h('span', { key: 'mark', className: 'dss-super-mark', 'aria-hidden': 'true' },
                h(SuperSessionIcon, { size: 22 })),
              h('h1', { key: 'title', className: 'dss-super-title' }, t('title')),
              h('p', { key: 'description', className: 'dss-super-description' }, t('description')),
              h('div', { key: 'actions', className: 'dss-super-actions' },
                h('button', {
                  type: 'button',
                  className: 'dss-super-button',
                  disabled: pending,
                  onClick: start,
                }, pending ? t('action.creating') : t('action.create'))),
              error === null ? null : h('p', {
                key: 'error', className: 'dss-super-error', role: 'alert',
              }, error),
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

        // The same id keys the `main` slot, so selecting the row shows this page.
        ctx.slots.inject('main', () => ctx.slots.register({
          name: 'main',
          key: PANEL_ID,
          locale: NS,
        }, SuperSessionPage))
      },
    }
  },
})
