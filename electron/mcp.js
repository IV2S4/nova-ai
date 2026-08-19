const { spawn } = require('child_process')

const clients = new Map()
const RPC_TIMEOUT = 60000

function spawnServer(id, cfg) {
  const proc = spawn(String(cfg.command || ''), Array.isArray(cfg.args) ? cfg.args : [], {
    env: { ...process.env, ...(cfg.env || {}) },
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true
  })
  const client = { proc, pending: new Map(), nextId: 1, buffer: '' }
  proc.stdout.on('data', (d) => {
    client.buffer += d.toString()
    let idx
    while ((idx = client.buffer.indexOf('\n')) !== -1) {
      const line = client.buffer.slice(0, idx).trim()
      client.buffer = client.buffer.slice(idx + 1)
      if (!line) continue
      let msg
      try { msg = JSON.parse(line) } catch { continue }
      if (msg.id != null && client.pending.has(msg.id)) {
        const { resolve, reject } = client.pending.get(msg.id)
        client.pending.delete(msg.id)
        if (msg.error) reject(new Error(msg.error.message || 'Error MCP'))
        else resolve(msg.result)
      }
    }
  })
  proc.stderr.on('data', () => {})
  proc.on('error', () => {
    for (const { reject } of client.pending.values()) reject(new Error('No se pudo arrancar el servidor MCP'))
    client.pending.clear()
  })
  proc.on('exit', () => {
    for (const { reject } of client.pending.values()) reject(new Error('El servidor MCP terminó'))
    client.pending.clear()
    if (clients.get(id) === client) clients.delete(id)
  })
  clients.set(id, client)
  return client
}

function getClient(id, cfg) {
  const existing = clients.get(id)
  if (existing && existing.proc.exitCode === null) return existing
  if (existing) clients.delete(id)
  return spawnServer(id, cfg)
}

function rpc(id, cfg, method, params) {
  const c = getClient(id, cfg)
  const msgId = c.nextId++
  return new Promise((resolve, reject) => {
    let settled = false
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true
        c.pending.delete(msgId)
        reject(new Error(`Tiempo de espera agotado en MCP (${method})`))
      }
    }, RPC_TIMEOUT)
    c.pending.set(msgId, {
      resolve: (v) => { if (!settled) { settled = true; clearTimeout(timer); resolve(v) } },
      reject: (e) => { if (!settled) { settled = true; clearTimeout(timer); reject(e) } }
    })
    c.proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: msgId, method, params }) + '\n')
  })
}

async function listTools(id, cfg) {
  const res = await rpc(id, cfg, 'tools/list', {})
  return (res?.tools || []).map((t) => ({
    name: t.name,
    description: t.description || '',
    inputSchema: t.inputSchema || {}
  }))
}

async function callTool(id, cfg, name, args) {
  const res = await rpc(id, cfg, 'tools/call', { name, arguments: args || {} })
  const parts = Array.isArray(res?.content) ? res.content : []
  const text = parts
    .filter((p) => p.type === 'text' || p.type === 'output_text')
    .map((p) => p.text || '')
    .join('\n')
  const isError = res?.isError || false
  return { ok: !isError, output: text || '(sin contenido)', error: isError ? text || 'Error del tool MCP' : '' }
}

function stopServer(id) {
  const c = clients.get(id)
  if (c) {
    try { c.proc.stdin.end() } catch { }
    try { c.proc.kill() } catch { }
    clients.delete(id)
  }
}

function stopAll() {
  for (const id of [...clients.keys()]) stopServer(id)
}

module.exports = { listTools, callTool, stopServer, stopAll }