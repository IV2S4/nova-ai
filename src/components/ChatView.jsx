import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Send, Paperclip, Mic, Square, Settings, X, RefreshCw, Pencil, Copy, Check,
  Volume2, Trash2, Loader2, ChevronDown, ChevronUp, Globe, Search, Sparkles, Image as ImageIcon, FileText, Zap, Download, FileCode2, MessageSquareX, GitCompareArrows, Bot, FileDown
} from 'lucide-react'
import Markdown from './Markdown.jsx'
import { uid, speak, cancelSpeech, bytesToBase64 } from '../api.js'

const SUGGESTIONS = [
  { t: 'Explicar conceptos', q: 'Explícame qué es la inteligencia artificial como si tuviera 10 años' },
  { t: 'Escribir emails', q: 'Escribe un email profesional solicitando un aumento de sueldo' },
  { t: 'Depurar código', q: 'Ayúdame a depurar este código: (pega tu código)' },
  { t: 'Ideas de negocio', q: 'Dame 5 ideas de negocios para 2026' },
  { t: 'Traducir y mejorar', q: 'Traduce y mejora este texto: (pega tu texto)' },
  { t: 'Rutinas de ejercicio', q: 'Crea una rutina de ejercicio semanal para principiantes' },
  { t: 'Resumir documentos', q: 'Resume el siguiente texto en 5 puntos clave: (pega tu texto)' },
  { t: 'Entrevista de trabajo', q: 'Prepárame para una entrevista de trabajo como desarrollador: hazme 10 preguntas difíciles' },
  { t: 'Plan de estudio', q: 'Crea un plan de estudio de 4 semanas para aprender React desde cero' },
  { t: 'Historias creativas', q: 'Escribe un cuento corto de ciencia ficción con un asistente de IA como protagonista' }
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
      <button className="model-btn" onClick={() => setOpen(!open)} title="Cambiar modelo">
        <span className="provider-dot" style={{ background: prov?.color || '#888' }} />
        <span className="model-btn-name">{prov?.name}</span>
        <strong>{model}</strong>
        {prov?.imageModels?.includes(model) && <span className="img-tag">🎨 imagen</span>}
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
                  <button className="badge-btn" onClick={() => { setOpen(false); onOpenSettings() }}>configurar clave</button>
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
                    {isFreeModel(m, p) && <span className="free-tag">gratis</span>}
                    {p.imageModels?.includes(m) && <span className="img-tag">🎨 imagen</span>}
                  </button>
                ))}
                {p.models.length === 0 && (
                  <span className="hint">
                    {p.local ? 'Abre el servidor local y pulsa aquí para recargar' : 'Sin modelos disponibles'}
                    <button className="badge-btn" onClick={onReloadProviders}>recargar</button>
                  </span>
                )}
              </div>
            </div>
          ))}
          <div className="popover-custom">
            <input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="Modelo personalizado (cualquier ID)"
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
              Usar
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
  const recRef = useRef(null)
  const chunksRef = useRef([])
  const fileRef = useRef(null)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)
  const searchInputRef = useRef(null)
  const pendingIdRef = useRef(null)
  const fullTextRef = useRef('')
  const imagesRef = useRef([])
  const flushTimerRef = useRef(null)
  const stickRef = useRef(true)
  const dragDepthRef = useRef(0)
  const searchResultsRef = useRef([])
  const convRef = useRef(conv)
  convRef.current = conv

  const tokenCount = useMemo(() => conv.messages.reduce((n, m) => n + Math.round((m.text || '').length / 4), 0), [conv.messages])

  const curProvider = providers.find((p) => p.id === conv.provider)
  const imageModel = !!curProvider?.imageModels?.includes(conv.model)

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
        messages: c.messages.map((m) => (m.id === assistantId ? { ...m, text: fullTextRef.current, images: imagesRef.current.length ? imagesRef.current : m.images } : m))
      }))
    }, 80)
  }

  const finalizeStream = (assistantId, extra = {}) => {
    clearTimeout(flushTimerRef.current)
    flushTimerRef.current = null
    updateConv((c) => ({
      ...c,
      messages: c.messages.map((m) => (m.id === assistantId ? { ...m, text: fullTextRef.current, images: imagesRef.current.length ? imagesRef.current : m.images, streaming: false, ...extra } : m))
    }))
  }

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
        else if (pendingIdRef.current) stop()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

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
    const text = (textOverride ?? input).trim()
    const attach = imageOverride ?? attachments
    if (sending || preparing || (!text && !attach.length)) return
    cancelSpeech()
    setSearchFailed(false)
    setPreparing(true)

    const images = attach.filter((a) => a.kind === 'image')
    const textFiles = attach.filter((a) => a.kind === 'text')
    let content = text
    if (textFiles.length) {
      const parts = textFiles.map((a) => `\n\n---\n### Archivo: ${a.name}\n${(a.text || '').slice(0, 12000)}`)
      content = text ? text + parts.join('') : 'Analiza estos archivos:\n' + parts.join('')
    }
    const userMsg = { id: uid(), role: 'user', text: content, images: images.map((i) => ({ name: i.name, mime: i.mime, data: i.data })) }
    const assistantId = uid()

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
        system: convRef.current.system || '',
        temperature: convRef.current.temperature ?? 0.7,
        messages: msgs,
        images: userMsg.images,
        searchContext,
        ...(imageModel ? { imageFormat: convRef.current.imgFormat || 'square', imageCount: convRef.current.imgCount || 1 } : {}),
        ...(contextImage ? { contextImage } : {})
      },
      {
        onDelta: (t) => {
          fullTextRef.current += t
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
        setAttachError(e.message || 'No se pudo leer el archivo')
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
      setAttachError('Micrófono no disponible')
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
      else lines.push('## 🤖 Nova AI', '', m.text || '', '')
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
    const res = await window.api.exportText(`Nova AI - ${convRef.current.title || 'Conversación'}.md`, convoMarkdown())
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
  paras.push(`<w:p><w:r><w:rPr><w:i/><w:color w:val="888888"/></w:rPr><w:t>${xmlEsc(`Exportado desde Nova AI · ${new Date().toLocaleString('es-ES')}`)}</w:t></w:r></w:p>`)
  for (const m of c.messages) {
    if (m.role !== 'user' && m.role !== 'assistant') continue
    const name = m.role === 'user' ? 'Tú' : 'Nova AI'
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
  const res = await window.api.exportFile(`Nova AI - ${title}.docx`, [{ name: 'Word', extensions: ['docx'] }], btoa(bin))
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
    const res = await window.api.exportPdf(`Nova AI - ${title}.pdf`, exportHtmlString(title))
    if (!res?.ok && res?.error) setAttachError(res.error)
  }

  const exportHtmlString = (title) => {
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} · Nova AI</title>
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
<div class="meta">Exportado desde Nova AI · ${new Date().toLocaleString('es-ES')}</div>
${mdToHtml(convoMessagesMd())}
</body>
</html>`
    return html
  }

  const exportHtml = async () => {
    const title = convRef.current.title || 'Conversación'
    const html = exportHtmlString(title)
    const res = await window.api.exportText(`Nova AI - ${title}.html`, html)
    if (!res?.ok && res?.error) setAttachError(res.error)
  }

  const copyConvo = async () => {
    try {
      await navigator.clipboard.writeText(convoMarkdown())
      notify?.('Conversación copiada al portapapeles')
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
        <div className="drop-overlay"><Paperclip size={30} /> Suelta los archivos para adjuntarlos</div>
      )}
      <div className="chat-head">
        <ModelPicker providers={providers} providerId={conv.provider} model={conv.model} onChange={changeModel} onOpenSettings={onOpenSettings} onReloadProviders={onReloadProviders} />
        <div className="chat-head-right">
          {tokenCount > 0 && <span className="tok-badge" title="Aproximado: ~4 caracteres por token">~{tokenCount} tok</span>}
          {sending && (
            <button className="btn danger" onClick={stop}><Square size={13} /> Detener</button>
          )}
          <button
            className="icon-btn"
            onClick={() => {
              const last = conv.messages.filter((m) => m.role === 'assistant' && m.text).at(-1)
              if (last) speak(last.text, { ...settings, voice: { ...(settings?.voice || {}), enabled: true } })
            }}
            title="Escuchar última respuesta"
          >
            <Volume2 size={16} />
          </button>
          <button className="icon-btn" onClick={copyConvo} title="Copiar conversación completa"><Copy size={16} /></button>
          <button className="icon-btn" onClick={exportConvo} title="Exportar a Markdown"><Download size={16} /></button>
          <button className="icon-btn" onClick={exportHtml} title="Exportar a HTML"><FileCode2 size={16} /></button>
          <button className="icon-btn" onClick={exportPdf} title="Exportar a PDF"><FileText size={16} /></button>
          <button className="icon-btn" onClick={exportDocx} title="Exportar a Word (.docx)"><FileDown size={16} /></button>
          <button className="icon-btn" onClick={onOpenSettings} title="Ajustes"><Settings size={16} /></button>
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
              placeholder="Buscar en esta conversación…"
            />
            <span className="conv-search-count">
              {searchResultsRef.current.length ? `${searchIdx + 1}/${searchResultsRef.current.length}` : ''}
            </span>
            <button className="icon-btn small" onClick={() => jumpSearch(-1)} title="Anterior (Shift+Enter)"><ChevronUp size={13} /></button>
            <button className="icon-btn small" onClick={() => jumpSearch(1)} title="Siguiente (Enter)"><ChevronDown size={13} /></button>
            <button className="icon-btn small" onClick={() => { setSearchOpen(false); setSearchQ(''); setSearchIdx(0); searchResultsRef.current = [] }} title="Cerrar"><X size={13} /></button>
          </div>
        )}
        {empty ? (
          <div className="welcome">
            <div className="welcome-logo"><Sparkles size={34} /></div>
            <h2>¿Qué quieres crear hoy?</h2>
            <p className="hint">
              {hasAnyProvider
                ? 'Elige el modelo en la parte superior. Puedes comparar modelos, buscar en web, adjuntar archivos e incluso hablar por micrófono.'
                : 'Conecta tus IA: ve a Ajustes y pega tus API keys (Claude, GPT, Gemini…), o instala Ollama para usar modelos locales gratis.'}
            </p>
            <div className="welcome-stats">
              <div className="stat"><strong>{convos.length}</strong><span>conversaciones</span></div>
              <div className="stat"><strong>{convos.reduce((a, c) => a + (c.count || 0), 0)}</strong><span>mensajes</span></div>
              <div className="stat"><strong>{providers.filter((p) => p.hasKey || p.local).length}</strong><span>IA conectadas</span></div>
            </div>
            <div className="welcome-actions">
              <button className="btn primary" onClick={() => onViewChange('compare')}><GitCompareArrows size={15} /> Comparar modelos</button>
              <button className="btn" onClick={() => onViewChange('agent')}><Bot size={15} /> Agente IA</button>
            </div>
            <div className="suggestions">
              {SUGGESTIONS.map((s) => (
                <button key={s.t} className="suggestion" title={s.q} onClick={() => { setInput(s.q); inputRef.current?.focus() }}>
                  <Zap size={13} /> {s.t}
                </button>
              ))}
            </div>
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
                        <button className="btn" onClick={() => setEditingId(null)}>Cancelar</button>
                        <button className="btn primary" onClick={() => {
                          const idx = conv.messages.findIndex((x) => x.id === m.id)
                          updateConv({ ...conv, messages: [...conv.messages.slice(0, idx), { ...m, text: editText }], updatedAt: Date.now() })
                          setEditingId(null)
                        }}>Guardar</button>
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
                        <button className="icon-btn" title="Editar" onClick={() => { setEditingId(m.id); setEditText(m.text) }}><Pencil size={13} /></button>
                        <button className="icon-btn" title="Borrar mensaje" onClick={() => setDelMenuId(delMenuId === m.id ? null : m.id)}><Trash2 size={13} /></button>
                      </div>
                      {delMenuId === m.id && (
                        <div className="del-menu" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => { deleteOne(m.id); setDelMenuId(null) }}><MessageSquareX size={13} /> Borrar solo este mensaje</button>
                          <button onClick={() => { deleteFrom(m.id); setDelMenuId(null) }}><Trash2 size={13} /> Borrar este y los siguientes</button>
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
                  {m.search && <div className="search-note"><Search size={12} /> Esta respuesta incluye búsqueda web</div>}
                  <div className="md">
                    {m.text ? <Markdown text={m.text} /> : m.streaming ? <span className="gen-hint"><Loader2 size={13} className="spin" /> Generando imagen…</span> : <span className="cursor-blink" />}
                    {m.streaming && m.text && <span className="cursor-blink" />}
                    {m.error && (
                      <div className="error-box retry-box">
                        <span>{m.error}</span>
                        <button className="retry-btn" onClick={regenerate} title="Reintentar con el mismo mensaje">
                          <RefreshCw size={12} /> Reintentar
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
                              <button className="icon-btn" title="Descargar imagen" onClick={() => window.api.saveImageFile(img.name, img.data, img.mime)}><Download size={13} /></button>
                              <button className="icon-btn" title="Editar esta imagen en el chat" onClick={() => setAttachments([{ id: uid(), name: img.name, kind: 'image', mime: img.mime, data: img.data }])}><Pencil size={13} /></button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {!m.streaming && (
                    <div className="msg-actions">
                      <button className="icon-btn" title="Copiar" onClick={() => copyText(m)}>{copiedId === m.id ? <Check size={13} /> : <Copy size={13} />}</button>
                      <button className="icon-btn" title="Responder de nuevo" onClick={regenerate}><RefreshCw size={13} /></button>
                      <button className="icon-btn" title="Escuchar" onClick={() => speak(m.text, { ...settings, voice: { ...(settings?.voice || {}), enabled: true } })}><Volume2 size={13} /></button>
                      <button className="icon-btn" title="Borrar mensaje" onClick={() => setDelMenuId(delMenuId === m.id ? null : m.id)}><Trash2 size={13} /></button>
                    </div>
                  )}
                  {!m.streaming && delMenuId === m.id && (
                    <div className="del-menu" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => { deleteOne(m.id); setDelMenuId(null) }}><MessageSquareX size={13} /> Borrar solo este mensaje</button>
                      <button onClick={() => { deleteFrom(m.id); setDelMenuId(null) }}><Trash2 size={13} /> Borrar este y los siguientes</button>
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
        {showScrollBtn && !empty && (
          <button className="scroll-bottom-btn" onClick={scrollToBottom} title="Ir al final"><ChevronDown size={16} /></button>
        )}
      </div>

      <div className="input-area">
        {showOptions && (
          <div className="options-panel">
            <label className="row-check">
              <input type="checkbox" checked={webSearch} onChange={(e) => setWebSearch(e.target.checked)} />
              <Globe size={14} /> Buscar en web antes de responder
            </label>
            <div className="row-slider">
              <span>Creatividad (temperatura)</span>
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
              <Volume2 size={14} /> Responder en voz
            </label>
            <textarea
              className="system-input"
              value={conv.system || ''}
              onChange={(e) => updateConv({ ...conv, system: e.target.value })}
              placeholder="Instrucciones del sistema (opcional): define la personalidad o reglas de la IA para este chat…"
            />
          </div>
        )}

        {imageModel && (
          <div className="img-controls">
            <div className="img-seg">
              {[
                { id: 'square', label: 'Cuadrado' },
                { id: 'wide', label: 'Ancho' },
                { id: 'tall', label: 'Alto' }
              ].map((f) => (
                <button
                  key={f.id}
                  className={`seg-btn ${(conv.imgFormat || 'square') === f.id ? 'active' : ''}`}
                  onClick={() => updateConv({ ...conv, imgFormat: f.id })}
                  title="Formato de la imagen"
                >
                  {f.label}
                </button>
              ))}
            </div>
            {conv.provider === 'openai' && (
              <div className="img-seg" title="Cantidad de imágenes">
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
              <label className="row-check img-edit-toggle" title="Si está activo, un mensaje nuevo sin foto adjunta edita la última imagen generada">
                <input type="checkbox" checked={conv.imgEditLast !== false} onChange={(e) => updateConv({ ...conv, imgEditLast: e.target.checked })} />
                <Pencil size={13} /> Editar la anterior
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

        {attachError && <div className="error-box small">{attachError}</div>}

        <div className="input-bar">
          {!imageModel && (
            <button className={`icon-btn ${webSearch ? 'on' : ''}`} onClick={() => setWebSearch(!webSearch)} title="Buscar en web">
              <Globe size={17} />
            </button>
          )}
          <button className={`icon-btn ${showOptions ? 'on' : ''}`} onClick={() => setShowOptions(!showOptions)} title="Opciones">
            <ChevronDown size={17} />
          </button>
          <button className="icon-btn" onClick={() => fileRef.current?.click()} title={imageModel ? 'Adjuntar una foto para editarla' : 'Adjuntar archivo o imagen'}>
            <Paperclip size={17} />
          </button>
          <input ref={fileRef} type="file" multiple hidden onChange={(e) => { onFiles([...e.target.files]); e.target.value = '' }} />
          <textarea
            ref={inputRef}
            className="input"
            value={input}
            placeholder={searching ? 'Buscando en web…' : imageModel ? 'Describe la imagen (o adjunta una foto para editarla)…' : 'Escribe tu mensaje… (Enter para enviar, Shift+Enter para salto de línea)'}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
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
            title={recState === 'idle' ? 'Dictar por voz (Whisper)' : recState === 'recording' ? 'Detener grabación' : 'Transcribiendo…'}
          >
            {recState === 'idle' ? <Mic size={17} /> : recState === 'recording' ? <Square size={17} /> : <Loader2 size={17} className="spin" />}
          </button>
          <button className="btn primary send-btn" onClick={() => send()} disabled={sending || preparing || (!input.trim() && !attachments.length)} title={imageModel ? 'Generar imagen' : 'Enviar'}>
            {sending || preparing ? <Loader2 size={16} className="spin" /> : imageModel ? <Sparkles size={16} /> : <Send size={16} />}
            {imageModel && !sending && !preparing && <span className="send-label">Generar</span>}
          </button>
        </div>
        <div className="input-foot">
          <span className="hint">
            {imageModel && !searchFailed && <span className="img-hint">🎨 Este modelo genera y edita imágenes en el chat: escribe una descripción o adjunta una foto y pide cambios.</span>}
            {searchFailed && <span className="search-fail">No se encontraron resultados web; respondo sin búsqueda.</span>}
            {recState === 'recording' && <span className="rec-hint">● Grabando… pulsa de nuevo para detener</span>}
          </span>
        </div>
      </div>
    </div>
  )
}