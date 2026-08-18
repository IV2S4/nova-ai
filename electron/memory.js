const fs = require('fs')
const path = require('path')

let baseDir = ''

function init(app) {
  baseDir = app.getPath('userData')
}

function filePath() {
  return path.join(baseDir, 'memory.json')
}

function read() {
  try {
    const raw = fs.readFileSync(filePath(), 'utf8')
    const data = JSON.parse(raw)
    if (!data || !Array.isArray(data.entries)) return { entries: [], profile: {} }
    return data
  } catch {
    return { entries: [], profile: {} }
  }
}

function write(data) {
  try {
    fs.writeFileSync(filePath(), JSON.stringify(data, null, 2), 'utf8')
  } catch { }
}

const ES_WORDS = ['ejecuta', 'corrige', 'arregla', 'revisa', 'explica', 'crea', 'añade', 'compila', 'prueba', 'puedes', 'quiero', 'dime', 'cómo', 'qué', 'mi', 'el', 'la', 'los', 'las', 'para', 'con', 'haz', 'borra', 'configura', 'instala', 'diseña', 'analiza', 'compara', 'resume', 'escribe', 'mejora', 'optimiza', 'prefiero', 'necesito', 'gracias', 'este', 'esta', 'proyecto', 'carpeta', 'archivo']
const EN_WORDS = ['the', 'you', 'please', 'can', 'run', 'fix', 'explain', 'create', 'build', 'my', 'with', 'and', 'for', 'this', 'write', 'add', 'remove', 'install', 'configure', 'test', 'check', 'help', 'what', 'how', 'make', 'need', 'like', 'want']
const ACTION_STYLES = {
  ejecuta: 'directo', corre: 'directo', compila: 'directo', arregla: 'directo', corrige: 'directo',
  revisa: 'directo', haz: 'directo', borra: 'directo', instala: 'directo', configura: 'directo',
  explica: 'detallado', analiza: 'detallado', describe: 'detallado', muestra: 'detallado', compara: 'detallado'
}

function detectLanguage(texts) {
  let es = 0
  let en = 0
  for (const t of texts) {
    const low = ' ' + t.toLowerCase() + ' '
    for (const w of ES_WORDS) if (low.includes(w)) es++
    for (const w of EN_WORDS) if (low.includes(w)) en++
  }
  if (es === 0 && en === 0) return ''
  return es >= en ? 'es' : 'en'
}

function learnFromMessages(messages) {
  try {
    const data = read()
    const users = (messages || [])
      .filter((m) => m && (m.role === 'user') && typeof m.text === 'string' && m.text.trim().length > 3)
      .map((m) => m.text)
    if (!users.length) return data

    const profile = { ...(data.profile || {}) }

    const lang = detectLanguage(users)
    if (lang && profile.language !== lang) {
      profile.language = profile.language && profile.language !== lang ? 'mixto' : lang
    }

    const tags = new Set(profile.tags || [])
    for (const t of users) {
      const low = t.toLowerCase()
      if (/rápido|rapido|enseguida|ya\b|urgente|lo antes posible/.test(low)) tags.add('rápido')
      if (/corto|breve|resumen|conciso|directo al grano/.test(low)) tags.add('breve')
      if (/(con detalle|detalladamente|explica bien|a fondo|paso a paso)/.test(low)) tags.add('detallado')
      for (const [word, style] of Object.entries(ACTION_STYLES)) {
        if (low.includes(word)) tags.add(style)
      }
    }
    if (tags.size) profile.tags = [...tags].slice(0, 8)

    const facts = new Set((data.entries || []).map((e) => e.text))
    const added = []
    for (const t of users) {
      const m = t.match(/recuerda\s*(?:que)?[:\s]+(.+)/i)
      if (m && m[1].trim().length > 4 && m[1].trim().length < 240 && !facts.has(m[1].trim())) {
        added.push({ id: 'mem_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), text: m[1].trim(), category: 'manual', createdAt: Date.now(), source: 'auto' })
        facts.add(m[1].trim())
      }
    }
    const entries = [...(data.entries || []), ...added]
    write({ entries, profile })
    return { entries, profile }
  } catch {
    return read()
  }
}

function addEntry(app, text, category) {
  const data = read()
  const entry = { id: 'mem_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), text: String(text).trim().slice(0, 500), category: category || 'manual', createdAt: Date.now(), source: 'manual' }
  data.entries.push(entry)
  write(data)
  return entry
}

function deleteEntry(id) {
  const data = read()
  data.entries = (data.entries || []).filter((e) => e.id !== id)
  write(data)
  return { ok: true }
}

function list() {
  return read()
}

function profileText(profile) {
  const parts = []
  if (profile.language === 'es') parts.push('Idioma preferido: español')
  else if (profile.language === 'en') parts.push('Preferred language: English')
  else if (profile.language === 'mixto') parts.push('Usa español e inglés indistintamente')
  if (profile.tags && profile.tags.length) {
    const map = {
      directo: 'quiere que actúes directamente (ejecutar, corregir, compilar)',
      detallado: 'quiere explicaciones detalladas, paso a paso',
      rápido: 'prefiere respuestas rápidas, sin rodeos',
      breve: 'prefiere respuestas breves y concisas'
    }
    parts.push('Estilo de trabajo: ' + profile.tags.map((t) => map[t] || t).join('; '))
  }
  return parts.join('. ')
}

function memoryContext(settings) {
  if (!settings?.memory?.enabled) return ''
  const data = read()
  const profile = data.profile || {}
  const parts = []
  const pt = profileText(profile)
  if (pt) parts.push(pt)
  const manual = (data.entries || []).filter((e) => e.category !== 'style')
  if (manual.length) {
    parts.push('Hechos que recuerdas de conversaciones anteriores:\n' + manual.map((e) => '- ' + e.text).join('\n'))
  }
  if (!parts.length) return ''
  return '## Memoria del usuario (aprendida de tus conversaciones anteriores)\n' + parts.join('\n')
}

function compress(messages, keepRecent = 26, maxChars = 1500) {
  const msgs = Array.isArray(messages) ? messages : []
  if (msgs.length <= keepRecent + 6) return { messages: msgs, summary: '' }
  const recent = msgs.slice(-keepRecent)
  const old = msgs.slice(0, msgs.length - keepRecent)
  const lines = []
  let size = 0
  for (const m of old) {
    const t = (m.text || '').replace(/\s+/g, ' ').trim()
    if (!t) continue
    const line = `${m.role === 'user' ? 'Usuario' : 'Asistente'}: ${t.slice(0, 160)}`
    if (size + line.length > maxChars) break
    lines.push(line)
    size += line.length
  }
  return { messages: recent, summary: lines.join('\n') }
}

module.exports = { init, list, addEntry, deleteEntry, learnFromMessages, memoryContext, compress, profileText }