const fs = require('fs')
const path = require('path')
const files = require('./files')

const CHUNK_SIZE = 1400
const CHUNK_OVERLAP = 200

function chunkText(text) {
  const paragraphs = text.split(/\n{2,}/)
  const chunks = []
  let cur = ''
  for (const p of paragraphs) {
    const piece = p.replace(/\s+/g, ' ').trim()
    if (!piece) continue
    if ((cur + '\n' + piece).length <= CHUNK_SIZE) {
      cur = cur ? cur + '\n' + piece : piece
      continue
    }
    if (cur) chunks.push(cur)
    if (piece.length > CHUNK_SIZE) {
      for (let i = 0; i < piece.length; i += CHUNK_SIZE - CHUNK_OVERLAP) {
        chunks.push(piece.slice(i, i + CHUNK_SIZE))
      }
    } else {
      cur = piece
    }
  }
  if (cur) chunks.push(cur)
  return chunks
}

function tokens(text) {
  return (text || '').toLowerCase().split(/[^a-z0-9áéíóúñü]+/i).filter((w) => w.length > 2)
}

function scoreChunk(chunk, queryTokens) {
  const words = tokens(chunk)
  const freq = new Map()
  for (const w of words) freq.set(w, (freq.get(w) || 0) + 1)
  let score = 0
  for (const q of queryTokens) {
    const f = freq.get(q) || 0
    if (f) score += 1 + Math.log2(f + 1)
  }
  if (score === 0) return 0
  score += words.length / 200
  return score
}

function indexPath(base, id) {
  return path.join(base, id, 'index.json')
}

function readIndex(base, id) {
  try {
    return JSON.parse(fs.readFileSync(indexPath(base, id), 'utf8'))
  } catch {
    return { files: [] }
  }
}

function writeIndex(base, id, index) {
  fs.mkdirSync(path.join(base, id), { recursive: true })
  fs.writeFileSync(indexPath(base, id), JSON.stringify(index), 'utf8')
}

function listProjects(base) {
  if (!fs.existsSync(base)) return []
  return fs.readdirSync(base, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => {
      const index = readIndex(base, e.name)
      const chunks = index.files.reduce((n, f) => n + f.chunks.length, 0)
      const stat = fs.statSync(path.join(base, e.name))
      return { id: e.name, name: e.name, files: index.files.length, chunks, updatedAt: stat.mtimeMs }
    })
    .sort((a, b) => b.updatedAt - a.updatedAt)
}

async function addFiles(base, id, filePaths) {
  const index = readIndex(base, id)
  const added = []
  for (const p of filePaths) {
    try {
      const res = await files.extract(p)
      if (!res.ok || res.kind !== 'text' || !res.text) {
        added.push({ name: p, ok: false, error: res.error || 'Sin texto extraíble' })
        continue
      }
      const name = path.basename(p)
      const chunks = chunkText(res.text).map((t, i) => ({ id: `${name}#${i}`, text: t }))
      index.files = index.files.filter((f) => f.name !== name)
      if (chunks.length) index.files.push({ name, chunks })
      added.push({ name, ok: true, chunks: chunks.length })
    } catch (e) {
      added.push({ name: p, ok: false, error: e.message })
    }
  }
  writeIndex(base, id, index)
  return added
}

function removeFile(base, id, fileName) {
  const index = readIndex(base, id)
  index.files = index.files.filter((f) => f.name !== fileName)
  writeIndex(base, id, index)
  return true
}

function search(base, id, query, topK = 5) {
  const index = readIndex(base, id)
  const qt = tokens(query)
  if (!qt.length) return []
  const scored = []
  for (const f of index.files) {
    for (const c of f.chunks) {
      const s = scoreChunk(c.text, qt)
      if (s > 0) scored.push({ file: f.name, chunkId: c.id, text: c.text, score: s })
    }
  }
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, topK)
}

function deleteProject(base, id) {
  fs.rmSync(path.join(base, id), { recursive: true, force: true })
  return true
}

module.exports = { listProjects, addFiles, removeFile, search, deleteProject, chunkText }