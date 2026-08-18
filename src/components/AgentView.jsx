import React, { useEffect, useRef, useState } from 'react'
import { Bot, FolderOpen, Folder, FileText, Send, Square, Loader2, Terminal, List, Pencil, Globe, CheckCircle2, XCircle, Settings, BadgeCheck, Sparkles, X, Check, Trash2, History, Code2, ExternalLink, RefreshCw, Play, Scissors } from 'lucide-react'
import Markdown from './Markdown.jsx'
import { uid } from '../api.js'
import { PROMPTS, PROMPT_CATEGORIES } from '../prompts.js'

const QUICK_ACTIONS = [
  'Ejecuta el build y corrige cualquier error',
  'Explica cómo funciona este proyecto',
  'Revisa el código en busca de errores o mejoras',
  'Ejecuta las pruebas y arregla las que fallen',
  'Crea un archivo README para este proyecto',
  'Añade una nueva funcionalidad y compila'
]

const TOOL_ICONS = { run_command: Terminal, read_file: FileText, list_files: List, write_file: Pencil, edit_file: Scissors, web_search: Globe }
const TOOL_NAMES = {
  run_command: 'Ejecutar comando',
  read_file: 'Leer archivo',
  list_files: 'Listar archivos',
  write_file: 'Editar archivo',
  edit_file: 'Edición quirúrgica',
  web_search: 'Buscar en web'
}

function toolSummary(t) {
  const a = t.args || {}
  if (t.name === 'run_command') return a.command || ''
  if (t.name === 'write_file' || t.name === 'edit_file' || t.name === 'read_file') return a.path || ''
  if (t.name === 'list_files') return a.path || '.'
  if (t.name === 'web_search') return a.query || ''
  return ''
}

function fmtDate(ts) {
  try {
    return new Date(ts).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

function fmtSize(n) {
  if (n < 1024) return `${n} B`
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1048576).toFixed(1)} MB`
}

export default function AgentView({ providers, settings, onOpenSettings }) {
  const [workspace, setWorkspace] = useState(settings?.agent?.workspace || '')
  const [providerId, setProviderId] = useState('')
  const [model, setModel] = useState('')
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [text, setText] = useState('')
  const [tools, setTools] = useState([])
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [skillsList, setSkillsList] = useState([])
  const [skillsOpen, setSkillsOpen] = useState(false)
  const [promptsOpen, setPromptsOpen] = useState(false)
  const [enabled, setEnabled] = useState(settings?.agent?.skills || null)
  const [sessions, setSessions] = useState([])
  const [sideTab, setSideTab] = useState('sessions')
  const [loaded, setLoaded] = useState(null)
  const [fsStack, setFsStack] = useState([])
  const [fsData, setFsData] = useState(null)
  const [fsError, setFsError] = useState('')
  const sessionRef = useRef(null)
  const scrollRef = useRef(null)
  const textareaRef = useRef(null)
  const metaRef = useRef(null)
  const contentRef = useRef({ text: '', tools: [] })

  const current = providers.find((p) => p.id === providerId)

  useEffect(() => {
    if (!providerId && providers.length) {
      const def = providers.find((p) => p.hasKey) || providers[0]
      setProviderId(def.id)
      setModel(def.models?.[0] || '')
    }
  }, [providers])

  useEffect(() => {
    if (workspace) window.api?.saveSettings({ agent: { workspace } })
  }, [workspace])

  useEffect(() => {
    window.api?.getSkills().then(setSkillsList)
    refreshSessions()
  }, [])

  useEffect(() => {
    if (workspace) loadDir([])
    else { setFsData(null); setFsStack([]) }
  }, [workspace])

  const refreshSessions = async () => {
    const list = await window.api?.listAgentHistory()
    setSessions(list || [])
  }

  const loadDir = async (rel) => {
    if (!workspace) return
    const res = await window.api?.listDir(workspace, rel)
    if (res?.ok) {
      setFsData({ path: res.path, entries: res.entries })
      setFsError('')
    } else {
      setFsData(null)
      setFsError(res?.error || 'No se pudo leer la carpeta')
    }
  }

  const goDir = (rel) => {
    setFsStack(rel)
    loadDir(rel)
  }

  const toggleSkill = (id, val) => {
    const base = enabled || Object.fromEntries(skillsList.map((s) => [s.id, true]))
    const next = { ...base, [id]: val }
    setEnabled(next)
    window.api?.saveSettings({ agent: { skills: next } })
  }

  const enabledIds = enabled ? skillsList.filter((s) => enabled[s.id] !== false).map((s) => s.id) : undefined

  useEffect(() => {
    const unsub = window.api?.onAgentEvent((ev) => {
      if (!sessionRef.current || ev.id !== sessionRef.current) return
      if (ev.type === 'text') {
        contentRef.current.text += ev.text
        setText(contentRef.current.text)
      } else if (ev.type === 'tool') {
        const card = { toolId: ev.id, name: ev.name, args: ev.args, status: 'running', output: '', error: '' }
        contentRef.current.tools = [...contentRef.current.tools, card]
        setTools(contentRef.current.tools)
      } else if (ev.type === 'tool_output') {
        contentRef.current.tools = contentRef.current.tools.map((t) =>
          t.toolId === ev.id && t.status === 'running'
            ? { ...t, output: (t.output + ev.chunk).slice(-200000) }
            : t
        )
        setTools(contentRef.current.tools)
      } else if (ev.type === 'tool_result') {
        contentRef.current.tools = contentRef.current.tools.map((t) =>
          t.toolId === ev.id
            ? { ...t, status: ev.ok ? 'done' : 'error', output: (ev.output || t.output || '').slice(-200000), error: ev.error || '' }
            : t
        )
        setTools(contentRef.current.tools)
      } else if (ev.type === 'done') {
        setBusy(false)
        setDone(true)
        saveSession({ done: true, error: '' })
      } else if (ev.type === 'error') {
        setBusy(false)
        setError(ev.message)
        saveSession({ done: false, error: ev.message })
      }
    })
    return () => unsub?.()
  }, [])

  const saveSession = (extra = {}) => {
    const meta = metaRef.current
    if (!meta) return
    const c = {
      id: meta.id,
      title: meta.prompt.slice(0, 60),
      provider: meta.provider,
      model: meta.model,
      createdAt: meta.createdAt,
      updatedAt: Date.now(),
      prompt: meta.prompt,
      workspace: meta.workspace,
      text: contentRef.current.text,
      tools: contentRef.current.tools,
      error: extra.error ?? error,
      done: extra.done ?? done
    }
    window.api?.saveAgentHistory(c)
    refreshSessions()
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [text, tools, error, busy, fsData])

  const pickWorkspace = async () => {
    const p = await window.api?.pickWorkspace()
    if (p) setWorkspace(p)
  }

  const send = async (override) => {
    const prompt = (override ?? input).trim()
    if (busy || !prompt || !current) return
    if (!workspace) {
      setError('Primero elige la carpeta de tu proyecto con el botón "Elegir proyecto".')
      return
    }
    if (!current.hasKey && !current.local) {
      setError(`Necesitas configurar la API key de ${current.name} en Ajustes.`)
      return
    }
    setError('')
    contentRef.current = { text: '', tools: [] }
    setText('')
    setTools([])
    setDone(false)
    setLoaded(null)
    const id = 'agent:' + uid()
    sessionRef.current = id
    const ctx = loaded ? buildContext(loaded) : undefined
    metaRef.current = { id, prompt, provider: providerId, model, createdAt: Date.now(), workspace }
    setBusy(true)
    window.api.sendAgent({ id, provider: providerId, model, prompt, workspace, skills: enabledIds, context: ctx })
  }

  const buildContext = (s) => {
    const parts = []
    if (s.text) parts.push(`Respuesta final anterior: ${s.text.slice(0, 1500)}`)
    const used = (s.tools || []).filter((t) => t.status === 'done' || t.status === 'error')
    if (used.length) parts.push(`Herramientas usadas antes: ${used.map((t) => `${t.name}(${t.status === 'done' ? 'ok' : 'error'})`).join(', ')}`)
    return parts.join('\n') || 'Sesión anterior sin resultados.'
  }

  const stop = () => {
    if (sessionRef.current) window.api?.stopAgent(sessionRef.current)
    setBusy(false)
    saveSession({ done: false, error: 'Detenido por el usuario' })
  }

  const changeProvider = (id) => {
    setProviderId(id)
    const def = providers.find((p) => p.id === id)
    setModel(def?.models?.[0] || '')
  }

  const loadSession = async (id) => {
    const s = await window.api?.getAgentHistory(id)
    if (!s) return
    sessionRef.current = null
    setBusy(false)
    setText(s.text || '')
    setTools(s.tools || [])
    setError(s.error || '')
    setDone(!!s.done)
    setInput('')
    if (s.workspace) setWorkspace(s.workspace)
    setLoaded(s)
    contentRef.current = { text: s.text || '', tools: s.tools || [] }
  }

  const deleteSession = async (id) => {
    await window.api?.deleteAgentHistory(id)
    refreshSessions()
    if (loaded?.id === id) newSession()
  }

  const newSession = () => {
    sessionRef.current = null
    metaRef.current = null
    contentRef.current = { text: '', tools: [] }
    setText('')
    setTools([])
    setError('')
    setDone(false)
    setLoaded(null)
    setInput('')
  }

  const Icon = (name) => TOOL_ICONS[name] || Terminal

  const relPath = fsStack.join('/')

  return (
    <div className="agent">
      <div className="agent-side">
        <div className="agent-side-tabs">
          <button className={`agent-tab ${sideTab === 'sessions' ? 'active' : ''}`} onClick={() => setSideTab('sessions')}><History size={13} /> Sesiones</button>
          <button className={`agent-tab ${sideTab === 'files' ? 'active' : ''}`} onClick={() => setSideTab('files')}><Folder size={13} /> Archivos</button>
        </div>
        <div className="agent-side-body">
          {sideTab === 'sessions' && (
            <>
              <div className="agent-side-head">
                <button className="btn primary small" onClick={newSession}><Play size={12} /> Nueva sesión</button>
                <button className="icon-btn" onClick={refreshSessions} title="Actualizar"><RefreshCw size={13} /></button>
              </div>
              <div className="agent-session-list">
                {sessions.length === 0 && <div className="empty-hint">Aún no hay sesiones guardadas. Cada trabajo del agente se guarda aquí automáticamente.</div>}
                {sessions.map((s) => (
                  <div key={s.id} className={`agent-session ${loaded?.id === s.id ? 'active' : ''}`} onClick={() => loadSession(s.id)}>
                    <div className="agent-session-title" title={s.title}>{s.title || 'Sesión'}</div>
                    <div className="agent-session-sub">{fmtDate(s.updatedAt)} · {(s.tools || []).length} herramientas</div>
                    <button className="icon-btn danger agent-session-del" onClick={(e) => { e.stopPropagation(); deleteSession(s.id) }} title="Eliminar">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
          {sideTab === 'files' && (
            <>
              <div className="agent-side-head">
                {workspace ? (
                  <>
                    <button className="btn small" onClick={() => window.api?.openPath(workspace, relPath || undefined, 'vscode')} title="Abrir en VS Code"><Code2 size={12} /> VS Code</button>
                    <button className="btn small" onClick={() => window.api?.openPath(workspace, relPath || undefined, 'explorer')} title="Abrir carpeta en Explorador"><ExternalLink size={12} /></button>
                    <button className="icon-btn" onClick={() => loadDir(fsStack)} title="Actualizar"><RefreshCw size={13} /></button>
                  </>
                ) : (
                  <span className="empty-hint">Elige un proyecto para explorar sus archivos</span>
                )}
              </div>
              {fsError && <div className="tool-error">{fsError}</div>}
              {fsData && (
                <>
                  <div className="agent-fs-path">
                    <button className="fs-crumb" onClick={() => goDir([])}>📁 raíz</button>
                    {fsStack.map((seg, i) => (
                      <span key={i}>
                        <span className="fs-sep">/</span>
                        <button className="fs-crumb" onClick={() => goDir(fsStack.slice(0, i + 1))}>{seg}</button>
                      </span>
                    ))}
                  </div>
                  <div className="agent-fs-list">
                    {fsData.entries.map((e) => (
                      <div
                        key={e.name}
                        className={`agent-fs-item ${e.dir ? 'dir' : 'file'}`}
                        onClick={() => {
                          const next = relPath ? `${relPath}/${e.name}` : e.name
                          if (e.dir) goDir(fsStack.concat(e.name))
                          else window.api?.openPath(workspace, next, 'vscode')
                        }}
                        title={e.dir ? 'Abrir carpeta' : 'Abrir en VS Code'}
                      >
                        {e.dir ? <Folder size={13} className="fs-icon dir" /> : <FileText size={13} className="fs-icon file" />}
                        <span className="fs-name">{e.name}</span>
                        {!e.dir && <span className="fs-size">{fmtSize(e.size)}</span>}
                      </div>
                    ))}
                    {fsData.entries.length === 0 && <div className="empty-hint">Carpeta vacía</div>}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      <div className="agent-main">
        <div className="chat-head">
          <div className="chat-title">
            <Bot size={17} />
            <span>Agente IA</span>
            {loaded && <span className="badge">sesión {fmtDate(loaded.updatedAt)}</span>}
            {busy && <Loader2 size={14} className="spin" />}
          </div>
          <div className="chat-head-right">
            <button className="btn" onClick={() => setPromptsOpen(true)} title="Prompts avanzados listos para usar"><Sparkles size={14} /> Prompts</button>
            <button className="btn" onClick={() => setSkillsOpen(true)} title="Skills del agente"><BadgeCheck size={14} /> Skills</button>
            <button className={`btn ${workspace ? '' : 'primary'}`} onClick={pickWorkspace} title="Elige la carpeta del proyecto donde trabajará el agente">
              <FolderOpen size={14} />
              {workspace ? workspace.split(/[\\/]/).pop() : 'Elegir proyecto'}
            </button>
            <select className="agent-select" value={providerId} onChange={(e) => changeProvider(e.target.value)} title="Proveedor del agente">
              {providers.map((p) => (
                <option key={p.id} value={p.id}>{p.name}{!p.hasKey && !p.local ? ' (sin key)' : ''}</option>
              ))}
            </select>
            <select className="agent-select" value={model} onChange={(e) => setModel(e.target.value)} title="Modelo del agente">
              {(current?.models || []).filter((m) => !current?.imageModels?.includes(m)).map((m) => <option key={m} value={m}>{m}{current?.local || current?.id === 'groq' || (current?.id === 'mistral' && /^(mistral-small|ministral)/.test(m)) || /^gemini-[0-9].*flash/i.test(m) || /:free$/i.test(m) ? ' (gratis)' : ''}</option>)}
            </select>
            {busy && (
              <button className="btn danger" onClick={stop}><Square size={13} /> Detener</button>
            )}
            <button className="icon-btn" onClick={onOpenSettings} title="Ajustes"><Settings size={16} /></button>
          </div>
        </div>

        <div className="messages" ref={scrollRef}>
          {!text && tools.length === 0 && !error && !loaded && (
            <div className="welcome">
              <div className="welcome-logo"><Bot size={34} /></div>
              <h2>Tu agente de programación</h2>
              <p className="hint">
                {workspace
                  ? `Trabajando en ${workspace}. Pídele que ejecute builds, revise código, cree archivos o arregle errores.`
                  : 'Elige la carpeta de tu proyecto y pídele que ejecute builds, revise código, cree archivos o arregle errores.'}
              </p>
              <div className="agent-welcome-actions">
                <button className="btn primary" onClick={() => setPromptsOpen(true)}><Sparkles size={15} /> Prompts avanzados</button>
                <button className="btn" onClick={() => setSkillsOpen(true)}><BadgeCheck size={15} /> Skills del agente</button>
                {!workspace && <button className="btn" onClick={pickWorkspace}><FolderOpen size={15} /> Elegir proyecto</button>}
              </div>
              <div className="suggestions">
                {QUICK_ACTIONS.map((a) => (
                  <button key={a} className="suggestion" onClick={() => send(a)} disabled={busy}>{a}</button>
                ))}
              </div>
            </div>
          )}

          {loaded && !text && tools.length === 0 && !error && (
            <div className="welcome">
              <div className="welcome-logo"><History size={30} /></div>
              <h2>Sesión cargada</h2>
              <p className="hint">Estás viendo la sesión «{loaded.title}». Escribe un mensaje para continuarla: el agente retomará el contexto del trabajo anterior.</p>
            </div>
          )}

          {text && (
            <div className="msg assistant">
              <div className="avatar" style={{ background: current?.color || '#8b5cf6' }}><Bot size={15} /></div>
              <div className="assistant-body">
                <div className="md">
                  <Markdown text={text} />
                  {busy && <span className="cursor-blink" />}
                  {done && !tools.length && <span className="msg-done">✓</span>}
                </div>
              </div>
            </div>
          )}

          {tools.map((t) => {
            const TIcon = Icon(t.name)
            return (
              <div key={t.toolId} className={`tool-card ${t.status}`}>
                <div className="tool-card-head">
                  <span className="tool-icon"><TIcon size={13} /></span>
                  <span className="tool-name">{TOOL_NAMES[t.name] || t.name}</span>
                  <code className="tool-summary">{toolSummary(t)}</code>
                  {t.status === 'running' && (
                    <>
                      <Loader2 size={13} className="spin" />
                      <button className="icon-btn" onClick={() => window.api?.killAgentTool(t.toolId)} title="Detener este comando"><Square size={11} /></button>
                    </>
                  )}
                  {t.status === 'done' && <CheckCircle2 size={13} className="ok" />}
                  {t.status === 'error' && <XCircle size={13} className="err" />}
                </div>
                {t.output && (
                  <pre className={`tool-output ${t.status === 'running' ? 'live' : ''}`}>{t.output}</pre>
                )}
                {t.error && <div className="tool-error">{t.error}</div>}
              </div>
            )
          })}

          {error && <div className="error-box">{error}</div>}
        </div>

        <div className="input-area">
          <div className="input-bar">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
              }}
              placeholder={loaded ? 'Continúa la sesión: escribe tu siguiente instrucción…' : 'Pídele al agente: ejecuta el build, corrige los errores, crea una funcionalidad…'}
              rows={2}
              disabled={busy}
            />
            {busy ? (
              <button className="btn danger" onClick={stop} title="Detener"><Square size={16} /></button>
            ) : (
              <button className="btn primary" onClick={() => send()} disabled={!input.trim()} title="Enviar"><Send size={16} /></button>
            )}
          </div>
          <div className="input-foot">
            <span className="hint">El agente ejecuta comandos y edita archivos dentro de tu proyecto, como Claude Code o Cursor. Las sesiones se guardan automáticamente.</span>
          </div>
        </div>
      </div>

      {skillsOpen && (
        <div className="modal-backdrop" onClick={() => setSkillsOpen(false)}>
          <div className="modal skills-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2><BadgeCheck size={16} /> Skills del agente</h2>
              <button className="icon-btn" onClick={() => setSkillsOpen(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p className="hint">
                Las skills se activan <b>automáticamente</b> cuando tu petición coincide con su descripción y le dicen al agente exactamente cómo hacer cada tarea. Desactiva las que no uses.
              </p>
              <div className="skills-list">
                {skillsList.map((s) => {
                  const on = !enabled || enabled[s.id] !== false
                  return (
                    <div key={s.id} className={`skill-item ${on ? 'on' : ''}`} onClick={() => toggleSkill(s.id, !on)}>
                      <span className={`skill-toggle ${on ? 'on' : ''}`}>{on && <Check size={12} />}</span>
                      <div className="skill-info">
                        <div className="skill-name">{s.name} <span className="skill-cat">{s.category}</span></div>
                        <div className="skill-desc">{s.description}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn primary" onClick={() => setSkillsOpen(false)}><Check size={15} /> Listo</button>
            </div>
          </div>
        </div>
      )}

      {promptsOpen && (
        <div className="modal-backdrop" onClick={() => setPromptsOpen(false)}>
          <div className="modal prompts-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2><Sparkles size={16} /> Prompts avanzados</h2>
              <button className="icon-btn" onClick={() => setPromptsOpen(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p className="hint">Haz clic en un prompt para cargarlo en el campo de texto. Puedes editarlo antes de enviarlo.</p>
              {PROMPT_CATEGORIES.map((cat) => {
                const items = PROMPTS.filter((p) => p.category === cat)
                if (!items.length) return null
                return (
                  <div key={cat} className="prompt-group">
                    <div className="prompt-group-head">{cat}</div>
                    {items.map((p) => (
                      <div
                        key={p.id}
                        className="prompt-card"
                        onClick={() => {
                          setInput(p.prompt)
                          setPromptsOpen(false)
                          setTimeout(() => textareaRef.current?.focus(), 60)
                        }}
                      >
                        <div className="prompt-title">{p.title}</div>
                        <div className="prompt-desc">{p.description}</div>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
