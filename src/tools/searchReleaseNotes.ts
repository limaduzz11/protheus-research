import { SourceResult } from '../types/index.js'
import { searchWeb, rankSources } from '../services/searcher.js'
import { getCached, setCache } from '../utils/cache.js'

export async function searchReleaseNotes(
  product: string,
  version?: string,
  patch?: string,
): Promise<{
  results: SourceResult[]
  changelog: string[]
  breakingChanges: string[]
  deprecatedFunctions: string[]
}> {
  const cacheKey = `releasenotes:${product}:${version ?? '*'}:${patch ?? '*'}`
  const cached = getCached<{
    results: SourceResult[]
    changelog: string[]
    breakingChanges: string[]
    deprecatedFunctions: string[]
  }>('tool', cacheKey)
  if (cached) return cached

  const queries: string[] = [
    `TOTVS ${product} release notes ${version ?? ''}`.trim(),
    `Protheus ${product} patch notes ${version ?? ''}`.trim(),
    `TOTVS ${product} changelog ${version ?? ''}`.trim(),
    `TOTVS ${product} breaking changes ${version ?? ''}`.trim(),
    `Protheus ${product} deprecated functions ${version ?? ''}`.trim(),
    `TOTVS ${product} LIB update ${version ?? ''}`.trim(),
    `site:tdn.totvs.com ${product} release notes`,
    `site:centraldeatendimento.totvs.com ${product} atualização`,
  ]

  if (patch) {
    queries.push(`TOTVS patch ${patch} ${product} release notes`)
    queries.push(`Protheus ${patch} update ${product}`)
  }

  const allResults: SourceResult[] = []
  const seen = new Set<string>()

  for (const q of queries) {
    const results = await searchWeb(q)
    for (const r of results) {
      const key = r.url.split('?')[0]
      if (seen.has(key)) continue
      seen.add(key)
      allResults.push(r)
    }
    if (allResults.length >= 25) break
  }

  const ranked = rankSources(allResults)

  const changelog = ranked
    .filter((r) => /changelog|release.?notes|atualiza|novidad/i.test(r.snippet))
    .map((r) => `[${r.title}](${r.url})`)

  const breakingChanges = ranked
    .filter((r) => /breaking|incompatib|deprecat|quebra|obsolet/i.test(r.snippet))
    .map((r) => `[${r.title}](${r.url})`)

  const deprecatedFunctions = ranked
    .filter((r) => /deprecat|obsolet|substituído|removido/i.test(r.snippet))
    .map((r) => `[${r.title}](${r.url})`)

  const result = { results: ranked.slice(0, 20), changelog, breakingChanges, deprecatedFunctions }
  setCache('tool', cacheKey, result, 600000)
  return result
}
