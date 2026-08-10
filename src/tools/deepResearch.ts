import { ResearchReport, SourceResult, SourceLevel } from '../types/index.js'
import { searchWeb, rankSources } from '../services/searcher.js'
import { getCached, setCache } from '../utils/cache.js'

function buildQueries(query: string, modules?: string[]): string[] {
  const q: string[] = []
  q.push(`TDN Protheus ${query}`)
  q.push(`TOTVS ${query}`)
  q.push(`ADVPL ${query}`)
  q.push(`Protheus ${query} documentação`)

  if (modules) {
    for (const m of modules) {
      q.push(`SIGA${m} ${query}`)
      q.push(`TOTVS ${m} ${query}`)
    }
  }

  if (query.length > 10) {
    q.push(`"${query}" ADVPL Protheus`)
  }

  q.push(`site:tdn.totvs.com ${query}`)
  q.push(`site:terminaldeinformacao.com ${query}`)
  q.push(`site:blacktdn.com.br ${query}`)
  q.push(`site:masteradvpl.com.br ${query}`)

  return q
}

export async function deepResearch(
  query: string,
  depth: 'quick' | 'intermediate' | 'deep' = 'intermediate',
  modules?: string[],
  versions?: string[],
): Promise<ResearchReport> {
  const cacheKey = `deep:${query}:${depth}:${(modules ?? []).join(',')}:${(versions ?? []).join(',')}`
  const cached = getCached<ResearchReport>('tool', cacheKey)
  if (cached) return cached

  const queries = buildQueries(query, modules)
  const maxQueries = depth === 'quick' ? 3 : depth === 'intermediate' ? 6 : queries.length
  const activeQueries = queries.slice(0, maxQueries)

  const allResults: SourceResult[] = []
  const seen = new Set<string>()

  for (const q of activeQueries) {
    const results = await searchWeb(q)
    for (const r of results) {
      const key = r.url.split('?')[0]
      if (seen.has(key)) continue
      seen.add(key)
      allResults.push(r)
    }
    if (depth === 'quick' && allResults.length >= 8) break
    if (depth === 'intermediate' && allResults.length >= 20) break
  }

  const ranked = rankSources(allResults)

  const official = ranked.filter((s) => s.sourceLevel <= SourceLevel.LEVEL2_OFFICIAL_REPO)
  const community = ranked.filter((s) => s.sourceLevel === SourceLevel.LEVEL3_COMMUNITY_TRUSTED)
  const github = ranked.filter((s) => s.url.includes('github.com'))
  const microsoft = ranked.filter((s) => s.url.includes('microsoft.com') || s.url.includes('msdn'))
  const other = ranked.filter((s) => s.sourceLevel === SourceLevel.LEVEL4_COMMUNITY_DISCUSSION)

  const versionNotes = versions?.length
    ? `Pesquisado para versões: ${versions.join(', ')}. ` +
      ranked
        .filter((s) => versions.some((v) => s.snippet.includes(v)))
        .map((s) => `- [${s.title}](${s.url})`)
        .join('\n')
    : ranked
        .filter((s) => /\b\d{2,3}\.\d{2,3}[a-z]?\b/.test(s.snippet))
        .slice(0, 5)
        .map((s) => `- [${s.title}](${s.url}) — ${s.snippet.slice(0, 100)}`)
        .join('\n')

  const report: ResearchReport = {
    summary: `Pesquisa concluída para "${query}". ${ranked.length} fontes consultadas (${official.length} oficiais, ${community.length} comunitárias).`,
    technicalExplanation: `Comportamento técnico baseado em ${ranked.length} fontes consultadas.\n\n` +
      ranked
        .filter((s) => s.sourceLevel <= SourceLevel.LEVEL2_OFFICIAL_REPO)
        .slice(0, 5)
        .map((s) => `- **${s.title}** — ${s.snippet}`)
        .join('\n'),
    officialDocumentation: official
      .slice(0, 8)
      .map((s) => `- **${s.title}**\n  ${s.url}\n  ${s.snippet}`)
      .join('\n\n'),
    communityFindings: community
      .slice(0, 6)
      .map((s) => `- **${s.title}**\n  ${s.url}\n  ${s.snippet}`)
      .join('\n\n'),
    bestPractices: `Melhores práticas identificadas a partir das fontes pesquisadas para "${query}".\n\n` +
      ranked
        .filter((s) => /boas? prática|best practice|recomenda|performance|segurança/i.test(s.snippet))
        .slice(0, 5)
        .map((s) => `- [${s.title}](${s.url})`)
        .join('\n'),
    commonMistakes: `Erros comuns identificados nas fontes para "${query}".\n\n` +
      ranked
        .filter((s) => /erro|error|bug|problema|falha|atenção/i.test(s.snippet))
        .slice(0, 5)
        .map((s) => `- [${s.title}](${s.url}) — ${s.snippet.slice(0, 150)}`)
        .join('\n'),
    codeExamples: rankSources([
      ...official.filter((s) => /exemplo|example|snippet|código|codigo/i.test(s.snippet)),
      ...community.filter((s) => /exemplo|example|snippet|código|codigo/i.test(s.snippet)),
    ])
      .slice(0, 5)
      .map((s) => `- [${s.title}](${s.url})`)
      .join('\n'),
    references: { official: official.slice(0, 10), community: community.slice(0, 8), github: github.slice(0, 5), microsoft: microsoft.slice(0, 3), other: other.slice(0, 5) },
    versionConsiderations: versionNotes || 'Nenhuma consideração específica de versão encontrada.',
    metadata: {
      query,
      sourcesConsulted: ranked.length,
      timestamp: new Date().toISOString(),
      depth,
    },
  }

  setCache('tool', cacheKey, report, 600000)
  return report
}
