const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')
const { getConfig, PROVIDER_DEFS } = require('./providers')
const websearch = require('./websearch')
const { findRelevantSkills } = require('./skills')
const memory = require('./memory')

const MAX_ITERS = 25
const MAX_OUTPUT = 30000

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'run_command',
      description: 'Ejecuta un comando de terminal dentro del proyecto del usuario (npm run build, npm test, git status, etc.). Usa esto para compilar, probar o inspeccionar el proyecto.',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'El comando exacto a ejecutar' },
          cwd: { type: 'string', description: 'Subcarpeta del proyecto donde ejecutarlo (opcional)' }
        },
        required: ['command']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_files',
      description: 'Lista los archivos y carpetas de un directorio del proyecto. Útil para entender la estructura del proyecto.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Ruta relativa al proyecto (opcional, por defecto la raíz)' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Lee el contenido completo de un archivo del proyecto. Útil para entender o revisar código.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Ruta relativa al proyecto' }
        },
        required: ['path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'write_file',
      description: 'Crea o sobrescribe un archivo del proyecto con el contenido dado. Usa esto para implementar cambios.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Ruta relativa al proyecto' },
          content: { type: 'string', description: 'Contenido completo del archivo' }
        },
        required: ['path', 'content']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'edit_file',
      description: 'Edita trozos concretos de un archivo sin reescribirlo entero. Recibe una lista de ediciones, cada una con oldText (texto existente, debe aparecer UNA sola vez) y newText (texto nuevo).',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Ruta relativa al proyecto' },
          edits: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                oldText: { type: 'string', description: 'Texto exacto existente a reemplazar (incluye contexto para que sea único)' },
                newText: { type: 'string', description: 'Texto nuevo que lo sustituye' }
              },
              required: ['oldText', 'newText']
            }
          }
        },
        required: ['path', 'edits']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'web_search',
      description: 'Busca información actualizada en internet (documentación, errores, ejemplos).',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'La búsqueda a realizar' }
        },
        required: ['query']
      }
    }
  }
]

const SYSTEM_PROMPT = `Eres un agente de programación experto que trabaja dentro del proyecto del usuario, al estilo de Claude Code o Cursor.

Reglas de trabajo:
- Primero explora el proyecto (list_files, read_file de package.json, README, etc.) antes de actuar.
- Para compilar, probar o inspeccionar usa run_command. Los comandos pueden tardar: espera siempre su salida.
- Para implementar cambios usa write_file (archivos nuevos o completos) o edit_file (cambios concretos en archivos grandes) y luego verifica con run_command (build o pruebas).
- Si necesitas información reciente usa web_search.
- Los comandos se ejecutan en la carpeta del proyecto; no borres archivos del usuario.
- Responde en el idioma del usuario, sé conciso y explica las decisiones importantes.
- Cuando termines la tarea, resume qué hiciste y qué comandos ejecutaste.`

function safeResolve(workspace, rel) {
  const base = path.resolve(workspace)
  const target = path.resolve(base, rel || '.')
  if (target !== base && !target.startsWith(base + path.sep)) {
    throw new Error(`Ruta fuera del espacio de trabajo: ${rel}`)
  }
  return target
}

const runningProcs = new Map()

function forceKill(child) {
  try {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true })
    } else {
      child.kill('SIGKILL')
    }
  } catch { }
}

function killTool(toolId) {
  const proc = runningProcs.get(toolId)
  if (proc) {
    forceKill(proc)
    runningProcs.delete(toolId)
    return true
  }
  return false
}

function killAllTools() {
  for (const id of [...runningProcs.keys()]) killTool(id)
  return runningProcs.size === 0
}

function runCommandStream(cwd, command, toolId, signal) {
  return new Promise((resolve) => {
    const child = spawn(command, { cwd, shell: true, windowsHide: true })
    runningProcs.set(toolId, child)
    let out = ''
    let killedByUser = false
    const push = (chunk) => {
      out = (out + chunk).slice(-MAX_OUTPUT * 2)
      chunks.push(chunk)
    }
    const chunks = []
    const done = (ok, error) => {
      if (runningProcs.get(toolId) === child) runningProcs.delete(toolId)
      resolve({ ok, error, output: out.slice(0, MAX_OUTPUT), chunks })
    }
    const timer = setTimeout(() => {
      forceKill(child)
      done(false, 'Tiempo de espera agotado (120s). Si el comando no termina, usa el botón de detener.')
    }, 120000)
    child.stdout?.on('data', (d) => push(d.toString()))
    child.stderr?.on('data', (d) => push(d.toString()))
    signal?.addEventListener('abort', () => {
      forceKill(child)
      done(false, 'Detenido por el usuario')
    }, { once: true })
    child.on('error', (err) => {
      clearTimeout(timer)
      done(false, String(err.message || err).slice(0, 1200))
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      const aborted = signal?.aborted
      if (aborted) done(false, 'Detenido por el usuario')
      else if (code === null) done(false, 'Proceso terminado sin código de salida')
      else done(code === 0, '')
    })
  })
}

async function* runToolStream(name, args, workspace, toolId, signal) {
  try {
    switch (name) {
      case 'run_command': {
        const command = String(args.command || '').trim()
        if (!command) throw new Error('Comando vacío')
        const cwd = args.cwd ? safeResolve(workspace, args.cwd) : workspace
        const r = await runCommandStream(cwd, command, toolId, signal)
        for (const chunk of r.chunks) yield { type: 'chunk', text: chunk }
        yield { type: 'result', result: { ok: r.ok, output: r.output || '', error: r.error || '' } }
        return
      }
      case 'read_file': {
        const p = safeResolve(workspace, args.path)
        const stat = fs.statSync(p)
        if (!stat.isFile()) throw new Error('No es un archivo')
        if (stat.size > 1.5 * 1024 * 1024) throw new Error('Archivo demasiado grande para leerlo entero')
        yield { type: 'result', result: { ok: true, output: fs.readFileSync(p, 'utf8').slice(0, MAX_OUTPUT) } }
        return
      }
      case 'list_files': {
        const p = safeResolve(workspace, args.path)
        const entries = fs.readdirSync(p, { withFileTypes: true })
          .sort((a, b) => (a.isDirectory() === b.isDirectory() ? a.name.localeCompare(b.name) : a.isDirectory() ? -1 : 1))
          .map((e) => (e.isDirectory() ? e.name + '/' : e.name))
        yield { type: 'result', result: { ok: true, output: entries.join('\n') || '(carpeta vacía)' } }
        return
      }
      case 'write_file': {
        const p = safeResolve(workspace, args.path)
        fs.mkdirSync(path.dirname(p), { recursive: true })
        fs.writeFileSync(p, String(args.content ?? ''), 'utf8')
        yield { type: 'result', result: { ok: true, output: `Archivo guardado: ${path.relative(workspace, p)}` } }
        return
      }
      case 'edit_file': {
        const p = safeResolve(workspace, args.path)
        let src = fs.readFileSync(p, 'utf8')
        const edits = Array.isArray(args.edits) ? args.edits : []
        if (!edits.length) throw new Error('No se proporcionaron ediciones')
        let applied = 0
        for (const ed of edits) {
          const oldText = String(ed.oldText ?? '')
          const newText = String(ed.newText ?? '')
          if (!oldText) throw new Error('Edit con oldText vacío')
          const idx = src.indexOf(oldText)
          if (idx === -1) throw new Error(`Texto no encontrado en ${path.relative(workspace, p)}: "${oldText.slice(0, 80)}..."`)
          const dup = src.indexOf(oldText, idx + 1)
          if (dup !== -1) throw new Error(`El texto aparece varias veces en ${path.relative(workspace, p)}; incluye más contexto: "${oldText.slice(0, 80)}..."`)
          src = src.slice(0, idx) + newText + src.slice(idx + oldText.length)
          applied++
        }
        fs.writeFileSync(p, src, 'utf8')
        yield { type: 'result', result: { ok: true, output: `${applied} edición(es) aplicada(s) en ${path.relative(workspace, p)}` } }
        return
      }
      case 'web_search': {
        const res = await websearch.search({ tavily: {} }, String(args.query || ''))
        yield { type: 'result', result: { ok: true, output: res ? res.slice(0, MAX_OUTPUT) : 'Sin resultados' } }
        return
      }
      default:
        throw new Error('Herramienta desconocida: ' + name)
    }
  } catch (e) {
    yield { type: 'result', result: { ok: false, output: '', error: String(e.message || e).slice(0, 1200) } }
  }
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
      if (data === '[DONE]') return
      try { yield { json: JSON.parse(data) } } catch { }
    }
  }
}

async function collectOpenAIDelta(res) {
  const toolCalls = []
  let content = ''
  for await (const { json } of readSSE(res)) {
    const delta = json.choices?.[0]?.delta || {}
    if (delta.content) content += delta.content
    for (const tc of delta.tool_calls || []) {
      const i = tc.index || 0
      toolCalls[i] = toolCalls[i] || { id: '', name: '', arguments: '' }
      if (tc.id) toolCalls[i].id = tc.id
      if (tc.function?.name) toolCalls[i].name += tc.function.name
      if (tc.function?.arguments) toolCalls[i].arguments += tc.function.arguments
    }
  }
  return { content, toolCalls }
}

async function collectAnthropicDelta(res) {
  let content = ''
  const tools = []
  for await (const { json } of readSSE(res)) {
    if (json.type === 'content_block_start' && json.content_block?.type === 'tool_use') {
      tools[json.index] = { id: json.content_block.id, name: json.content_block.name, input: '' }
    } else if (json.type === 'content_block_delta') {
      if (json.delta?.type === 'text_delta') content += json.delta.text || ''
      else if (json.delta?.type === 'input_json_delta') {
        tools[json.index] = tools[json.index] || { id: '', name: '', input: '' }
        tools[json.index].input += json.delta.partial_json || ''
      }
    } else if (json.type === 'error') {
      throw new Error(json.error?.message || 'Error de Anthropic')
    }
  }
  return { content, tools }
}

function anthropicTools() {
  return TOOLS.map((t) => ({
    name: t.function.name,
    description: t.function.description,
    input_schema: t.function.parameters
  }))
}

async function* runAgentOpenAI(cfg, def, msgs, signal, workspace) {
  const base = cfg.base || def.base || 'https://api.openai.com/v1'
  const isNewGen = /^(gpt-5|o3)/.test(msgs._model || '')
  for (let i = 0; i < MAX_ITERS; i++) {
    const body = {
      model: msgs._model,
      messages: msgs.messages,
      tools: TOOLS,
      stream: true,
      ...(isNewGen ? { max_completion_tokens: 8192 } : { max_tokens: 8192 })
    }
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}) },
      body: JSON.stringify(body),
      signal
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error?.message || `Error HTTP ${res.status}`)
    }
    const { content, toolCalls } = await collectOpenAIDelta(res)
    if (content) yield { type: 'text', text: content }
    if (!toolCalls.length) { yield { type: 'done' }; return }

    msgs.messages.push({
      role: 'assistant',
      content: content || null,
      tool_calls: toolCalls.map((tc) => ({ id: tc.id, type: 'function', function: { name: tc.name, arguments: tc.arguments } }))
    })
    for (const tc of toolCalls) {
      let args = {}
      try { args = JSON.parse(tc.arguments || '{}') } catch { }
      yield { type: 'tool', id: tc.id, name: tc.name, args }
      yield* execTool(tc.name, args, tc.id, signal, workspace)
      msgs.messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify({ ok: lastTool?.ok, output: lastTool?.output || '', error: lastTool?.error || '' }) })
    }
  }
  throw new Error('Demasiados pasos de agente (límite alcanzado). Detén la tarea y simplifícala.')
}

let lastTool = null

async function* execTool(name, args, toolId, signal, workspace) {
  lastTool = null
  for await (const ev of runToolStream(name, args, workspace, toolId, signal)) {
    if (ev.type === 'chunk') yield { type: 'tool_output', id: toolId, chunk: ev.text }
    else if (ev.type === 'result') {
      lastTool = ev.result
      yield { type: 'tool_result', id: toolId, name, ok: ev.result.ok, output: ev.result.output || '', error: ev.result.error || '' }
    }
  }
}

async function* runAgentAnthropic(cfg, msgs, signal, workspace) {
  const system = msgs.messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n')
  const conv = msgs.messages.filter((m) => m.role !== 'system').map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }))
  for (let i = 0; i < MAX_ITERS; i++) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': cfg.apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: msgs._model,
        max_tokens: 8192,
        system: system || undefined,
        messages: conv,
        tools: anthropicTools(),
        stream: true
      }),
      signal
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error?.message || `Error HTTP ${res.status}`)
    }
    const { content, tools } = await collectAnthropicDelta(res)
    if (content) yield { type: 'text', text: content }
    if (!tools.length) { yield { type: 'done' }; return }

    const parsed = tools.map((t) => {
      let input = {}
      try { input = JSON.parse(t.input || '{}') } catch { }
      return { id: t.id, name: t.name, input }
    })
    conv.push({
      role: 'assistant',
      content: [
        ...(content ? [{ type: 'text', text: content }] : []),
        ...parsed.map((t) => ({ type: 'tool_use', id: t.id, name: t.name, input: t.input }))
      ]
    })
    for (const t of parsed) {
      yield { type: 'tool', id: t.id, name: t.name, args: t.input }
      yield* execTool(t.name, t.input, t.id, signal, workspace)
      conv.push({ role: 'user', content: [{ type: 'tool_result', tool_use_id: t.id, content: JSON.stringify({ ok: lastTool?.ok, output: lastTool?.output || '', error: lastTool?.error || '' }) }] })
    }
  }
  throw new Error('Demasiados pasos de agente (límite alcanzado). Detén la tarea y simplifícala.')
}

function geminiTools() {
  return [{
    functionDeclarations: TOOLS.map((t) => ({
      name: t.function.name,
      description: t.function.description,
      parameters: t.function.parameters
    }))
  }]
}

function msgsToGemini(messages) {
  let system = ''
  const contents = []
  for (const m of messages) {
    if (m.role === 'system') {
      system += (system ? '\n' : '') + m.content
      continue
    }
    if (m.role === 'tool') {
      contents.push({
        role: 'user',
        parts: [{ functionResponse: { name: m.name, response: { ok: m.ok, output: m.output || '', error: m.error || '' } } }]
      })
      continue
    }
    const parts = []
    if (m.content) parts.push({ text: m.content })
    for (const fc of m.functionCalls || []) parts.push({ functionCall: { name: fc.name, args: fc.args } })
    if (parts.length) contents.push({ role: m.role === 'assistant' ? 'model' : 'user', parts })
  }
  return { system, contents }
}

async function collectGeminiDelta(res) {
  let text = ''
  const calls = []
  for await (const { json } of readSSE(res)) {
    const parts = json?.candidates?.[0]?.content?.parts || []
    for (const p of parts) {
      if (p.text) text += p.text
      else if (p.functionCall) calls.push({ name: p.functionCall.name, args: p.functionCall.args || {} })
    }
    if (json?.promptFeedback?.blockReason) {
      throw new Error('Petición bloqueada por Gemini: ' + json.promptFeedback.blockReason)
    }
  }
  return { text, calls }
}

async function* runAgentGemini(cfg, msgs, signal, workspace) {
  for (let i = 0; i < MAX_ITERS; i++) {
    const { system, contents } = msgsToGemini(msgs.messages)
    const body = {
      contents,
      systemInstruction: system ? { parts: [{ text: system }] } : undefined,
      tools: geminiTools(),
      generationConfig: { maxOutputTokens: 8192 }
    }
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(msgs._model)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(cfg.apiKey)}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err?.error?.message || `Error HTTP ${res.status}`)
    }
    const { text, calls } = await collectGeminiDelta(res)
    if (text) yield { type: 'text', text }
    if (!calls.length) { yield { type: 'done' }; return }

    msgs.messages.push({ role: 'assistant', content: text || '', functionCalls: calls })
    let n = 0
    for (const c of calls) {
      const id = `gem_${i}_${n++}`
      yield { type: 'tool', id, name: c.name, args: c.args }
      yield* execTool(c.name, c.args, id, signal, workspace)
      msgs.messages.push({ role: 'tool', name: c.name, ok: lastTool?.ok, output: lastTool?.output || '', error: lastTool?.error || '' })
    }
  }
  throw new Error('Demasiados pasos de agente (límite alcanzado). Detén la tarea y simplifícala.')
}

async function* runAgent(settings, req, signal) {
  const def = PROVIDER_DEFS.find((p) => p.id === req.provider)
  if (!def) throw new Error('Proveedor desconocido para el agente')
  const cfg = getConfig(settings)[req.provider]
  if (!cfg.apiKey && !def.local) throw new Error(`Falta la API key de ${def.name}. Configúrala en Ajustes.`)
  if (!req.workspace || !fs.existsSync(req.workspace)) {
    throw new Error('Primero elige la carpeta de tu proyecto (botón "Elegir proyecto").')
  }
  let system = buildSystemPrompt(req.prompt, req.skills, req.context)
  if (settings?.memory?.enabled) {
    const mem = memory.memoryContext(settings)
    if (mem) system += '\n\n' + mem
  }
  const msgs = {
    _model: req.model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: req.prompt }
    ]
  }
  if (def.id === 'anthropic') yield* runAgentAnthropic(cfg, msgs, signal, req.workspace)
  else if (def.id === 'google') yield* runAgentGemini(cfg, msgs, signal, req.workspace)
  else yield* runAgentOpenAI(cfg, def, msgs, signal, req.workspace)
}

function buildSystemPrompt(prompt, enabledIds, context) {
  let base = SYSTEM_PROMPT
  if (context) base += `\n\n## Contexto de la sesión anterior (estás RETOMANDO este trabajo)\n${context}\nSigue a partir de donde se quedó: no repitas trabajo ya hecho y termina lo pendiente.`
  const matched = findRelevantSkills(prompt, enabledIds)
  if (!matched.length) return base
  const block = matched
    .map((s) => `## Skill: ${s.name}\n${s.instructions}`)
    .join('\n\n')
  return `${base}\n\n## Skills activas para esta tarea\nLas siguientes skills coinciden con la petición del usuario. SIGUE SUS INSTRUCCIONES PASO A PASO:\n\n${block}`
}

module.exports = { runAgent, runToolStream, killTool, killAllTools, safeResolve, TOOLS }
