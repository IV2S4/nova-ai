import React, { useEffect, useRef, useState } from 'react'
import { GitCompareArrows, Send, X, Loader2, Check, Trash2, Plus, ChevronDown } from 'lucide-react'
import Markdown from './Markdown.jsx'
import { uid } from '../api.js'

export default function CompareView({ providers, runRequest, stopRequest, onOpenSettings, notify }) {
  const [selected, setSelected] = useState([])
  const [prompt, setPrompt] = useState('')
  const [results, setResults] = useState({})
  const [running, setRunning] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const pendingRef = useRef({})
  const timersRef = useRef({})

  const toggleModel = (p, m) => {
    if (!p.local && !p.hasKey) {
      notify?.(`Configura la API key de ${p.name} en Ajustes para usar sus modelos`)
      return
    }
    setSelected((s) => {
      const key = `${p.id}|${m}`
      if (s.some((x) => x.key === key)) return s.filter((x) => x.key !== key)
      if (s.length >= 4) { notify?.('Máximo 4 modelos a la vez'); return s }
      return [...s, { key, provider: p.id, model: m, color: p.color, label: `${p.name} · ${m}` }]
    })
  }

  const clearPending = () => {
    for (const id of Object.keys(pendingRef.current)) {
      clearTimeout(timersRef.current[id])
      delete pendingRef.current[id]
    }
    timersRef.current = {}
  }

  const flush = (id) => {
    clearTimeout(timersRef.current[id])
    timersRef.current[id] = null
    const t = pendingRef.current[id]
    if (t) {
      pendingRef.current[id] = ''
      setResults((r) => ({ ...r, [id]: { ...r[id], text: (r[id]?.text || '') + t } }))
    }
  }

  const compare = async () => {
    if (!prompt.trim() || !selected.length || running) return
    setRunning(true)
    clearPending()
    const res = {}
    for (const sel of selected) {
      const id = uid()
      res[id] = { id, label: sel.label, color: sel.color, text: '', status: 'running', t0: Date.now() }
      setResults({ ...res })
      pendingRef.current[id] = ''
      runRequest(
        {
          provider: sel.provider,
          model: sel.model,
          system: 'Eres un asistente experto. Responde de forma clara y completa.',
          temperature: 0.7,
          messages: [{ role: 'user', text: prompt }],
          images: [],
          searchContext: null
        },
        {
          onDelta: (t) => {
            pendingRef.current[id] = (pendingRef.current[id] || '') + t
            if (!timersRef.current[id]) {
              timersRef.current[id] = setTimeout(() => flush(id), 80)
            }
          },
          onDone: () => {
            flush(id)
            setResults((r) => ({ ...r, [id]: { ...r[id], status: 'done', ms: Date.now() - r[id].t0 } }))
          },
          onError: (message) => {
            flush(id)
            setResults((r) => ({ ...r, [id]: { ...r[id], status: 'error', error: message } }))
          }
        }
      )
    }
  }

  const stopOne = (id) => {
    stopRequest(id)
    clearTimeout(timersRef.current[id])
    timersRef.current[id] = null
    delete pendingRef.current[id]
    setResults((r) => ({ ...r, [id]: { ...r[id], status: 'stopped' } }))
  }

  const stopAll = () => {
    Object.keys(results).forEach((id) => {
      if (results[id].status === 'running') stopOne(id)
    })
    setRunning(false)
  }

  const clear = () => {
    stopAll()
    clearPending()
    setResults({})
    setPrompt('')
  }

  useEffect(() => {
    return () => clearPending()
  }, [])

  useEffect(() => {
    const anyRunning = Object.values(results).some((r) => r.status === 'running')
    if (!anyRunning) setRunning(false)
  }, [results])

  const columns = Object.values(results)

  return (
    <div className="compare">
      <div className="chat-head">
        <div className="compare-title">
          <GitCompareArrows size={16} />
          <h2>Comparar modelos</h2>
        </div>
        <div className="chat-head-right">
          {running && <button className="btn danger" onClick={stopAll}><X size={13} /> Detener todo</button>}
          {(columns.length > 0) && <button className="btn" onClick={clear}><Trash2 size={13} /> Limpiar</button>}
        </div>
      </div>

      <div className="compare-select">
        <div className="compare-chips">
          {selected.map((sel) => (
            <button key={sel.key} className="chip" style={{ borderColor: sel.color }} onClick={() => setSelected((prev) => prev.filter((x) => x.key !== sel.key))}>
              <span className="provider-dot" style={{ background: sel.color }} /> {sel.model} <X size={12} />
            </button>
          ))}
          <div className="picker-wrap">
            <button className="btn" onClick={() => setPickerOpen(!pickerOpen)}><Plus size={14} /> Añadir modelo</button>
            {pickerOpen && (
              <div className="popover">
                {providers.map((p) => (
                  <div key={p.id} className="popover-group">
                    <div className="popover-group-head">
                      <span className="provider-dot" style={{ background: p.color }} /> {p.name}
                      {!p.local && !p.hasKey && (
                        <button className="badge-btn" onClick={() => { setPickerOpen(false); onOpenSettings() }}>configurar clave</button>
                      )}
                    </div>
                    <div className="popover-models">
                      {p.models.slice(0, 30).map((m) => {
                        if (p.imageModels?.includes(m)) return null
                        const active = selected.some((s) => s.provider === p.id && s.model === m)
                        const locked = !p.local && !p.hasKey
                        return (
                          <button key={m} className={`model-option ${active ? 'active' : ''} ${locked ? 'locked' : ''}`} onClick={() => toggleModel(p, m)} title={locked ? 'Configura la API key en Ajustes' : ''}>
                            {active && <Check size={12} />} {m}
                            {locked && <span className="lock-tag">sin clave</span>}
                            {p.local || p.id === 'groq' || (p.id === 'mistral' && /^(mistral-small|ministral)/.test(m)) || /^gemini-[0-9].*flash/i.test(m) || /:free$/i.test(m) ? <span className="free-tag">gratis</span> : null}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="compare-prompt">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Escribe UNA pregunta y mándala a varios modelos a la vez para comparar sus respuestas…"
            rows={3}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) compare() }}
          />
          <button className="btn primary" onClick={compare} disabled={!prompt.trim() || !selected.length || running}>
            {running ? <Loader2 size={15} className="spin" /> : <Send size={15} />} Comparar
          </button>
        </div>
      </div>

      <div className="compare-grid">
        {columns.length === 0 && (
          <div className="welcome">
            <h2>Añade 2–4 modelos y compáralos</h2>
            <p className="hint">Misma pregunta, mismas condiciones, respuestas lado a lado. Ideal para elegir tu IA favorita.</p>
          </div>
        )}
        {columns.map((r) => (
          <div key={r.id} className="compare-col">
            <div className="compare-col-head" style={{ borderColor: r.color }}>
              <span className="provider-dot" style={{ background: r.color }} />
              <strong>{r.label}</strong>
              {r.status === 'running' && <Loader2 size={13} className="spin" />}
              {r.status === 'done' && <span className="ok-ms">{((r.ms || 0) / 1000).toFixed(1)}s</span>}
              {r.status === 'running' && <button className="icon-btn" onClick={() => stopOne(r.id)} title="Detener"><X size={13} /></button>}
            </div>
            <div className="compare-col-body">
              {r.text && <Markdown text={r.text} />}
              {r.status === 'error' && <div className="error-box">{r.error}</div>}
              {r.status === 'stopped' && <span className="hint">Detenido por el usuario</span>}
              {r.status === 'running' && !r.text && <span className="cursor-blink" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}