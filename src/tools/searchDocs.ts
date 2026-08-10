import { SourceResult, SourceLevel } from '../types/index.js'
import { searchWeb, rankSources } from '../services/searcher.js'
import { getCached, setCache } from '../utils/cache.js'

const OFFICIAL_DOMAINS = [
  'tdn.totvs.com',
  'centraldeatendimento.totvs.com',
  'github.com/totvs',
]

export async function searchProtheusDocs(
  query: string,
  module?: string,
  version?: string,
): Promise<{
  results: SourceResult[]
  totalFound: number
}> {
  const cacheKey = `docs:${query}:${module ?? '*'}:${version ?? '*'}`
  const cached = getCached<{ results: SourceResult[]; totalFound: number }>('tool', cacheKey)
  if (cached) return cached

  const queries: string[] = []

  if (module) {
    queries.push(`TDN Protheus ${module} ${query}`)
    queries.push(`TOTVS ${module} ${query} documentação`)
  }
  queries.push(`TDN Protheus ${query}`)
  queries.push(`TOTVS Protheus documentação ${query}`)

  if (version) {
    queries.push(`Protheus ${version} ${query}`)
    queries.push(`TOTVS ${version} ${query} documentação`)
  }

  const allResults: SourceResult[] = []
  const seen = new Set<string>()

  for (const q of queries) {
    const results = await searchWeb(q)
    for (const r of results) {
      const isOfficial = OFFICIAL_DOMAINS.some((d) => r.url.includes(d))
      if (!isOfficial) continue
      const key = r.url.split('?')[0]
      if (seen.has(key)) continue
      seen.add(key)
      allResults.push(r)
    }
    if (allResults.length >= 20) break
  }

  const ranked = rankSources(allResults)
  const result = { results: ranked.slice(0, 20), totalFound: ranked.length }
  setCache('tool', cacheKey, result, 600000)
  return result
}
