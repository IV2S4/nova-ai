const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')
const { getConfig, PROVIDER_DEFS } = require('./providers')
const websearch = require('./websearch')
const { findRelevantSkills } = require('./skills')
const memory = require('./memory')
const mcp = require('./mcp')
const files = require('./files')

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
      name: 'run_tests',
      description: 'Detecta y ejecuta la suite de tests del proyecto automáticamente (npm test, pytest, cargo test, go test, etc.). Úsala para verificar que el código funciona.',
      parameters: {
        type: 'object',
        properties: {
          cwd: { type: 'string', description: 'Subcarpeta del proyecto donde están los tests (opcional)' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'read_pdf',
      description: 'Lee y extrae el texto de un archivo PDF del proyecto. Útil para documentación, manuales o informes.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Ruta relativa al proyecto del PDF' }
        },
        required: ['path']
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

function mcpServerId(id) {
  return String(id || '').replace(/[^a-zA-Z0-9_-]/g, '-')
}

async function mcpTools(settings) {
  const servers = settings?.mcp?.servers || []
  const out = []
  for (const s of servers) {
    if (!s.enabled || !s.command) continue
    const sid = mcpServerId(s.id || s.name)
    let tools = mcpToolCache.get(sid)
    if (!tools) {
      try {
        tools = await Promise.race([
          mcp.listTools(sid, s),
          new Promise((_, rej) => setTimeout(() => rej(new Error('timeout MCP')), 15000))
        ])
        mcpToolCache.set(sid, tools)
      } catch {
        tools = []
      }
    }
    for (const t of tools) {
      out.push({
        type: 'function',
        function: {
          name: `mcp_${sid}__${t.name}`,
          description: `[MCP ${s.name}] ${t.description || 'Herramienta del servidor MCP'}`,
          parameters: t.inputSchema || { type: 'object', properties: {} }
        }
      })
    }
  }
  return out
}

const mcpToolCache = new Map()

async function buildTools(settings) {
  return [...TOOLS, ...(await mcpTools(settings))]
}

async function execMcpTool(fullName, args, settings) {
  const rest = fullName.slice(4)
  const sep = rest.indexOf('__')
  if (sep === -1) throw new Error('Herramienta MCP mal formada')
  const sid = rest.slice(0, sep)
  const toolName = rest.slice(sep + 2)
  const servers = settings?.mcp?.servers || []
  const server = servers.find((s) => mcpServerId(s.id || s.name) === sid)
  if (!server) throw new Error(`Servidor MCP no encontrado: ${sid}`)
  return mcp.callTool(sid, server, toolName, args)
}

function diffLines(oldStr, newStr) {
  const a = (oldStr || '').split('\n')
  const b = (newStr || '').split('\n')
  const n = a.length
  const m = b.length
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }
  const out = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (a[i] === b[j]) { out.push('  ' + a[i]); i++; j++ }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push('- ' + a[i]); i++ }
    else { out.push('+ ' + b[j]); j++ }
  }
  while (i < n) { out.push('- ' + a[i]); i++ }
  while (j < m) { out.push('+ ' + b[j]); j++ }
  return out.slice(0, 500).join('\n')
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
    let settled = false
    const push = (chunk) => {
      out = (out + chunk).slice(-MAX_OUTPUT * 2)
      chunks.push(chunk)
    }
    const chunks = []
    const done = (ok, error) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
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
      done(false, String(err.message || err).slice(0, 1200))
    })
    child.on('close', (code) => {
      const aborted = signal?.aborted
      if (aborted) done(false, 'Detenido por el usuario')
      else if (code === null) done(false, 'Proceso terminado sin código de salida')
      else done(code === 0, '')
    })
  })
}

async function* runToolStream(name, args, workspace, toolId, signal, settings, state) {
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
      case 'run_tests': {
        const cwd = args.cwd ? safeResolve(workspace, args.cwd) : workspace
        let command = null
        const pkgPath = path.join(cwd, 'package.json')
        if (fs.existsSync(pkgPath)) {
          try {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
            if (pkg.scripts?.test) command = 'npm test'
          } catch { }
        }
        if (!command && fs.existsSync(path.join(cwd, 'pytest.ini'))) command = 'python -m pytest'
        if (!command && fs.existsSync(path.join(cwd, 'pyproject.toml'))) command = 'python -m pytest'
        if (!command && fs.existsSync(path.join(cwd, 'go.mod'))) command = 'go test ./...'
        if (!command && fs.existsSync(path.join(cwd, 'Cargo.toml'))) command = 'cargo test'
        if (!command) {
          yield { type: 'result', result: { ok: false, error: 'No se detectaron tests en esta carpeta. Revisa package.json (script "test"), pytest, Go o Cargo.' } }
          return
        }
        const r = await runCommandStream(cwd, command, toolId, signal)
        for (const chunk of r.chunks) yield { type: 'chunk', text: chunk }
        yield { type: 'result', result: { ok: r.ok, output: r.output || '', error: r.error || '' } }
        return
      }
      case 'read_pdf': {
        const p = safeResolve(workspace, args.path)
        if (path.extname(p).toLowerCase() !== '.pdf') throw new Error('No es un archivo PDF')
        const res = await files.extract(p)
        if (!res.ok || res.kind !== 'text') throw new Error(res.error || 'No se pudo leer el PDF')
        yield { type: 'result', result: { ok: true, output: res.text.slice(0, MAX_OUTPUT) } }
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
        const newContent = String(args.content ?? '')
        const existed = fs.existsSync(p)
        const oldContent = existed ? fs.readFileSync(p, 'utf8') : null
        if (state?.plan) {
          const proposal = {
            id: 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            action: 'write', path: args.path, oldExisted: existed,
            oldContent, newContent, diff: diffLines(oldContent || '', newContent)
          }
          state.proposals = state.proposals || []
          state.proposals.push(proposal)
          yield { type: 'proposal', proposal }
          yield { type: 'result', result: { ok: true, output: `[PLAN] Propuesta registrada para ${path.relative(workspace, p)} (no se ha guardado). El usuario debe aprobarla para aplicarla.` } }
          return
        }
        fs.mkdirSync(path.dirname(p), { recursive: true })
        fs.writeFileSync(p, newContent, 'utf8')
        yield { type: 'result', result: { ok: true, output: `Archivo guardado: ${path.relative(workspace, p)}` } }
        return
      }
      case 'edit_file': {
        const p = safeResolve(workspace, args.path)
        const src = fs.readFileSync(p, 'utf8')
        const edits = Array.isArray(args.edits) ? args.edits : []
        if (!edits.length) throw new Error('No se proporcionaron ediciones')
        let next = src
        let applied = 0
        for (const ed of edits) {
          const oldText = String(ed.oldText ?? '')
          const newText = String(ed.newText ?? '')
          if (!oldText) throw new Error('Edit con oldText vacío')
          const idx = next.indexOf(oldText)
          if (idx === -1) throw new Error(`Texto no encontrado en ${path.relative(workspace, p)}: "${oldText.slice(0, 80)}..."`)
          const dup = next.indexOf(oldText, idx + 1)
          if (dup !== -1) throw new Error(`El texto aparece varias veces en ${path.relative(workspace, p)}; incluye más contexto: "${oldText.slice(0, 80)}..."`)
          next = next.slice(0, idx) + newText + next.slice(idx + oldText.length)
          applied++
        }
        if (state?.plan) {
          const proposal = {
            id: 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            action: 'edit', path: args.path, oldExisted: true,
            oldContent: src, newContent: next, diff: diffLines(src, next)
          }
          state.proposals = state.proposals || []
          state.proposals.push(proposal)
          yield { type: 'proposal', proposal }
          yield { type: 'result', result: { ok: true, output: `[PLAN] Propuesta registrada: ${applied} edición(es) en ${path.relative(workspace, p)} (no se ha guardado). El usuario debe aprobarla.` } }
          return
        }
        fs.writeFileSync(p, next, 'utf8')
        yield { type: 'result', result: { ok: true, output: `${applied} edición(es) aplicada(s) en ${path.relative(workspace, p)}` } }
        return
      }
      case 'web_search': {
        const res = await websearch.search(settings || { tavily: {} }, String(args.query || ''))
        yield { type: 'result', result: { ok: true, output: res ? res.slice(0, MAX_OUTPUT) : 'Sin resultados' } }
        return
      }
      default: {
        if (name.startsWith('mcp_')) {
          const r = await execMcpTool(name, args, settings)
          yield { type: 'result', result: r }
          return
        }
        throw new Error('Herramienta desconocida: ' + name)
      }
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

async function* streamOpenAIDelta(res, acc) {
  let content = ''
  for await (const { json, done } of readSSE(res)) {
    if (done) return content
    const delta = json.choices?.[0]?.delta || {}
    if (delta.reasoning_content) yield { type: 'thinking', text: delta.reasoning_content }
    if (delta.content) {
      content += delta.content
      yield { type: 'text', text: delta.content }
    }
    for (const tc of delta.tool_calls || []) {
      const i = tc.index || 0
      acc.toolCalls[i] = acc.toolCalls[i] || { id: '', name: '', arguments: '' }
      if (tc.id) acc.toolCalls[i].id = tc.id
      if (tc.function?.name) acc.toolCalls[i].name += tc.function.name
      if (tc.function?.arguments) acc.toolCalls[i].arguments += tc.function.arguments
    }
  }
  return content
}

async function* streamAnthropicDelta(res, acc) {
  let content = ''
  for await (const { json, done } of readSSE(res)) {
    if (done) return content
    if (json.type === 'content_block_start' && json.content_block?.type === 'tool_use') {
      acc.tools[json.index] = { id: json.content_block.id, name: json.content_block.name, input: '' }
    } else if (json.type === 'content_block_delta') {
      if (json.delta?.type === 'text_delta') {
        content += json.delta.text || ''
        yield { type: 'text', text: json.delta.text || '' }
      } else if (json.delta?.type === 'thinking_delta') {
        yield { type: 'thinking', text: json.delta.thinking || '' }
      } else if (json.delta?.type === 'input_json_delta') {
        acc.tools[json.index] = acc.tools[json.index] || { id: '', name: '', input: '' }
        acc.tools[json.index].input += json.delta.partial_json || ''
      }
    } else if (json.type === 'error') {
      throw new Error(json.error?.message || 'Error de Anthropic')
    }
  }
  return content
}

function anthropicTools(settings) {
  return buildTools(settings).then((all) => all.map((t) => ({
    name: t.function.name,
    description: t.function.description,
    input_schema: t.function.parameters
  })))
}

async function* runAgentOpenAI(cfg, def, msgs, signal, workspace, settings, state) {
  const base = cfg.base || def.base || 'https://api.openai.com/v1'
  const isNewGen = /^(gpt-5|o3)/.test(msgs._model || '')
  const maxTokens = msgs._maxTokens || 8192
  for (let i = 0; i < MAX_ITERS; i++) {
    const body = {
      model: msgs._model,
      messages: msgs.messages,
      tools: await buildTools(settings),
      stream: true,
      ...(msgs._temperature != null ? { temperature: msgs._temperature } : {}),
      ...(isNewGen ? { max_completion_tokens: maxTokens } : { max_tokens: maxTokens })
    }
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}) },
      body: JSON.stringify(body),
      signal: AbortSignal.any([signal, AbortSignal.timeout(300000)])
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error?.message || `Error HTTP ${res.status}`)
    }
    const acc = { toolCalls: [] }
    let content = ''
    for await (const ev of streamOpenAIDelta(res, acc)) {
      if (ev.type === 'thinking') yield { type: 'thinking', text: ev.text }
      else { content += ev.text; yield { type: 'text', text: ev.text } }
    }
    const toolCalls = acc.toolCalls
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
      yield* execTool(tc.name, args, tc.id, signal, workspace, settings, state)
      msgs.messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify({ ok: state.lastTool?.ok, output: state.lastTool?.output || '', error: state.lastTool?.error || '' }) })
    }
  }
  throw new Error('Demasiados pasos de agente (límite alcanzado). Detén la tarea y simplifícala.')
}

async function* execTool(name, args, toolId, signal, workspace, settings, state) {
  state.lastTool = null
  for await (const ev of runToolStream(name, args, workspace, toolId, signal, settings, state)) {
    if (ev.type === 'chunk') yield { type: 'tool_output', id: toolId, chunk: ev.text }
    else if (ev.type === 'proposal') yield { type: 'proposal', proposal: ev.proposal }
    else if (ev.type === 'result') {
      state.lastTool = ev.result
      yield { type: 'tool_result', id: toolId, name, ok: ev.result.ok, output: ev.result.output || '', error: ev.result.error || '' }
    }
  }
}

async function* runAgentAnthropic(cfg, msgs, signal, workspace, settings, state) {
  const system = msgs.messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n')
  const conv = msgs.messages.filter((m) => m.role !== 'system').map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }))
  const maxTokens = msgs._maxTokens || 8192
  for (let i = 0; i < MAX_ITERS; i++) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': cfg.apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: msgs._model,
        max_tokens: maxTokens,
        ...(msgs._temperature != null ? { temperature: msgs._temperature } : {}),
        system: system || undefined,
        messages: conv,
        tools: await anthropicTools(settings),
        stream: true
      }),
      signal: AbortSignal.any([signal, AbortSignal.timeout(300000)])
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error?.message || `Error HTTP ${res.status}`)
    }
    const acc = { tools: [] }
    let content = ''
    for await (const ev of streamAnthropicDelta(res, acc)) {
      if (ev.type === 'thinking') yield { type: 'thinking', text: ev.text }
      else { content += ev.text; yield { type: 'text', text: ev.text } }
    }
    const tools = acc.tools
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
      yield* execTool(t.name, t.input, t.id, signal, workspace, settings, state)
      conv.push({ role: 'user', content: [{ type: 'tool_result', tool_use_id: t.id, content: JSON.stringify({ ok: state.lastTool?.ok, output: state.lastTool?.output || '', error: state.lastTool?.error || '' }) }] })
    }
  }
  throw new Error('Demasiados pasos de agente (límite alcanzado). Detén la tarea y simplifícala.')
}

function geminiTools(settings) {
  return buildTools(settings).then((all) => [{
    functionDeclarations: all.map((t) => ({
      name: t.function.name,
      description: t.function.description,
      parameters: {
        type: 'object',
        properties: (t.function.parameters || {}).properties || {},
        required: (t.function.parameters || {}).required || []
      }
    }))
  }])
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

async function* streamGeminiDelta(res, acc) {
  let text = ''
  for await (const { json, done } of readSSE(res)) {
    if (done) return text
    const parts = json?.candidates?.[0]?.content?.parts || []
    for (const p of parts) {
      if (p.thought) yield { type: 'thinking', text: p.text || '' }
      else if (p.text) {
        text += p.text
        yield { type: 'text', text: p.text }
      }
      else if (p.functionCall) acc.calls.push({ name: p.functionCall.name, args: p.functionCall.args || {} })
    }
    if (json?.promptFeedback?.blockReason) {
      throw new Error('Petición bloqueada por Gemini: ' + json.promptFeedback.blockReason)
    }
  }
  return text
}

async function* runAgentGemini(cfg, msgs, signal, workspace, settings, state) {
  for (let i = 0; i < MAX_ITERS; i++) {
    const { system, contents } = msgsToGemini(msgs.messages)
    const body = {
      contents,
      systemInstruction: system ? { parts: [{ text: system }] } : undefined,
      tools: await geminiTools(settings),
      generationConfig: { maxOutputTokens: msgs._maxTokens || 8192, ...(msgs._temperature != null ? { temperature: msgs._temperature } : {}) }
    }
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(msgs._model)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(cfg.apiKey)}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.any([signal, AbortSignal.timeout(300000)])
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err?.error?.message || `Error HTTP ${res.status}`)
    }
    const acc = { calls: [] }
    let text = ''
    for await (const ev of streamGeminiDelta(res, acc)) {
      if (ev.type === 'thinking') yield { type: 'thinking', text: ev.text }
      else { text += ev.text; yield { type: 'text', text: ev.text } }
    }
    const calls = acc.calls
    if (!calls.length) { yield { type: 'done' }; return }

    msgs.messages.push({ role: 'assistant', content: text || '', functionCalls: calls })
    let n = 0
    for (const c of calls) {
      const id = `gem_${i}_${n++}`
      yield { type: 'tool', id, name: c.name, args: c.args }
      yield* execTool(c.name, c.args, id, signal, workspace, settings, state)
      msgs.messages.push({ role: 'tool', name: c.name, ok: state.lastTool?.ok, output: state.lastTool?.output || '', error: state.lastTool?.error || '' })
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

  let rules = ''
  try {
    const rulesPath = path.join(req.workspace, '.novarules')
    if (fs.existsSync(rulesPath)) {
      rules = fs.readFileSync(rulesPath, 'utf8')
    }
  } catch { }

  let context = req.context
  if (context && context.length > 20000) {
    const summary = await compactContext(settings, req, context)
    if (summary) {
      context = summary
      yield { type: 'compact', text: summary }
    } else {
      context = context.slice(0, 20000) + '\n… (contexto truncado)'
    }
  }

  let system = buildSystemPrompt(req.prompt, req.skills, context, rules)
  if (req.plan) {
    system += `\n\n## MODO PLAN (solo propuestas)
Estás en modo PLAN. Investiga el proyecto (list_files, read_file, run_command de solo lectura) y cuando quieras crear o modificar un archivo usa write_file o edit_file: aquí NO se guardan en disco, solo se registran como propuestas (diff) que el usuario revisará y aprobará una a una.
Reglas del modo plan:
- Prohibido aplicar cambios reales: todo cambio pasa por propuestas.
- Después de registrar propuestas, termina con un resumen de lo que propones y por qué.
- No ejecutes comandos que modifiquen el proyecto (build/install OK si son necesarios para inspeccionar, pero no commits ni scripts destructivos).`
  }
  if (settings?.memory?.enabled) {
    const mem = memory.memoryContext(settings)
    if (mem) system += '\n\n' + mem
  }
  const msgs = {
    _model: req.model,
    _maxTokens: settings?.tuning?.[req.provider]?.maxTokens || 8192,
    _temperature: settings?.tuning?.[req.provider]?.temperature,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: req.prompt }
    ]
  }
  const state = { lastTool: null, plan: !!req.plan, proposals: [] }
  if (def.id === 'anthropic') yield* runAgentAnthropic(cfg, msgs, signal, req.workspace, settings, state)
  else if (def.id === 'google') yield* runAgentGemini(cfg, msgs, signal, req.workspace, settings, state)
  else yield* runAgentOpenAI(cfg, def, msgs, signal, req.workspace, settings, state)
}

async function compactContext(settings, req, context) {
  try {
    const def = PROVIDER_DEFS.find((p) => p.id === req.provider)
    if (!def) return null
    const cfg = getConfig(settings)[req.provider]
    if (!cfg.apiKey && !def.local) return null
    const msgs = {
      _model: req.model,
      messages: [
        { role: 'system', content: 'Eres un asistente que resume el contexto de sesiones de programación. Devuelve SOLO el resumen en español, conciso (máx. 500 palabras), conservando rutas de archivos, comandos, errores y decisiones técnicas importantes. No añadas comentarios.' },
        { role: 'user', content: `Resume este contexto de sesión anterior:\n\n${context}` }
      ]
    }
    const state = { lastTool: null, plan: false, proposals: [] }
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 90000)
    try {
      let out = ''
      if (def.id === 'anthropic') {
        for await (const ev of runAgentAnthropic(cfg, msgs, ctrl.signal, req.workspace, settings, state)) {
          if (ev.type === 'text') out += ev.text
          if (ev.type === 'error') break
        }
      } else if (def.id === 'google') {
        for await (const ev of runAgentGemini(cfg, msgs, ctrl.signal, req.workspace, settings, state)) {
          if (ev.type === 'text') out += ev.text
          if (ev.type === 'error') break
        }
      } else {
        for await (const ev of runAgentOpenAI(cfg, def, msgs, ctrl.signal, req.workspace, settings, state)) {
          if (ev.type === 'text') out += ev.text
          if (ev.type === 'error') break
        }
      }
      return out.trim() || null
    } finally {
      clearTimeout(timer)
    }
  } catch {
    return null
  }
}

function buildSystemPrompt(prompt, enabledIds, context, rules) {
  let base = SYSTEM_PROMPT
  if (context) base += `\n\n## Contexto de la sesión anterior (estás RETOMANDO este trabajo)\n${context}\nSigue a partir de donde se quedó: no repitas trabajo ya hecho y termina lo pendiente.`
  if (rules) base += `\n\n## Reglas del proyecto (.novarules)\n${rules}\nSIGUE ESTAS REGLAS ESTRICTAMENTE en todo tu trabajo.`
  const matched = findRelevantSkills(prompt, enabledIds)
  if (!matched.length) return base
  const block = matched
    .map((s) => `## Skill: ${s.name}\n${s.instructions}`)
    .join('\n\n')
  return `${base}\n\n## Skills activas para esta tarea\nLas siguientes skills coinciden con la petición del usuario. SIGUE SUS INSTRUCCIONES PASO A PASO:\n\n${block}`
}

module.exports = { runAgent, runToolStream, killTool, killAllTools, safeResolve, TOOLS, mcpServerId, clearMcpCache: () => mcpToolCache.clear() }
