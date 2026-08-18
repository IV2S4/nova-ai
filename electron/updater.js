const GITHUB_REPO = 'IV2S4/nova-ai'

async function checkForUpdates(currentVersion) {
  if (!GITHUB_REPO) return { ok: false, configured: false, message: 'El canal de actualizaciones no está configurado. Publica el proyecto en GitHub y pon el nombre del repositorio en electron/updater.js (GITHUB_REPO).' }
  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Nova-AI' },
      signal: AbortSignal.timeout(10000)
    })
    if (!res.ok) return { ok: false, configured: true, message: `No se pudo consultar GitHub (HTTP ${res.status}).` }
    const rel = await res.json()
    const latest = String(rel.tag_name || '').replace(/^v/, '')
    const cur = String(currentVersion || '')
    if (latest && latest !== cur) {
      return { ok: true, configured: true, updateAvailable: true, latest, url: rel.html_url || '', notes: String(rel.body || '').slice(0, 400) }
    }
    return { ok: true, configured: true, updateAvailable: false, latest: cur, message: 'Ya tienes la última versión instalada.' }
  } catch (e) {
    return { ok: false, configured: true, message: 'Sin conexión para comprobar actualizaciones.' }
  }
}

module.exports = { checkForUpdates }