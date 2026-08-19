const PROVIDER_DEFS = [
  {
    id: 'anthropic', name: 'Claude (Anthropic)', color: '#d97757',
    keyPath: 'providers.anthropic.apiKey', keyName: 'ANTHROPIC_API_KEY',
    vision: ['*'],
    models: ['claude-opus-5', 'claude-sonnet-5', 'claude-fable-5', 'claude-opus-4-8', 'claude-opus-4-7', 'claude-opus-4-6', 'claude-sonnet-4-6', 'claude-sonnet-4-5-20250929', 'claude-haiku-4-5-20251001'],
    docs: 'https://console.anthropic.com/settings/keys'
  },
  {
    id: 'openai', name: 'OpenAI (GPT)', color: '#10a37f',
    keyPath: 'providers.openai.apiKey', keyName: 'OPENAI_API_KEY',
    vision: ['*'],
    reasoning: ['o3', 'o3-mini'],
    imageModels: ['gpt-image-2', 'gpt-image-1'],
    models: ['gpt-5.6-sol', 'gpt-5.6-terra', 'gpt-5.6-luna', 'gpt-5.5', 'gpt-5.5-pro', 'gpt-5.4', 'gpt-5.4-pro', 'gpt-5.4-mini', 'gpt-5.4-nano', 'gpt-5', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano', 'gpt-4o', 'gpt-4o-mini', 'o3', 'o3-mini', 'gpt-image-2', 'gpt-image-1'],
    docs: 'https://platform.openai.com/api-keys'
  },
  {
    id: 'google', name: 'Google Gemini', color: '#4285f4',
    keyPath: 'providers.google.apiKey', keyName: 'GEMINI_API_KEY',
    vision: ['*'],
    imageModels: ['gemini-3.1-flash-image', 'gemini-3.1-flash-lite-image', 'gemini-3-pro-image', 'gemini-2.5-flash-image'],
    models: ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-3-flash-preview', 'gemini-2.5-flash', 'gemini-3.1-flash-image', 'gemini-3.1-flash-lite-image', 'gemini-3-pro-image', 'gemini-2.5-flash-image'],
    docs: 'https://aistudio.google.com/apikey'
  },
  {
    id: 'openrouter', name: 'OpenRouter (¡todos los modelos!)', color: '#8b5cf6',
    keyPath: 'providers.openrouter.apiKey', keyName: 'OPENROUTER_API_KEY',
    base: 'https://openrouter.ai/api/v1',
    vision: true, live: true,
    models: [],
    docs: 'https://openrouter.ai/keys'
  },
  {
    id: 'deepseek', name: 'DeepSeek', color: '#4d6bfe',
    keyPath: 'providers.deepseek.apiKey', keyName: 'DEEPSEEK_API_KEY',
    base: 'https://api.deepseek.com/v1', vision: false,
    models: ['deepseek-v4-flash', 'deepseek-v4-pro'],
    docs: 'https://platform.deepseek.com/api_keys'
  },
  {
    id: 'groq', name: 'Groq (ultrarrápido)', color: '#f55036',
    keyPath: 'providers.groq.apiKey', keyName: 'GROQ_API_KEY',
    base: 'https://api.groq.com/openai/v1', vision: false,
    models: ['groq/compound', 'groq/compound-mini', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.6-27b', 'allam-2-7b'],
    docs: 'https://console.groq.com/keys'
  },
  {
    id: 'mistral', name: 'Mistral AI', color: '#fa520f',
    keyPath: 'providers.mistral.apiKey', keyName: 'MISTRAL_API_KEY',
    base: 'https://api.mistral.ai/v1', vision: false,
    models: ['mistral-large-latest', 'mistral-small-latest', 'mistral-medium-latest', 'magistral-small-latest', 'codestral-latest', 'devstral-latest', 'mistral-code-agent-latest', 'ministral-8b-latest', 'ministral-14b-latest', 'ministral-3b-latest'],
    docs: 'https://console.mistral.ai/api-keys'
  },
  {
    id: 'xai', name: 'xAI (Grok)', color: '#171717',
    keyPath: 'providers.xai.apiKey', keyName: 'XAI_API_KEY',
    base: 'https://api.x.ai/v1', vision: ['*'],
    models: ['grok-4.6', 'grok-4.5', 'grok-4.3', 'grok-build-0.1'],
    docs: 'https://console.x.ai'
  },
  {
    id: 'ollama', name: 'Ollama (local, gratis)', color: '#6b7280',
    keyPath: 'providers.ollama.apiKey', keyName: null, keyOptional: true, local: true,
    base: 'http://localhost:11434', vision: false,
    models: ['llama3.3', 'llama3.2', 'llama3.1', 'qwen3', 'qwen2.5', 'deepseek-r1', 'gemma3', 'phi4', 'gpt-oss', 'mistral'],
    docs: 'https://ollama.com/download'
  },
  {
    id: 'lmstudio', name: 'LM Studio (local)', color: '#3b82f6',
    keyPath: 'providers.lmstudio.apiKey', keyName: null, keyOptional: true, local: true,
    base: 'http://localhost:1234/v1', vision: true, live: true,
    models: ['local-model'],
    docs: 'https://lmstudio.ai'
  },
  {
    id: 'openaicompat', name: 'Servidor OpenAI (local)', color: '#10b981',
    keyPath: 'providers.openaicompat.apiKey', keyName: null, keyOptional: true, local: true,
    base: '', vision: false, live: true,
    models: [],
    docs: ''
  }
]

function getByPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj)
}

function getConfig(settings) {
  const cfg = {}
  for (const p of PROVIDER_DEFS) {
    cfg[p.id] = {
      ...p,
      apiKey: p.keyPath ? (getByPath(settings, p.keyPath) || '') : '',
      base: getByPath(settings, `providers.${p.id}.base`) || p.base || '',
      models: [...p.models]
    }
  }
  return cfg
}

const modelCache = new Map()
const MODEL_TTL = 5 * 60 * 1000

async function getLiveModels(provider, cfg) {
  const key = `${provider.id}:${cfg.apiKey}`
  const hit = modelCache.get(key)
  if (hit && Date.now() - hit.t < MODEL_TTL) return hit.models
  const live = await fetchLiveModels(provider, cfg)
  if (live && live.length) modelCache.set(key, { t: Date.now(), models: live })
  return live
}

function clearModelCache() {
  modelCache.clear()
}

async function getProviderList(settings) {
  const cfg = getConfig(settings)
  const list = []
  for (const p of PROVIDER_DEFS) {
    const c = cfg[p.id]
    let models = c.models
    if (p.live || p.local) {
      const live = await getLiveModels(p, c)
      if (live && live.length) models = live
    }
    list.push({
      id: p.id, name: p.name, color: p.color, vision: p.vision,
      hasKey: p.local ? true : !!c.apiKey,
      models, live: p.live, local: p.local, docs: p.docs,
      imageModels: p.imageModels || []
    })
  }
  return list
}

async function fetchLiveModels(provider, cfg) {
  try {
    if (provider.id === 'openrouter' && cfg.apiKey) {
      const res = await fetch('https://openrouter.ai/api/v1/models', {
        headers: { Authorization: `Bearer ${cfg.apiKey}` },
        signal: AbortSignal.timeout(8000)
      })
      if (!res.ok) return null
      const data = await res.json()
      return data.data.map((m) => m.id).sort()
    }
    if (provider.id === 'lmstudio') {
      const res = await fetch(`${provider.base}/models`, { signal: AbortSignal.timeout(4000) })
      if (!res.ok) return null
      const data = await res.json()
      return data.data.map((m) => m.id)
    }
    if (provider.id === 'ollama') {
      const res = await fetch(`${provider.base}/api/tags`, { signal: AbortSignal.timeout(4000) })
      if (!res.ok) return null
      const data = await res.json()
      return data.models.map((m) => m.name.replace(/:latest$/, ''))
    }
    if (provider.id === 'openaicompat') {
      if (!cfg.base) return null
      const headers = cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}
      const res = await fetch(`${cfg.base}/models`, { headers, signal: AbortSignal.timeout(4000) })
      if (!res.ok) return null
      const data = await res.json()
      return (data.data || []).map((m) => m.id)
    }
  } catch { /* servidor no disponible */ }
  return null
}

async function testProvider(settings, providerId) {
  const def = PROVIDER_DEFS.find((p) => p.id === providerId)
  if (!def) return { ok: false, message: 'Proveedor desconocido' }
  const cfg = getConfig(settings)[providerId]
  const t0 = Date.now()
  try {
    if (def.local) {
      if (def.id === 'openaicompat' && !cfg.base) {
        return { ok: false, message: 'Escribe primero la URL de tu servidor en el campo de abajo (p. ej. http://localhost:8080/v1) y guarda los ajustes.' }
      }
      const live = await fetchLiveModels(def, cfg)
      const tip = def.id === 'lmstudio'
        ? 'Abre LM Studio y activa el servidor en la pestaña Developer → "Start Server" (puerto 1234).'
        : def.id === 'ollama'
          ? 'Abre Ollama o ejecuta "ollama serve" en una terminal.'
          : 'Arranca tu servidor local y vuelve a probar.'
      return { ok: !!live, message: live ? `Servidor local conectado (${live.length} modelos)` : `No se pudo conectar al servidor local. ${tip}` }
    }
    if (!cfg.apiKey) return { ok: false, message: 'Falta la API key' }
    let res
    if (def.id === 'anthropic') {
      res = await fetch('https://api.anthropic.com/v1/models', {
        headers: { 'x-api-key': cfg.apiKey, 'anthropic-version': '2023-06-01' },
        signal: AbortSignal.timeout(10000)
      })
    } else if (def.id === 'google') {
      res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(cfg.apiKey)}`, { signal: AbortSignal.timeout(10000) })
    } else if (def.id === 'openrouter') {
      res = await fetch('https://openrouter.ai/api/v1/auth/key', {
        headers: { Authorization: `Bearer ${cfg.apiKey}` },
        signal: AbortSignal.timeout(10000)
      })
    } else {
      const base = cfg.base || def.base || 'https://api.openai.com/v1'
      res = await fetch(`${base}/models`, {
        headers: { Authorization: `Bearer ${cfg.apiKey}` },
        signal: AbortSignal.timeout(10000)
      })
    }
    const ms = Date.now() - t0
    if (res.ok) return { ok: true, message: `Conexión correcta (${ms} ms)` }
    const err = await res.json().catch(() => ({}))
    return { ok: false, message: err.error?.message || `Error HTTP ${res.status}` }
  } catch (e) {
    const cause = e?.cause?.code || e?.cause?.message
    const msg = e?.message === 'fetch failed'
      ? `Sin conexión con ${def.name}${cause ? ` (${cause})` : ''}. Revisa tu conexión o si el servidor local está en marcha.`
      : (e.message || 'Error de red')
    return { ok: false, message: e.name === 'TimeoutError' ? 'Tiempo de espera agotado' : msg }
  }
}

// ---------- Envío de mensajes ----------

function buildSystem(system, searchContext) {
  let s = system || 'Eres Nova, un asistente de IA experto, preciso y amigable. Respondes en el idioma del usuario. Usa Markdown cuando ayude a la claridad.'
  if (searchContext) {
    s += `\n\n## Contexto de búsqueda web (usa esta información para responder)\n${searchContext}`
  }
  return s
}

function pickVision(def, model, images) {
  if (!images || !images.length) return false
  if (def.vision === true) return true
  if (Array.isArray(def.vision) && (def.vision.includes('*') || def.vision.includes(model))) return true
  return false
}

function normalizeMessages(def, model, system, messages, images) {
  const useVision = pickVision(def, model, images)
  const msgs = []
  if (system) msgs.push({ role: 'system', content: system })
  for (const m of messages) {
    let content = m.text || ''
    if (m.role === 'user' && !useVision && images && images.length) {
      content = `${content}\n\n[Archivo adjunto: ${images.map((i) => i.name).join(', ')} — este modelo no soporta imágenes, solo se muestra el nombre]`
    }
    msgs.push({ role: m.role === 'assistant' ? 'assistant' : 'user', content })
  }
  const last = msgs[msgs.length - 1]
  if (useVision) {
    last.images = images
  }
  return msgs
}

function isImageModel(def, model) {
  return Array.isArray(def.imageModels) && def.imageModels.includes(model)
}

async function* streamChat(settings, req, signal) {
  const def = PROVIDER_DEFS.find((p) => p.id === req.provider)
  if (!def) throw new Error('Proveedor desconocido')
  const cfg = getConfig(settings)[req.provider]
  const images = (req.images || []).map((i) => ({ ...i }))
  const sys = buildSystem(req.system, req.searchContext)
  const msgs = normalizeMessages(def, req.model, sys, req.messages, images)

  if (isImageModel(def, req.model)) {
    const raw = req.messages.map((m) => ({ role: m.role, content: m.text || '', images: m.images || [] }))
    if (images.length) raw[raw.length - 1] = { ...raw[raw.length - 1], images: [...(raw[raw.length - 1].images || []), ...images] }
    const imgMsgs = req.system ? [{ role: 'system', content: sys }, ...raw] : raw
    yield* streamImage(cfg, def, req, imgMsgs, signal)
  } else if (def.id === 'anthropic') yield* streamAnthropic(cfg, req, msgs, signal)
  else if (def.id === 'google') yield* streamGoogle(cfg, req, msgs, signal)
  else if (def.id === 'ollama') yield* streamOllama(cfg, req, msgs, signal)
  else yield* streamOpenAICompat(cfg, def, req, msgs, signal)
}

async function* streamAnthropic(cfg, req, msgs, signal) {
  if (!cfg.apiKey) throw new Error('Falta la API key de Anthropic (Claude). Configúrala en Ajustes.')
  const system = msgs.find((m) => m.role === 'system')?.content || ''
  const content = msgs
    .filter((m) => m.role !== 'system')
    .map((m) => {
      const parts = [{ type: 'text', text: m.content }]
      if (m.images) {
        for (const img of m.images) {
          parts.push({ type: 'image', source: { type: 'base64', media_type: img.mime, data: img.data } })
        }
      }
      return { role: m.role, content: parts }
    })
  const budgetMap = { bajo: 2048, medio: 8192, alto: 16384 }
  const thinkingBudget = req.reasoningEffort ? budgetMap[req.reasoningEffort] : (req.showThinking ? 8192 : undefined)

  const send = (withThinking) => fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': cfg.apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: req.model,
      max_tokens: req.maxTokens || 8192,
      temperature: req.temperature ?? 0.7,
      system: system || undefined,
      messages: content,
      stream: true,
      ...(withThinking ? { thinking: { type: 'enabled', budget_tokens: thinkingBudget } } : {})
    }),
    signal
  })

  const consume = (res) => (async function* () {
    for await (const { json, done } of readSSE(res)) {
      if (done) break
      if (json.type === 'content_block_delta' && json.delta?.type === 'thinking_delta') {
        if (req.showThinking) yield { type: 'reasoning', text: json.delta.thinking || '' }
      } else if (json.type === 'content_block_delta' && json.delta?.type === 'text_delta') {
        yield { type: 'chunk', text: json.delta.text }
      } else if (json.type === 'error') {
        throw new Error(json.error?.message || 'Error de Anthropic')
      }
    }
    yield { type: 'done' }
  })()

  let res = await send(!!thinkingBudget)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    if (thinkingBudget && /thinking|budget|400/i.test(err.error?.message || '')) {
      res = await send(false)
    } else {
      throw new Error(err.error?.message || `Error HTTP ${res.status}`)
    }
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `Error HTTP ${res.status}`)
  }
  try {
    yield* consume(res)
  } catch (e) {
    if (!thinkingBudget) throw e
    const retry = await send(false)
    if (!retry.ok) throw e
    yield* consume(retry)
  }
}

async function* streamGoogle(cfg, req, msgs, signal) {
  if (!cfg.apiKey) throw new Error('Falta la API key de Google Gemini. Configúrala en Ajustes.')
  const system = msgs.find((m) => m.role === 'system')?.content || ''
  const contents = []
  for (const m of msgs.filter((x) => x.role !== 'system')) {
    const parts = [{ text: m.content }]
    if (m.images) {
      for (const img of m.images) {
        parts.push({ inline_data: { mime_type: img.mime, data: img.data } })
      }
    }
    if (contents.length && contents[contents.length - 1].role === m.role) {
      contents[contents.length - 1].parts.push(...parts)
    } else {
      contents.push({ role: m.role === 'assistant' ? 'model' : 'user', parts })
    }
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(req.model)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(cfg.apiKey)}`
  const isGemini3 = /^gemini-3/.test(req.model)
  const budgetMap = { bajo: 1024, medio: 8192, alto: 16384 }
  const thinkingBudget = req.reasoningEffort ? budgetMap[req.reasoningEffort] : (req.showThinking ? 8192 : undefined)
  const generationConfig = isGemini3
    ? { maxOutputTokens: req.maxTokens || 8192, ...(thinkingBudget ? { thinkingConfig: { thinkingBudget, includeThoughts: !!req.showThinking } } : {}) }
    : { temperature: req.temperature ?? 0.7, maxOutputTokens: req.maxTokens || 8192 }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: system ? { parts: [{ text: system }] } : undefined,
      contents,
      generationConfig
    }),
    signal
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `Error HTTP ${res.status}`)
  }
  for await (const { json, done } of readSSE(res)) {
    if (done) break
    const parts = json.candidates?.[0]?.content?.parts || []
    for (const p of parts) {
      if (p.thought) {
        if (req.showThinking) yield { type: 'reasoning', text: p.thought }
      } else if (p.text) {
        yield { type: 'chunk', text: p.text }
      }
    }
  }
  yield { type: 'done' }
}

async function* streamOllama(cfg, req, msgs, signal) {
  const payload = {
    model: req.model,
    stream: true,
    options: { temperature: req.temperature ?? 0.7, num_predict: req.maxTokens || undefined },
    messages: msgs.map((m) => ({
      role: m.role,
      content: m.content,
      images: m.images ? m.images.map((i) => i.data) : undefined
    }))
  }
  const headers = { 'content-type': 'application/json' }
  if (cfg.apiKey) headers.Authorization = `Bearer ${cfg.apiKey}`
  const res = await fetch(`${cfg.base}/api/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    signal
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Error HTTP ${res.status} — ¿está Ollama en marcha?`)
  }
  const reader = res.body.getReader()
  const dec = new TextDecoder()
  let buf = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    let idx
    while ((idx = buf.indexOf('\n')) !== -1) {
      const line = buf.slice(0, idx).trim()
      buf = buf.slice(idx + 1)
      if (!line) continue
      try {
        const j = JSON.parse(line)
        if (j.message?.content) yield { type: 'chunk', text: j.message.content }
        if (j.done) break
      } catch { /* línea no JSON */ }
    }
  }
  yield { type: 'done' }
}

async function* streamOpenAICompat(cfg, def, req, msgs, signal) {
  const apiKey = cfg.apiKey
  if (!apiKey && !def.local) throw new Error(`Falta la API key de ${def.name}. Configúrala en Ajustes.`)
  const base = cfg.base || def.base || 'https://api.openai.com/v1'
  const isReasoning = (def.reasoning || []).includes(req.model)
  const isNewGen = /^(gpt-5|o3)/.test(req.model)
  const noTemp = isNewGen || isReasoning || def.id === 'deepseek'
  const maxKey = isNewGen || isReasoning ? 'max_completion_tokens' : 'max_tokens'
  const effortMap = { bajo: 'low', medio: 'medium', alto: 'high' }
  const effort = isNewGen ? effortMap[req.reasoningEffort] : undefined

  const buildBody = (ms) => ({
    model: req.model,
    messages: ms.map((m) => ({
      role: m.role,
      content: m.images
        ? [
            { type: 'text', text: m.content },
            ...m.images.map((i) => ({ type: 'image_url', image_url: { url: `data:${i.mime};base64,${i.data}` } }))
          ]
        : m.content
    })),
    stream: true,
    [maxKey]: req.maxTokens || 8192,
    ...(effort ? { reasoning_effort: effort } : {}),
    ...(noTemp ? {} : { temperature: req.temperature ?? 0.7 })
  })

  const trySend = async (payload) => {
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}) },
      body: JSON.stringify(payload),
      signal
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error?.message || `Error HTTP ${res.status}`)
    }
    return res
  }

  let res = await trySend(buildBody(msgs))

  let firstError = null
  let emitted = false
  try {
    for await (const { json, done } of readSSE(res)) {
      if (done) break
      const delta = json.choices?.[0]?.delta || {}
      const text = delta.content || ''
      const reason = delta.reasoning_content || ''
      if (reason && req.showThinking) yield { type: 'reasoning', text: reason }
      if (text) {
        emitted = true
        yield { type: 'chunk', text }
      }
    }
  } catch (e) {
    firstError = e
  }
  if (firstError && !emitted && /image|vision/i.test(firstError.message)) {
    const ms = msgs.map((m) => ({ ...m, images: undefined }))
    res = await trySend(buildBody(ms))
    for await (const { json, done } of readSSE(res)) {
      if (done) break
      const delta = json.choices?.[0]?.delta || {}
      const text = delta.content || ''
      const reason = delta.reasoning_content || ''
      if (reason && req.showThinking) yield { type: 'reasoning', text: reason }
      if (text) yield { type: 'chunk', text }
    }
  } else if (firstError) {
    throw firstError
  }
  yield { type: 'done' }
}

function imageFormatToParams(format) {
  return format === 'wide'
    ? { openai: '1536x1024', dallE: '1792x1024', ratio: '16:9' }
    : format === 'tall'
      ? { openai: '1024x1536', dallE: '1024x1792', ratio: '9:16' }
      : { openai: '1024x1024', dallE: '1024x1024', ratio: '1:1' }
}

async function* streamImage(cfg, def, req, msgs, signal) {
  if (def.id === 'google') yield* streamGeminiImage(cfg, req, msgs, signal)
  else if (def.id === 'openai') yield* streamOpenAIImage(cfg, req, signal)
  else throw new Error('Este modelo no soporta generación de imágenes')
}

async function* streamGeminiImage(cfg, req, msgs, signal) {
  if (!cfg.apiKey) throw new Error('Falta la API key de Google Gemini. Configúrala en Ajustes.')
  const contents = []
  for (const m of msgs.filter((x) => x.role !== 'system')) {
    const parts = []
    if (m.images) {
      for (const img of m.images) parts.push({ inline_data: { mime_type: img.mime, data: img.data } })
    }
    parts.push({ text: m.content || '' })
    if (contents.length && contents[contents.length - 1].role === m.role) {
      contents[contents.length - 1].parts.push(...parts)
    } else {
      contents.push({ role: m.role === 'assistant' ? 'model' : 'user', parts })
    }
  }
  if (req.contextImage && contents.length && contents[contents.length - 1].role === 'user') {
    contents[contents.length - 1].parts.unshift({ inline_data: { mime_type: req.contextImage.mime, data: req.contextImage.data } })
  }
  const ratio = imageFormatToParams(req.imageFormat || 'square').ratio
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(req.model)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(cfg.apiKey)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      contents,
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: { aspectRatio: ratio }
      }
    }),
    signal
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `Error HTTP ${res.status}`)
  }
  let n = 0
  let gotImage = false
  for await (const { json, done } of readSSE(res)) {
    if (done) break
    if (json.error) throw new Error(json.error.message || 'Error de Gemini')
    const parts = json.candidates?.[0]?.content?.parts || []
    for (const p of parts) {
      if (p.thought) continue
      if (p.text) yield { type: 'chunk', text: p.text }
      if (p.inlineData) {
        gotImage = true
        const mime = p.inlineData.mimeType || 'image/png'
        const ext = mime.split('/')[1] === 'jpeg' ? 'jpg' : (mime.split('/')[1] || 'png')
        yield { type: 'image', name: `imagen-${++n}.${ext}`, mime, data: p.inlineData.data }
      }
    }
  }
  if (!gotImage) throw new Error('El modelo no devolvió ninguna imagen. Revisa el prompt.')
  yield { type: 'done' }
}

async function* streamOpenAIImage(cfg, req, signal) {
  if (!cfg.apiKey) throw new Error('Falta la API key de OpenAI. Configúrala en Ajustes.')
  const base = cfg.base || 'https://api.openai.com/v1'
  const prompt = [...(req.messages || [])].reverse().find((m) => m.text)?.text || ''
  if (!prompt) throw new Error('Escribe una descripción para generar la imagen')
  const params = imageFormatToParams(req.imageFormat || 'square')
  const isDalle = /^dall-e/.test(req.model)
  const size = isDalle ? params.dallE : params.openai
  const quality = isDalle ? 'standard' : (req.imageQuality || 'high')
  const input = req.images?.[0] || req.contextImage
  const payload = {
    model: req.model,
    prompt,
    size,
    quality,
    output_format: 'png',
    ...(input ? {} : { n: Math.min(4, Math.max(1, req.imageCount || 1)) })
  }
  const path = input ? 'images/edits' : 'images/generations'
  const res = await fetch(`${base}/${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', Authorization: `Bearer ${cfg.apiKey}` },
    body: JSON.stringify(input ? { ...payload, image: input.data } : payload),
    signal
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `Error HTTP ${res.status}`)
  }
  const data = await res.json()
  const items = data.data || []
  if (!items.length) throw new Error('El modelo no devolvió ninguna imagen')
  let n = 0
  for (const it of items) {
    if (it.b64_json) {
      yield { type: 'image', name: `imagen-${++n}.png`, mime: 'image/png', data: it.b64_json }
    } else if (it.url) {
      const img = await fetch(it.url, { signal: AbortSignal.timeout(60000) })
      const buf = Buffer.from(await img.arrayBuffer())
      yield { type: 'image', name: `imagen-${++n}.png`, mime: 'image/png', data: buf.toString('base64') }
    }
  }
  yield { type: 'done' }
}

async function* readSSE(res) {
  const reader = res.body.getReader()
  const dec = new TextDecoder()
  let buf = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    let idx
    while ((idx = buf.indexOf('\n')) !== -1) {
      const line = buf.slice(0, idx).trim()
      buf = buf.slice(idx + 1)
      if (!line || !line.startsWith('data:')) continue
      const data = line.slice(5).trim()
      if (data === '[DONE]') { yield { done: true }; return }
      try { yield { json: JSON.parse(data) } } catch { /* chunk parcial */ }
    }
  }
}

async function generateTitle(settings, req) {
  const def = PROVIDER_DEFS.find((p) => p.id === req?.provider)
  if (!def || isImageModel(def, req.model)) return null
  const text = (req?.text || '').replace(/\s+/g, ' ').trim().slice(0, 400)
  if (!text) return null
  try {
    const out = []
    for await (const ev of streamChat(settings, {
      provider: req.provider,
      model: req.model,
      system: 'Genera un TÍTULO corto (máximo 6 palabras) para la siguiente pregunta del usuario. Responde SOLO con el título, sin comillas ni puntuación final.',
      temperature: 0.2,
      messages: [{ role: 'user', text }]
    }, AbortSignal.timeout(25000))) {
      if (ev.type === 'chunk') out.push(ev.text)
    }
    const t = out.join('').replace(/\s+/g, ' ').trim()
    if (!t || t.length > 60) return null
    return t.replace(/[.,;:!?"']+$/g, '').trim() || null
  } catch { return null }
}

async function completeCode(settings, req) {
  const def = PROVIDER_DEFS.find((p) => p.id === req?.provider)
  if (!def) throw new Error('Proveedor desconocido')
  const cfg = getConfig(settings)[req.provider]
  if (!cfg.apiKey && !def.local) throw new Error(`Falta la API key de ${def.name}`)
  const code = String(req.code || '').slice(-6000)
  if (!code.trim()) throw new Error('Texto vacío')
  const sys = 'Eres un autocompletado de código (estilo Cursor/Tab). Completa el texto del usuario con la continuación más natural y útil. Devuelve SOLO la continuación (código/texto), sin explicaciones, sin markdown, sin comillas ni prefijos.'
  const temperature = 0.2
  const maxTokens = 80

  if (req.provider === 'anthropic') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': cfg.apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: req.model, max_tokens: maxTokens, temperature, system: sys, messages: [{ role: 'user', content: code }] }),
      signal: AbortSignal.timeout(25000)
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.error?.message || `Error HTTP ${res.status}`)
    return (data?.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('')
  }

  if (req.provider === 'google') {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(req.model)}:generateContent?key=${encodeURIComponent(cfg.apiKey)}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: sys }] },
        contents: [{ role: 'user', parts: [{ text: code }] }],
        generationConfig: { maxOutputTokens: maxTokens, temperature }
      }),
      signal: AbortSignal.timeout(25000)
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.error?.message || `Error HTTP ${res.status}`)
    return (data?.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('')
  }

  if (req.provider === 'ollama') {
    const base = (cfg.base || 'http://127.0.0.1:11434').replace(/\/+$/, '')
    const res = await fetch(`${base}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model: req.model, stream: false, options: { temperature, num_predict: maxTokens }, messages: [{ role: 'system', content: sys }, { role: 'user', content: code }] }),
      signal: AbortSignal.timeout(25000)
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.error || `Error HTTP ${res.status}`)
    return data?.message?.content || ''
  }

  const base = cfg.base || def.base || 'https://api.openai.com/v1'
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}) },
    body: JSON.stringify({ model: req.model, messages: [{ role: 'system', content: sys }, { role: 'user', content: code }], max_tokens: maxTokens, temperature }),
    signal: AbortSignal.timeout(25000)
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error?.message || `Error HTTP ${res.status}`)
  return data?.choices?.[0]?.message?.content || ''
}

module.exports = { getProviderList, testProvider, streamChat, clearModelCache, getConfig, PROVIDER_DEFS, generateTitle, completeCode }