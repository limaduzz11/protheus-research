import { searchWeb } from '../services/searcher.js'

interface GeneratedExample {
  language: string
  description: string
  code: string
  explanation: string
  references: string[]
}

const TEMPLATE_HEADERS: Record<string, string> = {
  advpl: `//StaticUser Include
#Include "Protheus.ch"
#Include "TopConn.ch"`,
  tlpp: `USES System.IO`,
  sql: `-- SQL Server - Protheus`,
}

export async function generateExample(
  language: 'advpl' | 'tlpp' | 'sql' | 'rest' | 'soap' | 'mvc',
  description: string,
  context?: string,
): Promise<GeneratedExample> {
  const searchQuery = `${language} ${description} Protheus exemplo`
  const refs = await searchWeb(searchQuery)
  const references = refs.slice(0, 3).map((r) => r.url)

  let code = ''
  let explanation = ''

  switch (language) {
    case 'advpl': {
      code = generateAdvpl(description, context)
      explanation = 'Código ADVPL moderno seguindo as boas práticas: Locais no topo, notação húngara, uso de Framework APIs.'
      break
    }
    case 'tlpp': {
      code = generateTlpp(description, context)
      explanation = 'Código TL++ orientado a objetos com namespaces e classes.'
      break
    }
    case 'sql': {
      code = generateSql(description, context)
      explanation = 'Query SQL Server otimizada para uso com Protheus. Utiliza TOP, ISNULL, CTEs e boas práticas de performance.'
      break
    }
    case 'rest': {
      code = generateRest(description, context)
      explanation = 'Exemplo de consumo/exposição de API REST no Protheus utilizando FWRest.'
      break
    }
    case 'soap': {
      code = generateSoap(description, context)
      explanation = 'Exemplo de consumo de WebService SOAP no Protheus.'
      break
    }
    case 'mvc': {
      code = generateMvc(description, context)
      explanation = 'Estrutura MVC completa utilizando FWFormModel/FWFormView com browse e formulário.'
      break
    }
  }

  return { language, description, code, explanation, references }
}

function generateAdvpl(description: string, context?: string): string {
  const ctx = context ?? ''
  return `${TEMPLATE_HEADERS.advpl}

/*/
  Funcao: ${description}
  Descricao: ${ctx}
  Data: ${new Date().toISOString().split('T')[0]}
/*/
User Function ${description.replace(/\s+/g, '')}
  Local cAlias      := "ZA0"
  Local cQuery      := ""
  Local aResult     := {}
  Local nI          := 0
  Local cMessage    := ""

  // Monta query com TCSQLExec
  cQuery := "SELECT TOP 10 " + CRLF
  cQuery += "  ZA0_CODIGO, ZA0_DESCRIC " + CRLF
  cQuery += "FROM " + RetSqlName("ZA0") + " " + CRLF
  cQuery += "WHERE ZA0_CODIGO IS NOT NULL " + CRLF
  cQuery += "ORDER BY ZA0_CODIGO"

  aResult := TCSQLExec(cQuery, .T.)()

  if Empty(aResult)
    MsgStop("Nenhum registro encontrado.", "Atenção")
    Return
  endif

  for nI := 1 to Len(aResult)
    cMessage += aResult[nI][1] + " - " + aResult[nI][2] + CRLF
  next nI

  MsgInfo(cMessage, "Resultados")

Return
`
}

function generateTlpp(description: string, context?: string): string {
  const ctx = context ?? ''
  return `${TEMPLATE_HEADERS.tlpp}

namespace Protheus.Examples

class ${description.replace(/\s+/g, '')}
  data cCodigo as string
  data cDescricao as string

  method new(cCodigo, cDescricao) constructor
  method listAll() as array
  method showDetails() as void
end class

method new(cCodigo, cDescricao) class ${description.replace(/\s+/g, '')}
  self:cCodigo   := cCodigo
  self:cDescricao := cDescricao
return self

method listAll() class ${description.replace(/\s+/g, '')}
  local cQuery   := ""
  local aResult  := {}

  cQuery := "SELECT * FROM " + RetSqlName("ZA0")
  aResult := TCSQLExec(cQuery, .T.)()

return aResult

method showDetails() class ${description.replace(/\s+/g, '')}
  MsgInfo("Código: " + self:cCodigo + CRLF + "Descricao: " + self:cDescricao, "Detalhes")
return
`
}

function generateSql(description: string, context?: string): string {
  const ctx = context ?? ''
  return `${TEMPLATE_HEADERS.sql}
-- Contexto: ${ctx}
-- Descricao: ${description}

WITH CTE_Dados AS (
  SELECT
    ZA0_CODIGO,
    ZA0_DESCRIC,
    ZA0_CCUSTO,
    ROW_NUMBER() OVER (ORDER BY ZA0_CODIGO) AS RowNum
  FROM ${context?.toUpperCase() ?? 'ZA0'} WITH (NOLOCK)
  WHERE ZA0_CODIGO IS NOT NULL
    AND ZA0_DESCRIC IS NOT NULL
)
SELECT
  TOP 100
  ZA0_CODIGO,
  ISNULL(ZA0_DESCRIC, '') AS ZA0_DESCRIC,
  ZA0_CCUSTO,
  RowNum
FROM CTE_Dados
ORDER BY ZA0_CODIGO

-- Indice recomendado:
-- CREATE NONCLUSTERED INDEX IDX_ZA0_BUSCA ON ZA0 (ZA0_CODIGO) INCLUDE (ZA0_DESCRIC, ZA0_CCUSTO)
`
}

function generateRest(description: string, context?: string): string {
  return `${TEMPLATE_HEADERS.advpl}

/*/
  Funcao: ${description.replace(/\s+/g, '')} REST
  Descricao: Exemplo REST API com FWRest
/*/
User Function ${description.replace(/\s+/g, '')}
  Local oRest    := FWRest():New("https://api.exemplo.com")
  Local oJson    := JsonObject():new()
  Local cRetorno := ""
  Local oRet     := NIL

  // Configurar headers
  oRest:SetHeader("Content-Type", "application/json")
  oRest:SetHeader("Authorization", "Bearer " + GetMV("MV_TOKEN"))

  // Monta payload
  oJson["codigo"]   := "001"
  oJson["descricao"] := "Exemplo"

  // POST
  oRet := oRest:Post("/api/dados", oJson:toJson())

  if oRest:GetStatus() == 200
    cRetorno := oRet:toJson()
    MsgInfo("Sucesso: " + cRetorno, "REST API")
  else
    MsgStop("Erro " + cValToChar(oRest:GetStatus()) + ": " + oRest:GetResult(), "REST API")
  endif

Return
`
}

function generateSoap(description: string, context?: string): string {
  return `${TEMPLATE_HEADERS.advpl}

/*/
  Funcao: ${description.replace(/\s+/g, '')} SOAP
  Descricao: Exemplo WebService SOAP
/*/
User Function ${description.replace(/\s+/g, '')}
  Local oWS      := NIL
  Local cXml     := ""
  Local cRetorno := ""

  // Inicializa WebService
  oWS := WSGetService("http://servidor:8080/ws/Exemplo?wsdl")

  if oWS == NIL
    MsgStop("Falha ao conectar ao WebService.", "SOAP Error")
    Return
  endif

  // Monta XML SOAP
  cXml := '<?xml version="1.0" encoding="UTF-8"?>'
  cXml += '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">'
  cXml += '<soap:Body>'
  cXml += '<ConsultarDados xmlns="http://exemplo.com/">'
  cXml += '<codigo>001</codigo>'
  cXml += '</ConsultarDados>'
  cXml += '</soap:Body>'
  cXml += '</soap:Envelope>'

  // Executa chamada
  cRetorno := oWS:Call("ConsultarDados", cXml)

  if !Empty(cRetorno)
    MsgInfo("Resposta: " + cRetorno, "SOAP Response")
  else
    MsgStop("Falha na chamada SOAP.", "SOAP Error")
  endif

Return
`
}

function generateMvc(description: string, context?: string): string {
  return `${TEMPLATE_HEADERS.advpl}

/*/
  Model: ${description.replace(/\s+/g, '')} Model
  View:  ${description.replace(/\s+/g, '')} View
  Control: ${description.replace(/\s+/g, '')} Control
  Descricao: Estrutura MVC - ${context ?? 'Exemplo'}
/*/

// -- MODEL ---------------------------------------------------
Class ${description.replace(/\s+/g, '')}Model From LongClassName

  Data cTable
  Data cStruct

  Method new(cTable) Constructor
  Method GetData()
  Method GetDataSQL()
  Method SaveData()
  Method DeleteData()

EndClass

Method new(cTable) Class ${description.replace(/\s+/g, '')}Model
  self:cTable  := cTable
  self:cStruct := "ZA0"
Return self

Method GetData() Class ${description.replace(/\s+/g, '')}Model
  Local aArea := GetArea()
  Local cAlias := ""
  Local aData  := {}

  cAlias := self:cTable
  DbSelectArea(cAlias)
  cAlias := (cAlias)
  cAlias->(DbGoTop())

  while cAlias->(!Eof())
    aAdd(aData, cAlias->(RecNo()))
    cAlias->(DbSkip())
  end

  RestArea(aArea)
Return aData

Method GetDataSQL() Class ${description.replace(/\s+/g, '')}Model
  Local cQuery := ""
  Local aData  := {}

  cQuery := "SELECT * FROM " + RetSqlName(self:cStruct) + " WITH (NOLOCK) ORDER BY 1"
  aData := TCSQLExec(cQuery, .T.)()

Return aData

// -- VIEW (Form) --------------------------------------------
Static Function ViewDef()
  Local aForm := {}

  aAdd(aForm, {1, .T., .T., .T., .T., "01", "01"})
  aAdd(aForm, {"ZA0_CODIGO",  "C",  10, 0, .F., "", "", "", "", "", "", "", "", "", "", "", "", "", .T., "", .T.})
  aAdd(aForm, {"ZA0_DESCRIC", "C",  50, 0, .F., "", "", "", "", "", "", "", "", "", "", "", "", "", .T., "", .T.})

Return aForm

// -- CONTROL -------------------------------------------------
User Function ${description.replace(/\s+/g, '')}Control()
  Local oModel  := ${description.replace(/\s+/g, '')}Model():New("ZA0")
  Local aData   := {}
  Local nOp     := 0

  // Executa browse
  aData := oModel:GetDataSQL()

  if Empty(aData)
    MsgStop("Nenhum registro encontrado.", "Atenção")
    Return
  endif

  FWFormBrowse("Cadastro Exemplo", "ZA0", ViewDef(), aData, nOp)

Return
`
}
