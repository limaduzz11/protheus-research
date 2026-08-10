import { getConfig } from '../utils/config.js'

export async function fetchUrl(
  url: string,
  timeout?: number,
): Promise<{ ok: boolean; body: string; status: number }> {
  const config = getConfig()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout ?? config.timeout)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': config.userAgent,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    })
    const body = await response.text()
    return { ok: response.ok, body, status: response.status }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { ok: false, body: message, status: 0 }
  } finally {
    clearTimeout(timer)
  }
}

export function extractSnippet(html: string, maxLength = 300): string {
  const text = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > maxLength ? text.slice(0, maxLength) + '...' : text
}

export function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  return match ? match[1].trim() : 'Sem título'
}
