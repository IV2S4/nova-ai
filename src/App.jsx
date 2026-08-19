import React, { useEffect, useRef, useState } from 'react'
import Sidebar from './components/Sidebar.jsx'
import ChatView from './components/ChatView.jsx'
import CompareView from './components/CompareView.jsx'
import AgentView from './components/AgentView.jsx'
import SettingsModal from './components/SettingsModal.jsx'
import ChangelogModal from './components/ChangelogModal.jsx'
import { uid } from './api.js'

export default function App() {
  const [providers, setProviders] = useState([])
  const [settings, setSettings] = useState(null)
  const [convos, setConvos] = useState([])
  const [view, setView] = useState('chat')
  const [activeId, setActiveId] = useState(null)
  const [conv, setConv] = useState(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [showChangelog, setShowChangelog] = useState(false)
  const [appInfo, setAppInfo] = useState({ version: '', entries: {} })
  const [ready, setReady] = useState(false)
  const [toast, setToast] = useState(null)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [paletteQ, setPaletteQ] = useState('')
  const [paletteIdx, setPaletteIdx] = useState(0)
  const streamsRef = useRef(new Map())
  const convRef = useRef(null)
  const saveTimer = useRef(null)
  const toastTimer = useRef(null)

  const notify = (msg) => {
    setToast({ id: Date.now(), msg })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    if (!window.api) {
      setReady(true)
      return
    }
    ;(async () => {
      const info = await window.api.getAppInfo()
      setAppInfo(info)
      const s = await window.api.getSettings()
      setSettings(s)
      if (s.lastSeenVersion !== info.version) setShowChangelog(true)
      const p = await window.api.getProviders()
      setProviders(p)
      const h = await window.api.listHistory()
      setConvos(h)
      if (h.length > 0) {
        const c = await window.api.getHistory(h[0].id)
        if (c) {
          setConv(c)
          setActiveId(c.id)
        } else {
          createLocal(h, p)
        }
      } else {
        createLocal([], p)
      }
      setReady(true)
    })()

    const unsub = window.api?.onChatEvent((ev) => {
      const h = streamsRef.current.get(ev.id)
      if (!h) return
      if (ev.type === 'chunk') h.onDelta(ev.text)
      else if (ev.type === 'image') h.onImage?.(ev)
      else if (ev.type === 'reasoning') h.onReasoning?.(ev)
      else if (ev.type === 'done') {
        streamsRef.current.delete(ev.id)
        h.onDone()
      } else if (ev.type === 'stopped') {
        streamsRef.current.delete(ev.id)
        h.onStopped?.()
      } else if (ev.type === 'error') {
        streamsRef.current.delete(ev.id)
        h.onError(ev.message)
      }
    })
    const unsubUpd = window.api?.onUpdateInfo?.((info) => {
      if (info?.latest) notify(`Nueva versión v${info.latest} disponible. Ajustes → Buscar actualizaciones`)
    })
    return () => { unsub?.(); unsubUpd?.() }
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const apply = () => {
      const t = settings?.theme === 'system' ? (mq.matches ? 'light' : 'dark') : settings?.theme
      document.documentElement.setAttribute('data-theme', t === 'light' ? 'light' : 'dark')
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [settings?.theme])

  const newChatRef = useRef(() => {})

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') { e.preventDefault(); newChatRef.current() }
      if ((e.ctrlKey || e.metaKey) && e.key === ',') { e.preventDefault(); setSettingsOpen(true) }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        if (!settingsOpen && !showChangelog) setPaletteOpen((o) => !o)
      }
      if (e.key === 'Escape' && paletteOpen) setPaletteOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [settingsOpen, showChangelog, paletteOpen])

  const makeConv = (p) => {
    const def = p.find((x) => x.hasKey)
    return {
      id: uid(),
      title: 'Nueva conversación',
      provider: def?.id || 'openai',
      model: def?.models?.[0] || (def?.id === 'ollama' ? 'llama3.3' : ''),
      system: '',
      temperature: 0.7,
      pinned: false,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  }

  const createLocal = (h, p) => {
    const c = makeConv(p)
    setConv(c)
    setActiveId(c.id)
    setConvos([...h, { id: c.id, title: c.title, provider: c.provider, model: c.model, createdAt: c.createdAt, updatedAt: c.updatedAt, count: 0, pinned: false, folder: '' }])
  }

  const busy = () => streamsRef.current.size > 0

  const changeView = (v) => {
    if (busy() && v !== view) {
      notify('Detén la respuesta en curso para cambiar de vista')
      return
    }
    setView(v)
  }

  const newChat = () => {
    if (busy()) { notify('Detén la respuesta en curso para abrir un chat nuevo'); return }
    createLocal(convos, providers)
  }
  newChatRef.current = newChat

  const setConvBoth = (c) => {
    convRef.current = c
    setConv(c)
  }

  const updateConv = (next) => {
    const resolved = typeof next === 'function' ? next(convRef.current) : next
    setConvBoth(resolved)
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      if (!window.api) return
      await window.api.saveHistory(resolved)
      const item = {
        id: resolved.id, title: resolved.title, provider: resolved.provider, model: resolved.model,
        createdAt: resolved.createdAt, updatedAt: resolved.updatedAt, count: resolved.messages.length, pinned: !!resolved.pinned, folder: resolved.folder || ''
      }
      setConvos((h) => {
        const exists = h.some((c) => c.id === resolved.id)
        return exists ? h.map((c) => (c.id === resolved.id ? item : c)) : [item, ...h]
      })
    }, 900)
  }

  const selectConvo = async (id) => {
    if (id === activeId) return
    if (busy()) { notify('Detén la respuesta en curso para cambiar de conversación'); return }
    if (convRef.current) window.api?.saveHistory(convRef.current)
    const c = await window.api.getHistory(id)
    if (c) {
      setConvBoth(c)
      setActiveId(id)
    }
  }

  const deleteConvo = async (id) => {
    if (busy()) { notify('Detén la respuesta en curso para eliminar conversaciones'); return }
    await window.api.deleteHistory(id)
    setConvos((h) => h.filter((c) => c.id !== id))
    if (id === activeId) {
      const rest = convos.filter((c) => c.id !== id)
      if (rest.length) {
        const c = await window.api.getHistory(rest[0].id)
        if (c) { setConvBoth(c); setActiveId(c.id) }
        else newChat()
      } else {
        newChat()
      }
    }
  }

  const clearHistory = async () => {
    if (busy()) { notify('Detén la respuesta en curso para borrar el historial'); return }
    for (const c of convos) await window.api.deleteHistory(c.id)
    setConvos([])
    createLocal([], providers)
  }

  const togglePin = (id) => {
    if (id === activeId && convRef.current) {
      updateConv({ ...convRef.current, pinned: !convRef.current.pinned, updatedAt: Date.now() })
      return
    }
    window.api.getHistory(id).then((c) => {
      if (c) {
        c.pinned = !c.pinned
        c.updatedAt = Date.now()
        window.api.saveHistory(c)
      }
    })
    setConvos((h) => h.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c)))
  }

  const setFolder = (id, folder) => {
    const apply = (c) => {
      c.folder = folder || ''
      c.updatedAt = Date.now()
      window.api.saveHistory(c)
    }
    if (id === activeId && convRef.current) {
      updateConv({ ...convRef.current, folder: folder || '', updatedAt: Date.now() })
      return
    }
    window.api.getHistory(id).then((c) => { if (c) apply(c) })
    setConvos((h) => h.map((c) => (c.id === id ? { ...c, folder: folder || '' } : c)))
  }

  const removeFolder = (folder) => {
    for (const c of convos.filter((x) => x.folder === folder)) {
      if (c.id === activeId && convRef.current) updateConv({ ...convRef.current, folder: '' })
      else {
        window.api.getHistory(c.id).then((x) => { if (x) { x.folder = ''; window.api.saveHistory(x) } })
      }
    }
    setConvos((h) => h.map((c) => (c.folder === folder ? { ...c, folder: '' } : c)))
  }

  const renameConvo = (id, title) => {
    if (id === activeId && convRef.current) {
      updateConv({ ...convRef.current, title, updatedAt: Date.now() })
      return
    }
    window.api.getHistory(id).then((c) => {
      if (c) {
        c.title = title
        c.updatedAt = Date.now()
        window.api.saveHistory(c)
      }
    })
    setConvos((h) => h.map((c) => (c.id === id ? { ...c, title, updatedAt: Date.now() } : c)))
  }

  const runRequest = (cfg, handlers) => {
    const id = uid()
    streamsRef.current.set(id, handlers)
    window.api.sendChat({ id, ...cfg })
    return id
  }

  const stopRequest = (id) => window.api.stopChat(id)

  const refreshProviders = async () => {
    const s = await window.api.getSettings()
    setSettings(s)
    const p = window.api.reloadProviders ? await window.api.reloadProviders() : await window.api.getProviders()
    setProviders(p)
  }

  const onSavedSettings = async (s) => {
    setSettings(s)
    const p = await window.api.getProviders()
    setProviders(p)
  }

  const closeChangelog = () => {
    setShowChangelog(false)
    window.api.saveSettings({ lastSeenVersion: appInfo.version })
    setSettings((s) => ({ ...s, lastSeenVersion: appInfo.version }))
  }

  if (!window.api) {
    return (
      <div className="fatal">
        <h2>Esta app debe ejecutarse con Electron</h2>
        <p>Ejecuta <code>npm start</code> dentro de la carpeta de la app.</p>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="fatal">
        <div className="spinner-big" />
        <p>Cargando Nova AI…</p>
      </div>
    )
  }

  const configuredCount = providers.filter((p) => p.hasKey).length

  return (
    <div className="app">
      <Sidebar
        convos={convos}
        activeId={activeId}
        view={view}
        onNew={newChat}
        onSelect={selectConvo}
        onDelete={deleteConvo}
        onRename={renameConvo}
        onTogglePin={togglePin}
        onSetFolder={setFolder}
        onRemoveFolder={removeFolder}
        onViewChange={changeView}
        onOpenSettings={() => setSettingsOpen(true)}
        providers={providers}
        configuredCount={configuredCount}
      />
      <main className="main">
        {view === 'chat' ? (
          <ChatView
            key={activeId}
            conv={conv}
            updateConv={updateConv}
            providers={providers}
            runRequest={runRequest}
            stopRequest={stopRequest}
            settings={settings}
            onOpenSettings={() => setSettingsOpen(true)}
            onSaveSettings={onSavedSettings}
            hasAnyProvider={configuredCount > 0}
            onReloadProviders={refreshProviders}
            notify={notify}
            convos={convos}
            onViewChange={changeView}
          />
        ) : view === 'agent' ? (
          <AgentView
            providers={providers}
            settings={settings}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        ) : (
          <CompareView
            providers={providers}
            runRequest={runRequest}
            stopRequest={stopRequest}
            onOpenSettings={() => setSettingsOpen(true)}
            notify={notify}
          />
        )}
      </main>
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        providers={providers}
        settings={settings}
        onSaved={onSavedSettings}
        testProvider={(id) => window.api.testProvider(id)}
        onClearHistory={clearHistory}
        currentVersion={appInfo.version}
        onShowChangelog={() => setShowChangelog(true)}
      />
      <ChangelogModal
        open={showChangelog}
        onClose={closeChangelog}
        entries={appInfo.entries}
        currentVersion={appInfo.version}
      />
      {toast && <div className="toast" key={toast.id}>{toast.msg}</div>}
      {paletteOpen && (
        <Palette
          convos={convos}
          activeId={activeId}
          query={paletteQ}
          setQuery={setPaletteQ}
          idx={paletteIdx}
          setIdx={setPaletteIdx}
          onClose={() => { setPaletteOpen(false); setPaletteQ('') }}
          onNewChat={() => { newChat(); setPaletteOpen(false); setPaletteQ('') }}
          onView={(v) => { changeView(v); setPaletteOpen(false); setPaletteQ('') }}
          onOpenSettings={() => { setSettingsOpen(true); setPaletteOpen(false); setPaletteQ('') }}
          onChangelog={() => { setShowChangelog(true); setPaletteOpen(false); setPaletteQ('') }}
          onSelectConvo={async (id) => { await selectConvo(id); setPaletteOpen(false); setPaletteQ('') }}
          onExport={() => {
            window.dispatchEvent(new CustomEvent('nova:export'))
            setPaletteOpen(false)
            setPaletteQ('')
          }}
        />
      )}
    </div>
  )
}

function Palette({ convos, activeId, query, setQuery, idx, setIdx, onClose, onNewChat, onView, onOpenSettings, onChangelog, onSelectConvo, onExport }) {
  const inputRef = useRef(null)
  const listRef = useRef(null)
  useEffect(() => inputRef.current?.focus(), [])
  useEffect(() => {
    if (listRef.current?.children[idx]) listRef.current.children[idx].scrollIntoView({ block: 'nearest' })
  }, [idx])

  const commands = [
    { id: 'new', label: 'Nueva conversación', hint: 'Ctrl+N', run: onNewChat },
    { id: 'chat', label: 'Ir al chat', hint: '', run: () => onView('chat') },
    { id: 'compare', label: 'Comparador de modelos', hint: '', run: () => onView('compare') },
    { id: 'agent', label: 'Agente de código', hint: '', run: () => onView('agent') },
    { id: 'export', label: 'Exportar conversación', hint: 'MD', run: onExport },
    { id: 'settings', label: 'Ajustes', hint: 'Ctrl+,', run: onOpenSettings },
    { id: 'changelog', label: 'Ver novedades', hint: '', run: onChangelog }
  ]
  const q = query.trim().toLowerCase()
  const found = commands.filter((c) => c.label.toLowerCase().includes(q) || (c.hint || '').toLowerCase().includes(q))
  const foundConvos = convos
    .filter((c) => c.id !== activeId && c.title.toLowerCase().includes(q))
    .slice(0, 6)
  const items = [
    ...found.map((c) => ({ kind: 'cmd', ...c })),
    ...foundConvos.map((c) => ({ kind: 'conv', id: c.id, label: c.title, hint: `${c.count} msgs`, run: () => onSelectConvo(c.id) }))
  ]

  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(i + 1, items.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter' && items[idx]) { e.preventDefault(); items[idx].run() }
    else if (e.key === 'Escape') onClose()
  }

  return (
    <div className="palette-overlay" onMouseDown={onClose}>
      <div className="palette" onMouseDown={(e) => e.stopPropagation()}>
        <div className="palette-search">
          <Search size={15} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setIdx(0) }}
            onKeyDown={onKey}
            placeholder="Comandos o buscar conversaciones…"
          />
          <span className="kbd">ESC</span>
        </div>
        <div className="palette-list" ref={listRef}>
          {items.length === 0 && <div className="palette-empty">Sin resultados</div>}
          {items.map((it, i) => (
            <div key={`${it.kind}-${it.id}`} className={`palette-item ${i === idx ? 'active' : ''}`} onMouseEnter={() => setIdx(i)} onMouseDown={() => it.run()}>
              <span className="palette-label">{it.label}</span>
              <span className="palette-hint">{it.hint}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}