import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Bot, FolderOpen, Folder, FileText, Send, Square, Loader2, Terminal, List, Pencil, Globe, CheckCircle2, XCircle, Settings, BadgeCheck, Sparkles, X, Check, Trash2, History, Code2, ExternalLink, RefreshCw, Play, Scissors, Minus, Plus, ChevronLeft, ChevronRight, Eye, EyeOff, Copy, Columns, GitBranch, MessageSquare, ArrowUp, ArrowDown, X as XIcon, Wrench, Search, FileDown, Users } from 'lucide-react'
import Markdown from './Markdown.jsx'
import { uid, bytesToBase64 } from '../api.js'
import { PROMPTS, PROMPT_CATEGORIES } from '../prompts.js'
import i18n from '../i18n.js'
import { estimateCost } from '../costs.js'

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

function unifiedDiff(oldStr, newStr) {
  const a = (oldStr || '').split('\n')
  const b = (newStr || '').split('\n')
  const n = a.length
  const m = b.length
  if (n > 4000 || m > 4000) return ''
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }
  const ops = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (a[i] === b[j]) { ops.push({ t: ' ', x: a[i] }); i++; j++ }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { ops.push({ t: '-', x: a[i] }); i++ }
    else { ops.push({ t: '+', x: b[j] }); j++ }
  }
  while (i < n) ops.push({ t: '-', x: a[i++] })
  while (j < m) ops.push({ t: '+', x: b[j++] })
  if (ops.every((o) => o.t === ' ')) return ''
  const out = []
  const oldIdx = (x) => ops.slice(0, x).filter((o) => o.t !== '+').length
  const newIdx = (x) => ops.slice(0, x).filter((o) => o.t !== '-').length
  let k = 0
  while (k < ops.length) {
    if (ops[k].t === ' ') { k++; continue }
    const runStart = k
    let k2 = k
    while (k2 < ops.length && ops[k2].t !== ' ') k2++
    const ctxStart = Math.max(0, runStart - 3)
    const ctxEnd = Math.min(ops.length, k2 + 3)
    const sA = oldIdx(ctxStart)
    const sB = newIdx(ctxStart)
    const cA = oldIdx(ctxEnd) - sA
    const cB = newIdx(ctxEnd) - sB
    out.push(`@@ -${sA + 1},${cA} +${sB + 1},${cB} @@`)
    for (let x = ctxStart; x < ctxEnd; x++) out.push(ops[x].t + ops[x].x)
    k = k2
  }
  return out.join('\n')
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

function ToolOutput({ text, live }) {
  const [showAll, setShowAll] = useState(text.length <= 8000)
  const big = text.length > 8000
  return (
    <>
      {live || showAll ? (
        <pre className={`tool-output ${live ? 'live' : ''}`}>{text}</pre>
      ) : (
        <pre className="tool-output">{text.slice(0, 4000)}…</pre>
      )}
      {big && (
        <button className="tool-output-more" onClick={() => setShowAll((s) => !s)}>
          {showAll ? i18n.t('agent.showLess') : i18n.t('agent.showMore', { chars: text.length })}
        </button>
      )}
    </>
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

const TOOL_ICONS = { run_command: Terminal, read_file: FileText, list_files: List, write_file: Pencil, edit_file: Scissors, web_search: Globe, search_codebase: Search, delegate_task: Users }
const TOOL_NAMES = {
  run_command: 'Ejecutar comando',
  read_file: 'Leer archivo',
  list_files: 'Listar archivos',
  write_file: 'Editar archivo',
  edit_file: 'Edición quirúrgica',
  web_search: 'Buscar en web',
  search_codebase: i18n.t('agent.searchCode'),
  delegate_task: i18n.t('agent.delegate')
}

function toolSummary(t) {
  const a = t.args || {}
  if (t.name === 'run_command') return a.command || ''
  if (t.name === 'write_file' || t.name === 'edit_file' || t.name === 'read_file') return a.path || ''
  if (t.name === 'list_files') return a.path || '.'
  if (t.name === 'web_search') return a.query || ''
  if (t.name === 'search_codebase') return a.query || ''
  if (t.name === 'delegate_task') return `${(a.subtasks || []).length || 1} sub-tarea(s)`
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
  const [exportNotice, setExportNotice] = useState('')
  const [autoFix, setAutoFix] = useState(false)
  const [tokensChars, setTokensChars] = useState(0)
  const [termOutput, setTermOutput] = useState([])
  const [termInput, setTermInput] = useState('')
  const [termBusy, setTermBusy] = useState(false)
  const [edPath, setEdPath] = useState('')
  const [edContent, setEdContent] = useState('')
  const [edOriginal, setEdOriginal] = useState(null)
  const [edNotice, setEdNotice] = useState('')
  const [verifyBusy, setVerifyBusy] = useState(false)
  const [verifyResult, setVerifyResult] = useState(null)
  const [suggestion, setSuggestion] = useState('')
  const [preview, setPreview] = useState(null)
  const [previewTab, setPreviewTab] = useState('preview')
  const [previewDraft, setPreviewDraft] = useState('')
  const [previewShown, setPreviewShown] = useState('')
  const [previewNotice, setPreviewNotice] = useState('')
  const previewTimerRef = useRef(null)
  const sessionRef = useRef(null)
  const scrollRef = useRef(null)
  const textareaRef = useRef(null)
  const metaRef = useRef(null)
  const contentRef = useRef({ text: '', tools: [], proposals: [] })
  const autoFixRef = useRef(false)
  const autoFixCountRef = useRef(0)
  const sendRef = useRef(null)
  const busyRef = useRef(false)
  const tokensRef = useRef(0)
  const suggestTimerRef = useRef(null)
  const termOutRef = useRef(null)

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

  useEffect(() => { autoFixRef.current = autoFix }, [autoFix])
  useEffect(() => { busyRef.current = busy }, [busy])

  useEffect(() => {
    const unsub = window.api?.onTerminalEvent((ev) => {
      if (ev.id === 'agent-term') {
        if (ev.type === 'chunk') {
          setTermOutput((o) => [...o.slice(-1999), { type: 'out', text: ev.text }])
        } else if (ev.type === 'error') {
          setTermBusy(false)
          setTermOutput((o) => [...o.slice(-1999), { type: 'err', text: ev.text }])
        } else if (ev.type === 'exit') {
          setTermBusy(false)
          setTermOutput((o) => [...o.slice(-1999), { type: 'exit', text: i18n.t('agent.termExit', { code: ev.code ?? '?' }) }])
        }
      } else if (ev.id === 'agent-verify') {
        if (ev.type === 'exit') {
          setVerifyBusy(false)
          setVerifyResult({ ok: ev.code === 0, text: ev.code === 0 ? i18n.t('agent.verifyOk') : i18n.t('agent.verifyFail', { code: ev.code }), code: ev.code })
        } else if (ev.type === 'error') {
          setVerifyBusy(false)
          setVerifyResult({ ok: false, text: ev.text, code: null })
        }
      }
    })
    return () => unsub?.()
  }, [])

  useEffect(() => {
    termOutRef.current?.scrollTo({ top: termOutRef.current.scrollHeight })
  }, [termOutput])

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

  const fixPrompt = (t) => `El comando falló con este error:\n${t.error}\n\nSalida:\n${(t.output || '').slice(0, 1500)}\n\nCorrige el problema: encuentra la causa raíz y arregla el código, luego verifica con el build.`

  const fixError = (t) => {
    send(fixPrompt(t))
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
        tokensRef.current += ev.text.length
        setTokensChars(tokensRef.current)
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
        if (autoFixRef.current) {
          const lastErr = contentRef.current.tools.filter((t) => t.status === 'error').slice(-1)[0]
          if (lastErr && autoFixCountRef.current < 2) {
            autoFixCountRef.current++
            setTimeout(() => sendRef.current?.(fixPrompt(lastErr)), 400)
          }
        }
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
    tokensRef.current = 0
    setTokensChars(0)
    if (!override) autoFixCountRef.current = 0
    setSuggestion('')
    contentRef.current = { text: '', tools: [], proposals: [] }
    setText('')
    setTools([])
    setProposals([])
    setDone(false)
    setLoaded(null)
    setThinking('')
    setPlanSteps([])
    setCpId(null)
    setVerifyResult(null)
    const id = 'agent:' + uid()
    sessionRef.current = id
    const ctx = loaded ? buildContext(loaded) : undefined
    metaRef.current = { id, prompt, provider: providerId, model, createdAt: Date.now(), workspace }
    setBusy(true)
    window.api.sendAgent({ id, provider: providerId, model, prompt, workspace, skills: enabledIds, context: ctx, plan: planMode })
  }

  useEffect(() => { sendRef.current = send }, [send])

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
    tokensRef.current = 0
    setTokensChars(0)
    setVerifyResult(null)
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
    tokensRef.current = 0
    setTokensChars(0)
    setVerifyResult(null)
  }

  const runTermCmd = () => {
    if (!workspace || !termInput.trim()) return
    if (termBusy) {
      window.api?.terminalStop('agent-term')
      return
    }
    setTermBusy(true)
    setTermOutput((o) => [...o.slice(-1999), { type: 'cmd', text: `$ ${termInput.trim()}` }])
    window.api?.terminalRun('agent-term', workspace, termInput.trim())
  }

  const clearTerm = () => setTermOutput([])

  const runVerify = async () => {
    if (!workspace) return
    setVerifyBusy(true)
    setVerifyResult(null)
    try {
      const pkgRaw = await window.api?.readWorkspaceFile(workspace, 'package.json')
      let cmd = null
      if (pkgRaw) {
        try {
          const pkg = JSON.parse(pkgRaw)
          if (pkg?.scripts?.build) cmd = 'npm run build'
          else if (pkg?.scripts?.test) cmd = 'npm test'
        } catch { /* package.json inválido */ }
      }
      if (!cmd) {
        setVerifyResult({ ok: false, text: i18n.t('agent.verifyNoCmd'), code: null })
        setVerifyBusy(false)
        return
      }
      setVerifyResult({ ok: null, text: i18n.t('agent.verifyRunning'), code: null })
      window.api?.terminalRun('agent-verify', workspace, cmd)
    } catch (e) {
      setVerifyResult({ ok: false, text: String(e.message || e), code: null })
      setVerifyBusy(false)
    }
  }

  const loadEdFile = async () => {
    const p = edPath.trim()
    if (!p || !workspace) return
    setEdNotice('')
    const text = await window.api?.readWorkspaceFile(workspace, p)
    if (text == null) {
      setEdNotice(i18n.t('agent.edLoadError', { error: 'archivo no encontrado' }))
      return
    }
    setEdOriginal(text)
    setEdContent(text)
  }

  const saveEdFile = async () => {
    const r = await window.api?.writeWorkspaceFile(workspace, edPath.trim(), edContent)
    if (r?.ok) {
      setEdOriginal(edContent)
      setEdNotice(i18n.t('agent.edSaved', { path: edPath.trim() }))
      setTimeout(() => setEdNotice(''), 2500)
    } else {
      setEdNotice(r?.error || 'Error al guardar')
    }
  }

  const openPreview = async (rel) => {
    if (!workspace) return
    const text = await window.api?.readWorkspaceFile(workspace, rel)
    if (text == null) return
    setPreview(rel)
    setPreviewDraft(text)
    setPreviewShown(text)
    setPreviewTab('preview')
  }

  const updatePreviewDraft = (val) => {
    setPreviewDraft(val)
    clearTimeout(previewTimerRef.current)
    previewTimerRef.current = setTimeout(() => setPreviewShown(val), 500)
  }

  const savePreview = async () => {
    const r = await window.api?.writeWorkspaceFile(workspace, preview, previewDraft)
    if (r?.ok) {
      setPreviewShown(previewDraft)
      setPreviewNotice(i18n.t('agent.edSaved', { path: preview }))
      setTimeout(() => setPreviewNotice(''), 2500)
    } else {
      setPreviewNotice(r?.error || 'Error al guardar')
    }
  }

  const downloadPreview = () => {
    if (!preview) return
    const name = preview.split('/').pop() || 'index.html'
    window.api?.exportFile(name, [{ name: 'HTML', extensions: ['html'] }], bytesToBase64(new TextEncoder().encode(previewDraft)))
  }

  const requestSuggestion = (val) => {
    clearTimeout(suggestTimerRef.current)
    if (!val.trim() || busyRef.current || !current || (!current.hasKey && !current.local) || !workspace) {
      setSuggestion('')
      return
    }
    suggestTimerRef.current = setTimeout(async () => {
      const r = await window.api?.completeCode({ provider: providerId, model, code: val })
      if (r?.ok && r.text && !busyRef.current) {
        const sug = r.text.trim()
        setSuggestion(sug && !sug.includes('\n\n\n') ? sug.slice(0, 240) : '')
      } else {
        setSuggestion('')
      }
    }, 900)
  }

  const exportSession = async () => {
    const c = contentRef.current
    const meta = metaRef.current
    if (!c.text && !c.tools.length && !c.proposals.length) {
      setExportNotice(i18n.t('agent.noSession'))
      setTimeout(() => setExportNotice(''), 3000)
      return
    }
    const lines = []
    lines.push(`# ${meta?.prompt?.slice(0, 60) || i18n.t('agent.title')}`, '')
    if (meta?.prompt) lines.push(`**${i18n.t('agent.exportTask')}:** ${meta.prompt}`, '')
    if (c.text) lines.push(`## ${i18n.t('agent.exportAssistant')}`, '', c.text, '')
    if (c.tools.length) {
      lines.push(`## ${i18n.t('agent.exportTools')}`, '')
      c.tools.forEach((t) => {
        const status = t.status === 'done' ? i18n.t('agent.exportDone') : t.status === 'error' ? i18n.t('agent.exportError') : i18n.t('agent.exportRunning')
        const sum = toolSummary(t)
        lines.push(`- **${TOOL_NAMES[t.name] || t.name}** — ${status}${sum ? ` — \`${sum}\`` : ''}`)
      })
      lines.push('')
    }
    if (c.proposals.length) {
      lines.push(`## ${i18n.t('agent.exportProposals')}`, '')
      c.proposals.forEach((p) => lines.push(`- ${p.path} — ${p.applied ? i18n.t('agent.exportApplied') : i18n.t('agent.exportPending')}`))
      lines.push('')
    }
    await window.api?.exportText?.('Nova AI - Sesion agente.md', lines.join('\n'))
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
    runVerify()
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
    runVerify()
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
          <button className={`agent-tab ${sideTab === 'sessions' ? 'active' : ''}`} onClick={() => setSideTab('sessions')}><History size={13} /> {i18n.t('agent.tabsSessions')}</button>
          <button className={`agent-tab ${sideTab === 'files' ? 'active' : ''}`} onClick={() => setSideTab('files')}><Folder size={13} /> {i18n.t('agent.tabsFiles')}</button>
          <button className={`agent-tab ${sideTab === 'git' ? 'active' : ''}`} onClick={() => setSideTab('git')}><GitBranch size={13} /> {i18n.t('agent.tabsGit')}</button>
          <button className={`agent-tab ${sideTab === 'term' ? 'active' : ''}`} onClick={() => setSideTab('term')}><Terminal size={13} /> {i18n.t('agent.tabsTerm')}</button>
          <button className={`agent-tab ${sideTab === 'editor' ? 'active' : ''}`} onClick={() => setSideTab('editor')}><Code2 size={13} /> {i18n.t('agent.tabsEditor')}</button>
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
          {sideTab === 'term' && (
            <>
              <div className="agent-side-head">
                <span className="term-title"><Terminal size={12} /> {i18n.t('agent.termTitle')}</span>
                <button className="icon-btn" onClick={clearTerm} title={i18n.t('agent.termClear')}><Trash2 size={13} /></button>
              </div>
              <div className="term-body" ref={termOutRef}>
                {termOutput.length === 0 && (
                  <div className="empty-hint">{i18n.t('agent.termEmpty')}</div>
                )}
                {termOutput.map((l, i) => (
                  <pre key={i} className={`term-line ${l.type}`}>{l.text}</pre>
                ))}
              </div>
              <div className="term-input-row">
                <input
                  className="term-input"
                  placeholder={i18n.t('agent.termPlaceholder')}
                  value={termInput}
                  onChange={(e) => setTermInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') runTermCmd() }}
                />
                <button className="icon-btn" onClick={runTermCmd} title={termBusy ? i18n.t('agent.termStop') : i18n.t('agent.termRun')}>
                  {termBusy ? <Square size={13} /> : <Play size={13} />}
                </button>
              </div>
            </>
          )}
          {sideTab === 'editor' && (
            <>
              <div className="agent-side-head">
                <span className="term-title"><Code2 size={12} /> {i18n.t('agent.edTitle')}</span>
              </div>
              <div className="editor-bar">
                <input
                  className="grep-input"
                  placeholder={i18n.t('agent.edPathPlaceholder')}
                  value={edPath}
                  onChange={(e) => setEdPath(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') loadEdFile() }}
                />
                <button className="icon-btn" onClick={loadEdFile} title={i18n.t('agent.edOpen')}><FileText size={13} /></button>
                {edOriginal !== null && (
                  <button className="icon-btn ok" onClick={saveEdFile} title={i18n.t('agent.edSave')} disabled={edOriginal === edContent}><Check size={13} /></button>
                )}
              </div>
              {edNotice && <div className={`tool-error ${edNotice.includes(i18n.t('agent.edSaved', { path: '' })) ? 'ed-ok' : ''}`}>{edNotice}</div>}
              {edOriginal === null ? (
                <div className="empty-hint editor-empty">{i18n.t('agent.edEmpty')}</div>
              ) : (
                <>
                  <textarea
                    className="editor-area"
                    value={edContent}
                    onChange={(e) => setEdContent(e.target.value)}
                    spellCheck={false}
                  />
                  {edOriginal !== edContent && (
                    <div className="editor-diff">
                      <div className="editor-diff-head"><strong>{i18n.t('agent.edDiffTitle')}</strong></div>
                      <DiffView diff={unifiedDiff(edOriginal, edContent)} readOnly />
                    </div>
                  )}
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
            <span>{i18n.t('agent.title')}</span>
            {loaded && <span className="badge">{i18n.t('agent.sessionBadge')} {fmtDate(loaded.updatedAt)}</span>}
            {busy && <Loader2 size={14} className="spin" />}
          </div>
          <div className="chat-head-right">
            <button className="btn" onClick={() => setPromptsOpen(true)} title="Prompts avanzados listos para usar"><Sparkles size={14} /> {i18n.t('agent.prompts')}</button>
            <button className="btn" onClick={() => setSkillsOpen(true)} title="Skills del agente"><BadgeCheck size={14} /> {i18n.t('agent.skills')}</button>
            <button className={`btn ${workspace ? '' : 'primary'}`} onClick={pickWorkspace} title="Elige la carpeta del proyecto donde trabajará el agente">
              <FolderOpen size={14} />
              {workspace ? workspace.split(/[\\/]/).pop() : i18n.t('agent.chooseProject')}
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
              <button className="btn danger" onClick={stop}><Square size={13} /> {i18n.t('agent.stop')}</button>
            )}
            <button className={`btn ${autoFix ? 'primary' : ''}`} onClick={() => setAutoFix(!autoFix)} title={i18n.t('agent.autoFixTitle')}>
              <Wrench size={13} /> {i18n.t('agent.autoFix')}
            </button>
            {tokensChars > 0 && (
              <span className="tokens-badge" title="Tokens de salida estimados y coste aproximado">
                {i18n.t('agent.tokens', { tokens: (tokensChars / 4 / 1000).toFixed(1), cost: (() => { const c = estimateCost(tokensChars, model); return c < 0.01 ? c.toFixed(4) : c.toFixed(2) })() })}
              </span>
            )}
            <button className="icon-btn" onClick={exportSession} title={i18n.t('agent.exportSession')}><FileDown size={16} /></button>
            <button className="icon-btn" onClick={onOpenSettings} title={i18n.t('agent.settings')}><Settings size={16} /></button>
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
              <p className="hint">{i18n.t('agent.resumeHint')}: «{loaded.title}».</p>
              <div className="agent-welcome-actions">
                <button className="btn primary" onClick={() => send(i18n.t('agent.resumePrompt', { title: loaded.title }))}><Play size={14} /> {i18n.t('agent.resume')}</button>
                <button className="btn" onClick={newSession}><X size={13} /> Nueva sesión</button>
              </div>
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
                  {t.status === 'done' && /\.html?$/i.test((t.args || {}).path || '') && (
                    <button className="btn small preview-btn" onClick={() => openPreview(t.args.path)} title="Vista previa de la página"><Eye size={12} /> {i18n.t('agent.preview')}</button>
                  )}
                </div>
                {t.output && (
                  <ToolOutput text={t.output} live={t.status === 'running'} />
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
                  <button className="btn small" onClick={runVerify} disabled={busy || verifyBusy} title={i18n.t('agent.verifyTitle')}>
                    {verifyBusy ? <Loader2 size={12} className="spin" /> : <CheckCircle2 size={12} />} {i18n.t('agent.verify')}
                  </button>
                </div>
              </div>
              {proposals.map((p) => (
                <ProposalCard key={p.id} p={p} busy={busy} onApplySelected={(sel) => applyOne(sel)} onApplyAll={(orig) => applyOne(orig)} />
              ))}
            </div>
          )}

          {verifyResult && (
            <div className={`verify-banner ${verifyResult.ok === null ? 'run' : verifyResult.ok ? 'ok' : 'fail'}`}>
              <span>
                {verifyResult.ok === null && <Loader2 size={13} className="spin" />}
                {verifyResult.ok === true && <CheckCircle2 size={13} />}
                {verifyResult.ok === false && <XCircle size={13} />}
                {verifyResult.text}
              </span>
              {verifyResult.ok === false && (
                <button className="btn small danger" onClick={() => fixError({ error: verifyResult.text, output: '' })} disabled={busy} title="Envía el fallo de verificación al agente para que lo corrija">
                  <Wrench size={12} /> Corregir
                </button>
              )}
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
              <Scissors size={13} /> {i18n.t('agent.plan')}
            </label>
            <div className="input-wrap">
              {suggestion && !busy && (
                <div className="ghost-text" data-ghost={suggestion} title={i18n.t('agent.suggestionHint')}>{input}</div>
              )}
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value)
                  setSuggestion('')
                  setSlashOpen(e.target.value.startsWith('/') && !e.target.value.includes(' '))
                  requestSuggestion(e.target.value)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Tab' && suggestion) {
                    e.preventDefault()
                    setInput(input + suggestion)
                    setSuggestion('')
                  } else if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    setSlashOpen(false)
                    setSuggestion('')
                    send()
                  } else if (e.key === 'Escape') {
                    setSlashOpen(false)
                    setSuggestion('')
                  }
                }}
                placeholder={loaded ? 'Continúa la sesión: escribe tu siguiente instrucción…' : 'Pídele al agente: ejecuta el build, corrige los errores, crea una funcionalidad…'}
                rows={2}
                disabled={busy}
              />
            </div>
            {busy ? (
              <button className="btn danger" onClick={stop} title={i18n.t('agent.stop')}><Square size={16} /></button>
            ) : (
              <button className="btn primary" onClick={() => send()} disabled={!input.trim()} title={i18n.t('agent.send')}><Send size={16} /></button>
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

      {preview && (
        <div className="modal-backdrop" onClick={() => { clearTimeout(previewTimerRef.current); setPreview(null) }}>
          <div className="modal preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2><Eye size={16} /> {i18n.t('agent.previewTitle')}</h2>
              <code className="preview-file">{preview}</code>
              <button className="icon-btn" onClick={() => { clearTimeout(previewTimerRef.current); setPreview(null) }}><X size={18} /></button>
            </div>
            <div className="preview-tabs">
              <button className={`view-btn ${previewTab === 'preview' ? 'active' : ''}`} onClick={() => setPreviewTab('preview')}><Eye size={13} /> {i18n.t('agent.previewTab')}</button>
              <button className={`view-btn ${previewTab === 'code' ? 'active' : ''}`} onClick={() => setPreviewTab('code')}><Code2 size={13} /> {i18n.t('agent.previewCode')}</button>
            </div>
            <div className="preview-body">
              {previewTab === 'preview' ? (
                previewShown ? (
                  <iframe className="preview-iframe" title="preview" srcDoc={previewShown} sandbox="allow-scripts allow-same-origin" />
                ) : (
                  <div className="editor-empty">{i18n.t('agent.previewEmpty')}</div>
                )
              ) : (
                <textarea className="preview-code" spellCheck={false} value={previewDraft} onChange={(e) => updatePreviewDraft(e.target.value)} />
              )}
            </div>
            <div className="preview-foot">
              {previewNotice && <span className="ed-ok">{previewNotice}</span>}
              <button className="btn small" onClick={savePreview} title="Guarda los cambios en el archivo"><Check size={13} /> {i18n.t('agent.previewSave')}</button>
              <button className="btn small" onClick={downloadPreview} title="Descarga el archivo HTML"><FileDown size={13} /> {i18n.t('agent.previewDownload')}</button>
              <button className="btn small" onClick={() => window.api?.openPath(workspace, preview, 'browser')} title="Abre la página en tu navegador"><Globe size={13} /> {i18n.t('agent.previewBrowser')}</button>
              <button className="btn primary" onClick={() => { clearTimeout(previewTimerRef.current); setPreview(null) }}>{i18n.t('agent.previewClose')}</button>
            </div>
          </div>
        </div>
      )}

      {exportNotice && <div className="toast">{exportNotice}</div>}

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
