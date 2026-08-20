const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const { spawn } = require('child_process')
const settingsStore = require('./settings')
const historyStore = require('./store')
const { getProviderList, testProvider, streamChat, clearModelCache, completeCode } = require('./providers')
const websearch = require('./websearch')
const fileExtract = require('./files')
const agent = require('./agent')
const skillsLib = require('./skills')
const memory = require('./memory')
const projects = require('./projects')
const changelog = require('./changelog')
const updater = require('./updater')
const mcp = require('./mcp')
const terminal = require('./terminal')
const { autoUpdater } = require('electron-updater')

app.setPath('userData', path.join(app.getPath('appData'), 'Nova AI'))

const activeRequests = new Map()

let splashWin = null

function createSplash() {
  splashWin = new BrowserWindow({
    width: 320,
    height: 240,
    frame: false,
    transparent: false,
    backgroundColor: '#0b0e14',
    resizable: false,
    alwaysOnTop: true,
    center: true,
    skipTaskbar: true,
    title: 'Aether AI',
    webPreferences: { sandbox: true }
  })
  splashWin.loadFile(path.join(__dirname, 'splash.html'))
  splashWin.on('closed', () => { splashWin = null })
}

function closeSplash() {
  if (splashWin && !splashWin.isDestroyed()) splashWin.close()
  splashWin = null
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 980,
    minHeight: 640,
    show: false,
    backgroundColor: '#0b0e14',
    title: 'Aether AI',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })
  win.removeMenu()
  win.once('ready-to-show', () => {
    win.show()
    closeSplash()
  })

  const devUrl = process.env.VITE_DEV_SERVER_URL
  if (devUrl) win.loadURL(devUrl)
  else win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))

  if (process.env.SMOKE_TEST) {
    win.webContents.once('did-finish-load', () => {
      setTimeout(() => {
        console.log('SMOKE_OK')
        app.quit()
      }, 1500)
    })
  }
  return win
}

app.whenReady().then(() => {
  app.setAppUserModelId('com.aether.ai')
  memory.init(app)
  createSplash()
  const win = createWindow()

  setupAutoUpdater(win)

  win.webContents.once('did-finish-load', async () => {
    const r = await updater.checkForUpdates(app.getVersion())
    if (!r?.ok || !r.updateAvailable) return
    const settings = await settingsStore.getSettings(app)
    if (settings.lastIgnoredVersion === r.latest) return
    if (!win.isDestroyed() && !win.webContents.isDestroyed()) {
      win.webContents.send('update:info', { latest: r.latest, url: r.url, notes: r.notes })
    }
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ---------- Auto-actualización (electron-updater, solo app instalada) ----------

let updateReady = false

function setupAutoUpdater(win) {
  if (!app.isPackaged) return
  autoUpdater.autoDownload = false
  autoUpdater.on('update-available', (info) => {
    if (!win.isDestroyed()) {
      win.webContents.send('update:info', { latest: String(info.version || '').replace(/^v/, ''), url: '', notes: '', autoAvailable: true })
    }
  })
  autoUpdater.on('update-downloaded', () => {
    updateReady = true
    if (!win.isDestroyed()) {
      win.webContents.send('update:info', { latest: '', url: '', notes: '', ready: true })
    }
  })
  autoUpdater.on('error', (e) => {
    if (!win.isDestroyed()) {
      win.webContents.send('update:info', { latest: '', url: '', notes: '', error: String(e?.message || e).slice(0, 300) })
    }
  })
  setTimeout(() => {
    if (!win.isDestroyed()) autoUpdater.checkForUpdates().catch(() => { })
  }, 20000)
}

ipcMain.handle('updates:install', async () => {
  if (!app.isPackaged) return { ok: false, error: 'Solo disponible en la app instalada' }
  if (updateReady) {
    autoUpdater.quitAndInstall()
    return { ok: true }
  }
  try {
    await autoUpdater.downloadUpdate()
    updateReady = true
    return { ok: true }
  } catch (e) {
    return { ok: false, error: String(e?.message || e).slice(0, 300) }
  }
})

// ---------- IPC ----------

const RETRYABLE = /high demand|overloaded|too busy|try again later|resource exhausted|exhausted|rate limit|429|temporarily unavailable|servers are busy/i

const NO_CREDIT = /insufficient (balance|credits|quota|funds)|not enough (credits|balance|tokens|quota)|out of credits|account balance|credit balance|payment required|billing|recharge|insufficient_quota|quota exhausted|quota exceeded|no credit|no credits|have any credits|credits or licenses|free tier|paid (model|plan)|low balance|coins/i

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function saturatedSuggestion(providerId) {
  if (providerId === 'google') return { label: 'Usar gemini-3.7-flash', provider: 'google', model: 'gemini-3.7-flash' }
  if (providerId === 'openrouter') return { label: 'Probar un modelo :free', provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct:free' }
  if (providerId === 'groq') return { label: 'Probar otro modelo de Groq', provider: 'groq', model: '' }
  return null
}

const PROVIDER_LABELS = { google: 'Gemini', openrouter: 'OpenRouter', groq: 'Groq', anthropic: 'Anthropic', openai: 'OpenAI', deepseek: 'DeepSeek', xai: 'xAI', mistral: 'Mistral', lmstudio: 'LM Studio', ollama: 'Ollama' }

const FALLBACKS = {
  google: { provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct', label: 'OpenRouter (meta-llama/llama-3.3-70b-instruct)' },
  openrouter: { provider: 'google', model: 'gemini-3.6-flash', label: 'Gemini (gemini-3.6-flash)' },
  groq: { provider: 'google', model: 'gemini-3.6-flash', label: 'Gemini (gemini-3.6-flash)' },
  anthropic: { provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct', label: 'OpenRouter (meta-llama/llama-3.3-70b-instruct)' },
  openai: { provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct', label: 'OpenRouter (meta-llama/llama-3.3-70b-instruct)' },
  deepseek: { provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct', label: 'OpenRouter (meta-llama/llama-3.3-70b-instruct)' },
  xai: { provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct', label: 'OpenRouter (meta-llama/llama-3.3-70b-instruct)' },
  mistral: { provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct', label: 'OpenRouter (meta-llama/llama-3.3-70b-instruct)' }
}

const FALLBACKABLE = /high demand|overloaded|too busy|try again later|temporarily unavailable|servers are busy|quota exceeded|free_tier|exceeded your current quota|resource exhausted|429|503|rate.limit/i

async function* withRetry(factory, attempts = 3, baseDelay = 3500) {
  let emitted = false
  for (let a = 1; a <= attempts; a++) {
    try {
      for await (const ev of factory()) {
        if (ev.type && ev.type !== 'error') emitted = true
        yield ev
      }
      return
    } catch (err) {
      const raw = `${err?.message || ''} ${err?.code ?? ''}`.trim()
      if (a < attempts && RETRYABLE.test(raw) && !emitted && !err?.signal?.aborted) {
        await sleep(baseDelay * a)
        continue
      }
      throw err
    }
  }
}

function friendlyError(raw, providerId) {
  if (/timed out|aborted due to timeout|timeout/i.test(raw) && !/abort\(\)/.test(raw)) {
    return 'El proveedor tardó demasiado en responder y la conexión se cortó. Reinténtalo, o si usas un modelo con razonamiento largo, prueba otro modelo o espera un momento.'
  }
  if (raw === 'fetch failed') {
    return 'No se pudo conectar con el proveedor. Revisa tu conexión a internet o si el servidor local está en marcha.'
  }
  if (/fetch failed|ECONNREFUSED|ECONNRESET|ENOTFOUND|EAI_AGAIN|ETIMEDOUT|connection refused|network error/i.test(raw)) {
    const tips = {
      lmstudio: 'Abre LM Studio y activa el servidor local: pestaña Developer → botón "Start Server" (puerto 1234). Después carga un modelo y vuelve a enviar.',
      ollama: 'Abre Ollama (o ejecuta "ollama serve" en una terminal) para que el servidor esté en marcha, y vuelve a enviar.',
      openrouter: 'No se pudo conectar con OpenRouter. Revisa tu conexión a internet y vuelve a intentarlo.'
    }
    return tips[providerId] || 'No se pudo conectar con el proveedor. Revisa tu conexión a internet o si el servidor local está en marcha.'
  }
  if (RETRYABLE.test(raw)) {
    const tips = {
      google: 'Prueba con gemini-3.7-flash o gemini-3.6-flash, que ahora mismo están respondiendo.',
      openrouter: 'Los modelos ":free" de OpenRouter se saturan con frecuencia: prueba otro modelo :free o espera un minuto.',
      groq: 'Groq es ultrarrápido: espera unos segundos y reintenta, o elige otro modelo.',
      deepseek: 'Espera unos segundos y vuelve a enviar, o elige otro modelo.'
    }
    return 'El proveedor está saturado en este momento (mucha demanda) y no respondió tras varios intentos. ' + (tips[providerId] || 'Espera unos segundos y vuelve a enviar, o cambia a otro modelo.')
  }
  if (NO_CREDIT.test(raw)) {
    const tips = {
      openrouter: 'Los modelos gratuitos de OpenRouter terminan en ":free" (p. ej. "meta-llama/llama-3.3-70b-instruct:free") y no gastan saldo: elígelos en el selector de modelo.',
      google: 'Los modelos Flash de Gemini son gratuitos dentro del free tier: úsalos o espera a que se restablezca la cuota del día.',
      openai: 'Recarga tu cuenta en platform.openai.com/billing o elige un modelo gratuito de otro proveedor (Groq, Gemini Flash, DeepSeek u OpenRouter :free).',
      anthropic: 'Recarga tu cuenta en console.anthropic.com o elige un modelo gratuito de otro proveedor (Groq, Gemini Flash, DeepSeek u OpenRouter :free).',
      deepseek: 'Recarga tu cuenta en platform.deepseek.com o elige un modelo gratuito de otro proveedor (Groq, Gemini Flash u OpenRouter :free).',
      groq: 'Recarga tu cuenta en console.groq.com o elige un modelo gratuito de otro proveedor (Gemini Flash, DeepSeek u OpenRouter :free).',
      xai: 'Recarga tu cuenta en console.x.ai o elige un modelo gratuito de otro proveedor (Groq, Gemini Flash u OpenRouter :free).',
      mistral: 'Recarga tu cuenta en console.mistral.ai o elige un modelo gratuito de otro proveedor (Groq, Gemini Flash u OpenRouter :free).',
      ollama: 'Los modelos locales de Ollama son gratis. Prueba "llama3.3" o "qwen3" desde el selector de modelo.'
    }
    return 'Este modelo requiere créditos de pago y tu cuenta no tiene saldo suficiente (o la cuota gratuita del día está agotada). ' + (tips[providerId] || 'Recarga tu cuenta en el panel del proveedor o elige otro modelo gratuito.')
  }
  return raw
}

ipcMain.handle('settings:get', async () => settingsStore.getSettings(app))
ipcMain.handle('settings:save', async (_e, s) => settingsStore.saveSettings(app, s))
ipcMain.handle('app:info', () => ({ version: app.getVersion(), entries: changelog.entries }))

ipcMain.handle('updates:check', async () => updater.checkForUpdates(app.getVersion()))

ipcMain.handle('updates:ignore', (_e, v) => {
  settingsStore.saveSettings(app, { lastIgnoredVersion: v })
  return { ok: true }
})
ipcMain.handle('providers:list', async () => {
  const settings = await settingsStore.getSettings(app)
  return getProviderList(settings)
})
ipcMain.handle('providers:reload', async () => {
  clearModelCache()
  const settings = await settingsStore.getSettings(app)
  return getProviderList(settings)
})
ipcMain.handle('providers:test', async (_e, id) => {
  const settings = await settingsStore.getSettings(app)
  return testProvider(settings, id)
})

ipcMain.handle('chat:send', async (e, req) => {
  const settings = await settingsStore.getSettings(app)
  const tuning = settings?.tuning?.[req.provider] || {}
  const ctrl = new AbortController()
  activeRequests.set(req.id, ctrl)
  ;(async () => {
    try {
      const sysParts = [req.system || '']
      if (settings?.memory?.enabled) {
        const mem = memory.memoryContext(settings)
        if (mem) sysParts.push(mem)
      }
      const { messages, summary } = memory.compress(req.messages || [])
      if (summary) sysParts.push(`## Resumen de la parte anterior de esta conversación (ya compactada)\n${summary}`)
      const enriched = {
        ...req,
        temperature: tuning.temperature != null ? tuning.temperature : req.temperature,
        maxTokens: tuning.maxTokens != null ? tuning.maxTokens : req.maxTokens,
        system: sysParts.filter(Boolean).join('\n\n'),
        messages
      }
      for await (const ev of withRetry(() => streamChat(settings, enriched, ctrl.signal))) {
        if (e.sender.isDestroyed()) { ctrl.abort(); break }
        e.sender.send('chat:event', { id: req.id, ...ev })
      }
      memory.learnFromMessages(req.messages || [])
    } catch (err) {
      if (ctrl.signal.aborted) {
        if (!e.sender.isDestroyed()) e.sender.send('chat:event', { id: req.id, type: 'stopped' })
      } else if (!e.sender.isDestroyed()) {
        const raw = err?.message || 'Error desconocido'
        const cause = err?.cause?.code || err?.cause?.message
        e.sender.send('chat:event', { id: req.id, type: 'error', message: friendlyError(cause && raw === 'fetch failed' ? `${raw} (${cause})` : raw, req.provider) })
      }
    } finally {
      activeRequests.delete(req.id)
    }
  })()
  return { ok: true }
})

ipcMain.handle('chat:stop', (_e, id) => {
  const ctrl = activeRequests.get(id)
  if (ctrl) ctrl.abort()
  return { ok: true }
})

ipcMain.handle('chat:title', async (_e, req) => {
  try {
    const settings = await settingsStore.getSettings(app)
    const title = await providers.generateTitle(settings, req)
    return title ? { ok: true, title } : { ok: false }
  } catch (err) {
    return { ok: false, error: err?.message || 'No se pudo generar el título' }
  }
})

ipcMain.handle('agent:send', async (e, req) => {
  const settings = await settingsStore.getSettings(app)
  const ctrl = new AbortController()
  activeRequests.set(req.id, ctrl)
  ;(async () => {
    const send = (ev) => {
      if (!e.sender.isDestroyed()) e.sender.send('agent:event', { id: req.id, ...ev })
    }
    const runWith = (provider, model) => withRetry(() => agent.runAgent(settings, { ...req, provider, model }, ctrl.signal))
    try {
      for await (const ev of runWith(req.provider, req.model)) {
        if (e.sender.isDestroyed()) { ctrl.abort(); break }
        send(ev)
      }
    } catch (err) {
      if (!ctrl.signal.aborted && !e.sender.isDestroyed()) {
        const raw = `${err?.message || 'Error desconocido'} ${err?.cause?.code || err?.cause?.message || ''} ${err?.code ?? ''}`.trim()
        const fb = FALLBACKABLE.test(raw) ? FALLBACKS[req.provider] : null
        if (fb && settings.providers?.[fb.provider]?.apiKey) {
          const name = PROVIDER_LABELS[req.provider] || req.provider
          send({ type: 'notice', message: `${name} está saturado ahora mismo. Continuando automáticamente con ${fb.label}.` })
          send({ type: 'switched', provider: fb.provider, model: fb.model })
          try {
            for await (const ev of runWith(fb.provider, fb.model)) {
              if (e.sender.isDestroyed()) { ctrl.abort(); break }
              send(ev)
            }
          } catch (err2) {
            if (!ctrl.signal.aborted && !e.sender.isDestroyed()) {
              const raw2 = `${err2?.message || 'Error desconocido'} ${err2?.cause?.code || err2?.cause?.message || ''} ${err2?.code ?? ''}`.trim()
              send({
                type: 'error',
                message: `${name} está saturado y el plan B (${fb.label}) tampoco respondió. ${friendlyError(raw2, fb.provider)}`,
                suggestion: null
              })
            }
          }
        } else {
          send({
            type: 'error',
            message: friendlyError(raw, req.provider),
            suggestion: RETRYABLE.test(raw) ? saturatedSuggestion(req.provider) : null
          })
        }
      }
    } finally {
      activeRequests.delete(req.id)
    }
  })()
  return { ok: true }
})

ipcMain.handle('agent:stop', (_e, id) => {
  const ctrl = activeRequests.get(id)
  if (ctrl) ctrl.abort()
  agent.killAllTools()
  return { ok: true }
})

ipcMain.handle('win:alwaysOnTop', (e) => {
  const win = BrowserWindow.fromWebContents(e.sender)
  if (!win) return false
  const next = !win.isAlwaysOnTop()
  win.setAlwaysOnTop(next)
  return next
})

ipcMain.handle('agent:pickWorkspace', async (e) => {
  const win = BrowserWindow.fromWebContents(e.sender)
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: 'Elige la carpeta de tu proyecto',
    buttonLabel: 'Usar esta carpeta',
    properties: ['openDirectory']
  })
  return canceled || !filePaths.length ? null : filePaths[0]
})

ipcMain.handle('skills:list', () => skillsLib.listSkills())

const LOCAL_BASES = { lmstudio: 'http://localhost:1234/v1', ollama: 'http://localhost:11434' }

function spawnDetached(cmd, args) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args || [], { windowsHide: true, stdio: 'ignore', detached: true })
    child.on('error', () => resolve(false))
    child.on('spawn', () => { child.unref(); resolve(true) })
  })
}

async function waitForServer(base, ms) {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) {
    try {
      const res = await fetch(base + '/models', { signal: AbortSignal.timeout(1500) })
      if (res.ok) return true
    } catch { }
    await sleep(800)
  }
  return false
}

ipcMain.handle('local:start', async (_e, providerId) => {
  const base = LOCAL_BASES[providerId]
  if (!base) return { ok: false, error: 'Este proveedor no tiene arranque automático: abre su servidor tú mismo.' }
  try {
    if (await waitForServer(base, 2500)) {
      return { ok: true, message: 'El servidor local ya estaba en marcha.' }
    }
    let started = false
    const candidates = providerId === 'lmstudio'
      ? [['lms', ['server', 'start']], [path.join(process.env.USERPROFILE || '', '.lmstudio', 'bin', 'lms.exe'), ['server', 'start']], [path.join(process.env.LOCALAPPDATA || '', 'LM Studio', 'lms.exe'), ['server', 'start']], [path.join(process.env.LOCALAPPDATA || '', 'Programs', 'LM Studio', 'lms.exe'), ['server', 'start']]]
      : [['ollama', ['serve']], [path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Ollama', 'ollama app.exe'), []]]
    for (const [cmd, args] of candidates) {
      started = await spawnDetached(cmd, args)
      if (started) break
    }
    if (!started) {
      return {
        ok: false,
        error: providerId === 'lmstudio'
          ? 'No pude iniciar LM Studio automáticamente (no encuentro su CLI). Abre LM Studio → Developer → Start Server, o instala la CLI `lms`.'
          : 'No pude iniciar Ollama automáticamente. Ábrelo tú o ejecuta `ollama serve` en una terminal.'
      }
    }
    if (await waitForServer(base, 12000)) {
      return {
        ok: true,
        message: providerId === 'lmstudio'
          ? 'Servidor de LM Studio arrancado (puerto 1234). Si aún no tienes un modelo cargado, cárgalo en LM Studio.'
          : 'Servidor de Ollama arrancado (puerto 11434).'
      }
    }
    return { ok: false, error: 'Intenté arrancar el servidor pero aún no responde. Espera unos segundos y pulsa "Probar" de nuevo.' }
  } catch (err) {
    return { ok: false, error: err?.message || 'Error al iniciar el servidor local' }
  }
})

ipcMain.handle('memory:list', () => memory.list())
ipcMain.handle('memory:add', (_e, text, category) => memory.addEntry(app, text, category))
ipcMain.handle('memory:delete', (_e, id) => memory.deleteEntry(id))

ipcMain.handle('agent:killTool', (_e, toolId) => ({ ok: agent.killTool(toolId) }))

ipcMain.handle('agent:history:list', async () => {
  const all = await historyStore.list(app)
  return all.filter((c) => c.id.startsWith('agent:'))
})
ipcMain.handle('agent:history:get', async (_e, id) => historyStore.get(app, id))
ipcMain.handle('agent:history:delete', async (_e, id) => historyStore.remove(app, id))
ipcMain.handle('agent:history:save', async (_e, c) => historyStore.save(app, c))

function applyHunks(content, hunks, appliedHunkIndices) {
  if (!appliedHunkIndices || !appliedHunkIndices.length) return content
  const lines = content.split('\n')
  const sorted = [...appliedHunkIndices].sort((a, b) => a - b)
  let offset = 0
  for (const hi of sorted) {
    const hunk = hunks[hi]
    if (!hunk) continue
    let lineIdx = hunk.oldStart - 1 + offset
    let i = 0
    while (i < hunk.lines.length) {
      const l = hunk.lines[i]
      if (l.startsWith(' ')) {
        lineIdx++
        i++
      } else if (l.startsWith('-')) {
        lines.splice(lineIdx, 1)
        offset--
        i++
      } else if (l.startsWith('+')) {
        lines.splice(lineIdx, 0, l.slice(1))
        lineIdx++
        offset++
        i++
      }
    }
  }
  return lines.join('\n')
}

function parseHunks(diff) {
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

ipcMain.handle('agent:applyProposals', (_e, { proposals, workspace }) => {
  try {
    if (!workspace) return { ok: false, error: 'Falta el workspace' }
    const applied = []
    for (const p of proposals || []) {
      if (!p || p.applied) continue
      const target = agent.safeResolve(workspace, p.path)
      let newContent = String(p.newContent ?? '')
      if (p.appliedHunks && p.appliedHunks.length && p.diff) {
        const hunks = parseHunks(p.diff)
        const existed = fs.existsSync(target)
        const oldContent = existed ? fs.readFileSync(target, 'utf8') : ''
        newContent = applyHunks(oldContent, hunks, p.appliedHunks)
      }
      fs.mkdirSync(path.dirname(target), { recursive: true })
      fs.writeFileSync(target, newContent, 'utf8')
      applied.push(p.id)
    }
    return { ok: true, applied }
  } catch (e) {
    return { ok: false, error: e.message }
  }
})

ipcMain.handle('agent:undoProposals', (_e, { proposals, workspace }) => {
  try {
    if (!workspace) return { ok: false, error: 'Falta el workspace' }
    const undone = []
    for (const p of [...(proposals || [])].reverse()) {
      if (!p || !p.applied) continue
      const target = agent.safeResolve(workspace, p.path)
      if (p.oldExisted === false || p.oldContent == null) {
        fs.rmSync(target, { force: true })
      } else {
        fs.writeFileSync(target, String(p.oldContent), 'utf8')
      }
      undone.push(p.id)
    }
    return { ok: true, undone }
  } catch (e) {
    return { ok: false, error: e.message }
  }
})

function runGit(workspace, args) {
  return new Promise((resolve) => {
    const child = spawn('git', args, { cwd: workspace, shell: true, windowsHide: true })
    let out = '', err = ''
    child.stdout?.on('data', (d) => out += d.toString())
    child.stderr?.on('data', (d) => err += d.toString())
    child.on('close', (code) => resolve({ code, out: out.trim(), err: err.trim() }))
    child.on('error', (e) => resolve({ code: -1, out: '', err: e.message }))
  })
}

function gitFriendly(err) {
  if (!err) return ''
  const e = String(err)
  if (/not a git repository/i.test(e)) return 'No es un repositorio Git. Inicializa uno con "git init" en el proyecto o usa la terminal.'
  if (/please tell me who you are|user\.name|user\.email/i.test(e)) return 'Git no conoce tu identidad. Configúrala en una terminal: git config --global user.name "Tu Nombre" y git config --global user.email "tu@correo.com"'
  if (/nothing to commit|no changes added to commit/i.test(e)) return 'No hay cambios que commitear.'
  if (/no staged changes/i.test(e)) return 'No hay cambios preparados. Añade archivos primero (botón de staging).'
  if (/unmerged|conflict/i.test(e)) return 'Hay conflictos sin resolver. Resuélvelos antes de continuar.'
  if (/pathspec .* did not match/i.test(e)) return 'El archivo indicado no existe en el repositorio (puede que tenga otra ruta).'
  if (/ambiguous argument|unknown revision/i.test(e)) return 'Git no reconoció la referencia indicada.'
  if (/Permission denied/i.test(e)) return 'Permiso denegado al acceder al repositorio o a la carpeta del proyecto.'
  return e.replace(/^fatal:\s*/i, 'Error de Git: ')
}

ipcMain.handle('git:status', async (_e, { workspace }) => {
  try {
    const r = await runGit(workspace, ['status', '--porcelain'])
    return { ok: r.code === 0, status: r.out, error: gitFriendly(r.err) }
  } catch (e) { return { ok: false, error: e.message } }
})

ipcMain.handle('git:diff', async (_e, { workspace, staged }) => {
  try {
    const args = ['diff']
    if (staged) args.push('--staged')
    const r = await runGit(workspace, args)
    return { ok: r.code === 0, diff: r.out, error: gitFriendly(r.err) }
  } catch (e) { return { ok: false, error: e.message } }
})

ipcMain.handle('git:log', async (_e, { workspace, max = 20 }) => {
  try {
    const r = await runGit(workspace, ['log', `--oneline`, `-${max}`, '--pretty=format:%H|%s|%an|%ad', '--date=short'])
    const commits = r.out.split('\n').filter(Boolean).map((line) => {
      const [hash, subject, author, date] = line.split('|')
      return { hash, subject, author, date }
    })
    return { ok: r.code === 0, commits, error: gitFriendly(r.err) }
  } catch (e) { return { ok: false, error: e.message } }
})

ipcMain.handle('git:stage', async (_e, { workspace, files }) => {
  try {
    const args = ['add', ...(Array.isArray(files) ? files : [files])]
    const r = await runGit(workspace, args)
    return { ok: r.code === 0, error: gitFriendly(r.err) }
  } catch (e) { return { ok: false, error: e.message } }
})

ipcMain.handle('git:unstage', async (_e, { workspace, files }) => {
  try {
    const args = ['reset', 'HEAD', ...(Array.isArray(files) ? files : [files])]
    const r = await runGit(workspace, args)
    return { ok: r.code === 0, error: gitFriendly(r.err) }
  } catch (e) { return { ok: false, error: e.message } }
})

ipcMain.handle('git:commit', async (_e, { workspace, message }) => {
  try {
    const r = await runGit(workspace, ['commit', '-m', message])
    return { ok: r.code === 0, output: r.out, error: gitFriendly(r.err) }
  } catch (e) { return { ok: false, error: e.message } }
})

ipcMain.handle('git:branch', async (_e, { workspace }) => {
  try {
    const r = await runGit(workspace, ['branch', '--show-current'])
    return { ok: r.code === 0, branch: r.out.trim(), error: gitFriendly(r.err) }
  } catch (e) { return { ok: false, error: e.message } }
})

async function simpleChat(settings, providerId, model, system, user) {
  const { PROVIDER_DEFS, getConfig } = require('./providers')
  const def = PROVIDER_DEFS.find((p) => p.id === providerId)
  if (!def) throw new Error('Proveedor desconocido')
  const cfg = getConfig(settings)[providerId]
  if (!cfg.apiKey && !def.local) throw new Error('Falta la API key de ' + def.name)
  if (def.id === 'anthropic') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': cfg.apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model, max_tokens: 400, system, messages: [{ role: 'user', content: user }] }),
      signal: AbortSignal.timeout(60000)
    })
    if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error?.message || `Error HTTP ${res.status}`)
    const data = await res.json()
    return (data.content || []).map((c) => c.text || '').join('')
  }
  if (def.id === 'google') {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(cfg.apiKey)}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: { maxOutputTokens: 400 }
      }),
      signal: AbortSignal.timeout(60000)
    })
    if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error?.message || `Error HTTP ${res.status}`)
    const data = await res.json()
    return (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('')
  }
  const base = cfg.base || def.base || 'https://api.openai.com/v1'
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}) },
    body: JSON.stringify({ model, messages: [{ role: 'system', content: system }, { role: 'user', content: user }], max_tokens: 400 }),
    signal: AbortSignal.timeout(60000)
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error?.message || `Error HTTP ${res.status}`)
  const data = await res.json()
  return data.choices?.[0]?.message?.content || ''
}

ipcMain.handle('git:commitMessage', async (_e, { workspace }) => {
  try {
    const settings = await settingsStore.getSettings(app)
    const { getProviderList } = require('./providers')
    const providers = await getProviderList(settings)
    const prov = providers.find((p) => p.hasKey) || providers.find((p) => p.local)
    if (!prov) return { ok: false, error: 'Configura una API key en Ajustes para generar el mensaje.' }
    const staged = await runGit(workspace, ['diff', '--staged'])
    const unstaged = await runGit(workspace, ['diff'])
    const diff = (staged.out || unstaged.out).slice(0, 12000)
    if (!diff.trim()) return { ok: false, error: 'No hay cambios que commitear.' }
    const model = (prov.models || []).find((m) => !/image/i.test(m)) || prov.models?.[0]
    const text = await simpleChat(
      settings, prov.id, model,
      'Eres un experto en Git. Genera un mensaje de commit CONVENCIONAL y conciso en español (tipo: asunto en imperativo, máx. 70 caracteres, sin firmas ni markdown). Devuelve SOLO el mensaje.',
      'Diff:\n' + diff
    )
    return { ok: true, message: text.trim().split('\n')[0] }
  } catch (e) {
    return { ok: false, error: e.message }
  }
})

// ---------- MCP ----------

ipcMain.handle('mcp:list', async () => {
  const settings = await settingsStore.getSettings(app)
  return { ok: true, servers: settings.mcp?.servers || [] }
})

ipcMain.handle('mcp:save', async (_e, servers) => {
  const settings = await settingsStore.saveSettings(app, { mcp: { servers: Array.isArray(servers) ? servers : [] } })
  agent.clearMcpCache()
  mcp.stopAll()
  return { ok: true, servers: settings.mcp?.servers || [], settings }
})

ipcMain.handle('mcp:tools', async (_e, server) => {
  if (!server?.command) return { ok: false, error: 'Falta el comando del servidor' }
  try {
    const sid = agent.mcpServerId(server.id || server.name)
    const tools = await mcp.listTools(sid, server)
    return { ok: true, tools }
  } catch (e) {
    return { ok: false, error: e.message }
  }
})

ipcMain.handle('mcp:stopAll', () => {
  mcp.stopAll()
  return { ok: true }
})

// ---------- Búsqueda grep ----------

ipcMain.handle('workspace:grep', async (_e, { workspace, pattern, rel, maxResults }) => {
  try {
    if (!pattern) return { ok: true, results: [] }
    const root = path.resolve(workspace)
    const base = rel ? path.resolve(root, rel) : root
    let re
    try { re = new RegExp(pattern, 'i') } catch { return { ok: false, error: 'Expresión regular inválida' } }
    const SKIP = /node_modules|\.git[\\/]|dist[\\/]|build[\\/]|out[\\/]|__pycache__|\.next[\\/]|\.vite[\\/]|coverage[\\/]|package-lock|pnpm-lock|yarn\.lock/i
    const limit = maxResults || 200
    const results = []
    const walk = (dir) => {
      if (results.length >= limit) return
      let entries
      try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }
      for (const e of entries) {
        if (results.length >= limit) return
        const full = path.join(dir, e.name)
        const relp = path.relative(root, full).split(path.sep).join('/')
        if (SKIP.test(relp)) continue
        if (e.isDirectory()) walk(full)
        else if (e.isFile()) {
          try {
            const stat = fs.statSync(full)
            if (stat.size > 2 * 1024 * 1024) continue
            const lines = fs.readFileSync(full, 'utf8').split('\n')
            for (let i = 0; i < lines.length; i++) {
              if (re.test(lines[i])) {
                results.push({ path: relp, line: i + 1, text: lines[i].trim().slice(0, 300) })
                if (results.length >= limit) return
              }
            }
          } catch { }
        }
      }
    }
    walk(base)
    return { ok: true, results }
  } catch (e) {
    return { ok: false, error: e.message }
  }
})

// ---------- Checkpoints ----------

function checkpointDir() {
  return path.join(app.getPath('userData'), 'checkpoints')
}

ipcMain.handle('agent:createCheckpoint', async (_e, { workspace, files }) => {
  try {
    if (!workspace || !files?.length) return { ok: false, error: 'Faltan datos' }
    const id = 'cp_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
    const dir = path.join(checkpointDir(), id)
    const meta = []
    for (const f of files) {
      const target = agent.safeResolve(workspace, f)
      if (!fs.existsSync(target)) { meta.push({ path: f, existed: false }); continue }
      const dest = path.join(dir, ...f.split('/'))
      fs.mkdirSync(path.dirname(dest), { recursive: true })
      fs.copyFileSync(target, dest)
      meta.push({ path: f, existed: true })
    }
    fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify({ workspace, files: meta }, null, 2))
    return { ok: true, id }
  } catch (e) {
    return { ok: false, error: e.message }
  }
})

ipcMain.handle('agent:restoreCheckpoint', async (_e, { id }) => {
  try {
    const dir = path.join(checkpointDir(), id)
    if (!fs.existsSync(path.join(dir, 'meta.json'))) return { ok: false, error: 'Checkpoint no encontrado' }
    const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'))
    for (const m of meta.files) {
      const target = agent.safeResolve(meta.workspace, m.path)
      if (m.existed) {
        const src = path.join(dir, ...m.path.split('/'))
        fs.mkdirSync(path.dirname(target), { recursive: true })
        fs.copyFileSync(src, target)
      } else {
        fs.rmSync(target, { force: true })
      }
    }
    return { ok: true, files: meta.files.map((m) => m.path) }
  } catch (e) {
    return { ok: false, error: e.message }
  }
})

ipcMain.handle('agent:selfWorkspace', () => ({
  ok: true,
  path: path.join(__dirname, '..')
}))

const projectBase = () => path.join(app.getPath('userData'), 'projects')

ipcMain.handle('project:list', () => {
  try {
    return { ok: true, projects: projects.listProjects(projectBase()) }
  } catch (e) {
    return { ok: false, error: e.message }
  }
})

ipcMain.handle('project:create', (_e, name) => {
  try {
    const clean = String(name || '').trim().replace(/[\\/:*?"<>|]/g, '-').slice(0, 80)
    if (!clean) return { ok: false, error: 'Nombre inválido' }
    const base = projectBase()
    fs.mkdirSync(path.join(base, clean), { recursive: true })
    projects.writeIndex(base, clean, { files: [] })
    return { ok: true, project: { id: clean, name: clean, files: 0, chunks: 0, updatedAt: Date.now() } }
  } catch (e) {
    return { ok: false, error: e.message }
  }
})

ipcMain.handle('project:delete', (_e, id) => {
  try {
    projects.deleteProject(projectBase(), id)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e.message }
  }
})

ipcMain.handle('project:pickFiles', async (e) => {
  const win = BrowserWindow.fromWebContents(e.sender)
  const r = await dialog.showOpenDialog(win, {
    title: 'Añadir archivos al proyecto de conocimiento',
    properties: ['openFile', 'multiSelections']
  })
  return r.canceled ? [] : r.filePaths
})

ipcMain.handle('project:addFiles', async (_e, { id, paths }) => {
  try {
    const added = await projects.addFiles(projectBase(), id, paths || [])
    return { ok: true, added }
  } catch (e) {
    return { ok: false, error: e.message }
  }
})

ipcMain.handle('project:removeFile', (_e, { id, fileName }) => {
  try {
    projects.removeFile(projectBase(), id, fileName)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e.message }
  }
})

ipcMain.handle('project:search', (_e, { id, query, topK }) => {
  try {
    return { ok: true, results: projects.search(projectBase(), id, String(query || ''), topK || 5) }
  } catch (e) {
    return { ok: false, error: e.message }
  }
})

ipcMain.handle('project:index', (_e, id) => {
  try {
    const index = projects.readIndex(projectBase(), id)
    return { ok: true, files: index.files.map((f) => ({ name: f.name, chunks: f.chunks.length })) }
  } catch (e) {
    return { ok: false, error: e.message }
  }
})

ipcMain.handle('fs:listDir', (_e, { workspace, rel }) => {
  try {
    const dir = agent.safeResolve(workspace, rel || '.')
    const entries = fs.readdirSync(dir, { withFileTypes: true })
      .filter((e) => !e.name.startsWith('.git') && e.name !== 'node_modules')
      .map((e) => {
        let size = 0
        if (e.isFile()) {
          try { size = fs.statSync(dir + '\\' + e.name).size } catch { }
        }
        return { name: e.name, dir: e.isDirectory(), size }
      })
      .sort((a, b) => (a.dir === b.dir ? a.name.localeCompare(b.name) : a.dir ? -1 : 1))
    return { ok: true, path: dir, entries }
  } catch (e) {
    return { ok: false, error: e.message }
  }
})

ipcMain.handle('shell:open', async (_e, { workspace, rel, target }) => {
  try {
    const p = rel ? agent.safeResolve(workspace, rel) : workspace
    if (target === 'vscode') {
      await new Promise((resolve) => {
        const child = spawn('code', [p], { shell: true, windowsHide: true })
        child.on('error', resolve)
        child.on('close', (code) => resolve(code))
        setTimeout(resolve, 2500)
      })
      return { ok: true, action: 'vscode', path: p }
    }
    if (target === 'browser') {
      await shell.openPath(p)
      return { ok: true, action: 'browser', path: p }
    }
    await shell.openPath(p)
    return { ok: true, action: 'explorer', path: p }
  } catch (e) {
    return { ok: false, error: e.message }
  }
})

ipcMain.handle('backup:export', async (e) => {
  try {
    const win = BrowserWindow.fromWebContents(e.sender)
    const settings = await settingsStore.getSettings(app)
    const all = await historyStore.list(app)
    const data = { app: 'Aether AI', exportedAt: new Date().toISOString(), settings, history: all }
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: 'Exportar copia de seguridad',
      defaultPath: `Aether AI backup ${new Date().toISOString().slice(0, 10)}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })
    if (canceled || !filePath) return { ok: false }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8')
    return { ok: true, filePath }
  } catch (err) {
    return { ok: false, error: err.message }
  }
})

ipcMain.handle('backup:import', async (e) => {
  try {
    const win = BrowserWindow.fromWebContents(e.sender)
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      title: 'Importar copia de seguridad',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile']
    })
    if (canceled || !filePaths.length) return { ok: false }
    const data = JSON.parse(fs.readFileSync(filePaths[0], 'utf8'))
    if (!data || !data.settings || !Array.isArray(data.history)) {
      return { ok: false, error: 'El archivo no es una copia de seguridad válida de Aether AI' }
    }
    await settingsStore.saveSettings(app, data.settings)
    await historyStore.clear(app)
    for (const c of data.history) {
      if (c && typeof c.id === 'string') await historyStore.save(app, c)
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err.message }
  }
})

ipcMain.handle('history:list', () => historyStore.list(app))
ipcMain.handle('history:get', (_e, id) => historyStore.get(app, id))
ipcMain.handle('history:save', (_e, c) => historyStore.save(app, c))
ipcMain.handle('history:delete', (_e, id) => historyStore.remove(app, id))

ipcMain.handle('websearch:query', async (_e, q) => {
  const settings = await settingsStore.getSettings(app)
  return websearch.search(settings, q)
})

ipcMain.handle('file:extract', async (_e, p) => fileExtract.extract(p))

ipcMain.handle('workspace:readFile', async (_e, { workspace, rel }) => {
  try {
    const fs = require('fs')
    const path = require('path')
    const agent = require('./agent')
    const full = agent.safeResolve(workspace, rel)
    const stat = fs.statSync(full)
    if (!stat.isFile()) return { ok: false, error: 'No es un archivo' }
    if (stat.size > 2 * 1024 * 1024) return { ok: false, error: 'Archivo demasiado grande para @mención (máx. 2 MB)' }
    const text = fs.readFileSync(full, 'utf8')
    return { ok: true, name: path.basename(rel), path: rel, text, size: stat.size }
  } catch (e) {
    return { ok: false, error: e.message }
  }
})

ipcMain.handle('workspace:readFileB64', async (_e, { workspace, rel }) => {
  try {
    const fs = require('fs')
    const path = require('path')
    const agent = require('./agent')
    const full = agent.safeResolve(workspace, rel)
    const stat = fs.statSync(full)
    if (!stat.isFile()) return { ok: false, error: 'No es un archivo' }
    if (stat.size > 2 * 1024 * 1024) return { ok: false, error: 'Archivo demasiado grande' }
    const mimes = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf' }
    return { ok: true, base64: fs.readFileSync(full).toString('base64'), mime: mimes[path.extname(full).toLowerCase()] || 'application/octet-stream' }
  } catch (e) {
    return { ok: false, error: e.message }
  }
})

ipcMain.handle('workspace:listFiles', async (_e, { workspace, rel, pattern }) => {
  try {
    const fs = require('fs')
    const path = require('path')
    const agent = require('./agent')
    const dir = agent.safeResolve(workspace, rel || '.')
    const entries = fs.readdirSync(dir, { withFileTypes: true })
      .filter((e) => !e.name.startsWith('.git') && e.name !== 'node_modules' && e.name !== 'dist' && e.name !== 'build')
      .map((e) => {
        const full = path.join(dir, e.name)
        let size = 0
        if (e.isFile()) {
          try { size = fs.statSync(full).size } catch { }
        }
        return { name: e.name, dir: e.isDirectory(), size, rel: rel ? `${rel}/${e.name}` : e.name }
      })
      .sort((a, b) => (a.dir === b.dir ? a.name.localeCompare(b.name) : a.dir ? -1 : 1))
    if (pattern) {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'), 'i')
      return { ok: true, entries: entries.filter((e) => regex.test(e.name)) }
    }
    return { ok: true, entries }
  } catch (e) {
    return { ok: false, error: e.message }
  }
})

ipcMain.handle('workspace:readFolder', async (_e, { workspace, rel, maxFiles = 20 }) => {
  try {
    const fs = require('fs')
    const path = require('path')
    const agent = require('./agent')
    const dir = agent.safeResolve(workspace, rel || '.')
    const results = []
    function walk(d, base) {
      if (results.length >= maxFiles) return
      const entries = fs.readdirSync(d, { withFileTypes: true })
      for (const e of entries) {
        if (results.length >= maxFiles) break
        if (e.name.startsWith('.git') || e.name === 'node_modules' || e.name === 'dist' || e.name === 'build') continue
        const full = path.join(d, e.name)
        const relPath = base ? `${base}/${e.name}` : e.name
        if (e.isDirectory()) {
          walk(full, relPath)
        } else {
          try {
            const stat = fs.statSync(full)
            if (stat.size <= 500 * 1024) {
              const text = fs.readFileSync(full, 'utf8')
              results.push({ name: e.name, path: relPath, text, size: stat.size })
            }
          } catch { }
        }
      }
    }
    walk(dir, rel || '')
    return { ok: true, files: results }
  } catch (e) {
    return { ok: false, error: e.message }
  }
})

ipcMain.handle('workspace:readRules', async (_e, { workspace }) => {
  try {
    const fs = require('fs')
    const path = require('path')
    const agent = require('./agent')
    const rulesPath = path.join(workspace, '.novarules')
    if (!fs.existsSync(rulesPath)) return { ok: true, rules: '' }
    const text = fs.readFileSync(rulesPath, 'utf8')
    return { ok: true, rules: text }
  } catch (e) {
    return { ok: false, error: e.message }
  }
})

ipcMain.handle('workspace:writeRules', async (_e, { workspace, rules }) => {
  try {
    const fs = require('fs')
    const path = require('path')
    const agent = require('./agent')
    const rulesPath = path.join(workspace, '.novarules')
    fs.writeFileSync(rulesPath, rules, 'utf8')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e.message }
  }
})

ipcMain.handle('workspace:writeFile', (_e, { workspace, rel, content }) => {
  try {
    if (!workspace || !rel) return { ok: false, error: 'Faltan parámetros' }
    const target = agent.safeResolve(workspace, rel)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.writeFileSync(target, String(content ?? ''), 'utf8')
    return { ok: true, path: rel }
  } catch (err) {
    return { ok: false, error: String(err.message || err).slice(0, 1200) }
  }
})

ipcMain.handle('terminal:run', (e, { id, cwd, command }) => {
  if (!id || !command) return { ok: false, error: 'Faltan parámetros' }
  if (!cwd || !fs.existsSync(cwd)) return { ok: false, error: 'La carpeta no existe' }
  const send = (ev) => {
    if (!e.sender.isDestroyed()) e.sender.send('terminal:event', { id, ...ev })
  }
  const started = terminal.runTerminal(id, cwd, command, send)
  return started ? { ok: true } : { ok: false, error: 'No se pudo iniciar el comando' }
})

ipcMain.handle('terminal:stop', (_e, id) => ({ ok: terminal.stopTerminal(id) }))

ipcMain.handle('terminal:stopAll', () => ({ ok: terminal.stopAll() }))

ipcMain.handle('complete:code', async (_e, req) => {
  const settings = await settingsStore.getSettings(app)
  try {
    const text = await completeCode(settings, req)
    return { ok: true, text }
  } catch (err) {
    return { ok: false, error: String(err.message || err).slice(0, 400) }
  }
})

ipcMain.handle('export:text', async (e, { defaultName, content }) => {
  try {
    const win = BrowserWindow.fromWebContents(e.sender)
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: 'Exportar conversación',
      defaultPath: defaultName,
      filters: [{ name: 'Markdown', extensions: ['md'] }, { name: 'Texto', extensions: ['txt'] }, { name: 'Todos', extensions: ['*'] }]
    })
    if (canceled || !filePath) return { ok: false }
    fs.writeFileSync(filePath, content, 'utf8')
    return { ok: true, filePath }
  } catch (err) {
    return { ok: false, error: err.message }
  }
})

ipcMain.handle('export:file', async (e, { defaultName, filters, base64 }) => {
  try {
    const win = BrowserWindow.fromWebContents(e.sender)
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: 'Exportar conversación',
      defaultPath: defaultName,
      filters: filters && filters.length ? filters : [{ name: 'Todos', extensions: ['*'] }]
    })
    if (canceled || !filePath) return { ok: false }
    fs.writeFileSync(filePath, Buffer.from(base64, 'base64'))
    return { ok: true, filePath }
  } catch (err) {
    return { ok: false, error: err.message }
  }
})

ipcMain.handle('image:save', async (e, { defaultName, base64, mime }) => {
  try {
    const win = BrowserWindow.fromWebContents(e.sender)
    const ext = (mime || 'image/png').split('/')[1] === 'jpeg' ? 'jpg' : ((mime || 'image/png').split('/')[1] || 'png')
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: 'Guardar imagen',
      defaultPath: defaultName,
      filters: [{ name: 'Imagen', extensions: [ext] }]
    })
    if (canceled || !filePath) return { ok: false }
    fs.writeFileSync(filePath, Buffer.from(base64, 'base64'))
    return { ok: true, filePath }
  } catch (err) {
    return { ok: false, error: err.message }
  }
})

ipcMain.handle('export:pdf', async (e, { defaultName, html }) => {
  const win = BrowserWindow.fromWebContents(e.sender)
  const pdfWin = new BrowserWindow({ show: false, webPreferences: { offscreen: true, sandbox: true } })
  try {
    await pdfWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))
    const pdf = await pdfWin.webContents.printToPDF({
      pageSize: 'A4',
      printBackground: true,
      margins: { top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 }
    })
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: 'Guardar PDF',
      defaultPath: defaultName,
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    })
    if (canceled || !filePath) return { ok: false }
    fs.writeFileSync(filePath, pdf)
    return { ok: true, filePath }
  } catch (err) {
    return { ok: false, error: err.message }
  } finally {
    if (!pdfWin.isDestroyed()) pdfWin.destroy()
  }
})

ipcMain.handle('stt:transcribe', async (_e, { base64, mime }) => {
  const settings = await settingsStore.getSettings(app)
  const key = settings.providers?.openai?.apiKey
  if (!key) return { ok: false, error: 'Necesitas una API key de OpenAI para el dictado por voz (Whisper). Configúrala en Ajustes.' }
  try {
    const ext = mime.includes('mp4') ? 'm4a' : mime.includes('ogg') ? 'ogg' : 'webm'
    const form = new FormData()
    form.append('file', new Blob([Buffer.from(base64, 'base64')], { type: mime }), `audio.${ext}`)
    form.append('model', 'whisper-1')
    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}` },
      body: form,
      signal: AbortSignal.timeout(60000)
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return { ok: false, error: err.error?.message || `Error HTTP ${res.status}` }
    }
    const data = await res.json()
    return { ok: true, text: data.text }
  } catch (e) {
    return { ok: false, error: e.message }
  }
})