import { SearchConfig } from '../types/index.js'

const config: SearchConfig = {
  maxResultsPerSource: 10,
  timeout: 30000,
  retryAttempts: 3,
  cacheTTL: 3600000,
  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
}

export function getConfig(): SearchConfig {
  return config
}
