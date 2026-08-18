async function search(settings, query) {
  const tavilyKey = settings.tavily?.apiKey
  if (tavilyKey) {
    try {
      const res = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ api_key: tavilyKey, query, max_results: 6, search_depth: 'basic' }),
        signal: AbortSignal.timeout(15000)
      })
      if (res.ok) {
        const data = await res.json()
        if (data.results?.length) return formatResults(data.results)
      }
    } catch { /* cae al plan B */ }
  }
  try {
    const res = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`, {
      signal: AbortSignal.timeout(12000)
    })
    if (res.ok) {
      const data = await res.json()
      const results = []
      if (data.AbstractText) {
        results.push({ title: data.Heading || query, url: data.AbstractURL || '', content: data.AbstractText })
      }
      const walk = (topics) => {
        for (const t of topics || []) {
          if (t.Text) results.push({ title: t.FirstURL || query, url: t.FirstURL || '', content: t.Text })
          if (t.Topics) walk(t.Topics)
        }
      }
      walk(data.RelatedTopics)
      if (results.length) return formatResults(results)
    }
  } catch { /* sin conexión */ }
  return null
}

function formatResults(results) {
  return results
    .map((r, i) => `${i + 1}. ${r.title}\n   ${r.url}\n   ${r.content}`)
    .join('\n\n')
}

module.exports = { search }