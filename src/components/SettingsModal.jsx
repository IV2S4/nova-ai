import React, { useEffect, useState } from 'react'
import { X, KeyRound, Eye, EyeOff, Save, Trash2, CheckCircle2, XCircle, Loader2, ExternalLink, Volume2, Sparkles, Download, Upload, Brain, Plus, Play, RefreshCw, Plug, Server } from 'lucide-react'
import i18n from '../i18n.js'

export default function SettingsModal({ open, onClose, providers, settings, onSaved, testProvider, onClearHistory, currentVersion, onShowChangelog }) {
  const [draft, setDraft] = useState(null)
  const [tests, setTests] = useState({})
  const [saved, setSaved] = useState(false)
  const [voices, setVoices] = useState([])
  const [showKey, setShowKey] = useState({})
  const [memData, setMemData] = useState(null)
  const [memText, setMemText] = useState('')
  const [updState, setUpdState] = useState(null)
  const [projects, setProjects] = useState(null)
  const [newProject, setNewProject] = useState('')
  const [projBusy, setProjBusy] = useState(false)
const [projectRules, setProjectRules] = useState('')
  const [savingRules, setSavingRules] = useState(false)
  const [rulesStatus, setRulesStatus] = useState('')
  const [mcpServers, setMcpServers] = useState([])
  const [mcpStatus, setMcpStatus] = useState('')
  const [mcpTesting, setMcpTesting] = useState('')

  const workspace = settings?.agent?.workspace || ''

  const loadRules = async () => {
    if (!workspace) return
    const r = await window.api.readWorkspaceRules(workspace)
    if (r?.ok) { setProjectRules(r.rules); setRulesStatus('Cargado') }
    else { setRulesStatus(r?.error || 'Error al cargar') }
    setTimeout(() => setRulesStatus(''), 3000)
  }

const saveRules = async () => {
    if (!workspace) return
    setSavingRules(true)
    const r = await window.api.writeWorkspaceRules(workspace, projectRules)
    setSavingRules(false)
    setRulesStatus(r?.ok ? 'Guardado ✓' : (r?.error || 'Error al guardar'))
    setTimeout(() => setRulesStatus(''), 3000)
  }

  const loadMcp = async () => {
    const r = await window.api?.mcpList()
    if (r?.ok) setMcpServers(r.servers)
  }

  const saveMcp = async () => {
    setMcpStatus('Guardando…')
    const r = await window.api?.mcpSave(mcpServers)
    if (r?.ok) {
      setMcpServers(r.servers)
      onSaved(r.settings)
      setMcpStatus('Guardado ✓ (los servidores se reinician)')
    } else {
      setMcpStatus(r?.error || 'Error al guardar')
    }
    setTimeout(() => setMcpStatus(''), 3500)
  }

  const testMcp = async (idx) => {
    const s = mcpServers[idx]
    if (!s?.command) return
    setMcpTesting(idx)
    const r = await window.api?.mcpTools(s)
    setMcpTesting('')
    if (r?.ok) setMcpStatus(`Servidor OK — ${r.tools.length} herramientas: ${r.tools.map((t) => t.name).slice(0, 8).join(', ')}${r.tools.length > 8 ? '…' : ''}`)
    else setMcpStatus(r?.error || 'Error al conectar')
    setTimeout(() => setMcpStatus(''), 6000)
  }

  const updateMcp = (idx, key, val) => {
    setMcpServers((prev) => prev.map((s, i) => (i === idx ? { ...s, [key]: val } : s)))
  }

  useEffect(() => {
    if (open) {
      setDraft(JSON.parse(JSON.stringify(settings)))
      setTests({})
      setSaved(false)
      window.api?.getMemory().then(setMemData)
      const load = () => setVoices(window.speechSynthesis?.getVoices() || [])
      load()
      window.speechSynthesis?.addEventListener('voiceschanged', load)
      refreshProjects()
      loadRules()
      loadMcp()
      return () => window.speechSynthesis?.removeEventListener('voiceschanged', load)
    }
  }, [open])

  const refreshProjects = async () => {
    const r = await window.api.projectList()
    setProjects(r?.ok ? r.projects : [])
  }

  const syncProjectsSetting = async (list) => {
    const saved = await window.api.saveSettings({ projects: list.map((p) => ({ id: p.id, name: p.name })) })
    onSaved(saved)
  }

  if (!open || !draft) return null

  const set = (path, value) => {
    setDraft((d) => {
      const copy = JSON.parse(JSON.stringify(d))
      const parts = path.split('.')
      let o = copy
      for (let i = 0; i < parts.length - 1; i++) o = o[parts[i]]
      o[parts[parts.length - 1]] = value
      return copy
    })
  }

const save = async () => {
    const savedSettings = await window.api.saveSettings(draft)
    onSaved(savedSettings)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const saveTemplates = async (next) => {
    set('templates', next)
    const s = await window.api.saveSettings({ templates: next })
    onSaved(s)
  }

  const saveTuning = async (id, patch) => {
    const next = { ...(draft.tuning || {}), [id]: { ...(draft.tuning?.[id] || {}), ...patch } }
    set('tuning', next)
    const s = await window.api.saveSettings({ tuning: next })
    onSaved(s)
  }

  const runTest = async (id) => {
    setTests((t) => ({ ...t, [id]: { loading: true } }))
    try {
      const r = await testProvider(id)
      setTests((t) => ({ ...t, [id]: r }))
    } catch (e) {
      setTests((t) => ({ ...t, [id]: { ok: false, error: e.message || 'Error de prueba' } }))
    }
  }

const checkUpdates = async () => {
    setUpdState({ loading: true })
    const r = await window.api.checkUpdates()
    setUpdState(r)
    if (r?.ok && r.updateAvailable) {
      if (confirm(`Nueva versión v${r.latest} disponible.\n\n${r.notes || 'Descarga la última versión desde GitHub.'}\n\n¿Descargar e instalar automáticamente? (Pulsa Cancelar para abrir la página de descarga)`)) {
        const res = await window.api.installUpdate()
        if (res?.ok) setUpdState({ loading: false, ok: true, updateAvailable: false, message: 'Actualización descargada. Se instalará al reiniciar la app.' })
        else setUpdState({ loading: false, ok: false, updateAvailable: true, latest: r.latest, error: res?.error || 'No se pudo descargar (solo disponible en la app instalada).' })
      } else {
        window.open(r.url, '_blank')
        window.api.ignoreUpdate(r.latest)
      }
    }
  }

  const startLocal = async (id) => {
    setTests((t) => ({ ...t, [id]: { loading: true } }))
    try {
      const r = await window.api.startLocalServer(id)
      setTests((t) => ({ ...t, [id]: r }))
    } catch (e) {
      setTests((t) => ({ ...t, [id]: { ok: false, error: e.message || 'Error al arrancar el servidor' } }))
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Ajustes</h2>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-body">
          <h3>Proveedores de IA</h3>
          <p className="hint">Tu API key se guarda solo en este equipo (no se sube a ninguna parte).</p>

          {providers.map((p) => (
            <div key={p.id} className="provider-card">
              <div className="provider-card-head">
                <span className="provider-dot" style={{ background: p.color }} />
                <strong>{p.name}</strong>
                {p.local && <span className="badge">local · gratis</span>}
                {p.live && !p.local && <span className="badge">centenares de modelos</span>}
                {!p.local && (
                  <a className="link" href={p.docs} target="_blank" rel="noreferrer">
                    Obtener clave <ExternalLink size={11} />
                  </a>
                )}
              </div>
              <div className="key-row">
                <div className="key-input">
                  <KeyRound size={14} />
                  <input
                    type={showKey[p.id] ? 'text' : 'password'}
                    value={draft.providers?.[p.id]?.apiKey || ''}
                    onChange={(e) => set(`providers.${p.id}.apiKey`, e.target.value)}
                    placeholder={
                      p.local
                        ? 'Opcional: añade una clave solo si tu servidor local la pide'
                        : p.hasKey
                          ? '••••••••  (clave guardada)'
                          : `Pega tu API key de ${p.name}`
                    }
                  />
                  <button className="icon-btn" onClick={() => setShowKey((s) => ({ ...s, [p.id]: !s[p.id] }))}>
                    {showKey[p.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <button className="btn" disabled={tests[p.id]?.loading} onClick={() => runTest(p.id)}>
                  {tests[p.id]?.loading ? <Loader2 size={13} className="spin" /> : 'Probar'}
                </button>
                {p.id === 'openaicompat' && (
                  <div className="key-row" style={{ marginBottom: 8, flexDirection: 'column', alignItems: 'stretch' }}>
                    <div className="key-input">
                      <ExternalLink size={14} />
                      <input
                        type="text"
                        value={draft.providers?.openaicompat?.base || ''}
                        onChange={(e) => set('providers.openaicompat.base', e.target.value)}
                        placeholder="URL de tu servidor, p. ej. http://localhost:8080/v1"
                      />
                    </div>
                    <div className="local-presets">
                      {[
                        ['llama.cpp', 'http://localhost:8080/v1'],
                        ['Jan', 'http://localhost:1337/v1'],
                        ['GPT4All', 'http://localhost:4891/v1'],
                        ['LM Studio', 'http://localhost:1234/v1'],
                      ].map(([label, url]) => (
                        <button
                          key={url}
                          className="chip-btn"
                          onClick={() => set('providers.openaicompat.base', url)}
                          title={`Usar ${label} (${url})`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
{(p.id === 'ollama' || p.id === 'lmstudio') && (
                  <button className="btn" disabled={tests[p.id]?.loading} onClick={() => startLocal(p.id)} title={`Arranca el servidor local de ${p.name} automáticamente`}>
                    <Play size={13} /> Iniciar servidor
                  </button>
                )}
              </div>
              <div className="key-row" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
                <div className="row-slider" style={{ flex: 1, minWidth: 200 }}>
                  <span>Temperatura</span>
                  <input
                    type="range" min="0" max="2" step="0.1"
                    value={draft.tuning?.[p.id]?.temperature ?? 0.7}
                    onChange={(e) => saveTuning(p.id, { temperature: parseFloat(e.target.value) })}
                  />
                  <span>{draft.tuning?.[p.id]?.temperature != null ? draft.tuning[p.id].temperature : 'Automático'}</span>
                </div>
                <div className="key-input" style={{ maxWidth: 240 }}>
                  <Sparkles size={14} />
                  <input
                    type="number" min="256" step="256"
                    value={draft.tuning?.[p.id]?.maxTokens ?? ''}
                    placeholder="Máx. tokens por respuesta (automático)"
                    onChange={(e) => saveTuning(p.id, { maxTokens: e.target.value ? parseInt(e.target.value, 10) : null })}
                  />
                </div>
                <button className="icon-btn" title="Restablecer temperatura y tokens (automático)" onClick={() => saveTuning(p.id, { temperature: null, maxTokens: null })}>
                  <RefreshCw size={13} />
                </button>
              </div>
              {p.id === 'openaicompat' ? (
                <p className="hint">Funciona con <b>Jan</b> (puerto 1337), <b>GPT4All</b> (4891), <b>llama.cpp</b>, <b>llamafile</b>, <b>LocalAI</b>, <b>vLLM</b> y cualquier servidor OpenAI-compatible. Escribe su URL, guarda y pulsa Probar.</p>
              ) : p.local ? (
                <p className="hint">{p.id === 'ollama' ? 'Gratis y sin clave. Descarga Ollama, instala un modelo (ollama pull llama3.3) y listo.' : 'Servidor local con modelos propios (OpenAI-compatible).'}</p>
              ) : null}
              {tests[p.id] && !tests[p.id].loading && (
                <div className={`test-result ${tests[p.id].ok ? 'ok' : 'err'}`}>
                  {tests[p.id].ok ? <CheckCircle2 size={13} /> : <XCircle size={13} />} {tests[p.id].message || tests[p.id].error || 'Sin respuesta'}
                </div>
              )}
            </div>
          ))}

          <h3>Búsqueda web</h3>
          <div className="provider-card">
            <div className="provider-card-head">
              <span className="provider-dot" style={{ background: '#4a8cff' }} />
              <strong>Tavily (recomendada)</strong>
              <a className="link" href="https://tavily.com" target="_blank" rel="noreferrer">Obtener clave gratis <ExternalLink size={11} /></a>
            </div>
            <div className="key-row">
              <div className="key-input">
                <KeyRound size={14} />
                <input
                  type="password"
                  value={draft.tavily?.apiKey || ''}
                  onChange={(e) => set('tavily.apiKey', e.target.value)}
                  placeholder="Clave de Tavily (opcional; sin ella se usa DuckDuckGo)"
                />
              </div>
            </div>
            <p className="hint">Sin clave, la app usa DuckDuckGo (gratis, resultados limitados).</p>
          </div>

          <h3>Voz</h3>
          <div className="provider-card">
            <label className="row-check">
              <input type="checkbox" checked={draft.voice?.enabled || false} onChange={(e) => set('voice.enabled', e.target.checked)} />
              <Volume2 size={15} /> Responder en voz con cada respuesta
            </label>
            <div className="row-slider">
              <span>Velocidad</span>
              <input type="range" min="0.5" max="2" step="0.1" value={draft.voice?.rate ?? 1} onChange={(e) => set('voice.rate', parseFloat(e.target.value))} />
              <span>{draft.voice?.rate ?? 1}x</span>
            </div>
            {voices.length > 0 && (
              <div className="row-slider">
                <span>Voz</span>
                <select value={draft.voice?.voice || ''} onChange={(e) => set('voice.voice', e.target.value)}>
                  <option value="">Automática</option>
                  {voices.map((v) => <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>)}
                </select>
              </div>
            )}
            <p className="hint">El dictado por micrófono usa Whisper de OpenAI (requiere API key de OpenAI).</p>
          </div>

          <h3>Memoria</h3>
          <div className="provider-card">
            <label className="row-check">
              <input type="checkbox" checked={draft.memory?.enabled !== false} onChange={(e) => set('memory.enabled', e.target.checked)} />
              <Brain size={15} /> Usar memoria en los chats y en el Agente IA
            </label>
            <p className="hint">
              La app aprende de tus conversaciones tu idioma y tu estilo (directo, detallado, breve…), compacta los chats largos para que no pierdas el hilo, y aplica estos recuerdos en cada mensaje.
            </p>
            {memData?.profile?.tags?.length > 0 && (
              <div className="memory-profile">
                {memData.profile.language && <span className="badge">{memData.profile.language === 'es' ? 'Español' : memData.profile.language === 'en' ? 'Inglés' : 'Mixto'}</span>}
                {memData.profile.tags.map((t) => <span key={t} className="badge">{t}</span>)}
              </div>
            )}
            <div className="memory-row">
              <input
                className="memory-input"
                value={memText}
                onChange={(e) => setMemText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && memText.trim()) {
                    window.api.addMemory(memText, 'manual').then(() => { setMemText(''); window.api.getMemory().then(setMemData) })
                  }
                }}
                placeholder="Añade un recuerdo: «Prefiero explicaciones cortas» o «Mi proyecto usa React»"
              />
              <button
                className="btn"
                disabled={!memText.trim()}
                onClick={() => {
                  window.api.addMemory(memText, 'manual').then(() => { setMemText(''); window.api.getMemory().then(setMemData) })
                }}
              >
                <Plus size={14} /> Añadir
              </button>
            </div>
            {(memData?.entries || []).length > 0 && (
              <div className="memory-list">
                {(memData.entries || []).map((en) => (
                  <div key={en.id} className="memory-item">
                    <span className="memory-text">{en.text}</span>
                    <button className="icon-btn" onClick={() => window.api.deleteMemory(en.id).then(() => window.api.getMemory().then(setMemData))} title="Olvidar">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="hint">Consejo: escribe «recuerda que…» en cualquier chat y la app lo guardará automáticamente como recuerdo.</p>
          </div>

          <h3>Proyectos de conocimiento</h3>
          <div className="provider-card">
            <p className="hint">Añade archivos (código, docs, PDFs) de tu proyecto: el chat los buscará automáticamente y responderá con ese contexto, como un RAG local. Todo se queda en tu equipo.</p>
            {(projects || []).length === 0 && <p className="hint">Todavía no hay proyectos. Crea uno abajo y añádele archivos.</p>}
            {(projects || []).map((p) => (
              <div key={p.id} className="project-row">
                <div className="project-info">
                  <strong>{p.name}</strong>
                  <span className="project-meta">{p.files} archivos · {p.chunks} fragmentos</span>
                </div>
                <div className="project-actions">
                  <button
                    className="btn small"
                    disabled={projBusy}
                    onClick={async () => {
                      setProjBusy(true)
                      const paths = await window.api.projectPickFiles()
                      if (paths.length) {
                        const r = await window.api.projectAddFiles({ id: p.id, paths })
                        if (r?.ok) {
                          const bad = r.added.filter((a) => !a.ok)
                          if (bad.length) alert(`${r.added.length - bad.length} archivo(s) añadidos.\n\nNo se pudieron indexar:\n${bad.map((b) => `${b.name}: ${b.error || 'sin texto'}`).join('\n')}`)
                        }
                        await refreshProjects()
                      }
                      setProjBusy(false)
                    }}
                  >
                    <Plus size={13} /> Añadir archivos
                  </button>
                  <button
                    className="btn small"
                    onClick={async () => {
                      const idx = await window.api.projectIndex(p.id)
                      const names = idx?.ok ? idx.files.map((f) => f.name) : []
                      if (!names.length) { alert('Este proyecto no tiene archivos indexados.'); return }
                      const name = prompt(`Eliminar archivo del proyecto "${p.name}":\n${names.map((n) => `- ${n}`).join('\n')}`, names[0])
                      if (name) {
                        await window.api.projectRemoveFile({ id: p.id, fileName: name })
                        await refreshProjects()
                      }
                    }}
                  >
                    <Trash2 size={13} /> Quitar archivo
                  </button>
                  <button
                    className="icon-btn danger"
                    title="Eliminar proyecto"
                    onClick={async () => {
                      if (!confirm(`¿Eliminar el proyecto de conocimiento "${p.name}"? Se borrará su índice.`)) return
                      await window.api.projectDelete(p.id)
                      await refreshProjects()
                      await syncProjectsSetting((projects || []).filter((x) => x.id !== p.id))
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
            <div className="project-create">
              <input
                className="tpl-name project-name-input"
                value={newProject}
                placeholder="Nombre del proyecto (ej. manual-api)"
                onChange={(e) => setNewProject(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter' && newProject.trim()) {
                    const r = await window.api.projectCreate(newProject.trim())
                    if (r?.ok) {
                      const next = [...(projects || []), r.project]
                      setProjects(next)
                      await syncProjectsSetting(next)
                      setNewProject('')
                    } else {
                      alert(r?.error || 'No se pudo crear el proyecto')
                    }
                  }
                }}
              />
              <button
                className="btn"
                disabled={!newProject.trim()}
                onClick={async () => {
                  const r = await window.api.projectCreate(newProject.trim())
                  if (r?.ok) {
                    const next = [...(projects || []), r.project]
                    setProjects(next)
                    await syncProjectsSetting(next)
                    setNewProject('')
                  } else {
                    alert(r?.error || 'No se pudo crear el proyecto')
                  }
                }}
              >
                <Plus size={14} /> Crear proyecto
              </button>
            </div>
          </div>

          <h3>Reglas del proyecto (.novarules)</h3>
          <div className="provider-card">
            <p className="hint">Crea o edita el archivo <code>.novarules</code> del proyecto actual: instrucciones que el agente de programación seguirá siempre en ese workspace (estilo, stack, convenciones...), como Cursor Rules o CLAUDE.md.</p>
            {workspace ? (
              <>
                <textarea
                  className="rules-editor"
                  value={projectRules}
                  onChange={(e) => setProjectRules(e.target.value)}
                  placeholder="# Reglas del proyecto
- Usa React 19 y Vite
- Mantén la UI en español
- ..."
                />
                <div className="rules-actions">
                  <button className="btn" onClick={loadRules}><RefreshCw size={13} /> Recargar</button>
                  <button className="btn primary" onClick={saveRules} disabled={savingRules}>
                    {savingRules ? <Loader2 size={13} className="spin" /> : <Save size={13} />} Guardar reglas
                  </button>
                  <span className="rules-status">{rulesStatus}</span>
                </div>
              </>
            ) : (
              <p className="hint">Primero elige un proyecto del agente (pestaña Agente IA) para gestionar sus reglas.</p>
            )}
          </div>

          <h3>Servidores MCP</h3>
          <div className="provider-card">
            <p className="hint">
              Conecta servidores MCP (Model Context Protocol) para dar al agente herramientas externas: bases de datos, navegador, Figma, APIs propias, etc. Escribe el comando con el que se lanza (p. ej. <code>npx -y @modelcontextprotocol/server-filesystem C:\mi\carpeta</code>).
            </p>
            <div className="mcp-list">
              {mcpServers.map((s, i) => (
                <div key={i} className="mcp-row">
                  <label className="mcp-enabled" title="Activar/desactivar servidor">
                    <input type="checkbox" checked={s.enabled !== false} onChange={(e) => updateMcp(i, 'enabled', e.target.checked)} />
                  </label>
                  <div className="mcp-fields">
                    <input className="mcp-input" placeholder="Nombre (ej. Filesystem)" value={s.name || ''} onChange={(e) => updateMcp(i, 'name', e.target.value)} />
                    <input className="mcp-input mono" placeholder="Comando (ej. npx -y @modelcontextprotocol/server-filesystem …)" value={s.command || ''} onChange={(e) => updateMcp(i, 'command', e.target.value)} />
                  </div>
                  <div className="mcp-actions">
                    <button className="btn small" onClick={() => testMcp(i)} disabled={mcpTesting !== '' || !s.command} title="Probar conexión y listar herramientas">
                      {mcpTesting === i ? <Loader2 size={12} className="spin" /> : <Plug size={12} />} Probar
                    </button>
                    <button className="icon-btn danger" onClick={() => setMcpServers((prev) => prev.filter((_, j) => j !== i))} title="Eliminar servidor"><Trash2 size={13} /></button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mcp-actions-bar">
              <button className="btn" onClick={() => setMcpServers((prev) => [...prev, { name: '', command: '', enabled: true }])}><Plus size={13} /> Añadir servidor</button>
              <button className="btn primary" onClick={saveMcp}><Save size={13} /> Guardar servidores</button>
              <span className="rules-status">{mcpStatus}</span>
            </div>
          </div>

<h3>Plantillas de mensajes</h3>
          <div className="provider-card">
            <p className="hint">Plantillas reutilizables que puedes insertar en el chat con un clic (botón 🏷️ del compositor).</p>
            {(draft.templates || []).map((t, i) => (
              <div key={t.id} className="template-row">
                <input
                  className="tpl-name"
                  value={t.title || ''}
                  placeholder="Título de la plantilla"
                  onChange={(e) => saveTemplates((draft.templates || []).map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))}
                />
                <textarea
                  className="tpl-text"
                  rows={2}
                  value={t.text || ''}
                  placeholder="Texto de la plantilla…"
                  onChange={(e) => saveTemplates((draft.templates || []).map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))}
                />
                <button
                  className="icon-btn"
                  title="Eliminar plantilla"
                  onClick={() => saveTemplates((draft.templates || []).filter((x) => x.id !== t.id))}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            <button
              className="btn"
              onClick={() => saveTemplates([...(draft.templates || []), { id: `t${Date.now()}`, title: '', text: '' }])}
            >
              <Plus size={14} /> Añadir plantilla
            </button>
          </div>

<h3>General</h3>
          <div className="provider-card">
            <label className="row-check">
              <input
                type="checkbox"
                checked={(draft.theme || 'dark') === 'light'}
                onChange={(e) => set('theme', e.target.checked ? 'light' : 'dark')}
              />
              Tema claro (en lugar de oscuro)
            </label>
          </div>
          <div className="provider-card">
            <div className="row-slider">
              <span>Idioma de la interfaz</span>
              <select
                className="thinking-select"
                value={draft.language || 'es'}
                onChange={(e) => {
                  set('language', e.target.value)
                  i18n.setLang(e.target.value)
                }}
              >
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>
          <div className="provider-card">
            <label className="row-check">
              <input
                type="checkbox"
                checked={draft.theme === 'system'}
                onChange={(e) => set('theme', e.target.checked ? 'system' : (draft.theme === 'system' ? 'dark' : draft.theme))}
              />
              Seguir el tema del sistema automáticamente
            </label>
            <p className="hint">Con esta opción activada, Nova cambia entre claro y oscuro según tu Windows.</p>
          </div>
          <div className="provider-card">
            <label className="row-check">
              <input type="checkbox" checked={draft.webSearchDefault || false} onChange={(e) => set('webSearchDefault', e.target.checked)} />
              Activar búsqueda web por defecto en cada chat
            </label>
          </div>
          <div className="provider-card">
            <label className="row-check">
              <input type="checkbox" checked={draft.autoTitles !== false} onChange={(e) => set('autoTitles', e.target.checked)} />
              <Sparkles size={15} /> Generar títulos automáticos para las conversaciones
            </label>
            <p className="hint">Tras la primera respuesta, Nova crea un título corto para el chat (usa un poco de crédito del proveedor).</p>
          </div>
          <div className="provider-card">
            <button className="btn" onClick={onShowChangelog}><Sparkles size={14} /> Ver novedades (v{currentVersion})</button>
          </div>
          <div className="provider-card">
            <button className="btn" disabled={updState?.loading} onClick={checkUpdates}>
              {updState?.loading ? <Loader2 size={14} className="spin" /> : <Download size={14} />} Buscar actualizaciones
            </button>
            {updState && !updState.loading && (
              <div className={`test-result ${updState.ok ? (updState.updateAvailable ? 'err' : 'ok') : 'err'}`}>
                {updState.ok ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                {updState.updateAvailable ? `Hay una versión nueva (v${updState.latest})` : (updState.message || (updState.error || 'Sin información'))}
              </div>
            )}
          </div>

          <h3>Copia de seguridad</h3>
          <div className="provider-card">
            <div className="backup-row">
              <button
                className="btn"
                onClick={async () => {
                  const r = await window.api.exportBackup()
                  if (r?.ok) alert(`Copia de seguridad guardada en:\n${r.filePath}`)
                  else if (r && !r.ok && r.error) alert('No se pudo exportar: ' + r.error)
                }}
              >
                <Download size={14} /> Exportar (ajustes + chats)
              </button>
              <button
                className="btn"
                onClick={async () => {
                  if (!confirm('La copia de seguridad REEMPLAZARÁ todo el historial actual (conversaciones y sesiones del agente). ¿Continuar?')) return
                  const r = await window.api.importBackup()
                  if (r?.ok) { alert('Copia restaurada correctamente. Reinicia la app para ver los cambios.'); window.location.reload() }
                  else if (r && !r.ok && r.error) alert('No se pudo importar: ' + r.error)
                }}
              >
                <Upload size={14} /> Importar desde archivo
              </button>
            </div>
            <p className="hint">El archivo de backup incluye las API keys, ajustes, conversaciones y sesiones del agente. Guárdalo fuera de esta carpeta.</p>
          </div>

          <h3>Zona de peligro</h3>
          <div className="provider-card danger-zone">
            <button
              className="btn danger"
              onClick={() => {
                if (confirm('¿Borrar TODO el historial de conversaciones?')) onClearHistory()
              }}
            >
              <Trash2 size={14} /> Borrar todo el historial
            </button>
          </div>
        </div>

        <div className="modal-foot">
          <span className="saved-note">{saved && '✓ Guardado'}</span>
          <button className="btn primary" onClick={save}><Save size={15} /> Guardar</button>
        </div>
      </div>
    </div>
  )
}
