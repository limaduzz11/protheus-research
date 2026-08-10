import { SourceResult } from '../types/index.js'
import { searchWeb, rankSources } from '../services/searcher.js'
import { getCached, setCache } from '../utils/cache.js'

const COMMUNITY_DOMAINS = [
  'terminaldeinformacao.com',
  'blacktdn.com.br',
  'masteradvpl.com.br',
  'universoadvpl.com.br',
  'github.com',
  'stackoverflow.com',
  'reddit.com',
  'medium.com',
  'dev.to',
]

export async function searchCommunity(
  query: string,
  includeForums?: boolean,
): Promise<{
  results: SourceResult[]
  totalFound: number
}> {
  const cacheKey = `community:${query}:${includeForums ?? false}`
  const cached = getCached<{ results: SourceResult[]; totalFound: number }>('tool', cacheKey)
  if (cached) return cached

  const queries: string[] = [
    query,
    ...query.split(' ').length > 2
      ? [`"${query}" ADVPL`]
      : [`${query} Protheus ADVPL`],
  ]

  const allResults: SourceResult[] = []
  const seen = new Set<string>()

  for (const q of queries) {
    const results = await searchWeb(q)
    for (const r of results) {
      const isCommunity = COMMUNITY_DOMAINS.some((d) => r.url.includes(d))
      if (!isCommunity) continue
      if (!includeForums && (r.url.includes('reddit.com') || r.url.includes('stackoverflow.com'))) continue
      const key = r.url.split('?')[0]
      if (seen.has(key)) continue
      seen.add(key)
      allResults.push(r)
    }
    if (allResults.length >= 30) break
  }

  const ranked = rankSources(allResults)
  const result = { results: ranked.slice(0, 25), totalFound: ranked.length }
  setCache('tool', cacheKey, result, 600000)
  return result
}
