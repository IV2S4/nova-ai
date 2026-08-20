import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Send, Paperclip, Mic, Square, Settings, X, RefreshCw, Pencil, Copy, Check,
  Volume2, Trash2, Loader2, ChevronDown, ChevronUp, Globe, Search, Sparkles, Image as ImageIcon, FileText, Zap, Download, FileCode2, MessageSquareX, GitCompareArrows, Bot, FileDown, Brain, Bookmark
} from 'lucide-react'
import Markdown from './Markdown.jsx'
import { uid, speak, cancelSpeech, bytesToBase64 } from '../api.js'
import i18n from '../i18n.js'

const SUGGESTIONS = () => [
  { t: i18n.t('suggest-explain-concepts'), q: i18n.t('suggest-explain-concepts-q') },
  { t: i18n.t('suggest-write-emails'), q: i18n.t('suggest-write-emails-q') },
  { t: i18n.t('suggest-debug-code'), q: i18n.t('suggest-debug-code-q') },
  { t: i18n.t('suggest-business-ideas'), q: i18n.t('suggest-business-ideas-q') },
  { t: i18n.t('suggest-translate-improve'), q: i18n.t('suggest-translate-improve-q') },
  { t: i18n.t('suggest-exercise-routines'), q: i18n.t('suggest-exercise-routines-q') },
  { t: i18n.t('suggest-summarize-docs'), q: i18n.t('suggest-summarize-docs-q') },
  { t: i18n.t('suggest-job-interview'), q: i18n.t('suggest-job-interview-q') },
  { t: i18n.t('suggest-study-plan'), q: i18n.t('suggest-study-plan-q') },
  { t: i18n.t('suggest-creative-stories'), q: i18n.t('suggest-creative-stories-q') }
]

function isFreeModel(m, p) {
  if (p?.local) return true
  if (p?.id === 'groq') return true
  if (p?.id === 'mistral' && /^(mistral-small|ministral)/.test(m)) return true
  return /:free$/i.test(m) || /^gemini-[0-9].*flash/i.test(m) || /(^|[:\-])(free|gratis)$/i.test(m)
}

function ModelPicker({ providers, providerId, model, onChange, onOpenSettings, onReloadProviders }) {
  const [open, setOpen] = useState(false)
  const [custom, setCustom] = useState('')
  const prov = providers.find((p) => p.id === providerId) || providers[0]

  return (
    <div className="picker-wrap">
      <button className="model-btn" onClick={() => setOpen(!open)} title={i18n.t('change-model')}>
        <span className="provider-dot" style={{ background: prov?.color || '#888' }} />
        <span className="model-btn-name">{prov?.name}</span>
        <strong>{model}</strong>
        {prov?.imageModels?.includes(model) && <span className="img-tag">🎨 {i18n.t('img-tag')}</span>}
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="popover">
          {providers.map((p) => (
            <div key={p.id} className="popover-group">
              <div className="popover-group-head">
                <span className="provider-dot" style={{ background: p.color }} />
                {p.name}
                {!p.local && !p.hasKey && (
                  <button className="badge-btn" onClick={() => { setOpen(false); onOpenSettings() }}>{i18n.t('configure-key')}</button>
                )}
              </div>
              <div className="popover-models">
                {p.models.slice(0, 30).map((m) => (
                  <button
                    key={m}
                    className={`model-option ${p.id === providerId && m === model ? 'active' : ''}`}
                    onClick={() => { onChange(p.id, m); setOpen(false) }}
                  >
                    {m}
                    {isFreeModel(m, p) && <span className="free-tag">{i18n.t('free')}</span>}
                    {p.imageModels?.includes(m) && <span className="img-tag">🎨 {i18n.t('img-tag')}</span>}
                  </button>
                ))}
                {p.models.length === 0 && (
                  <span className="hint">
                    {p.local ? i18n.t('open-local-server-reload') : i18n.t('no-models')}
                    <button className="badge-btn" onClick={onReloadProviders}>{i18n.t('reload')}</button>
                  </span>
                )}
              </div>
            </div>
          ))}
          <div className="popover-custom">
            <input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder={i18n.t('custom-model-placeholder')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && custom.trim()) {
                  onChange(providerId, custom.trim())
                  setCustom('')
                  setOpen(false)
                }
              }}
            />
            <button
              className="btn"
              disabled={!custom.trim()}
              onClick={() => { onChange(providerId, custom.trim()); setCustom(''); setOpen(false) }}
            >
              {i18n.t('use')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ChatView({
  conv, updateConv, providers, runRequest, stopRequest, settings, onOpenSettings, onSaveSettings, hasAnyProvider, onReloadProviders, notify, convos, onViewChange
}) {
  const [input, setInput] = useState('')
  const [attachments, setAttachments] = useState([])
  const [webSearch, setWebSearch] = useState(settings?.webSearchDefault || false)
  const [searching, setSearching] = useState(false)
  const [searchFailed, setSearchFailed] = useState(false)
  const [sending, setSending] = useState(false)
  const [preparing, setPreparing] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [recState, setRecState] = useState('idle')
  const [attachError, setAttachError] = useState('')
  const [copiedId, setCopiedId] = useState(null)
  const [delMenuId, setDelMenuId] = useState(null)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [searchIdx, setSearchIdx] = useState(0)
  const [mentions, setMentions] = useState([])
  const [mentionOpen, setMentionOpen] = useState(false)
  const [mentionQ, setMentionQ] = useState('')
  const [mentionSel, setMentionSel] = useState(0)
  const [mentionItems, setMentionItems] = useState([])
  const mentionTriggerRef = useRef({ index: -1, query: '' })
  const recRef = useRef(null)
  const chunksRef = useRef([])
  const fileRef = useRef(null)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)
  const searchInputRef = useRef(null)
  const pendingIdRef = useRef(null)
  const fullTextRef = useRef('')
  const imagesRef = useRef([])
  const reasoningRef = useRef('')
  const flushTimerRef = useRef(null)
  const stickRef = useRef(true)
  const dragDepthRef = useRef(0)
  const searchResultsRef = useRef([])
  const convRef = useRef(conv)
  convRef.current = conv

  const tokenCount = useMemo(() => conv.messages.reduce((n, m) => n + Math.round((m.text || '').length / 4), 0), [conv.messages])

  const suggestions = SUGGESTIONS()

  const curProvider = providers.find((p) => p.id === conv.provider)
  const imageModel = !!curProvider?.imageModels?.includes(conv.model)
  const supportsThinking = (conv.provider === 'anthropic' && /^claude-(sonnet|opus|fable|haiku)/.test(conv.model)) ||
    (conv.provider === 'openai' && /^(gpt-5|o3)/.test(conv.model)) ||
    (conv.provider === 'google' && /^gemini-3/.test(conv.model))

  const onScroll = () => {
    const el = scrollRef.current
    if (!el) return
    stickRef.current = el.scrollTop + el.clientHeight >= el.scrollHeight - 120
    setShowScrollBtn(!stickRef.current)
  }

  const scrollToBottom = () => {
    stickRef.current = true
    setShowScrollBtn(false)
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }

  const runSearch = (q) => {
    const ql = q.trim().toLowerCase()
    const matches = ql
      ? convRef.current.messages.map((m) => ({ m })).filter(({ m }) => (m.text || '').toLowerCase().includes(ql))
      : []
    searchResultsRef.current = matches
    setSearchIdx(matches.length ? 0 : -1)
    if (matches.length) {
      document.getElementById('msg-' + matches[0].m.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  const jumpSearch = (dir) => {
    const matches = searchResultsRef.current
    if (!matches.length) return
    const next = (searchIdx + dir + matches.length) % matches.length
    setSearchIdx(next)
    document.getElementById('msg-' + matches[next].m.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const flushStream = (assistantId) => {
    if (flushTimerRef.current) return
    flushTimerRef.current = setTimeout(() => {
      flushTimerRef.current = null
      updateConv((c) => ({
        ...c,
        messages: c.messages.map((m) => (m.id === assistantId ? { ...m, text: fullTextRef.current, images: imagesRef.current.length ? imagesRef.current : m.images, reasoning: reasoningRef.current || m.reasoning } : m))
      }))
    }, 80)
  }

  const finalizeStream = (assistantId, extra = {}) => {
    clearTimeout(flushTimerRef.current)
    flushTimerRef.current = null
    updateConv((c) => ({
      ...c,
      messages: c.messages.map((m) => (m.id === assistantId ? { ...m, text: fullTextRef.current, images: imagesRef.current.length ? imagesRef.current : m.images, reasoning: reasoningRef.current || m.reasoning, streaming: false, ...extra } : m))
    }))
  }

  useEffect(() => {
    const onExport = () => exportConvo()
    window.addEventListener('nova:export', onExport)
    return () => window.removeEventListener('nova:export', onExport)
  })

  useEffect(() => {
    if (stickRef.current) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [conv.messages, sending])

useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'l') { e.preventDefault(); inputRef.current?.focus() }
        else if (e.key === 'f') { e.preventDefault(); setSearchOpen(true); setTimeout(() => searchInputRef.current?.focus(), 30) }
        return
      }
      if (e.key === 'Escape') {
        if (delMenuId) setDelMenuId(null)
        else if (searchOpen) { setSearchOpen(false); setSearchQ(''); setSearchIdx(0); searchResultsRef.current = [] }
        else if (mentionOpen) { setMentionOpen(false); setMentionQ(''); setMentionSel(0); setMentionItems([]) }
        else if (pendingIdRef.current) stop()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [delMenuId, searchOpen, mentionOpen])

  const searchMentionFiles = async (query) => {
    const ws = convRef.current?.workspace || settings?.agent?.workspace
    if (!ws) return []
    try {
      const res = await window.api.listWorkspaceFiles(ws, '.', query || undefined)
      if (res?.ok) return res.entries.filter((e) => !e.dir).slice(0, 15)
    } catch { }
    return []
  }

  const handleMentionTrigger = (value, cursorPos) => {
    const beforeCursor = value.slice(0, cursorPos)
    const match = beforeCursor.match(/@([^\s@]*)$/)
    if (match) {
      const query = match[1]
      const triggerIndex = cursorPos - match[0].length
      mentionTriggerRef.current = { index: triggerIndex, query }
      setMentionQ(query)
      setMentionOpen(true)
      setMentionSel(0)
      searchMentionFiles(query).then((items) => setMentionItems(items))
    } else {
      setMentionOpen(false)
      setMentionQ('')
      setMentionItems([])
      mentionTriggerRef.current = { index: -1, query: '' }
    }
  }

  const applyMention = (item) => {
    const { index, query } = mentionTriggerRef.current
    if (index === -1) return
    const before = input.slice(0, index)
    const after = input.slice(index + 1 + query.length)
    const mentionText = `@${item.rel || item.name} `
    setInput(before + mentionText + after)
    setMentions((m) => [...m, { id: uid(), name: item.name, path: item.rel || item.name, kind: 'file' }])
    setMentionOpen(false)
    setMentionQ('')
    setMentionItems([])
    mentionTriggerRef.current = { index: -1, query: '' }
    setTimeout(() => inputRef.current?.focus(), 10)
  }

  const removeMention = (id) => {
    setMentions((m) => m.filter((x) => x.id !== id))
  }

  const SLASH_CMDS = [
  { id: 'resumir', label: i18n.t('slash-summarize-convo'), desc: i18n.t('slash-summarize-convo-desc'), sys: 'Resume la conversación anterior de forma clara y concisa, con puntos clave.' },
  { id: 'mejorar', label: i18n.t('slash-improve-last'), desc: i18n.t('slash-improve-last-desc'), sys: 'Eres un editor experto. Mejora la respuesta del asistente anterior: corrige errores, hazla más clara y completa, manteniendo el formato y el sentido.' },
  { id: 'traducir', label: i18n.t('slash-translate-last'), desc: i18n.t('slash-translate-last-desc'), sys: 'Eres un traductor experto. Traduce la respuesta del asistente anterior al español manteniendo tono, formato y significado.' },
  { id: 'corto', label: i18n.t('slash-shorten-last'), desc: i18n.t('slash-shorten-last-desc'), sys: 'Resume la última respuesta del asistente en un máximo de 3 líneas.' },
  { id: 'explicar', label: i18n.t('slash-explain-last'), desc: i18n.t('slash-explain-last-desc'), sys: 'Explica la última respuesta del asistente con más detalle: paso a paso, con ejemplos y clarificando conceptos.' }
]

const ARTIFACT_RE = /```(html|svg)\n([\s\S]*?)```/g

function extractArtifacts(text) {
  const out = []
  if (!text) return out
  let m
  ARTIFACT_RE.lastIndex = 0
  while ((m = ARTIFACT_RE.exec(text)) !== null) {
    out.push({ id: `a${m.index}_${out.length}`, lang: m[1], code: m[2] })
  }
  return out
}

function Artifact({ art, fileName }) {
  const [editing, setEditing] = useState(false)
  const [code, setCode] = useState(art.code)
  const [copied, setCopied] = useState(false)
  useEffect(() => setCode(art.code), [art.code])
  const srcDoc = art.lang === 'html' ? code : `<!DOCTYPE html><html><body style="margin:0">${code}</body></html>`
  return (
    <div className="artifact">
      <div className="artifact-head">
        <span className="artifact-badge">{art.lang === 'html' ? '🌐' : '✨'} {art.lang.toUpperCase()}</span>
        <code className="artifact-file">{fileName}</code>
        <div className="artifact-actions">
          <button className="icon-btn" title={i18n.t('edit-code')} onClick={() => setEditing(!editing)}>{editing ? <Check size={13} /> : <Pencil size={13} />}</button>
          <button
            className="icon-btn"
            title={i18n.t('copy-code')}
            onClick={async () => {
              await navigator.clipboard.writeText(code)
              setCopied(true)
              setTimeout(() => setCopied(false), 1500)
            }}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
          </button>
          <button className="icon-btn" title={i18n.t('download')} onClick={() => window.api.exportText(fileName, code)}>
            <Download size={13} />
          </button>
        </div>
      </div>
      {editing && (
        <textarea
          className="artifact-edit"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          spellCheck={false}
        />
      )}
      <iframe
        key={code.length + (editing ? 'e' : '')}
        className="artifact-frame"
        srcDoc={srcDoc}
        sandbox="allow-scripts"
        title={fileName}
      />
    </div>
  )
}

  const [slashOpen, setSlashOpen] = useState(false)
  const [slashQ, setSlashQ] = useState('')
  const [slashSel, setSlashSel] = useState(0)
  const [tplOpen, setTplOpen] = useState(false)

  const applySlash = (cmd) => {
    setInput(`/${cmd.id} `)
    setSlashOpen(false)
    setSlashQ('')
    inputRef.current?.focus()
  }

  const applyTemplate = (t) => {
    setInput((v) => (v ? `${v}\n${t.text}` : t.text))
    setTplOpen(false)
    inputRef.current?.focus()
  }

  const stop = () => {
    cancelSpeech()
    const id = pendingIdRef.current
    if (id) {
      stopRequest(id)
      pendingIdRef.current = null
      setSending(false)
      finalizeStream(id)
    }
  }

  const send = async (textOverride, imageOverride, base) => {
    let text = (textOverride ?? input).trim()
    const attach = imageOverride ?? attachments
    if (sending || preparing || (!text && !attach.length)) return
    cancelSpeech()
    setSearchFailed(false)
    setPreparing(true)

    let slashSys = ''
    let userLabel = text
    const slashMatch = text.match(/^\/(resumir|mejorar|traducir|corto|explicar)\b(?:\s+([\s\S]*))?$/)
    if (slashMatch) {
      const cmd = SLASH_CMDS.find((c) => c.id === slashMatch[1])
      const param = (slashMatch[2] || '').trim()
      const lastAsst = [...(base ?? convRef.current.messages)].reverse().find((m) => m.role === 'assistant' && m.text)
      if (cmd.id !== 'resumir' && !lastAsst && !param) {
        notify(i18n.t('no-previous-response'))
        setPreparing(false)
        return
      }
      slashSys = cmd.sys
      if (cmd.id === 'resumir') {
        text = param || i18n.t('do-summary')
        userLabel = param ? i18n.t('summarize-prefix', { text: param }) : i18n.t('summarize-label')
      } else {
        text = param || `Aplica el comando a esta respuesta:\n\n${lastAsst.text}`
        const icons = { mejorar: '✏️', traducir: '🌐', corto: '⚡', explicar: '🔍' }
        userLabel = `${icons[cmd.id]} ${cmd.label}`
      }
    }

    const images = attach.filter((a) => a.kind === 'image')
    const textFiles = attach.filter((a) => a.kind === 'text')

    let mentionContent = ''
    if (mentions.length > 0) {
      const ws = convRef.current?.workspace || settings?.agent?.workspace
      if (ws) {
        for (const m of mentions) {
          try {
            const res = await window.api.readWorkspaceFile(ws, m.path)
            if (res?.ok) {
              mentionContent += `\n\n---\n### Archivo referenciado: ${res.path}\n${res.text.slice(0, 15000)}`
            }
          } catch { }
        }
      }
    }

    let content = text
    if (textFiles.length) {
      const parts = textFiles.map((a) => `\n\n---\n### Archivo: ${a.name}\n${(a.text || '').slice(0, 12000)}`)
      content = text ? text + parts.join('') : 'Analiza estos archivos:\n' + parts.join('')
    }
    if (mentionContent) {
      content = content ? content + mentionContent : 'Archivos referenciados:' + mentionContent
    }
    const userMsg = { id: uid(), role: 'user', text: userLabel || content, images: images.map((i) => ({ name: i.name, mime: i.mime, data: i.data })) }
    const assistantId = uid()

    setMentions([])

    let searchContext = null
    if (webSearch && text && !imageModel) {
      setSearching(true)
      try {
        const res = await window.api.webSearch(text)
        if (res) searchContext = res
        else setSearchFailed(true)
      } catch {
        setSearchFailed(true)
      } finally {
        setSearching(false)
      }
    }

    let contextImage = null
    if (imageModel && !images.length && convRef.current.imgEditLast !== false) {
      const lastGen = [...baseMsgs].reverse().find((m) => m.images?.length)
      if (lastGen) contextImage = { mime: lastGen.images[0].mime, data: lastGen.images[0].data }
    }

    let ragContext = ''
    const ragId = convRef.current.ragProject
    if (ragId && text && !imageModel) {
      setSearching(true)
      try {
        const r = await window.api.projectSearch({ id: ragId, query: text, topK: 5 })
        if (r?.ok && r.results?.length) {
          ragContext = r.results.map((c) => `[${c.file}]\n${c.text}`).join('\n\n')
        } else {
          setSearchFailed(true)
        }
      } catch {
        setSearchFailed(true)
      } finally {
        setSearching(false)
      }
    }

    const baseMsgs = base ?? convRef.current.messages
    const msgs = baseMsgs.map((m) => ({ role: m.role, text: m.text, images: m.images }))
    msgs.push({ role: 'user', text: content, images: userMsg.images })

    const newConv = {
      ...convRef.current,
      title: !convRef.current.title || convRef.current.title === 'Nueva conversación' ? text.slice(0, 48) || 'Conversación' : convRef.current.title,
      messages: [...baseMsgs, userMsg, { id: assistantId, role: 'assistant', text: '', streaming: true, search: !!searchContext }],
      updatedAt: Date.now()
    }
    pendingIdRef.current = assistantId
    fullTextRef.current = ''
    imagesRef.current = []
    reasoningRef.current = ''
    stickRef.current = true
    updateConv(newConv)
    setInput('')
    setAttachments([])
    setSending(true)
    setPreparing(false)

    runRequest(
      {
        provider: convRef.current.provider,
        model: convRef.current.model,
        system: [slashSys || convRef.current.system || '', ragContext ? `## Contexto de tu proyecto de conocimiento (RESPONDE USÁNDOLO)\n${ragContext}` : ''].filter(Boolean).join('\n\n'),
        temperature: convRef.current.temperature ?? 0.7,
        messages: msgs,
        images: userMsg.images,
        searchContext,
        ...(imageModel ? { imageFormat: convRef.current.imgFormat || 'square', imageCount: convRef.current.imgCount || 1 } : {}),
        ...(contextImage ? { contextImage } : {}),
        ...(supportsThinking ? { showThinking: !!convRef.current.showThinking, reasoningEffort: convRef.current.reasoningEffort || '' } : {})
      },
      {
        onDelta: (t) => {
          fullTextRef.current += t
          flushStream(assistantId)
        },
        onReasoning: (t) => {
          reasoningRef.current += t
          flushStream(assistantId)
        },
        onImage: (img) => {
          imagesRef.current.push({ name: img.name, mime: img.mime, data: img.data })
          flushStream(assistantId)
        },
        onDone: () => {
          pendingIdRef.current = null
          setSending(false)
          finalizeStream(assistantId)
          speak(fullTextRef.current, settings)
          maybeAutoTitle(assistantId)
        },
        onStopped: () => {
          pendingIdRef.current = null
          setSending(false)
          finalizeStream(assistantId)
        },
        onError: (message) => {
          pendingIdRef.current = null
          setSending(false)
          finalizeStream(assistantId, { error: message })
        }
      }
    )
  }

  const maybeAutoTitle = (assistantId) => {
    const c = convRef.current
    if (settings?.autoTitles === false) return
    if (c.title && c.title !== 'Nueva conversación') return
    const prov = providers.find((p) => p.id === c.provider)
    if (prov?.imageModels?.includes(c.model)) return
    const lastUser = [...c.messages].reverse().find((m) => m.role === 'user')
    const userText = lastUser?.text || ''
    if (userText.trim().length < 8) return
    window.api?.generateTitle({ provider: c.provider, model: c.model, text: userText }).then((r) => {
      if (r?.ok && r.title && convRef.current?.id === c.id) {
        updateConv((x) => ({ ...x, title: r.title, updatedAt: Date.now() }))
      }
    }).catch(() => { })
  }

  const regenerate = () => {
    if (sending || preparing) return
    const msgs = convRef.current.messages
    let li = -1
    for (let i = msgs.length - 1; i >= 0; i--) if (msgs[i].role === 'user') { li = i; break }
    if (li === -1) return
    const last = msgs[li]
    const base = msgs.slice(0, li)
    send(last.text, last.images || [], base)
  }

  const onFiles = async (files) => {
    for (const f of files) {
      try {
        const res = await window.api.extractFile(f)
        if (res.ok) {
          setAttachments((a) => [...a, { id: uid(), name: res.name, kind: res.kind, mime: res.mime, data: res.data, text: res.text }])
          setAttachError('')
        } else {
          setAttachError(res.error)
          setTimeout(() => setAttachError(''), 5000)
        }
      } catch (e) {
        setAttachError(e.message || i18n.t('file-read-error'))
        setTimeout(() => setAttachError(''), 5000)
      }
    }
  }

  const toggleMic = async () => {
    if (recState === 'recording') { recRef.current?.stop(); return }
    if (recState === 'transcribing') return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mime = MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : 'audio/webm'
      const rec = new MediaRecorder(stream, { mimeType: mime })
      chunksRef.current = []
      rec.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data) }
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: mime })
        const base64 = bytesToBase64(await blob.arrayBuffer())
        setRecState('transcribing')
        const res = await window.api.transcribe({ base64, mime })
        setRecState('idle')
        if (res.ok) {
          setInput((i) => (i ? i + ' ' : '') + res.text)
          inputRef.current?.focus()
        } else {
          setAttachError(res.error)
          setTimeout(() => setAttachError(''), 6000)
        }
      }
      recRef.current = rec
      rec.start()
      setRecState('recording')
    } catch {
      setAttachError(i18n.t('mic-unavailable'))
      setTimeout(() => setAttachError(''), 5000)
    }
  }

  const copyText = async (m) => {
    try {
      await navigator.clipboard.writeText(m.text)
      setCopiedId(m.id)
      setTimeout(() => setCopiedId(null), 1500)
    } catch { }
  }

  const deleteFrom = (id) => {
    if (sending) return
    const idx = convRef.current.messages.findIndex((m) => m.id === id)
    if (idx === -1) return
    updateConv({ ...convRef.current, messages: convRef.current.messages.slice(0, idx), updatedAt: Date.now() })
  }

  const deleteOne = (id) => {
    if (sending) return
    updateConv({ ...convRef.current, messages: convRef.current.messages.filter((m) => m.id !== id), updatedAt: Date.now() })
  }

  const changeModel = (providerId, model) => {
    updateConv({ ...convRef.current, provider: providerId, model, updatedAt: Date.now() })
  }

  const convoMessagesMd = () => {
    const lines = []
    for (const m of convRef.current.messages) {
      if (m.role === 'user') lines.push('## 👤 Tú', '', m.text || '', '')
      else lines.push('## 🤖 Aether AI', '', m.text || '', '')
    }
    return lines.join('\n')
  }

  const convoMarkdown = () => {
    const title = convRef.current.title || 'Conversación'
    const prov = providers.find((p) => p.id === convRef.current.provider)
    const lines = [`# ${title}`, '', `**Modelo:** ${prov?.name || ''} · ${convRef.current.model || ''}`, '', '---', '']
    return lines.join('\n') + '\n' + convoMessagesMd()
  }

  const exportConvo = async () => {
    const res = await window.api.exportText(`Aether AI - ${convRef.current.title || 'Conversación'}.md`, convoMarkdown())
    if (!res?.ok && res?.error) setAttachError(res.error)
  }

  const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const crcTable = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

const crc32 = (buf) => {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function zipStore(files) {
  const chunks = []
  const central = []
  let offset = 0
  const enc = new TextEncoder()
  for (const { name, data } of files) {
    const nameBuf = enc.encode(name)
    const crc = crc32(data)
    const head = new Uint8Array(30)
    const dv = new DataView(head.buffer)
    dv.setUint32(0, 0x04034b50, true)
    dv.setUint16(4, 20, true)
    dv.setUint16(8, 0, true)
    dv.setUint32(14, crc, true)
    dv.setUint32(18, data.length, true)
    dv.setUint32(22, data.length, true)
    dv.setUint16(26, nameBuf.length, true)
    chunks.push(head, nameBuf, data)
    const cen = new Uint8Array(46)
    const dv2 = new DataView(cen.buffer)
    dv2.setUint32(0, 0x02014b50, true)
    dv2.setUint16(4, 20, true)
    dv2.setUint16(6, 20, true)
    dv2.setUint32(16, crc, true)
    dv2.setUint32(20, data.length, true)
    dv2.setUint32(24, data.length, true)
    dv2.setUint16(28, nameBuf.length, true)
    dv2.setUint32(42, offset, true)
    central.push({ cen, nameBuf })
    offset += head.length + nameBuf.length + data.length
  }
  const cdSize = central.reduce((a, c) => a + c.cen.length + c.nameBuf.length, 0)
  const end = new Uint8Array(22)
  const dv3 = new DataView(end.buffer)
  dv3.setUint32(0, 0x06054b50, true)
  dv3.setUint16(8, central.length, true)
  dv3.setUint16(10, central.length, true)
  dv3.setUint32(12, cdSize, true)
  dv3.setUint32(16, offset, true)
  const out = []
  for (const c of chunks) out.push(c)
  for (const c of central) { out.push(c.cen); out.push(c.nameBuf) }
  out.push(end)
  return new Blob(out, { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
}

const xmlEsc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const exportDocx = async () => {
  const c = convRef.current
  const title = c.title || 'Conversación'
  const paras = [`<w:p><w:pPr><w:pStyle w:val="Title"/></w:pPr><w:r><w:t>${xmlEsc(title)}</w:t></w:r></w:p>`]
  paras.push(`<w:p><w:r><w:rPr><w:i/><w:color w:val="888888"/></w:rPr><w:t>${xmlEsc(`Exportado desde Aether AI · ${new Date().toLocaleString('es-ES')}`)}</w:t></w:r></w:p>`)
  for (const m of c.messages) {
    if (m.role !== 'user' && m.role !== 'assistant') continue
    const name = m.role === 'user' ? 'Tú' : 'Aether AI'
    const text = (m.text || '')
      .split('\n')
      .map((l) => `<w:p><w:r><w:rPr><w:b/></w:rPr><w:t>${xmlEsc(name + ':')}</w:t></w:r><w:r><w:t xml:space="preserve"> ${xmlEsc(l)}</w:t></w:r></w:p>`)
      .join('')
    paras.push(text)
    if (m.error) paras.push(`<w:p><w:r><w:rPr><w:color w:val="cc4444"/></w:rPr><w:t>${xmlEsc(m.error)}</w:t></w:r></w:p>`)
  }
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>
${paras.join('\n')}
<w:sectPr><w:pgSz w:w="11906" w:h="16838"/></w:sectPr>
</w:body>
</w:document>`
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
  const enc = new TextEncoder()
  const blob = zipStore([
    { name: '[Content_Types].xml', data: enc.encode(contentTypes) },
    { name: '_rels/.rels', data: enc.encode(rels) },
    { name: 'word/document.xml', data: enc.encode(documentXml) }
  ])
  const buf = new Uint8Array(await blob.arrayBuffer())
  let bin = ''
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000))
  const res = await window.api.exportFile(`Aether AI - ${title}.docx`, [{ name: 'Word', extensions: ['docx'] }], btoa(bin))
  if (!res?.ok && res?.error) setAttachError(res.error)
}

  const mdToHtml = (text) => {
    const lines = escapeHtml(text || '').split('\n')
    const out = []
    let inCode = false
    let codeBuf = []
    for (const line of lines) {
      const fence = /^```(\w*)/.exec(line)
      if (fence) {
        if (inCode) {
          out.push(`<pre><code>${codeBuf.join('\n')}</code></pre>`)
          codeBuf = []
        } else {
          out.push(`<pre><code class="lang-${escapeHtml(fence[1])}">`)
        }
        inCode = !inCode
        continue
      }
      if (inCode) { codeBuf.push(line); continue }
      if (!line.trim()) { out.push('<p></p>'); continue }
      if (/^###\s/.test(line)) out.push(`<h3>${line.slice(4)}</h3>`)
      else if (/^##\s/.test(line)) out.push(`<h2>${line.slice(3)}</h2>`)
      else if (/^#\s/.test(line)) out.push(`<h1>${line.slice(2)}</h1>`)
      else if (/^>\s?/.test(line)) out.push(`<blockquote>${line.replace(/^>\s?/, '')}</blockquote>`)
      else if (/^\d+\.\s/.test(line)) out.push(`<li class="ol">${line.replace(/^\d+\.\s/, '')}</li>`)
      else if (/^[-*]\s/.test(line)) out.push(`<li>${line.replace(/^[-*]\s/, '')}</li>`)
      else out.push(`<p>${line}</p>`)
    }
    if (inCode) out.push(`<pre><code>${codeBuf.join('\n')}</code></pre>`)
    return out.join('\n')
  }

  const exportPdf = async () => {
    const title = convRef.current.title || 'Conversación'
    const res = await window.api.exportPdf(`Aether AI - ${title}.pdf`, exportHtmlString(title))
    if (!res?.ok && res?.error) setAttachError(res.error)
  }

  const exportHtmlString = (title) => {
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} · Aether AI</title>
<style>
  body { font-family: 'Segoe UI', system-ui, sans-serif; background: #0b0e14; color: #e6e9f0; max-width: 860px; margin: 0 auto; padding: 32px 20px 64px; line-height: 1.65; }
  h1 { background: linear-gradient(135deg, #7c6cff, #22d3ee); -webkit-background-clip: text; background-clip: text; color: transparent; }
  h2 { color: #22d3ee; border-bottom: 1px solid #232a3b; padding-bottom: 6px; margin-top: 32px; }
  h3 { color: #7c6cff; }
  pre { background: #11151f; border: 1px solid #232a3b; border-radius: 10px; padding: 14px; overflow-x: auto; }
  code { font-family: Consolas, monospace; font-size: 13px; }
  blockquote { border-left: 3px solid #7c6cff; margin: 0; padding-left: 12px; color: #8b93a7; }
  li { margin: 3px 0; }
  a { color: #22d3ee; }
  .meta { color: #8b93a7; font-size: 13px; margin-bottom: 24px; }
</style>
</head>
<body>
<h1>${escapeHtml(title)}</h1>
<div class="meta">Exportado desde Aether AI · ${new Date().toLocaleString('es-ES')}</div>
${mdToHtml(convoMessagesMd())}
</body>
</html>`
    return html
  }

  const exportHtml = async () => {
    const title = convRef.current.title || 'Conversación'
    const html = exportHtmlString(title)
    const res = await window.api.exportText(`Aether AI - ${title}.html`, html)
    if (!res?.ok && res?.error) setAttachError(res.error)
  }

  const copyConvo = async () => {
    try {
      await navigator.clipboard.writeText(convoMarkdown())
      notify?.(i18n.t('convo-copied'))
    } catch { }
  }

  const empty = conv.messages.length === 0

  return (
    <div
      className="chat"
      onDragEnter={(e) => { e.preventDefault(); dragDepthRef.current++; setDragging(true) }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => { dragDepthRef.current = Math.max(0, dragDepthRef.current - 1); if (!dragDepthRef.current) setDragging(false) }}
      onDrop={(e) => {
        e.preventDefault()
        dragDepthRef.current = 0
        setDragging(false)
        if (e.dataTransfer.files?.length) onFiles([...e.dataTransfer.files])
      }}
    >
      {dragging && (
        <div className="drop-overlay"><Paperclip size={30} /> {i18n.t('drop-files')}</div>
      )}
      <div className="chat-head">
        <ModelPicker providers={providers} providerId={conv.provider} model={conv.model} onChange={changeModel} onOpenSettings={onOpenSettings} onReloadProviders={onReloadProviders} />
        <div className="chat-head-right">
          {tokenCount > 0 && <span className="tok-badge" title={i18n.t('token-approx')}>~{tokenCount} tok</span>}
          {sending && (
            <button className="btn danger" onClick={stop}><Square size={13} /> {i18n.t('stop')}</button>
          )}
          <button
            className="icon-btn"
            onClick={() => {
              const last = conv.messages.filter((m) => m.role === 'assistant' && m.text).at(-1)
              if (last) speak(last.text, { ...settings, voice: { ...(settings?.voice || {}), enabled: true } })
            }}
            title={i18n.t('listen-last')}
          >
            <Volume2 size={16} />
          </button>
          <button className="icon-btn" onClick={copyConvo} title={i18n.t('copy-full-convo')}><Copy size={16} /></button>
          <button className="icon-btn" onClick={exportConvo} title={i18n.t('export-md')}><Download size={16} /></button>
          <button className="icon-btn" onClick={exportHtml} title={i18n.t('export-html')}><FileCode2 size={16} /></button>
          <button className="icon-btn" onClick={exportPdf} title={i18n.t('export-pdf')}><FileText size={16} /></button>
          <button className="icon-btn" onClick={exportDocx} title={i18n.t('export-docx')}><FileDown size={16} /></button>
          <button className="icon-btn" onClick={onOpenSettings} title={i18n.t('settings')}><Settings size={16} /></button>
        </div>
      </div>

      <div className="messages" ref={scrollRef} onScroll={onScroll}>
        {searchOpen && (
          <div className="conv-search">
            <Search size={13} />
            <input
              ref={searchInputRef}
              value={searchQ}
              onChange={(e) => { setSearchQ(e.target.value); runSearch(e.target.value) }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); jumpSearch(e.shiftKey ? -1 : 1) }
                if (e.key === 'Escape') { setSearchOpen(false); setSearchQ(''); setSearchIdx(0); searchResultsRef.current = [] }
              }}
              placeholder={i18n.t('search-in-convo')}
            />
            <span className="conv-search-count">
              {searchResultsRef.current.length ? `${searchIdx + 1}/${searchResultsRef.current.length}` : ''}
            </span>
            <button className="icon-btn small" onClick={() => jumpSearch(-1)} title={i18n.t('previous-shift-enter')}><ChevronUp size={13} /></button>
            <button className="icon-btn small" onClick={() => jumpSearch(1)} title={i18n.t('next-enter')}><ChevronDown size={13} /></button>
            <button className="icon-btn small" onClick={() => { setSearchOpen(false); setSearchQ(''); setSearchIdx(0); searchResultsRef.current = [] }} title={i18n.t('close')}><X size={13} /></button>
          </div>
        )}
        {empty ? (
          <div className="welcome">
            <div className="welcome-logo"><Sparkles size={34} /></div>
            <h2>{i18n.t('what-create-today')}</h2>
            <p className="hint">
              {hasAnyProvider
                ? i18n.t('welcome-hint-has-provider')
                : i18n.t('welcome-hint-no-provider')}
            </p>
            <div className="welcome-stats">
              <div className="stat"><strong>{convos.length}</strong><span>{i18n.t('stat-conversations')}</span></div>
              <div className="stat"><strong>{convos.reduce((a, c) => a + (c.count || 0), 0)}</strong><span>{i18n.t('stat-messages')}</span></div>
              <div className="stat"><strong>{providers.filter((p) => p.hasKey || p.local).length}</strong><span>{i18n.t('stat-connected-ai')}</span></div>
            </div>
            <div className="welcome-actions">
              <button className="btn primary" onClick={() => onViewChange('compare')}><GitCompareArrows size={15} /> {i18n.t('compare-models')}</button>
              <button className="btn" onClick={() => onViewChange('agent')}><Bot size={15} /> {i18n.t('agent-ai')}</button>
            </div>
            <div className="suggestions">
              {suggestions.map((s) => (
                <button key={s.t} className="suggestion" title={s.q} onClick={() => { setInput(s.q); inputRef.current?.focus() }}>
                  <Zap size={13} /> {s.t}
                </button>
              ))}
            </div>
            {settings?.templates?.length > 0 && (
              <div className="suggestions" style={{ marginTop: 10 }}>
                {settings.templates.map((t) => (
                  <button key={t.id} className="suggestion" title={t.text} onClick={() => applyTemplate(t)}>
                    <Bookmark size={13} /> {t.title || t.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          conv.messages.map((m) => {
            if (m.role === 'user') {
              return (
                <div key={m.id} id={`msg-${m.id}`} className="msg user">
                  {editingId === m.id ? (
                    <div className="edit-box">
                      <textarea value={editText} onChange={(e) => setEditText(e.target.value)} autoFocus />
                      <div className="edit-actions">
                        <button className="btn" onClick={() => setEditingId(null)}>{i18n.t('cancel')}</button>
                        <button className="btn primary" onClick={() => {
                          const idx = conv.messages.findIndex((x) => x.id === m.id)
                          updateConv({ ...conv, messages: [...conv.messages.slice(0, idx), { ...m, text: editText }], updatedAt: Date.now() })
                          setEditingId(null)
                        }}>{i18n.t('save')}</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="user-bubble">
                        {m.images?.length > 0 && (
                          <div className="msg-images">
                            {m.images.map((img, i) => (
                              <img key={i} src={`data:${img.mime};base64,${img.data}`} alt={img.name} title={img.name} />
                            ))}
                          </div>
                        )}
                        <div className="md md-user">{m.text}</div>
                      </div>
                      <div className="msg-actions">
                        <button className="icon-btn" title={i18n.t('edit')} onClick={() => { setEditingId(m.id); setEditText(m.text) }}><Pencil size={13} /></button>
                        <button className="icon-btn" title={i18n.t('delete-message')} onClick={() => setDelMenuId(delMenuId === m.id ? null : m.id)}><Trash2 size={13} /></button>
                      </div>
                      {delMenuId === m.id && (
                        <div className="del-menu" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => { deleteOne(m.id); setDelMenuId(null) }}><MessageSquareX size={13} /> {i18n.t('delete-only-this')}</button>
                          <button onClick={() => { deleteFrom(m.id); setDelMenuId(null) }}><Trash2 size={13} /> {i18n.t('delete-this-and-following')}</button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            }
            return (
              <div key={m.id} id={`msg-${m.id}`} className="msg assistant">
                <div className="avatar" style={{ background: providers.find((p) => p.id === conv.provider)?.color }}>N</div>
                <div className="assistant-body">
                  {m.search && <div className="search-note"><Search size={12} /> {i18n.t('includes-web-search')}</div>}
                  <div className="md">
                    {m.reasoning && !m.streaming && (
                      <details className="reasoning-box">
                        <summary>{i18n.t('model-reasoning')}</summary>
                        <div className="reasoning-content">{m.reasoning}</div>
                      </details>
                    )}
                    {m.text ? <Markdown text={m.text} /> : m.streaming ? <span className="gen-hint"><Loader2 size={13} className="spin" /> {i18n.t('generating-image')}</span> : <span className="cursor-blink" />}
                    {m.streaming && m.text && <span className="cursor-blink" />}
                    {!m.streaming && extractArtifacts(m.text || '').map((art) => (
                      <Artifact key={art.id} art={art} fileName={`artifact-${m.id.slice(-6)}.${art.lang}`} />
                    ))}
                    {m.error && (
                      <div className="error-box retry-box">
                        <span>{m.error}</span>
                        <button className="retry-btn" onClick={regenerate} title={i18n.t('retry-same-message')}>
                          <RefreshCw size={12} /> {i18n.t('retry')}
                        </button>
                      </div>
                    )}
                  </div>
                  {m.images?.length > 0 && (
                    <div className="msg-images gen">
                      {m.images.map((img, i) => (
                        <div key={i} className="gen-img">
                          <img src={`data:${img.mime};base64,${img.data}`} alt={img.name} title={img.name} />
                          {!m.streaming && (
                            <div className="gen-img-actions">
                              <button className="icon-btn" title={i18n.t('download-image')} onClick={() => window.api.saveImageFile(img.name, img.data, img.mime)}><Download size={13} /></button>
                              <button className="icon-btn" title={i18n.t('edit-image-chat')} onClick={() => setAttachments([{ id: uid(), name: img.name, kind: 'image', mime: img.mime, data: img.data }])}><Pencil size={13} /></button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {!m.streaming && (
                    <div className="msg-actions">
                      <button className="icon-btn" title={i18n.t('copy')} onClick={() => copyText(m)}>{copiedId === m.id ? <Check size={13} /> : <Copy size={13} />}</button>
                      <button className="icon-btn" title={i18n.t('reply-again')} onClick={regenerate}><RefreshCw size={13} /></button>
                      <button className="icon-btn" title={i18n.t('listen')} onClick={() => speak(m.text, { ...settings, voice: { ...(settings?.voice || {}), enabled: true } })}><Volume2 size={13} /></button>
                      <button className="icon-btn" title={i18n.t('delete-message')} onClick={() => setDelMenuId(delMenuId === m.id ? null : m.id)}><Trash2 size={13} /></button>
                    </div>
                  )}
                  {!m.streaming && delMenuId === m.id && (
                    <div className="del-menu" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => { deleteOne(m.id); setDelMenuId(null) }}><MessageSquareX size={13} /> {i18n.t('delete-only-this')}</button>
                      <button onClick={() => { deleteFrom(m.id); setDelMenuId(null) }}><Trash2 size={13} /> {i18n.t('delete-this-and-following')}</button>
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
        {showScrollBtn && !empty && (
          <button className="scroll-bottom-btn" onClick={scrollToBottom} title={i18n.t('go-to-bottom')}><ChevronDown size={16} /></button>
        )}
      </div>

      <div className="input-area">
        {showOptions && (
          <div className="options-panel">
{supportsThinking && (
            <>
              <label className="row-check">
                <input type="checkbox" checked={!!conv.showThinking} onChange={(e) => updateConv({ ...conv, showThinking: e.target.checked })} />
                <Brain size={14} /> {i18n.t('show-model-reasoning')}
              </label>
              <div className="row-slider">
                <span>{i18n.t('reasoning-effort')}</span>
                <select className="thinking-select" value={conv.reasoningEffort || ''} onChange={(e) => updateConv({ ...conv, reasoningEffort: e.target.value })}>
                  <option value="">{i18n.t('automatic')}</option>
                  <option value="bajo">{i18n.t('low')}</option>
                  <option value="medio">{i18n.t('medium')}</option>
                  <option value="alto">{i18n.t('high')}</option>
                </select>
              </div>
            </>
          )}
          {!imageModel && (settings?.projects || []).length > 0 && (
            <div className="row-slider">
              <span>{i18n.t('knowledge-project')}</span>
              <select className="thinking-select" value={conv.ragProject || ''} onChange={(e) => updateConv({ ...conv, ragProject: e.target.value })}>
                <option value="">{i18n.t('no-project')}</option>
                {settings.projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}
          <label className="row-check">
            <input type="checkbox" checked={webSearch} onChange={(e) => setWebSearch(e.target.checked)} />
            <Globe size={14} /> {i18n.t('web-search-before')}
          </label>
            <div className="row-slider">
              <span>{i18n.t('creativity-temperature')}</span>
              <input
                type="range" min="0" max="2" step="0.1"
                value={conv.temperature ?? 0.7}
                onChange={(e) => updateConv({ ...conv, temperature: parseFloat(e.target.value) })}
              />
              <span>{conv.temperature ?? 0.7}</span>
            </div>
            <label className="row-check">
              <input type="checkbox" checked={settings?.voice?.enabled || false} onChange={async (e) => {
                const s = await window.api.saveSettings({ voice: { ...(settings?.voice || {}), enabled: e.target.checked } })
                onSaveSettings?.(s)
              }} />
              <Volume2 size={14} /> {i18n.t('respond-voice')}
            </label>
            <textarea
              className="system-input"
              value={conv.system || ''}
              onChange={(e) => updateConv({ ...conv, system: e.target.value })}
              placeholder={i18n.t('system-instructions-placeholder')}
            />
          </div>
        )}

        {imageModel && (
          <div className="img-controls">
            <div className="img-seg">
              {[
                { id: 'square', label: i18n.t('square') },
                { id: 'wide', label: i18n.t('wide') },
                { id: 'tall', label: i18n.t('tall') }
              ].map((f) => (
                <button
                  key={f.id}
                  className={`seg-btn ${(conv.imgFormat || 'square') === f.id ? 'active' : ''}`}
                  onClick={() => updateConv({ ...conv, imgFormat: f.id })}
                  title={i18n.t('image-format')}
                >
                  {f.label}
                </button>
              ))}
            </div>
            {conv.provider === 'openai' && (
              <div className="img-seg" title={i18n.t('image-count')}>
                {[1, 2, 3, 4].map((n) => (
                  <button
                    key={n}
                    className={`seg-btn ${(conv.imgCount || 1) === n ? 'active' : ''}`}
                    onClick={() => updateConv({ ...conv, imgCount: n })}
                  >
                    ×{n}
                  </button>
                ))}
              </div>
            )}
            {conv.messages.some((m) => m.images?.length) && (
              <label className="row-check img-edit-toggle" title={i18n.t('edit-previous-tip')}>
                <input type="checkbox" checked={conv.imgEditLast !== false} onChange={(e) => updateConv({ ...conv, imgEditLast: e.target.checked })} />
                <Pencil size={13} /> {i18n.t('edit-previous')}
              </label>
            )}
          </div>
        )}

        {attachments.length > 0 && (
          <div className="attachments">
            {attachments.map((a) => (
              <div key={a.id} className="attach-chip" title={a.name}>
                {a.kind === 'image' ? (
                  <img src={`data:${a.mime};base64,${a.data}`} alt="" />
                ) : (
                  <FileText size={14} />
                )}
                <span>{a.name}</span>
                <button className="icon-btn" onClick={() => setAttachments((x) => x.filter((y) => y.id !== a.id))}><X size={12} /></button>
              </div>
            ))}
          </div>
        )}

        {mentions.length > 0 && (
          <div className="mentions-bar">
            {mentions.map((m) => (
              <div key={m.id} className="mention-chip">
                <FileCode2 size={12} />
                <span>@{m.name}</span>
                <button className="icon-btn" onClick={() => removeMention(m.id)}><X size={10} /></button>
              </div>
            ))}
          </div>
        )}

        {attachError && <div className="error-box small">{attachError}</div>}

        <div className="input-bar-wrap">
          {slashOpen && (
            <div className="slash-menu">
              {SLASH_CMDS.filter((c) => c.id.startsWith(slashQ)).map((c, i) => (
                <div key={c.id} className={`slash-item ${i === slashSel ? 'active' : ''}`} onMouseEnter={() => setSlashSel(i)} onMouseDown={() => applySlash(c)}>
                  <span className="slash-name">/{c.id}</span>
                  <span className="slash-desc">{c.desc}</span>
                </div>
              ))}
            </div>
          )}
          {mentionOpen && mentionItems.length > 0 && (
            <div className="mention-menu">
              {mentionItems.map((item, i) => (
                <div key={item.rel || item.name} className={`mention-item ${i === mentionSel ? 'active' : ''}`} onMouseEnter={() => setMentionSel(i)} onMouseDown={() => applyMention(item)}>
                  <FileCode2 size={12} />
                  <span className="mention-name">@{item.rel || item.name}</span>
                  <span className="mention-hint">{item.size ? `${Math.round(item.size / 1024)} KB` : ''}</span>
                </div>
              ))}
            </div>
          )}
        <div className="input-bar">
          {!imageModel && (
            <button className={`icon-btn ${webSearch ? 'on' : ''}`} onClick={() => setWebSearch(!webSearch)} title={i18n.t('search-web')}>
              <Globe size={17} />
            </button>
          )}
          {!imageModel && settings?.templates?.length > 0 && (
            <div className="tpl-wrap">
              <button className="icon-btn" onClick={() => setTplOpen(!tplOpen)} title={i18n.t('insert-template')}>
                <Bookmark size={17} />
              </button>
              {tplOpen && (
                <div className="tpl-menu">
                  {settings.templates.map((t) => (
                    <div key={t.id} className="slash-item" onMouseDown={() => applyTemplate(t)}>
                      <span className="slash-name">{t.title || t.name}</span>
                      <span className="slash-desc">{t.text.slice(0, 60)}{t.text.length > 60 ? '…' : ''}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <button className={`icon-btn ${showOptions ? 'on' : ''}`} onClick={() => setShowOptions(!showOptions)} title={i18n.t('options')}>
            <ChevronDown size={17} />
          </button>
          <button className="icon-btn" onClick={() => fileRef.current?.click()} title={imageModel ? i18n.t('attach-photo-edit') : i18n.t('attach-file')}>
            <Paperclip size={17} />
          </button>
          <input ref={fileRef} type="file" multiple hidden onChange={(e) => { onFiles([...e.target.files]); e.target.value = '' }} />
          <textarea
            ref={inputRef}
            className="input"
            value={input}
            placeholder={searching ? i18n.t('searching-web') : imageModel ? i18n.t('image-input-placeholder') : i18n.t('input-placeholder')}
            onChange={(e) => {
              const v = e.target.value
              setInput(v)
              const m = v.match(/^\/(\w*)$/)
              if (m && !imageModel) { setSlashOpen(true); setSlashQ(m[1]); setSlashSel(0) }
              else { setSlashOpen(false); setSlashQ('') }
              if (!v) setTplOpen(false)
              const cursorPos = e.target.selectionStart
              handleMentionTrigger(v, cursorPos)
            }}
            onKeyDown={(e) => {
              if (mentionOpen) {
                if (e.key === 'ArrowDown') { e.preventDefault(); setMentionSel((i) => Math.min(i + 1, mentionItems.length - 1)) }
                else if (e.key === 'ArrowUp') { e.preventDefault(); setMentionSel((i) => Math.max(i - 1, 0)) }
                else if (e.key === 'Enter') { e.preventDefault(); if (mentionItems[mentionSel]) applyMention(mentionItems[mentionSel]) }
                else if (e.key === 'Escape') { setMentionOpen(false); setMentionQ(''); setMentionItems([]) }
                return
              }
              if (slashOpen) {
                const list = SLASH_CMDS.filter((c) => c.id.startsWith(slashQ))
                if (e.key === 'ArrowDown') { e.preventDefault(); setSlashSel((i) => Math.min(i + 1, list.length - 1)) }
                else if (e.key === 'ArrowUp') { e.preventDefault(); setSlashSel((i) => Math.max(i - 1, 0)) }
                else if (e.key === 'Enter') { e.preventDefault(); if (list[slashSel]) applySlash(list[slashSel]) }
                else if (e.key === 'Escape') { setSlashOpen(false); setSlashQ('') }
                return
              }
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            onSelect={(e) => {
              const cursorPos = e.target.selectionStart
              handleMentionTrigger(input, cursorPos)
            }}
            onPaste={(e) => {
              const items = e.clipboardData?.items || []
              const files = []
              for (const it of items) {
                if (it.kind === 'file') {
                  const f = it.getAsFile()
                  if (f) files.push(f)
                }
              }
              if (files.length) {
                e.preventDefault()
                onFiles(files)
              }
            }}
            rows={Math.min(8, Math.max(1, input.split('\n').length))}
          />
          <button
            className={`icon-btn mic ${recState !== 'idle' ? 'rec' : ''}`}
            onClick={toggleMic}
            title={recState === 'idle' ? i18n.t('dictate-voice') : recState === 'recording' ? i18n.t('stop-recording') : i18n.t('transcribing')}
          >
            {recState === 'idle' ? <Mic size={17} /> : recState === 'recording' ? <Square size={17} /> : <Loader2 size={17} className="spin" />}
          </button>
          <button className="btn primary send-btn" onClick={() => send()} disabled={sending || preparing || (!input.trim() && !attachments.length)} title={imageModel ? i18n.t('generate-image') : i18n.t('send')}>
            {sending || preparing ? <Loader2 size={16} className="spin" /> : imageModel ? <Sparkles size={16} /> : <Send size={16} />}
            {imageModel && !sending && !preparing && <span className="send-label">{i18n.t('generate')}</span>}
          </button>
        </div>
        </div>
        <div className="input-foot">
          <span className="hint">
            {imageModel && !searchFailed && <span className="img-hint">{i18n.t('img-hint')}</span>}
            {searchFailed && <span className="search-fail">{i18n.t('no-web-results')}</span>}
            {recState === 'recording' && <span className="rec-hint">{i18n.t('recording-hint')}</span>}
          </span>
        </div>
      </div>
    </div>
  )
}