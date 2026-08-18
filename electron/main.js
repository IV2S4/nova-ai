const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const { spawn } = require('child_process')
const settingsStore = require('./settings')
const historyStore = require('./store')
const { getProviderList, testProvider, streamChat, clearModelCache } = require('./providers')
const websearch = require('./websearch')
const fileExtract = require('./files')
const agent = require('./agent')
const skillsLib = require('./skills')
const memory = require('./memory')
const changelog = require('./changelog')
const updater = require('./updater')

const activeRequests = new Map()

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 980,
    minHeight: 640,
    backgroundColor: '#0b0e14',
    title: 'Nova AI',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })
  win.removeMenu()

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
  app.setAppUserModelId('com.nova.ai')
  memory.init(app)
  const win = createWindow()

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

// ---------- IPC ----------

const RETRYABLE = /high demand|overloaded|too busy|try again later|resource exhausted|exhausted|rate limit|429|temporarily unavailable|servers are busy/i

const NO_CREDIT = /insufficient (balance|credits|quota|funds)|not enough (credits|balance|tokens|quota)|out of credits|account balance|credit balance|payment required|billing|recharge|insufficient_quota|quota exhausted|quota exceeded|no credit|no credits|have any credits|credits or licenses|free tier|paid (model|plan)|low balance|coins/i

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

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
      const msg = err?.message || ''
      if (a < attempts && RETRYABLE.test(msg) && !emitted && !err?.signal?.aborted) {
        await sleep(baseDelay * a)
        continue
      }
      throw err
    }
  }
}

function friendlyError(raw, providerId) {
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
      const enriched = { ...req, system: sysParts.filter(Boolean).join('\n\n'), messages }
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
    try {
      for await (const ev of withRetry(() => agent.runAgent(settings, req, ctrl.signal))) {
        if (e.sender.isDestroyed()) { ctrl.abort(); break }
        e.sender.send('agent:event', { id: req.id, ...ev })
      }
    } catch (err) {
      if (!ctrl.signal.aborted && !e.sender.isDestroyed()) {
        const raw = err?.message || 'Error desconocido'
        const cause = err?.cause?.code || err?.cause?.message
        e.sender.send('agent:event', { id: req.id, type: 'error', message: friendlyError(cause && raw === 'fetch failed' ? `${raw} (${cause})` : raw, req.provider) })
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
ipcMain.handle('memory:learn', (_e, messages) => memory.learnFromMessages(messages))

ipcMain.handle('agent:killTool', (_e, toolId) => ({ ok: agent.killTool(toolId) }))

ipcMain.handle('agent:history:list', async () => {
  const all = await historyStore.list(app)
  return all.filter((c) => c.id.startsWith('agent:'))
})
ipcMain.handle('agent:history:get', async (_e, id) => historyStore.get(app, id))
ipcMain.handle('agent:history:delete', async (_e, id) => historyStore.remove(app, id))
ipcMain.handle('agent:history:save', async (_e, c) => historyStore.save(app, c))

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
    const data = { app: 'Nova AI', exportedAt: new Date().toISOString(), settings, history: all }
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: 'Exportar copia de seguridad',
      defaultPath: `Nova AI backup ${new Date().toISOString().slice(0, 10)}.json`,
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
      return { ok: false, error: 'El archivo no es una copia de seguridad válida de Nova AI' }
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