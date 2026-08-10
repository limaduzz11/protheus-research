import { SourceResult, SourceType, SourceLevel } from '../types/index.js'
import { fetchUrl, extractSnippet, extractTitle } from './fetcher.js'
import { getCached, setCache } from '../utils/cache.js'
import { getConfig } from '../utils/config.js'

const SEARCH_PROVIDER = 'https://html.duckduckgo.com/html/?q='

async function webSearch(
  query: string,
  site?: string,
): Promise<{ title: string; url: string; snippet: string }[]> {
  const fullQuery = site ? `${query} site:${site}` : query
  const encoded = encodeURIComponent(fullQuery)
  const url = `${SEARCH_PROVIDER}${encoded}`

  const cached = getCached<{ title: string; url: string; snippet: string }[]>('search', fullQuery)
  if (cached) return cached

  const result = await fetchUrl(url)
  if (!result.ok) return []

  const results: { title: string; url: string; snippet: string }[] = []
  const linkRegex = /<a[^>]+class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi
  const snippetRegex = /<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi

  let linkMatch: RegExpExecArray | null
  while ((linkMatch = linkRegex.exec(result.body)) !== null) {
    const snippetMatch = snippetRegex.exec(result.body)
    const title = extractSnippet(linkMatch[2], 150)
    let href = linkMatch[1]
    if (href.startsWith('//')) href = 'https:' + href
    const snippet = snippetMatch ? extractSnippet(snippetMatch[1], 300) : ''
    results.push({ title, url: href, snippet })
  }

  setCache('search', fullQuery, results, 300000)
  return results.slice(0, getConfig().maxResultsPerSource)
}

const SOURCE_MAP: { domain: string; type: SourceType; level: SourceLevel; name: string }[] = [
  { domain: 'tdn.totvs.com', type: SourceType.OFFICIAL_TDN, level: SourceLevel.LEVEL1_OFFICIAL, name: 'TDN - TOTVS Developer Network' },
  { domain: 'centraldeatendimento.totvs.com', type: SourceType.OFFICIAL_CENTRAL, level: SourceLevel.LEVEL1_OFFICIAL, name: 'Central de Atendimento TOTVS' },
  { domain: 'github.com/totvs', type: SourceType.OFFICIAL_GITHUB, level: SourceLevel.LEVEL2_OFFICIAL_REPO, name: 'GitHub TOTVS' },
  { domain: 'github.com/totvs', type: SourceType.OFFICIAL_GITHUB, level: SourceLevel.LEVEL2_OFFICIAL_REPO, name: 'GitHub TOTVS' },
  { domain: 'terminaldeinformacao.com', type: SourceType.COMMUNITY_TI, level: SourceLevel.LEVEL3_COMMUNITY_TRUSTED, name: 'Terminal de Informação' },
  { domain: 'blacktdn.com.br', type: SourceType.COMMUNITY_BLACKTDN, level: SourceLevel.LEVEL3_COMMUNITY_TRUSTED, name: 'BlackTDN' },
  { domain: 'masteradvpl.com.br', type: SourceType.COMMUNITY_MASTERADVPL, level: SourceLevel.LEVEL3_COMMUNITY_TRUSTED, name: 'MasterADVPL' },
  { domain: 'universoadvpl.com.br', type: SourceType.COMMUNITY_UNIVERSO, level: SourceLevel.LEVEL3_COMMUNITY_TRUSTED, name: 'Universo ADVPL' },
  { domain: 'stackoverflow.com', type: SourceType.COMMUNITY_FORUM, level: SourceLevel.LEVEL4_COMMUNITY_DISCUSSION, name: 'Stack Overflow' },
  { domain: 'reddit.com', type: SourceType.COMMUNITY_FORUM, level: SourceLevel.LEVEL4_COMMUNITY_DISCUSSION, name: 'Reddit' },
  { domain: 'github.com', type: SourceType.COMMUNITY_GITHUB, level: SourceLevel.LEVEL3_COMMUNITY_TRUSTED, name: 'GitHub' },
  { domain: 'medium.com', type: SourceType.COMMUNITY_BLOG, level: SourceLevel.LEVEL4_COMMUNITY_DISCUSSION, name: 'Medium' },
  { domain: 'dev.to', type: SourceType.COMMUNITY_BLOG, level: SourceLevel.LEVEL4_COMMUNITY_DISCUSSION, name: 'Dev.to' },
  { domain: 'docs.microsoft.com', type: SourceType.MICROSOFT, level: SourceLevel.LEVEL1_OFFICIAL, name: 'Microsoft Docs' },
  { domain: 'learn.microsoft.com', type: SourceType.MICROSOFT, level: SourceLevel.LEVEL1_OFFICIAL, name: 'Microsoft Learn' },
]

function classifySource(url: string): { type: SourceType; level: SourceLevel; name: string } {
  for (const entry of SOURCE_MAP) {
    if (url.includes(entry.domain)) return { type: entry.type, level: entry.level, name: entry.name }
  }
  return { type: SourceType.OTHER, level: SourceLevel.LEVEL4_COMMUNITY_DISCUSSION, name: 'Outra fonte' }
}

export interface SearchOptions {
  site?: string
  maxResults?: number
}

export async function searchWeb(
  query: string,
  options?: SearchOptions,
): Promise<SourceResult[]> {
  const site = options?.site ?? undefined
  const results = await webSearch(query, site)

  return results.map((r) => {
    const classification = classifySource(r.url)
    return {
      title: r.title,
      url: r.url,
      snippet: r.snippet,
      sourceType: classification.type,
      sourceLevel: classification.level,
      relevance: classification.level === SourceLevel.LEVEL1_OFFICIAL ? 90
        : classification.level === SourceLevel.LEVEL2_OFFICIAL_REPO ? 75
        : classification.level === SourceLevel.LEVEL3_COMMUNITY_TRUSTED ? 60
        : 40,
    }
  })
}

export function rankSources(sources: SourceResult[]): SourceResult[] {
  const scored = sources.map((s) => ({
    ...s,
    score:
      s.relevance * 10 +
      (s.snippet.length > 50 ? 20 : 0) +
      (s.title.toLowerCase().includes('totvs') ||
      s.title.toLowerCase().includes('protheus') ||
      s.title.toLowerCase().includes('advpl')
        ? 15
        : 0),
  }))
  scored.sort((a, b) => b.score - a.score)

  const seen = new Set<string>()
  return scored.filter((s) => {
    const key = s.url.split('?')[0]
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
