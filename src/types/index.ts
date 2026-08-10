export interface SourceResult {
  title: string
  url: string
  snippet: string
  sourceType: SourceType
  sourceLevel: SourceLevel
  relevance: number
  timestamp?: string
}

export enum SourceType {
  OFFICIAL_TDN = 'official_tdn',
  OFFICIAL_CENTRAL = 'official_central',
  OFFICIAL_RELEASE = 'official_release',
  OFFICIAL_GITHUB = 'official_github',
  COMMUNITY_TI = 'community_ti',
  COMMUNITY_BLACKTDN = 'community_blacktdn',
  COMMUNITY_MASTERADVPL = 'community_masteradvpl',
  COMMUNITY_UNIVERSO = 'community_universo',
  COMMUNITY_GITHUB = 'community_github',
  COMMUNITY_BLOG = 'community_blog',
  COMMUNITY_FORUM = 'community_forum',
  MICROSOFT = 'microsoft',
  OTHER = 'other',
}

export enum SourceLevel {
  LEVEL1_OFFICIAL = 1,
  LEVEL2_OFFICIAL_REPO = 2,
  LEVEL3_COMMUNITY_TRUSTED = 3,
  LEVEL4_COMMUNITY_DISCUSSION = 4,
}

export interface ResearchRequest {
  query: string
  depth?: 'quick' | 'intermediate' | 'deep'
  versions?: string[]
  modules?: string[]
}

export interface ResearchReport {
  summary: string
  technicalExplanation: string
  officialDocumentation: string
  communityFindings: string
  bestPractices: string
  commonMistakes: string
  codeExamples: string
  references: {
    official: SourceResult[]
    community: SourceResult[]
    github: SourceResult[]
    microsoft: SourceResult[]
    other: SourceResult[]
  }
  versionConsiderations: string
  metadata: {
    query: string
    sourcesConsulted: number
    timestamp: string
    depth: string
  }
}

export interface DebugResult {
  diagnosis: string
  probableCauses: string[]
  verificationSteps: string[]
  fixes: string[]
  alternativeFixes: string[]
  preventiveMeasures: string[]
  officialSources: SourceResult[]
  communitySources: SourceResult[]
}

export interface CodeExampleRequest {
  language: 'advpl' | 'tlpp' | 'sql' | 'rest' | 'soap' | 'mvc'
  description: string
  context?: string
}

export interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

export interface SearchConfig {
  maxResultsPerSource: number
  timeout: number
  retryAttempts: number
  cacheTTL: number
  userAgent: string
}
