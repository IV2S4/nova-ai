const fs = require('fs')
const path = require('path')

function filePath(app) {
  return path.join(app.getPath('userData'), 'config.json')
}

const DEFAULTS = {
  providers: {
    anthropic: { apiKey: '' },
    openai: { apiKey: '' },
    google: { apiKey: '' },
    openrouter: { apiKey: '' },
    deepseek: { apiKey: '' },
    groq: { apiKey: '' },
    mistral: { apiKey: '' },
    xai: { apiKey: '' },
    ollama: { apiKey: '' },
    lmstudio: { apiKey: '' },
    openaicompat: { apiKey: '', base: '' }
  },
  tavily: { apiKey: '' },
  voice: { enabled: false, rate: 1, voice: '' },
  webSearchDefault: false,
  agent: { workspace: '' },
  memory: { enabled: true },
  autoTitles: true,
  theme: 'dark',
  lastSeenVersion: ''
}

function deepMerge(base, extra) {
  const out = { ...base }
  for (const [k, v] of Object.entries(extra || {})) {
    if (v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object') {
      out[k] = deepMerge(base[k], v)
    } else {
      out[k] = v
    }
  }
  return out
}

async function getSettings(app) {
  try {
    const raw = fs.readFileSync(filePath(app), 'utf8')
    return deepMerge(DEFAULTS, JSON.parse(raw))
  } catch {
    return { ...DEFAULTS }
  }
}

async function saveSettings(app, settings) {
  const cur = await getSettings(app)
  const merged = deepMerge(cur, settings)
  fs.mkdirSync(path.dirname(filePath(app)), { recursive: true })
  fs.writeFileSync(filePath(app), JSON.stringify(merged, null, 2))
  return merged
}

module.exports = { getSettings, saveSettings }