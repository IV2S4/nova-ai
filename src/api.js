export const uid = () =>
  (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36))

export function speak(text, settings) {
  if (!settings?.voice?.enabled || !text) return
  try {
    const synth = window.speechSynthesis
    synth.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'es-ES'
    u.rate = settings.voice.rate || 1
    const voices = synth.getVoices()
    const v = voices.find((x) => x.voiceURI === settings.voice.voice) || voices.find((x) => x.lang.toLowerCase().startsWith('es'))
    if (v) u.voice = v
    synth.speak(u)
  } catch { /* síntesis no disponible */ }
}

export function cancelSpeech() {
  try { window.speechSynthesis?.cancel() } catch { }
}

export function bytesToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  let bin = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(bin)
}