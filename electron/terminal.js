const { spawn } = require('child_process')

const terminals = new Map()

function forceKill(child) {
  try {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true })
    } else {
      child.kill('SIGKILL')
    }
  } catch { }
}

function runTerminal(id, cwd, command, onEvent) {
  if (!id || !cwd || !command) return false
  const prev = terminals.get(id)
  if (prev) forceKill(prev)
  const child = spawn(command, { cwd, shell: true, windowsHide: true })
  terminals.set(id, child)
  child.stdout?.on('data', (d) => onEvent({ type: 'chunk', text: d.toString() }))
  child.stderr?.on('data', (d) => onEvent({ type: 'chunk', text: d.toString() }))
  child.on('error', (err) => onEvent({ type: 'error', text: String(err.message || err).slice(0, 1200) }))
  child.on('close', (code) => {
    if (terminals.get(id) === child) terminals.delete(id)
    onEvent({ type: 'exit', code })
  })
  return true
}

function stopTerminal(id) {
  const child = terminals.get(id)
  if (!child) return false
  forceKill(child)
  terminals.delete(id)
  return true
}

function stopAll() {
  for (const id of [...terminals.keys()]) stopTerminal(id)
  return terminals.size === 0
}

module.exports = { runTerminal, stopTerminal, stopAll }