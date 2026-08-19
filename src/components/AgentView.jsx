import React, { useEffect, useRef, useState } from 'react'
import { Bot, FolderOpen, Folder, FileText, Send, Square, Loader2, Terminal, List, Pencil, Globe, CheckCircle2, XCircle, Settings, BadgeCheck, Sparkles, X, Check, Trash2, History, Code2, ExternalLink, RefreshCw, Play, Scissors, Minus, Plus, ChevronLeft, ChevronRight, Eye, EyeOff, Copy, Columns, GitBranch, MessageSquare, ArrowUp, ArrowDown, X as XIcon, Wrench, Search } from 'lucide-react'
import Markdown from './Markdown.jsx'
import { uid } from '../api.js'
import { PROMPTS, PROMPT_CATEGORIES } from '../prompts.js'

function parseDiff(diff) {
  const hunks = []
  const lines = diff.split('\n')
  let currentHunk = null
  for (const line of lines) {
    if (line.startsWith('@@')) {
      if (currentHunk) hunks.push(currentHunk)
      const m = line.match(/@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/)
      currentHunk = { header: line, oldStart: parseInt(m?.[1] || 1), oldLines: parseInt(m?.[2] || 1), newStart: parseInt(m?.[3] || 1), newLines: parseInt(m?.[4] || 1), lines: [] }
    } else if (currentHunk) {
      currentHunk.lines.push(line)
    }
  }
  if (currentHunk) hunks.push(currentHunk)
  return hunks
}

function DiffView({ diff, onHunkToggle, appliedHunks, readOnly }) {
  const [view, setView] = useState('side')
  const hunks = useMemo(() => parseDiff(diff), [diff])

  return (
    <div className="diff-viewer">
      <div className="diff-toolbar">
        <span className="diff-stats">
          {hunks.reduce((a, h) => a + h.lines.filter(l => l.startsWith('+')).length, 0)} adiciones,
          {hunks.reduce((a, h) => a + h.lines.filter(l => l.startsWith('-')).length, 0)} eliminaciones
        </span>
        <div className="diff-view-toggle">
          <button className={`view-btn ${view === 'side' ? 'active' : ''}`} onClick={() => setView('side')} title="Vista lado a lado"><Columns size={12} /></button>
          <button className={`view-btn ${view === 'inline' ? 'active' : ''}`} onClick={() => setView('inline')} title="Vista en línea"><FileText size={12} /></button>
        </div>
      </div>
      {view === 'side' ? (
        <div className="diff-side-by-side">
          <div className="diff-pane old">
            <div className="pane-header">Original</div>
            <pre className="diff-content">{hunks.map((h, hi) => (
              <React.Fragment key={hi}>
                <div className="hunk-header">{h.header}</div>
                {h.lines.map((l, li) => (
                  <div key={li} className={`diff-line ${l.startsWith('+') ? 'added' : l.startsWith('-') ? 'removed' : 'context'}`}>
                    <span className="line-num">{l.startsWith('+') ? '' : h.oldStart + li}</span>
                    <span className="line-content">{l.startsWith('+') ? l.slice(1) : l.slice(1)}</span>
                  </div>
                ))}
              </React.Fragment>
            ))}</pre>
          </div>
          <div className="diff-pane new">
            <div className="pane-header">Propuesto</div>
            <pre className="diff-content">{hunks.map((h, hi) => (
              <React.Fragment key={hi}>
                <div className="hunk-header">{h.header}</div>
                {h.lines.map((l, li) => (
                  <div key={li} className={`diff-line ${l.startsWith('+') ? 'added' : l.startsWith('-') ? 'removed' : 'context'}`}>
                    <span className="line-num">{l.startsWith('-') ? '' : h.newStart + li}</span>
                    <span className="line-content">{l.startsWith('-') ? l.slice(1) : l.slice(1)}</span>
                  </div>
                ))}
              </React.Fragment>
            ))}</pre>
          </div>
        </div>
      ) : (
        <div className="diff-inline">
          <pre className="diff-content">{hunks.map((h, hi) => (
            <React.Fragment key={hi}>
              <div className="hunk-header">
                {h.header}
                {!readOnly && (
                  <label className="hunk-checkbox">
                    <input
                      type="checkbox"
                      checked={appliedHunks.includes(hi)}
                      onChange={() => onHunkToggle(hi)}
                      disabled={readOnly}
                    />
                    <span>Aplicar este bloque</span>
                  </label>
                )}
              </div>
              {h.lines.map((l, li) => (
                <div key={li} className={`diff-line ${l.startsWith('+') ? 'added' : l.startsWith('-') ? 'removed' : 'context'}`}>
                  <span className="line-num">{l.startsWith('+') ? '+' : l.startsWith('-') ? '-' : ' '}</span>
                  <span className="line-content">{l.slice(1)}</span>
                </div>
              ))}
            </React.Fragment>
          ))}</pre>
        </div>
      )}
    </div>
  )
}

function ProposalCard({ p, busy, onApplySelected, onApplyAll }) {
  const [appliedHunks, setAppliedHunks] = useState(() => p.appliedHunks || [])
  const handleHunkToggle = (hi) => {
    setAppliedHunks((prev) => prev.includes(hi) ? prev.filter((x) => x !== hi) : [...prev, hi])
  }
  return (
    <div key={p.id} className={`proposal ${p.applied ? 'applied' : ''}`}>
      <div className="proposal-head">
        <code className="proposal-path">{p.path}</code>
        {p.applied ? <span className="proposal-badge ok">Aplicado</span> : <span className="proposal-badge">Pendiente</span>}
        {!p.applied && (
          <>
            <button className="btn small" onClick={() => onApplySelected({ ...p, appliedHunks })} disabled={busy}><Check size={12} /> Aplicar seleccionados</button>
            <button className="btn small" onClick={() => onApplyAll(p)} disabled={busy}><Check size={12} /> Aplicar todo</button>
          </>
        )}
      </div>
      <DiffView diff={p.diff} onHunkToggle={handleHunkToggle} appliedHunks={appliedHunks} readOnly={p.applied || busy} />
    </div>
  )
}

const SLASH_COMMANDS = [
  { id: 'fix', name: '/fix', desc: 'Corrige el último error o fallo detectado', build: (ctx) => ctx.lastError ? `El comando falló con este error:\n${ctx.lastError.error}\n\nSalida:\n${(ctx.lastError.output || '').slice(0, 1500)}\n\nCorrige el problema: encuentra la causa raíz y arregla el código, luego verifica con el build.` : 'Ejecuta el build y corrige cualquier error que aparezca.' },
  { id: 'explain', name: '/explain', desc: 'Explica cómo funciona el proyecto', build: () => 'Explica cómo funciona este proyecto: estructura, archivos clave y flujo principal, de forma clara y concisa.' },
  { id: 'review', name: '/review', desc: 'Revisa el código en busca de errores y mejoras', build: () => 'Revisa el código del proyecto en busca de errores, bugs y mejoras. Propón cambios concretos y explícalos.' },
  { id: 'test', name: '/test', desc: 'Ejecuta las pruebas y arregla los fallos', build: () => 'Ejecuta las pruebas del proyecto, identifica los fallos y corrígelos hasta que pasen.' },
  { id: 'docs', name: '/docs', desc: 'Crea o actualiza la documentación', build: () => 'Revisa la documentación del proyecto (README, comentarios clave) y créala o actualízala.' },
  { id: 'commit', name: '/commit', desc: 'Prepara los cambios y sugiere un commit', build: () => 'Revisa los cambios pendientes (git status/diff) y sugiere el commit a hacer.' }
]

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
  const [planMode, setPlanMode] = useState(false)
  const [proposals, setProposals] = useState([])
  const [gitBranch, setGitBranch] = useState('')
  const [gitFiles, setGitFiles] = useState([])
  const [gitLog, setGitLog] = useState([])
  const [gitStatusLoading, setGitStatusLoading] = useState(false)
  const [gitError, setGitError] = useState('')
  const [showStaged, setShowStaged] = useState(true)
  const [showFileDiffPath, setShowFileDiffPath] = useState(null)
  const [gitFileDiff, setGitFileDiff] = useState('')
  const [commitMsg, setCommitMsg] = useState('')
  const [gitCommitting, setGitCommitting] = useState(false)
  const [ctxMenu, setCtxMenu] = useState(null)
  const [refs, setRefs] = useState([])
  const [thinking, setThinking] = useState('')
  const [slashOpen, setSlashOpen] = useState(false)
  const [planSteps, setPlanSteps] = useState([])
  const [cpId, setCpId] = useState(null)
  const [grepQ, setGrepQ] = useState('')
  const [grepResults, setGrepResults] = useState([])
  const [grepBusy, setGrepBusy] = useState(false)
  const [commitMsgGen, setCommitMsgGen] = useState(false)
  const sessionRef = useRef(null)
  const scrollRef = useRef(null)
  const textareaRef = useRef(null)
  const metaRef = useRef(null)
  const contentRef = useRef({ text: '', tools: [], proposals: [] })

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

  useEffect(() => {
    if (sideTab === 'git' && workspace) refreshGit()
  }, [sideTab, workspace])

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

  const addRef = async (path, name, dir) => {
    if (!workspace) return
    if (refs.some((r) => r.path === path)) { setCtxMenu(null); return }
    setRefs((prev) => [...prev, { path, name, dir, loading: true }])
    try {
      let content = ''
      if (dir) {
        const res = await window.api?.listDir(workspace, path)
        content = res?.ok
          ? res.entries.map((e) => `- ${e.dir ? '📁' : '📄'} ${e.name}${e.dir ? '/' : ''}`).join('\n')
          : '(no se pudo leer la carpeta)'
      } else {
        content = (await window.api?.readWorkspaceFile(workspace, path)) ?? '(archivo vacío)'
      }
      setRefs((prev) => prev.map((r) => (r.path === path ? { ...r, content, loading: false } : r)))
    } catch {
      setRefs((prev) => prev.map((r) => (r.path === path ? { ...r, content: '(error al leer)', loading: false } : r)))
    }
    setCtxMenu(null)
  }

  const removeRef = (path) => setRefs((prev) => prev.filter((r) => r.path !== path))

  const copyPath = async (path) => {
    try { await navigator.clipboard.writeText(path) } catch { /* noop */ }
    setCtxMenu(null)
  }

  const refreshGit = async () => {
    if (!workspace) return
    setGitStatusLoading(true)
    setGitError('')
    try {
      const [statusRes, branchRes, logRes] = await Promise.all([
        window.api?.gitStatus(workspace),
        window.api?.gitBranch(workspace),
        window.api?.gitLog(workspace, 20)
      ])
      if (branchRes?.ok) setGitBranch(branchRes.branch)
      if (logRes?.ok) setGitLog(logRes.commits)
      if (statusRes?.ok) {
        const lines = statusRes.status.split('\n').filter(Boolean)
        const files = lines.map((line) => {
          const xy = line.slice(0, 2)
          const path = line.slice(3)
          const staged = xy[0] !== ' '
          const unstaged = xy[1] !== ' ' || xy === '??'
          return { staged, unstaged, status: xy.trim(), path }
        })
        setGitFiles(files)
      }
    } catch (e) {
      setGitError(e.message)
    } finally {
      setGitStatusLoading(false)
    }
  }

  const stageFile = async (file) => {
    const r = await window.api?.gitStage(workspace, file)
    if (r?.ok) refreshGit()
    else setGitError(r?.error || 'Error al hacer stage')
  }

  const unstageFile = async (file) => {
    const r = await window.api?.gitUnstage(workspace, file)
    if (r?.ok) refreshGit()
    else setGitError(r?.error || 'Error al deshacer stage')
  }

  const openFileDiff = async (file) => {
    const r = await window.api?.gitDiff(workspace, showStaged)
    if (r?.ok) {
      setShowFileDiffPath(file)
      setGitFileDiff(r.diff)
    } else setGitError(r?.error || 'Error al mostrar diff')
  }

  const doCommit = async () => {
    if (!commitMsg.trim()) return
    setGitCommitting(true)
    const r = await window.api?.gitCommit(workspace, commitMsg)
    setGitCommitting(false)
    if (r?.ok) {
      setCommitMsg('')
      refreshGit()
    } else setGitError(r?.error || 'Error al hacer commit')
  }

  const genCommitMsg = async () => {
    setCommitMsgGen(true)
    const r = await window.api?.gitCommitMessage(workspace)
    setCommitMsgGen(false)
    if (r?.ok) setCommitMsg(r.message)
    else setGitError(r?.error || 'No se pudo generar el mensaje')
  }

  const fixError = (t) => {
    send(`El comando falló con este error:\n${t.error}\n\nSalida:\n${(t.output || '').slice(0, 1500)}\n\nCorrige el problema: encuentra la causa raíz y arregla el código, luego verifica con el build.`)
  }

  const applySlash = (cmd) => {
    const ctx = { lastError: contentRef.current.tools.filter((t) => t.status === 'error').slice(-1)[0] }
    setInput(cmd.build(ctx))
    setSlashOpen(false)
    setTimeout(() => textareaRef.current?.focus(), 40)
  }

  const runPlanSteps = () => {
    const pending = planSteps.filter((s) => s.checked)
    if (!pending.length) return
    setPlanMode(false)
    setPlanSteps([])
    send(`Ejecuta este plan que el usuario aprobó (paso a paso, verificando cada uno):\n${pending.map((s, i) => `${i + 1}. ${s.text}`).join('\n')}`)
  }

  const doGrep = async () => {
    if (!workspace || !grepQ.trim()) return
    setGrepBusy(true)
    const r = await window.api?.workspaceGrep({ workspace, pattern: grepQ.trim(), rel: relPath || undefined })
    setGrepBusy(false)
    setGrepResults(r?.ok ? r.results : [])
  }

  const openSelf = async () => {
    const r = await window.api?.selfWorkspace()
    if (r?.ok) setWorkspace(r.path)
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
      if (ev.type === 'thinking') {
        setThinking((t) => t + ev.text)
      } else if (ev.type === 'text') {
        contentRef.current.text += ev.text
        setText(contentRef.current.text)
      } else if (ev.type === 'compact') {
        setThinking('')
        contentRef.current.text += `\n\n> **Contexto compactado automáticamente** (sesión anterior muy larga)\n`
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
      } else if (ev.type === 'proposal') {
        contentRef.current.proposals = [...contentRef.current.proposals, ev.proposal]
        setProposals(contentRef.current.proposals)
      } else if (ev.type === 'done') {
        setBusy(false)
        setDone(true)
        setThinking('')
        if (planMode && contentRef.current.text) {
          const steps = contentRef.current.text
            .split('\n')
            .map((l) => l.trim())
            .filter((l) => /^\d+[.)]/.test(l))
            .map((l) => ({ text: l.replace(/^\d+[.)]\s*/, ''), checked: false }))
          setPlanSteps(steps.length ? steps : [])
        }
        saveSession({ done: true, error: '' })
      } else if (ev.type === 'error') {
        setBusy(false)
        setThinking('')
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
      proposals: contentRef.current.proposals,
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
    let prompt = (override ?? input).trim()
    if (busy || !prompt || !current) return
    if (!workspace) {
      setError('Primero elige la carpeta de tu proyecto con el botón "Elegir proyecto".')
      return
    }
    if (!current.hasKey && !current.local) {
      setError(`Necesitas configurar la API key de ${current.name} en Ajustes.`)
      return
    }
    const readyRefs = refs.filter((r) => !r.loading && r.content)
    if (readyRefs.length) {
      const ctx = readyRefs.map((r) => `<context ${r.dir ? 'folder' : 'file'}="${r.path}">\n${r.content.slice(0, 8000)}\n</context>`).join('\n\n')
      prompt = `${prompt}\n\nReferencias del proyecto:\n${ctx}`
    }
    setError('')
    contentRef.current = { text: '', tools: [], proposals: [] }
    setText('')
    setTools([])
    setProposals([])
    setDone(false)
    setLoaded(null)
    setThinking('')
    setPlanSteps([])
    setCpId(null)
    const id = 'agent:' + uid()
    sessionRef.current = id
    const ctx = loaded ? buildContext(loaded) : undefined
    metaRef.current = { id, prompt, provider: providerId, model, createdAt: Date.now(), workspace }
    setBusy(true)
    window.api.sendAgent({ id, provider: providerId, model, prompt, workspace, skills: enabledIds, context: ctx, plan: planMode })
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
    setProposals(s.proposals || [])
    setError(s.error || '')
    setDone(!!s.done)
    setInput('')
    if (s.workspace) setWorkspace(s.workspace)
    setLoaded(s)
    contentRef.current = { text: s.text || '', tools: s.tools || [], proposals: s.proposals || [] }
  }

  const deleteSession = async (id) => {
    await window.api?.deleteAgentHistory(id)
    refreshSessions()
    if (loaded?.id === id) newSession()
  }

  const newSession = () => {
    sessionRef.current = null
    metaRef.current = null
    contentRef.current = { text: '', tools: [], proposals: [] }
    setText('')
    setTools([])
    setProposals([])
    setError('')
    setDone(false)
    setLoaded(null)
    setInput('')
    setThinking('')
    setPlanSteps([])
    setCpId(null)
  }

  const applyOne = async (p) => {
    if (!workspace) return
    const cp = await window.api?.createCheckpoint({ workspace, files: [p.path] })
    if (cp?.ok) setCpId(cp.id)
    const r = await window.api.applyProposals({ proposals: [p], workspace })
    if (!r?.ok) { setError(r?.error || 'No se pudieron aplicar los cambios'); return }
    const next = contentRef.current.proposals.map((x) => (x.id === p.id ? { ...x, applied: true } : x))
    contentRef.current.proposals = next
    setProposals(next)
  }

  const applyAll = async () => {
    if (!workspace) return
    const pending = contentRef.current.proposals.filter((p) => !p.applied)
    if (!pending.length) return
    const cp = await window.api?.createCheckpoint({ workspace, files: pending.map((p) => p.path) })
    if (cp?.ok) setCpId(cp.id)
    const r = await window.api.applyProposals({ proposals: pending, workspace })
    if (!r?.ok) { setError(r?.error || 'No se pudieron aplicar los cambios'); return }
    const next = contentRef.current.proposals.map((x) => (r.applied.includes(x.id) ? { ...x, applied: true } : x))
    contentRef.current.proposals = next
    setProposals(next)
  }

  const restoreCheckpoint = async () => {
    if (!cpId) return
    const r = await window.api?.restoreCheckpoint(cpId)
    if (r?.ok) {
      const next = contentRef.current.proposals.map((x) => (r.files.includes(x.path) ? { ...x, applied: false } : x))
      contentRef.current.proposals = next
      setProposals(next)
      setCpId(null)
    } else setError(r?.error || 'No se pudo restaurar el checkpoint')
  }

  const undoAll = async () => {
    if (!workspace) return
    const applied = contentRef.current.proposals.filter((p) => p.applied)
    if (!applied.length) return
    const r = await window.api.undoProposals({ proposals: applied, workspace })
    if (!r?.ok) { setError(r?.error || 'No se pudieron deshacer los cambios'); return }
    const next = contentRef.current.proposals.map((x) => (r.undone.includes(x.id) ? { ...x, applied: false } : x))
    contentRef.current.proposals = next
    setProposals(next)
  }

  const Icon = (name) => TOOL_ICONS[name] || Terminal

  const relPath = fsStack.join('/')

  return (
    <div className="agent">
      <div className="agent-side">
        <div className="agent-side-tabs">
          <button className={`agent-tab ${sideTab === 'sessions' ? 'active' : ''}`} onClick={() => setSideTab('sessions')}><History size={13} /> Sesiones</button>
          <button className={`agent-tab ${sideTab === 'files' ? 'active' : ''}`} onClick={() => setSideTab('files')}><Folder size={13} /> Archivos</button>
          <button className={`agent-tab ${sideTab === 'git' ? 'active' : ''}`} onClick={() => setSideTab('git')}><GitBranch size={13} /> Git</button>
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
              {workspace && (
                <div className="grep-box">
                  <input
                    className="grep-input"
                    placeholder="Buscar en el proyecto (regex)…"
                    value={grepQ}
                    onChange={(e) => setGrepQ(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') doGrep() }}
                  />
                  <button className="icon-btn" onClick={doGrep} disabled={grepBusy || !grepQ.trim()} title="Buscar">
                    {grepBusy ? <Loader2 size={13} className="spin" /> : <Search size={13} />}
                  </button>
                </div>
              )}
              {grepResults.length > 0 && (
                <div className="grep-results">
                  <div className="grep-results-head">
                    <span>{grepResults.length} resultados</span>
                    <button className="icon-btn" onClick={() => setGrepResults([])} title="Cerrar"><X size={12} /></button>
                  </div>
                  <div className="grep-results-list">
                    {grepResults.map((m, i) => (
                      <div key={i} className="grep-item" onClick={() => window.api?.openPath(workspace, m.path, 'vscode')} title="Abrir en VS Code">
                        <code className="grep-loc">{m.path}:{m.line}</code>
                        <span className="grep-text">{m.text}</span>
                        <button className="icon-btn" onClick={(e) => { e.stopPropagation(); addRef(m.path, m.path.split('/').pop(), false) }} title="Añadir al chat"><Plus size={11} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
                        onContextMenu={(ev) => {
                          ev.preventDefault()
                          const next = relPath ? `${relPath}/${e.name}` : e.name
                          setCtxMenu({
                            x: Math.min(ev.clientX, window.innerWidth - 230),
                            y: Math.min(ev.clientY, window.innerHeight - 210),
                            path: next,
                            name: e.name,
                            dir: !!e.dir
                          })
                        }}
                        title={e.dir ? 'Abrir carpeta · clic derecho: más opciones' : 'Abrir en VS Code · clic derecho: más opciones'}
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
          {sideTab === 'git' && (
            <>
              <div className="agent-side-head">
                {workspace ? (
                  <>
                    <button className="btn small" onClick={refreshGit} title="Actualizar"><RefreshCw size={12} /></button>
                    <span className="git-branch">{gitBranch}</span>
                  </>
                ) : (
                  <span className="empty-hint">Elige un proyecto para ver Git</span>
                )}
              </div>
              {gitError && <div className="tool-error">{gitError}</div>}
              {workspace && (
                <>
                  <div className="git-section">
                    <div className="git-section-head">
                      <strong>{showStaged ? 'Stageados' : 'Sin stagear'}</strong>
                      <button className="btn small" onClick={() => { setShowStaged(!showStaged); setShowFileDiffPath(null) }}>{showStaged ? 'Ver sin stagear' : 'Ver stageados'}</button>
                    </div>
                    {gitStatusLoading ? (
                      <div className="empty-hint">Cargando...</div>
                    ) : gitFiles.length === 0 ? (
                      <div className="empty-hint">Sin cambios</div>
                    ) : (
                      <div className="git-file-list">
                        {gitFiles.filter((f) => showStaged ? f.staged : f.unstaged).map((f) => {
                          const statusClass = f.status === '??' ? 'untracked' : f.status.trim()
                          return (
                            <div key={f.path} className="git-file-item">
                              <span className={`git-file-status ${statusClass}`}>{f.status}</span>
                              <span className="git-file-path" title={f.path}>{f.path}</span>
                              <div className="git-file-actions">
                                {showStaged ? (
                                  <button className="icon-btn" onClick={() => unstageFile(f.path)} title="Deshacer stage"><ArrowDown size={12} /></button>
                                ) : (
                                  <button className="icon-btn" onClick={() => stageFile(f.path)} title="Stage"><ArrowUp size={12} /></button>
                                )}
                                <button className="icon-btn" onClick={() => openFileDiff(f.path)} title="Ver diff"><MessageSquare size={12} /></button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                  {showFileDiffPath && (
                    <div className="git-diff-panel">
                      <div className="git-diff-head">
                        <strong>Diff: {showFileDiffPath}</strong>
                        <button className="icon-btn" onClick={() => setShowFileDiffPath(null)}><XIcon size={14} /></button>
                      </div>
                      <pre className="diff-view">{gitFileDiff}</pre>
                    </div>
                  )}
                  <div className="git-section">
                    <div className="git-section-head">
                      <strong>Commit</strong>
                    </div>
                    <textarea
                      className="git-commit-input"
                      value={commitMsg}
                      onChange={(e) => setCommitMsg(e.target.value)}
                      placeholder="Mensaje del commit..."
                      rows={3}
                    />
                    <div className="git-commit-actions">
                      <button className="btn primary" onClick={doCommit} disabled={!commitMsg.trim() || gitCommitting}>
                        {gitCommitting ? <Loader2 size={13} className="spin" /> : <Check size={13} />} Commit
                      </button>
                      <button className="btn small" onClick={genCommitMsg} disabled={commitMsgGen} title="Genera un mensaje de commit con IA a partir del diff">
                        {commitMsgGen ? <Loader2 size={12} className="spin" /> : <Sparkles size={12} />} Generar con IA
                      </button>
                    </div>
                  </div>
                  <div className="git-section">
                    <strong>Historial</strong>
                    <div className="git-log">
                      {gitLog.map((c) => (
                        <div key={c.hash} className="git-log-item">
                          <code>{c.hash.slice(0, 7)}</code>
                          <span>{c.subject}</span>
                          <span className="git-log-meta">{c.author} · {c.date}</span>
                        </div>
                      ))}
                    </div>
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
          {!busy && !text && tools.length === 0 && !error && !loaded && (
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
                <button className="btn" onClick={openSelf} title="Abre la propia app (Nova AI) como proyecto para que el agente la desarrolle"><Bot size={15} /> Desarrollar Nova AI</button>
              </div>
              <div className="suggestions">
                {QUICK_ACTIONS.map((a) => (
                  <button key={a} className="suggestion" onClick={() => send(a)} disabled={busy}>{a}</button>
                ))}
              </div>
            </div>
          )}

          {loaded && !busy && !text && tools.length === 0 && !error && (
            <div className="welcome">
              <div className="welcome-logo"><History size={30} /></div>
              <h2>Sesión cargada</h2>
              <p className="hint">Estás viendo la sesión «{loaded.title}». Escribe un mensaje para continuarla: el agente retomará el contexto del trabajo anterior.</p>
            </div>
          )}

          {(text || thinking || (busy && tools.length === 0)) && (
            <div className="msg assistant">
              <div className="avatar" style={{ background: current?.color || '#8b5cf6' }}><Bot size={15} /></div>
              <div className="assistant-body">
                {thinking && (
                  <details className="thinking-block" open>
                    <summary><Sparkles size={11} /> Pensando… {busy && <Loader2 size={11} className="spin" />}</summary>
                    <pre>{thinking}</pre>
                  </details>
                )}
                {text ? (
                  <div className="md">
                    <Markdown text={text} />
                    {busy && <span className="cursor-blink" />}
                    {done && !tools.length && <span className="msg-done">✓</span>}
                  </div>
                ) : (
                  !thinking && <div className="working-hint"><Loader2 size={13} className="spin" /> El agente está trabajando…</div>
                )}
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
                  {t.status === 'error' && (
                    <>
                      <XCircle size={13} className="err" />
                      <button className="btn small" onClick={() => fixError(t)} disabled={busy} title="Envía el error al agente para que lo corrija"><Wrench size={12} /> Corregir</button>
                    </>
                  )}
                </div>
                {t.output && (
                  <pre className={`tool-output ${t.status === 'running' ? 'live' : ''}`}>{t.output}</pre>
                )}
                {t.error && <div className="tool-error">{t.error}</div>}
              </div>
            )
          })}

          {proposals.length > 0 && (
            <div className="proposals-panel">
              <div className="proposals-head">
                <span><Scissors size={13} /> Propuestas de cambios ({proposals.filter((p) => p.applied).length}/{proposals.length} aplicadas)</span>
                <div className="proposals-actions">
                  <button className="btn small" onClick={applyAll} disabled={busy || proposals.every((p) => p.applied)}><Check size={12} /> Aplicar todas</button>
                  <button className="btn small" onClick={undoAll} disabled={busy || !proposals.some((p) => p.applied)}><RefreshCw size={12} /> Deshacer todas</button>
                </div>
              </div>
              {proposals.map((p) => (
                <ProposalCard key={p.id} p={p} busy={busy} onApplySelected={(sel) => applyOne(sel)} onApplyAll={(orig) => applyOne(orig)} />
              ))}
            </div>
          )}

          {error && <div className="error-box">{error}</div>}

          {cpId && (
            <div className="cp-banner">
              <span><History size={13} /> Checkpoint creado antes de aplicar los cambios</span>
              <button className="btn small danger" onClick={restoreCheckpoint} title="Restaura los archivos al estado previo"><RefreshCw size={12} /> Restaurar</button>
            </div>
          )}

          {planSteps.length > 0 && (
            <div className="plan-checklist">
              <div className="plan-checklist-head">
                <span><List size={13} /> Plan propuesto — marca los pasos a ejecutar</span>
                <div className="plan-checklist-actions">
                  <button className="btn small" onClick={() => setPlanSteps(planSteps.map((s) => ({ ...s, checked: true })))}>Marcar todos</button>
                  <button className="btn small primary" onClick={runPlanSteps} disabled={!planSteps.some((s) => s.checked)}><Play size={12} /> Ejecutar aprobados</button>
                  <button className="btn small" onClick={() => setPlanSteps([])}><X size={12} /> Descartar</button>
                </div>
              </div>
              {planSteps.map((s, i) => (
                <label key={i} className="plan-step">
                  <input
                    type="checkbox"
                    checked={s.checked}
                    onChange={() => setPlanSteps(planSteps.map((x, j) => (j === i ? { ...x, checked: !x.checked } : x)))}
                  />
                  <input
                    className="plan-step-text"
                    value={s.text}
                    onChange={(e) => setPlanSteps(planSteps.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))}
                  />
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="input-area">
          {slashOpen && (
            <div className="slash-menu">
              {SLASH_COMMANDS.map((c) => (
                <button key={c.id} className="slash-item" onClick={() => applySlash(c)}>
                  <span className="slash-name">{c.name}</span>
                  <span className="slash-desc">{c.desc}</span>
                </button>
              ))}
            </div>
          )}
          {refs.length > 0 && (
            <div className="ref-pills">
              {refs.map((r) => (
                <span key={r.path} className={`ref-pill ${r.dir ? 'dir' : ''}`} title={r.path}>
                  {r.dir ? <Folder size={11} /> : <FileText size={11} />}
                  <span className="ref-pill-name">{r.name}</span>
                  {r.loading && <Loader2 size={10} className="spin" />}
                  <button className="ref-pill-x" onClick={() => removeRef(r.path)} title="Quitar referencia"><X size={10} /></button>
                </span>
              ))}
            </div>
          )}
          <div className="input-bar">
            <label className={`plan-toggle ${planMode ? 'on' : ''}`} title="Modo plan: el agente solo propone cambios (diffs) y no toca tus archivos hasta que los apruebes">
              <input type="checkbox" checked={planMode} onChange={(e) => setPlanMode(e.target.checked)} />
              <Scissors size={13} /> Plan
            </label>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value)
                setSlashOpen(e.target.value.startsWith('/') && !e.target.value.includes(' '))
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); setSlashOpen(false); send() }
                else if (e.key === 'Escape') setSlashOpen(false)
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

      {ctxMenu && (
        <div
          className="ctx-menu-backdrop"
          onClick={() => setCtxMenu(null)}
          onContextMenu={(e) => { e.preventDefault(); setCtxMenu(null) }}
        >
          <div className="ctx-menu" style={{ left: ctxMenu.x, top: ctxMenu.y }}>
            <button onClick={() => addRef(ctxMenu.path, ctxMenu.name, ctxMenu.dir)}>
              <FileText size={13} /> {ctxMenu.dir ? 'Añadir carpeta al chat' : 'Añadir archivo al chat'}
            </button>
            <button onClick={() => copyPath(ctxMenu.path)}>
              <Copy size={13} /> Copiar ruta
            </button>
            <button onClick={() => { window.api?.openPath(workspace, ctxMenu.path, 'vscode'); setCtxMenu(null) }}>
              <Code2 size={13} /> Abrir en VS Code
            </button>
            <button onClick={() => { window.api?.openPath(workspace, ctxMenu.path, 'explorer'); setCtxMenu(null) }}>
              <ExternalLink size={13} /> Mostrar en Explorador
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
