import { SourceResult, SourceLevel } from '../types/index.js'
import { searchWeb, rankSources } from '../services/searcher.js'
import { searchProtheusDocs } from './searchDocs.js'
import { searchCommunity } from './searchCommunity.js'

interface ComparisonResult {
  agreements: string[]
  contradictions: string[]
  versionSpecific: { version: string; details: string }[]
  officialSources: SourceResult[]
  communitySources: SourceResult[]
  confidence: 'high' | 'medium' | 'low'
}

export async function compareSources(
  query: string,
  topics?: string[],
): Promise<ComparisonResult> {
  const officialResults = await searchProtheusDocs(query)
  const communityResults = await searchCommunity(query, true)

  const allSources = rankSources([
    ...officialResults.results,
    ...communityResults.results,
  ])

  const officialSources = allSources.filter(
    (s) => s.sourceLevel <= SourceLevel.LEVEL2_OFFICIAL_REPO,
  )
  const communitySources = allSources.filter(
    (s) => s.sourceLevel >= SourceLevel.LEVEL3_COMMUNITY_TRUSTED,
  )

  const agreements: string[] = []
  const contradictions: string[] = []
  const versionSpecific: { version: string; details: string }[] = []

  const keyTerms = topics ?? query.toLowerCase().split(' ')

  const officialTexts = officialSources.map((s) => s.snippet.toLowerCase()).join(' ')
  const communityTexts = communitySources.map((s) => s.snippet.toLowerCase()).join(' ')

  for (const term of keyTerms) {
    const inOfficial = officialTexts.includes(term.toLowerCase())
    const inCommunity = communityTexts.includes(term.toLowerCase())
    if (inOfficial && inCommunity) {
      agreements.push(`Ambas as fontes mencionam "${term}"`)
    }
  }

  const versionMatches = allSources.filter((s) =>
    /\b\d{2,3}\.\d{2,3}\b|\b(?:12|22|24|25|26|27|28|29|30|31|32|33|34|35|40|41|42|50|55)\b/.test(
      s.snippet,
    ),
  )
  for (const match of versionMatches) {
    const v = match.snippet.match(/\b(\d{2,3}\.\d{2,3}[a-z]?)\b/i)
    if (v) {
      versionSpecific.push({ version: v[1], details: match.snippet.slice(0, 200) })
    }
  }

  const confidence: 'high' | 'medium' | 'low' =
    officialSources.length >= 3 ? 'high'
    : officialSources.length >= 1 ? 'medium'
    : 'low'

  return {
    agreements,
    contradictions,
    versionSpecific,
    officialSources: officialSources.slice(0, 10),
    communitySources: communitySources.slice(0, 10),
    confidence,
  }
}
