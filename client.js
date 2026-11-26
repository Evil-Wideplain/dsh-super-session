/**
 * Browser half of the bundle: the sidebar panel row named "Super Session".
 *
 * There is exactly one super session, and its identity is a fixed Session id
 * this half passes to `sessions.create`. It is a *member* of the built-in
 * Workspace `<Documents>/deepseek-harness/super-workspace` that the Host
 * registers at startup, and that membership is load bearing: the Conversation
 * disables the composer of a *blank* Session that belongs to no Workspace and
 * turns it into a workspace picker, so an unattached Session opens but cannot
 * be typed into. Creation therefore names `workspaceId` — never `cwd`, which
 * the Host refuses beside `workspaceId` — and the Host attaches the Session in
 * the same call; an earlier version created it from `cwd` alone, so the Host
 * half also attaches that stored Session once at startup. This half finds the
 * Workspace by path tail or title, reads its identity and path, never registers
 * a Workspace and never guesses a path. Because the Session is now an ordinary
 * member, the ordinary new-conversation path can reuse it while it is blank and
 * applies the current default preset to it; a click repairs the preset while the
 * Session has not started a turn. The page registered for the panel id
 * resolves or creates that Session and hands the navigation to ui-workspace,
 * which returns the main column to the Conversation. Nothing is painted on the
 * successful path; a status line appears only when resolution is slow, and
 * failures stay on this page with a retry action.
 *
 * The built-in Workspace has no visibility flag anywhere in DSH — its record and
 * wire view carry only path, title, membership and timestamps, and the tree
 * derives its groups from that shared store — so its sidebar group is hidden at
 * the display layer instead: one scoped style element keyed on the tree row's
 * stable `data-row-key` attribute, never on a hashed CSS-module class. The
 * store is read and followed, never written, and disposing the element is the
 * whole restore path.
 *
 * Constraints (see AGENTS.md): this file is plain JavaScript loaded by
 * `window.__ModuleLoader__` — no build step, no imports. React is the only
 * module it may request; every other DSH client package is off limits, so all
 * styling is local CSS built from host theme tokens and the icon is inline SVG.
 *
 * @module @evil-wideplain/dsh-super-session/client
 */

window.__ModuleLoader__.load({
  id: '@evil-wideplain/dsh-super-session',
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
     * The one Session this panel owns, named instead of minted. Passing it to
     * `sessions.create` makes creation idempotent: the Host reuses the blank
     * Session stored under this id while it is an unarchived member of the
     * requested Workspace, and creates it when nothing is stored. It is not a
     * UUID and does not need to be: the wire accepts any string (a `SessionId`
     * is an unvalidated branded string) and the log directory goes through
     * `encodeSegment`, which escapes every character outside `[A-Za-z0-9._-]` —
     * this spelling needs no escaping — so a readable id stays legible in
     * diagnostics.
     */
    const SUPER_SESSION_ID = 'session-super-session'

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
     * Attribute value marking the display-layer style element that hides the
     * built-in Workspace group. The element is the dispose handle: removing it
     * restores the group, and no Workspace record was touched to hide it.
     */
    const HIDE_STYLE_MARKER = 'super-workspace-group'

    /** Dictionaries; `zh` and `en` must carry the same keys. */
    const DICTIONARIES = {
      zh: {
        title: '超级会话',
        'status.opening': '正在打开超级会话…',
        'action.retry': '重试',
        'error.create': '创建会话失败：{message}',
        'error.open': '打开会话失败：{message}',
        'error.notReady': '超级会话的工作区还没准备好：重启 DSH 后它会自动建好',
        'error.notAttached': '超级会话还没挂进内置工作区：重启 DSH 后它会自动挂好',
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
        'error.notAttached': 'The super session is not attached to its built-in workspace yet: restart DSH and it will be attached automatically.',
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

    /** Session ids the user archived; the fixed id is unarchived before it opens. */
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
     * Escape one value for a double-quoted CSS attribute selector. Workspace ids
     * are UUIDs today; the escape keeps the rule well formed if a future id ever
     * carries a quote, a backslash, or a newline.
     * @param {string} value - the raw attribute value.
     * @returns The escaped value.
     */
    function cssAttributeValue(value) {
      return value
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/[\n\r\f]/g, ' ')
    }

    /**
     * Stylesheet that removes the built-in Workspace group from the sidebar.
     *
     * The group is addressed through the stable `data-row-key` attribute the
     * Session tree puts on every row (`workspace:<workspaceId>`), never through
     * the hashed group-section CSS-module class name that changes with a
     * rebuild. `:has()` locates the group wrapper from the row: the wrapper is
     * the div whose direct child is that row, or the div whose direct child is
     * the span the row's hover card renders around it, so both depths are
     * listed. The intermediate element is named as a `span`, not a wildcard, so
     * the selector cannot reach past the wrapper and hide an ancestor such as
     * the tree itself. Each rule is kept separate on purpose — a selector list
     * holding one unsupported selector is dropped whole, so if an engine lacked
     * `:has()` the plain row rule would still hide the header instead of nothing
     * at all.
     * The wrapper carries no padding or border of its own (only 2px gaps between
     * its children), so removing the whole box leaves neither an empty row nor a
     * gap where the group was.
     * @param {string} workspaceId - the built-in Workspace's identity.
     * @returns The stylesheet text.
     */
    function hideWorkspaceCss(workspaceId) {
      const row = 'div[data-row-key="workspace:' + cssAttributeValue(workspaceId) + '"]'
      return [
        '/* The built-in super session Workspace: entered from the sidebar panel row, not from the tree. */',
        row + '{display:none !important}',
        'div:has(> ' + row + '){display:none !important}',
        'div:has(> span > ' + row + '){display:none !important}',
      ].join('\n')
    }

    /**
     * Hide the built-in Workspace's group in the sidebar, display layer only.
     *
     * DSH exposes no visibility flag for a Workspace: the record and the wire
     * `WorkspaceView` carry path, title, session ids and timestamps, and the
     * commands are create, rename, delete, reorder, archive/pin and membership.
     * The tree derives its groups from the shared Workspace store, so filtering
     * that data would corrupt real state. This function therefore reads the
     * store, follows it (a late baseline or a re-registered id still gets hidden)
     * and writes only a `<style>` element into `document.head`; disposing it is
     * the entire restore path. Only the one group named by the resolved id is
     * matched, so no other Workspace and no other row is affected.
     * @param {any} ctx - Client root context whose `workspaces` service exists.
     * @returns The disposer: stop following the store, remove the style element.
     */
    function hideBuiltInWorkspaceGroup(ctx) {
      if (typeof document === 'undefined' || document.head === null) return () => {}
      const workspaces = ctx.get('workspaces')
      const source = workspaces && workspaces.list
      if (!source || typeof source.getSnapshot !== 'function') return () => {}
      let style = null
      let appliedId = ''

      const removeStyle = () => {
        appliedId = ''
        if (style === null) return
        style.remove()
        style = null
      }

      const sync = () => {
        const workspace = findSuperWorkspace(ctx)
        const workspaceId = workspace && typeof workspace.workspaceId === 'string'
          ? workspace.workspaceId
          : ''
        if (workspaceId === '') {
          removeStyle()
          return
        }
        if (style === null) {
          style = document.createElement('style')
          style.setAttribute('data-dsh-super-session', HIDE_STYLE_MARKER)
          document.head.appendChild(style)
        }
        if (workspaceId === appliedId) return
        appliedId = workspaceId
        style.textContent = hideWorkspaceCss(workspaceId)
      }

      sync()
      const unsubscribe = typeof source.subscribe === 'function' ? source.subscribe(sync) : () => {}
      return () => {
        unsubscribe()
        removeStyle()
      }
    }

    /**
     * One listed Session summary, or undefined while the list does not carry
     * that id. The list is the Host-authoritative set, archived or not.
     * @param {any} ctx - Client root context.
     * @param {string} sessionId - the Session to look up.
     * @returns The list row, or undefined.
     */
    function listedSession(ctx, sessionId) {
      const list = sessionList(ctx)
      const byId = (list && list.byId) || {}
      return byId[sessionId]
    }

    /**
     * Whether one Workspace lists a Session as a member. The Conversation reads
     * the same array to decide whether a blank Session may take input at all,
     * so this is the check that answers "can the user type here".
     * @param {any} workspace - a Workspace view from the list snapshot, or undefined.
     * @param {string} sessionId - the Session to look for.
     * @returns True when the Workspace accounts for that Session.
     */
    function memberOf(workspace, sessionId) {
      return workspace !== undefined
        && Array.isArray(workspace.sessionIds)
        && workspace.sessionIds.includes(sessionId)
    }

    /**
     * Whether the Workspace list has finished its first load. Membership is
     * only an answer once it has: before that the list is legitimately empty,
     * and reading "not listed yet" as "not a member" would report a restart that
     * is not needed.
     * @param {any} ctx - Client root context.
     * @returns True when the list carries the Host's first baseline.
     */
    function workspaceListReady(ctx) {
      const snapshot = workspaceSnapshot(ctx)
      return snapshot !== undefined && snapshot.phase === 'ready'
    }

    /**
     * The Agent preset the Host recorded for one listed Session.
     * @param {any} summary - a Session list row.
     * @returns The preset id, or undefined when the projection has not arrived.
     */
    function recordedPreset(summary) {
      const values = summary && summary.projectionValues
      const preset = values && values.agentPreset
      return typeof preset === 'string' ? preset : undefined
    }

    /**
     * Pull the real Session list before deciding anything, best effort: a
     * transport hiccup leaves the current snapshot in place, which is still a
     * usable answer, so it never blocks the click.
     * @param {any} sessions - Session Controller service.
     */
    async function refreshSessions(sessions) {
      if (typeof sessions.refresh !== 'function') return
      try {
        await sessions.refresh()
      } catch (_reason) {
        // The current snapshot is the fallback.
      }
    }

    /**
     * Drop the super session from the archive set before opening it. Archiving
     * is the one user action that could hide the fixed id, so a click restores
     * it; the call is idempotent, and a refusal still leaves the Session
     * openable, with only its listing hidden.
     * @param {any} ctx - Client root context.
     * @param {string} sessionId - the Session to restore.
     */
    async function unarchiveSuperSession(ctx, sessionId) {
      if (!archivedSessions(ctx).has(sessionId)) return
      try {
        const workspaces = ctx.get('workspaces')
        const unarchive = workspaces && workspaces.unarchiveSession
        if (typeof unarchive !== 'function') return
        await unarchive.call(workspaces, sessionId)
      } catch (_reason) {
        // An archived Session still opens; only its listing stays hidden.
      }
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
     * Create the super session inside the built-in Workspace on the personal
     * preset, addressed by the Workspace and by its fixed id. The Host resolves
     * the directory from the Workspace, creates or reuses the named blank
     * Session, and attaches it before answering — attachment is what lets the
     * Conversation accept input. `cwd` is deliberately absent: the Host rejects
     * `workspaceId` and `cwd` together with `gateway/bad-request`.
     * @param {any} sessions - Session Controller service.
     * @param {string} workspaceId - the built-in Workspace's identity.
     * @param {(key: string, params?: Record<string, unknown>) => string} t - bound translate.
     * @returns The created or reused Session id, which may differ from the fixed id.
     */
    async function createSuperSession(sessions, workspaceId, t) {
      const target = { workspaceId, sessionId: SUPER_SESSION_ID }
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
     * Put the super session back on its preset while it is still blank.
     *
     * As an ordinary member of the built-in Workspace, the Session can be reused
     * by a plain "new session" click in that Workspace, which applies the
     * current default preset to it. `sessions.create` with the same id and
     * `personal` is how the Host applies a preset to a blank Session: it resumes
     * the Session, records the selection, and returns the same id — the same
     * call DSH itself makes to restore a blank draft on startup. A Session that
     * already started a turn is never passed here (it is not blank, and the Host
     * would mint a new identity instead of changing it), and a refusal simply
     * leaves the recorded preset in place, so the whole repair is best effort.
     * @param {any} sessions - Session Controller service.
     * @param {string} workspaceId - the built-in Workspace's identity.
     * @returns True when the Host answered with the fixed id.
     */
    async function restorePreset(sessions, workspaceId) {
      try {
        const restored = await sessions.create({
          workspaceId,
          sessionId: SUPER_SESSION_ID,
          agentPreset: AGENT_PRESET,
        })
        return restored === SUPER_SESSION_ID
      } catch (_reason) {
        return false
      }
    }

    /**
     * Open the one super session, creating it on the first visit.
     *
     * Resolution is the fixed id or nothing. A Session an earlier version
     * created in the built-in Workspace under a minted id is deliberately not
     * adopted: the client Workspace service exposes no attach or detach call
     * (`archiveSession`, `unarchiveSession`, `pinSession`,
     * `insertSessionBefore` are the membership verbs), and an adopted id could
     * not be recognized again on the next launch. It keeps its history as an
     * ordinary member of that Workspace. The fixed id is the only identity, and
     * the Host half attaches it to the Workspace once at startup for the
     * versions that created it outside.
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
      // Whether the fixed id already exists is the list's answer, so refresh it
      // first: a stale snapshot would ask the Host to create a Session it
      // already holds, and the Host answers a started Session with a new id.
      await refreshSessions(sessions)
      // The Workspace list is the other half of the answer: it says whether the
      // fixed Session is a member, which is what lets the composer take input.
      const workspace = findSuperWorkspace(ctx)
      const listed = listedSession(ctx, SUPER_SESSION_ID)
      const blank = listed !== undefined && listed.blank === true
      let sessionId
      if (listed !== undefined) {
        sessionId = SUPER_SESSION_ID
        // A blank Session outside every Workspace gets an inert composer that
        // asks the user to pick a Workspace, and only the Host can attach one,
        // so say what repairs it instead of opening a page that cannot be typed
        // into. The Host half attaches this Session once at startup.
        if (blank && workspaceListReady(ctx) && !memberOf(workspace, SUPER_SESSION_ID)) {
          throw new Error(t(workspace === undefined ? 'error.notReady' : 'error.notAttached'))
        }
      } else {
        const workspaceId = workspace && workspace.workspaceId
        if (typeof workspaceId !== 'string' || workspaceId === '') {
          throw new Error(t('error.notReady'))
        }
        sessionId = await createSuperSession(sessions, workspaceId, t)
        if (sessionId !== SUPER_SESSION_ID) {
          // The Host minted an identity instead of using the fixed one, so the
          // list held the fixed id after all: rescan and prefer it rather than
          // opening the Session that was just minted.
          await refreshSessions(sessions)
          if (listedSession(ctx, SUPER_SESSION_ID) !== undefined) sessionId = SUPER_SESSION_ID
        }
      }
      if (!stillHere()) return
      // Archiving hides the Session from the sidebar even though the Session
      // list still carries the id; a click restores it before the open. This
      // also has to come before the preset repair, because the Host only reuses
      // an unarchived blank Session.
      if (sessionId === SUPER_SESSION_ID) await unarchiveSuperSession(ctx, sessionId)
      // The ordinary new-session path of this Workspace can reuse the blank
      // Session and apply the current default preset; put it back while the Host
      // still may, and never touch a Session that already ran a turn.
      if (blank && sessionId === SUPER_SESSION_ID && recordedPreset(listed) !== AGENT_PRESET) {
        const workspaceId = workspace && workspace.workspaceId
        if (typeof workspaceId === 'string' && workspaceId !== '') await restorePreset(sessions, workspaceId)
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
      // Only now does the Session have a binding: opening retained it. The
      // title is cosmetic, so a failed rename is ignored.
      await renameSession(sessions, sessionId, t('session.title'))
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, DICTIONARIES), 'dsh-super-session: dictionaries')
        const t = ctx.locale.bind(NS)

        // Hide the built-in Workspace's sidebar group: the session is entered
        // from the panel row above, so a group of its own is noise. Waiting for
        // the service instead of naming it in `inject` keeps the panel row alive
        // on a client composition that has no Workspace controller.
        ctx.inject(['workspaces'], (scope) => {
          scope.effect(
            () => hideBuiltInWorkspaceGroup(scope),
            'dsh-super-session: hide built-in workspace group',
          )
        })

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
