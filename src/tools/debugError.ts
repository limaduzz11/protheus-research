import { DebugResult } from '../types/index.js'
import { searchWeb, rankSources } from '../services/searcher.js'

const ERROR_PATTERNS: { pattern: RegExp; category: string }[] = [
  { pattern: /access.?violation|violaçao.{0,5}acesso/i, category: 'Access Violation' },
  { pattern: /array.?bounds|estouro.{0,5}array|subscript.?out.?of.?range/i, category: 'Array Bounds' },
  { pattern: /deadlock/i, category: 'Deadlock' },
  { pattern: /timeout|time.?out/i, category: 'Timeout' },
  { pattern: /stack.?overflow|pilha/i, category: 'Stack Overflow' },
  { pattern: /null.?pointer|nil.?pointer/i, category: 'Null Pointer' },
  { pattern: /division.?by.?zero|divis.{0,3}o.{0,5}zero/i, category: 'Division by Zero' },
  { pattern: /file.{0,5}not.{0,5}found|arquivo.{0,5}n.{0,5}o.{0,5}encontrado/i, category: 'File Not Found' },
  { pattern: /license|licença|licenciamento/i, category: 'License Error' },
  { pattern: /dbaaccess|dbaccess/i, category: 'DBAccess Error' },
  { pattern: /appserver|smartclient/i, category: 'AppServer Error' },
  { pattern: /rpo|RPO/i, category: 'RPO Error' },
  { pattern: /compil|compilat/i, category: 'Compilation Error' },
  { pattern: /rest|webservice|http.?404|http.?500/i, category: 'REST/SOAP Failure' },
]

function detectCategory(errorMessage: string): string {
  for (const { pattern, category } of ERROR_PATTERNS) {
    if (pattern.test(errorMessage)) return category
  }
  return 'General Error'
}

export async function debugError(
  errorMessage: string,
  stackTrace?: string,
  environment?: string,
): Promise<DebugResult> {
  const category = detectCategory(errorMessage)

  const queries: string[] = [
    `Protheus ${errorMessage} erro`,
    `TOTVS Protheus ${category}`,
    `ADVPL erro ${errorMessage}`,
    `Protheus runtime error ${category}`,
    `site:tdn.totvs.com ${category} erro Protheus`,
    `site:centraldeatendimento.totvs.com ${category}`,
    `site:terminaldeinformacao.com ${category} Protheus`,
    `site:blacktdn.com.br ${category} Protheus`,
  ]

  if (stackTrace) {
    const lines = stackTrace.split('\n').slice(0, 3)
    queries.push(`Protheus ${lines.join(' ')} stack trace`)
  }

  if (environment) {
    queries.push(`Protheus ${environment} ${category} erro`)
  }

  const allResults = rankSources((await Promise.all(queries.map((q) => searchWeb(q)))).flat())
  const officialSources = allResults.filter((s) => s.url.includes('tdn.totvs.com') || s.url.includes('centraldeatendimento'))
  const communitySources = allResults.filter((s) => !s.url.includes('tdn.totvs.com'))

  const diagnosis = `Erro classificado como: **${category}**. ` +
    `Foram encontradas ${allResults.length} fontes relevantes para investigação.`

  const probableCauses = allResults
    .filter((s) => /causa|cause|motivo|origin|provoc|geral?/i.test(s.snippet))
    .slice(0, 5)
    .map((s) => `- **${s.title}**: ${s.snippet.slice(0, 150)}`)

  if (probableCauses.length === 0) {
    probableCauses.push(`- Causa provável não identificada automaticamente para "${category}". Consulte as fontes oficiais.`)
  }

  const fixes = allResults
    .filter((s) => /soluç|soluc|fix|correç|corrig|resolv|workaround|solução|alternativ|ajuste/i.test(s.snippet))
    .slice(0, 5)
    .map((s) => `- **${s.title}**: ${s.snippet.slice(0, 200)}`)

  if (fixes.length === 0) {
    fixes.push(`- Nenhuma correção específica encontrada automaticamente. Consulte TDN e Central de Atendimento TOTVS para ${category}.`)
  }

  return {
    diagnosis: `**Categoria**: ${category}\n\n${diagnosis}`,
    probableCauses: probableCauses.length ? probableCauses : [`Causa provável não identificada para: ${errorMessage}`],
    verificationSteps: [
      '1. Verificar logs do AppServer (appserver_\\*.log)',
      '2. Verificar logs do SmartClient na estação',
      '3. Verificar se o RPO está atualizado e compilado',
      '4. Verificar versão do Framework e LIBs',
      '5. Testar em ambiente de homologação',
    ],
    fixes,
    alternativeFixes: [
      '• Atualizar para a última LIB/Release disponível',
      '• Validar se o problema persiste em versão anterior',
      '• Abrir chamado na Central de Atendimento TOTVS',
      '• Consultar o TDN para notas técnicas sobre o erro',
    ],
    preventiveMeasures: [
      '• Manter o RPO sempre compilado e sincronizado',
      '• Utilizar FWCallProc no lugar de chamadas diretas a fontes',
      '• Validar índices do banco de dados regularmente',
      '• Implementar tratamento de erros com bloco BEGIN SEQUENCE / END SEQUENCE',
      '• Realizar testes em homologação antes de promover a produção',
    ],
    officialSources: officialSources.slice(0, 5),
    communitySources: communitySources.slice(0, 5),
  }
}
