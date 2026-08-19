const MODELS = [
  { re: /gpt-5/, out: 10, in: 2.5 },
  { re: /gpt-4\.1-nano/, out: 0.1, in: 0.1 },
  { re: /gpt-4\.1-mini/, out: 0.4, in: 0.4 },
  { re: /gpt-4\.1/, out: 10, in: 2 },
  { re: /gpt-4o-mini/, out: 0.6, in: 0.15 },
  { re: /gpt-4o/, out: 15, in: 2.5 },
  { re: /gpt-4-turbo/, out: 30, in: 10 },
  { re: /gpt-4/, out: 30, in: 30 },
  { re: /o4-mini/, out: 5, in: 1.1 },
  { re: /o3/, out: 20, in: 5 },
  { re: /o1/, out: 60, in: 15 },
  { re: /claude-opus-4/, out: 75, in: 15 },
  { re: /claude-sonnet-4/, out: 15, in: 3 },
  { re: /claude-haiku-3-5/, out: 5, in: 0.8 },
  { re: /claude-3-opus/, out: 75, in: 15 },
  { re: /claude-3-5-sonnet/, out: 15, in: 3 },
  { re: /claude-3-haiku/, out: 1.25, in: 0.25 },
  { re: /gemini-3/, out: 10, in: 2 },
  { re: /gemini-2\.5-pro/, out: 10, in: 1.25 },
  { re: /gemini-2\.5-flash/, out: 2.5, in: 0.3 },
  { re: /gemini-2\.0-flash/, out: 0.4, in: 0.1 },
  { re: /deepseek-reasoner/, out: 2.19, in: 0.55 },
  { re: /deepseek-chat/, out: 0.28, in: 0.14 },
  { re: /llama/, out: 0.59, in: 0.19 },
  { re: /qwen/, out: 0.4, in: 0.1 }
]

const DEFAULT_OUT = 1.0
const DEFAULT_IN = 0.3

export function modelPrices(model) {
  const m = String(model || '').toLowerCase()
  const hit = MODELS.find((x) => x.re.test(m))
  return hit ? { in: hit.in, out: hit.out } : { in: DEFAULT_IN, out: DEFAULT_OUT }
}

export function estimateTokens(text) {
  return Math.max(1, Math.ceil(String(text || '').length / 4))
}

export function estimateCost(chars, model) {
  const { out } = modelPrices(model)
  return (chars / 4) * (out / 1000000)
}