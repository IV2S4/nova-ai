import React, { useEffect, useState } from 'react'
import { X, KeyRound, Eye, EyeOff, Save, Trash2, CheckCircle2, XCircle, Loader2, ExternalLink, Volume2, Sparkles, Download, Upload, Brain, Plus, Play } from 'lucide-react'

export default function SettingsModal({ open, onClose, providers, settings, onSaved, testProvider, onClearHistory, currentVersion, onShowChangelog }) {
  const [draft, setDraft] = useState(null)
  const [tests, setTests] = useState({})
  const [saved, setSaved] = useState(false)
  const [voices, setVoices] = useState([])
  const [showKey, setShowKey] = useState({})
  const [memData, setMemData] = useState(null)
  const [memText, setMemText] = useState('')
  const [updState, setUpdState] = useState(null)

  useEffect(() => {
    if (open) {
      setDraft(JSON.parse(JSON.stringify(settings)))
      setTests({})
      setSaved(false)
      window.api?.getMemory().then(setMemData)
      const load = () => setVoices(window.speechSynthesis?.getVoices() || [])
      load()
      window.speechSynthesis?.addEventListener('voiceschanged', load)
      return () => window.speechSynthesis?.removeEventListener('voiceschanged', load)
    }
  }, [open])

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
      if (confirm(`Nueva versión v${r.latest} disponible.\n\n${r.notes || 'Descarga la última versión desde GitHub.'}\n\n¿Abrir la página de descarga?`)) {
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