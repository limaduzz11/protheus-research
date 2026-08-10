import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js'
import { searchProtheusDocs } from './tools/searchDocs.js'
import { searchCommunity } from './tools/searchCommunity.js'
import { searchReleaseNotes } from './tools/searchReleaseNotes.js'
import { compareSources } from './tools/compareSources.js'
import { deepResearch } from './tools/deepResearch.js'
import { generateExample } from './tools/generateExample.js'
import { debugError } from './tools/debugError.js'
import { clearCache, cacheSize } from './utils/cache.js'

const TOOLS: Tool[] = [
  {
    name: 'search_protheus_docs',
    description: `Search official TOTVS Protheus documentation across TDN, Central de Atendimento, Framework docs, and Release Notes.
Use this tool when you need authoritative, official TOTVS documentation for any Protheus-related topic.
Always prefer this over community sources for factual technical information.`,
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Technical search query (e.g., "TCSQLExec", "FWRest POST", "SX6 MV_PARXX")',
        },
        module: {
          type: 'string',
          description: 'Optional Protheus module filter (e.g., "SIGAFAT", "SIGAFIN", "SIGAEST")',
        },
        version: {
          type: 'string',
          description: 'Optional Protheus version filter (e.g., "12.1.25", "12.1.33")',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'search_community',
    description: `Search trusted Protheus community sources: Terminal de Informação, BlackTDN, MasterADVPL,
Universo ADVPL, GitHub, Stack Overflow, and technical blogs. Use this to find practical examples,
workarounds, and real-world experiences.`,
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query for community resources',
        },
        includeForums: {
          type: 'boolean',
          description: 'Include forums (Reddit, Stack Overflow) in results',
          default: false,
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'search_release_notes',
    description: `Search for TOTVS Protheus release notes, LIB updates, patches, behavior changes,
breaking changes, and deprecated functions across versions.`,
    inputSchema: {
      type: 'object',
      properties: {
        product: {
          type: 'string',
          description: 'Product name (e.g., "Protheus", "Framework", "SIGAFAT")',
        },
        version: {
          type: 'string',
          description: 'Optional version filter (e.g., "12.1.33")',
        },
        patch: {
          type: 'string',
          description: 'Optional patch number',
        },
      },
      required: ['product'],
    },
  },
  {
    name: 'compare_sources',
    description: `Compare multiple information sources (official vs community) on a given topic.
Identifies agreements, contradictions, and version-specific differences.
Useful when documentation is conflicting or unclear.`,
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Technical topic to compare across sources',
        },
        topics: {
          type: 'array',
          items: { type: 'string' },
          description: 'Specific subtopics to analyze for agreements/contradictions',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'deep_research',
    description: `Orchestrate comprehensive research across ALL sources for a Protheus topic.
Aggregates results, ranks sources by reliability, removes duplicates, and produces a complete
technical report with summary, explanation, official docs, community findings, best practices,
common mistakes, code examples, and version considerations.`,
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The main research query',
        },
        depth: {
          type: 'string',
          enum: ['quick', 'intermediate', 'deep'],
          description: 'Research depth: quick (2-4 sources), intermediate (5-8), deep (exhaustive)',
          default: 'intermediate',
        },
        modules: {
          type: 'array',
          items: { type: 'string' },
          description: 'Protheus modules to focus on (e.g., ["FAT", "FIN", "EST"])',
        },
        versions: {
          type: 'array',
          items: { type: 'string' },
          description: 'Protheus versions to check (e.g., ["12.1.25", "12.1.33"])',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'generate_advpl_example',
    description: `Generate production-ready, modern ADVPL/TL++ code examples based on researched material.
Supports ADVPL, TL++, SQL, REST, SOAP, and MVC patterns.
Code follows modern standards: LOCAL variables, Framework APIs, SQL Server syntax, no obsolete patterns.`,
    inputSchema: {
      type: 'object',
      properties: {
        language: {
          type: 'string',
          enum: ['advpl', 'tlpp', 'sql', 'rest', 'soap', 'mvc'],
          description: 'Target language or pattern',
        },
        description: {
          type: 'string',
          description: 'What the code should do',
        },
        context: {
          type: 'string',
          description: 'Additional context (e.g., table name, module, business rule)',
        },
      },
      required: ['language', 'description'],
    },
  },
  {
    name: 'debug_protheus_error',
    description: `Investigate Protheus runtime errors, stack traces, AppServer logs, and common failures.
Combines official and community knowledge for diagnosis, probable causes, fixes, and prevention.
Supports: Access Violations, Array Bounds, Deadlocks, REST/SOAP failures, DBAccess errors,
License errors, and more.`,
    inputSchema: {
      type: 'object',
      properties: {
        errorMessage: {
          type: 'string',
          description: 'The error message or description',
        },
        stackTrace: {
          type: 'string',
          description: 'Optional stack trace to aid diagnosis',
        },
        environment: {
          type: 'string',
          description: 'Optional environment info (e.g., "Protheus 12.1.33, SQL Server 2019")',
        },
      },
      required: ['errorMessage'],
    },
  },
]

const server = new Server(
  {
    name: 'protheus-research',
    version: '1.0.0',
    description: 'Advanced research engine for TOTVS Protheus - searches, validates, compares, and synthesizes information from official and community sources.',
  },
  {
    capabilities: {
      tools: {},
    },
  },
)

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}))

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  try {
    switch (name) {
      case 'search_protheus_docs': {
        const { query, module, version } = args as {
          query: string
          module?: string
          version?: string
        }
        const result = await searchProtheusDocs(query, module, version)
        return {
          content: [
            {
              type: 'text',
              text: formatDocsResult(result),
            },
          ],
        }
      }

      case 'search_community': {
        const { query, includeForums } = args as {
          query: string
          includeForums?: boolean
        }
        const result = await searchCommunity(query, includeForums)
        return {
          content: [
            {
              type: 'text',
              text: formatCommunityResult(result),
            },
          ],
        }
      }

      case 'search_release_notes': {
        const { product, version, patch } = args as {
          product: string
          version?: string
          patch?: string
        }
        const result = await searchReleaseNotes(product, version, patch)
        return {
          content: [
            {
              type: 'text',
              text: formatReleaseNotesResult(result),
            },
          ],
        }
      }

      case 'compare_sources': {
        const { query, topics } = args as {
          query: string
          topics?: string[]
        }
        const result = await compareSources(query, topics)
        return {
          content: [
            {
              type: 'text',
              text: formatComparisonResult(result),
            },
          ],
        }
      }

      case 'deep_research': {
        const { query, depth, modules, versions } = args as {
          query: string
          depth?: 'quick' | 'intermediate' | 'deep'
          modules?: string[]
          versions?: string[]
        }
        const result = await deepResearch(query, depth ?? 'intermediate', modules, versions)
        return {
          content: [
            {
              type: 'text',
              text: formatResearchReport(result),
            },
          ],
        }
      }

      case 'generate_advpl_example': {
        const { language, description, context } = args as {
          language: 'advpl' | 'tlpp' | 'sql' | 'rest' | 'soap' | 'mvc'
          description: string
          context?: string
        }
        const result = await generateExample(language, description, context)
        return {
          content: [
            {
              type: 'text',
              text: formatExample(result),
            },
          ],
        }
      }

      case 'debug_protheus_error': {
        const { errorMessage, stackTrace, environment } = args as {
          errorMessage: string
          stackTrace?: string
          environment?: string
        }
        const result = await debugError(errorMessage, stackTrace, environment)
        return {
          content: [
            {
              type: 'text',
              text: formatDebugResult(result),
            },
          ],
        }
      }

      default:
        throw new Error(`Unknown tool: ${name}`)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `Erro na ferramenta ${name}: ${message}`,
        },
      ],
    }
  }
})

function formatDocsResult(result: { results: import('./types/index.js').SourceResult[]; totalFound: number }): string {
  let output = `## 📚 Documentação Oficial Protheus\n\n`
  output += `**Total encontrado**: ${result.totalFound} fontes\n\n`

  if (result.results.length === 0) {
    output += `Nenhum resultado oficial encontrado. Tente termos alternativos ou use search_community.\n`
    return output
  }

  for (const r of result.results) {
    output += `### ${r.title}\n`
    output += `**Fonte**: ${r.sourceType} (Nível ${r.sourceLevel})\n`
    output += `**URL**: ${r.url}\n`
    output += `**Resumo**: ${r.snippet}\n\n`
  }

  return output
}

function formatCommunityResult(result: { results: import('./types/index.js').SourceResult[]; totalFound: number }): string {
  let output = `## 🌐 Comunidade Protheus\n\n`
  output += `**Total encontrado**: ${result.totalFound} fontes\n\n`

  if (result.results.length === 0) {
    output += `Nenhum resultado comunitário encontrado. Tente termos alternativos.\n`
    return output
  }

  for (const r of result.results) {
    output += `### ${r.title}\n`
    output += `**Fonte**: ${r.sourceType}\n`
    output += `**URL**: ${r.url}\n`
    output += `**Resumo**: ${r.snippet}\n\n`
  }

  return output
}

function formatReleaseNotesResult(result: {
  results: import('./types/index.js').SourceResult[]
  changelog: string[]
  breakingChanges: string[]
  deprecatedFunctions: string[]
}): string {
  let output = `## 📋 Release Notes - Pesquisa\n\n`
  output += `**Produto pesquisado**\n\n`
  output += `### 📝 Changelog\n`
  if (result.changelog.length > 0) {
    output += result.changelog.map((c) => `- ${c}`).join('\n')
  } else {
    output += `Nenhum changelog específico encontrado.\n`
  }

  output += `\n\n### ⚠️ Breaking Changes\n`
  if (result.breakingChanges.length > 0) {
    output += result.breakingChanges.map((c) => `- ${c}`).join('\n')
  } else {
    output += `Nenhuma breaking change detectada.\n`
  }

  output += `\n\n### 🗑️ Funções Deprecadas\n`
  if (result.deprecatedFunctions.length > 0) {
    output += result.deprecatedFunctions.map((c) => `- ${c}`).join('\n')
  } else {
    output += `Nenhuma função deprecada detectada.\n`
  }

  output += `\n\n### 🔍 Resultados Completos\n`
  for (const r of result.results.slice(0, 10)) {
    output += `- [${r.title}](${r.url})\n`
  }

  return output
}

function formatComparisonResult(result: {
  agreements: string[]
  contradictions: string[]
  versionSpecific: { version: string; details: string }[]
  officialSources: import('./types/index.js').SourceResult[]
  communitySources: import('./types/index.js').SourceResult[]
  confidence: string
}): string {
  let output = `## 🔍 Comparação de Fontes\n\n`
  output += `**Confiança**: ${result.confidence.toUpperCase()}\n\n`

  output += `### ✅ Concórdâncias\n`
  if (result.agreements.length > 0) {
    output += result.agreements.map((a) => `- ${a}`).join('\n')
  } else {
    output += `Nenhuma concórdância específica identificada.\n`
  }

  output += `\n\n### ❌ Contradições\n`
  if (result.contradictions.length > 0) {
    output += result.contradictions.map((c) => `- ${c}`).join('\n')
  } else {
    output += `Nenhuma contradição detectada entre as fontes.\n`
  }

  output += `\n\n### 📌 Diferenças por Versão\n`
  if (result.versionSpecific.length > 0) {
    for (const vs of result.versionSpecific) {
      output += `- **Versão ${vs.version}**: ${vs.details}\n`
    }
  } else {
    output += `Nenhuma diferença por versão identificada.\n`
  }

  output += `\n\n### 📖 Fontes Oficiais\n`
  for (const s of result.officialSources) {
    output += `- [${s.title}](${s.url})\n`
  }

  output += `\n### 👥 Fontes Comunitárias\n`
  for (const s of result.communitySources) {
    output += `- [${s.title}](${s.url})\n`
  }

  return output
}

function formatResearchReport(report: import('./types/index.js').ResearchReport): string {
  let output = `# 🔬 Relatório de Pesquisa Profunda\n\n`
  output += `**Query**: ${report.metadata.query}\n`
  output += `**Profundidade**: ${report.metadata.depth}\n`
  output += `**Fontes consultadas**: ${report.metadata.sourcesConsulted}\n`
  output += `**Data**: ${report.metadata.timestamp}\n\n`

  output += `## 📋 Sumário\n${report.summary}\n\n`
  output += `## 🏗️ Explicação Técnica\n${report.technicalExplanation}\n\n`

  output += `## 📚 Documentação Oficial\n${report.officialDocumentation}\n\n`
  output += `## 👥 Descobertas da Comunidade\n${report.communityFindings}\n\n`
  output += `## ✅ Melhores Práticas\n${report.bestPractices}\n\n`
  output += `## ⚠️ Erros Comuns\n${report.commonMistakes}\n\n`
  output += `## 💻 Exemplos de Código\n${report.codeExamples}\n\n`
  output += `## 📌 Considerações de Versão\n${report.versionConsiderations}\n\n`

  output += `## 🔗 Referências\n\n`
  output += `### Oficiais\n`
  for (const s of report.references.official) {
    output += `- [${s.title}](${s.url})\n`
  }
  output += `\n### Comunidade\n`
  for (const s of report.references.community) {
    output += `- [${s.title}](${s.url})\n`
  }
  output += `\n### GitHub\n`
  for (const s of report.references.github) {
    output += `- [${s.title}](${s.url})\n`
  }
  output += `\n### Microsoft\n`
  for (const s of report.references.microsoft) {
    output += `- [${s.title}](${s.url})\n`
  }
  output += `\n### Outras\n`
  for (const s of report.references.other) {
    output += `- [${s.title}](${s.url})\n`
  }

  return output
}

function formatExample(example: {
  language: string
  description: string
  code: string
  explanation: string
  references: string[]
}): string {
  let output = `## 💻 Exemplo ${example.language.toUpperCase()}\n\n`
  output += `**Descrição**: ${example.description}\n\n`
  output += `**Explicação**: ${example.explanation}\n\n`
  output += `### Código\n`
  output += '```' + (example.language === 'tlpp' ? 'advpl' : example.language) + '\n'
  output += example.code
  output += '\n```\n\n'
  output += `### Referências\n`
  for (const r of example.references) {
    output += `- ${r}\n`
  }
  return output
}

function formatDebugResult(result: import('./types/index.js').DebugResult): string {
  let output = `## 🔧 Diagnóstico de Erro\n\n`
  output += `### 📋 Diagnóstico\n${result.diagnosis}\n\n`

  output += `### 🔍 Causas Prováveis\n`
  for (const cause of result.probableCauses) {
    output += `${cause}\n`
  }

  output += `\n### ✅ Passos para Verificação\n`
  for (const step of result.verificationSteps) {
    output += `${step}\n`
  }

  output += `\n### 🛠️ Correções\n`
  for (const fix of result.fixes) {
    output += `${fix}\n`
  }

  output += `\n### 🔄 Correções Alternativas\n`
  for (const fix of result.alternativeFixes) {
    output += `${fix}\n`
  }

  output += `\n### 🛡️ Medidas Preventivas\n`
  for (const measure of result.preventiveMeasures) {
    output += `${measure}\n`
  }

  output += `\n### 📖 Fontes Oficiais\n`
  for (const s of result.officialSources) {
    output += `- [${s.title}](${s.url})\n`
  }

  output += `\n### 👥 Fontes Comunitárias\n`
  for (const s of result.communitySources) {
    output += `- [${s.title}](${s.url})\n`
  }

  return output
}

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('🚀 protheus-research MCP server running on stdio')
  console.error(`📦 Cache initialized with ${cacheSize()} entries`)
}

main().catch((error) => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})
