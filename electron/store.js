const fs = require('fs')
const path = require('path')

function filePath(app) {
  return path.join(app.getPath('userData'), 'conversations.json')
}

function readAll(app) {
  try {
    return JSON.parse(fs.readFileSync(filePath(app), 'utf8'))
  } catch {
    return []
  }
}

function writeAll(app, list) {
  fs.mkdirSync(path.dirname(filePath(app)), { recursive: true })
  fs.writeFileSync(filePath(app), JSON.stringify(list, null, 2))
}

async function list(app) {
  const all = readAll(app)
  return all
    .map((c) => ({
      id: c.id,
      title: c.title,
      provider: c.provider,
      model: c.model,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      count: (c.messages || []).length
    }))
    .sort((a, b) => b.updatedAt - a.updatedAt)
}

async function get(app, id) {
  return readAll(app).find((c) => c.id === id) || null
}

async function save(app, conv) {
  const all = readAll(app)
  const idx = all.findIndex((c) => c.id === conv.id)
  if (idx >= 0) all[idx] = conv
  else all.push(conv)
  writeAll(app, all)
  return conv
}

async function remove(app, id) {
  writeAll(app, readAll(app).filter((c) => c.id !== id))
}

async function clear(app) {
  writeAll(app, [])
}

module.exports = { list, get, save, remove, clear }