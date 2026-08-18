const fs = require('fs')
const path = require('path')

const TEXT_EXT = [
  'txt', 'md', 'markdown', 'json', 'csv', 'py', 'js', 'ts', 'jsx', 'tsx',
  'html', 'css', 'xml', 'yml', 'yaml', 'sql', 'c', 'cpp', 'java', 'go',
  'rs', 'rb', 'php', 'sh', 'bat', 'ini', 'toml', 'log'
]

async function extract(filePath) {
  const ext = path.extname(filePath).slice(1).toLowerCase()
  const stat = fs.statSync(filePath)
  if (!stat.isFile()) return { ok: false, error: 'No es un archivo' }

  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'].includes(ext)) {
    if (stat.size > 12 * 1024 * 1024) return { ok: false, error: 'Imagen demasiado grande (máx. 12 MB)' }
    const mime = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`
    return { ok: true, kind: 'image', mime, name: path.basename(filePath), data: fs.readFileSync(filePath).toString('base64') }
  }

  if (ext === 'pdf') {
    if (stat.size > 20 * 1024 * 1024) return { ok: false, error: 'PDF demasiado grande (máx. 20 MB)' }
    try {
      const pdfParse = require('pdf-parse')
      const data = await pdfParse(fs.readFileSync(filePath))
      return { ok: true, kind: 'text', name: path.basename(filePath), text: data.text }
    } catch (e) {
      return { ok: false, error: `No se pudo leer el PDF: ${e.message}` }
    }
  }

  if (TEXT_EXT.includes(ext)) {
    if (stat.size > 5 * 1024 * 1024) return { ok: false, error: 'Archivo demasiado grande (máx. 5 MB)' }
    return { ok: true, kind: 'text', name: path.basename(filePath), text: fs.readFileSync(filePath, 'utf8') }
  }

  return { ok: false, error: `Tipo de archivo no soportado (.${ext || '?'}). Soporta: imágenes, PDF y texto` }
}

module.exports = { extract }