import { getConfig } from './config'

type LogProperties = Record<string, unknown>

function write(level: string, message: string, properties: LogProperties) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    application: 'compete-api',
    ...properties,
  }

  const output = JSON.stringify(entry)
  if (level === 'Error') console.error(output)
  else console.log(output)

  const config = getConfig()
  if (!config.seqUrl) return

  const clef = JSON.stringify({
    '@t': entry.timestamp,
    '@mt': message,
    '@l': level,
    Application: 'compete-api',
    ...properties,
  })

  void fetch(`${config.seqUrl.replace(/\/$/, '')}/ingest/clef`, {
    method: 'POST',
    headers: {
      'content-type': 'application/vnd.serilog.clef',
      ...(config.seqApiKey ? { 'x-seq-api-key': config.seqApiKey } : {}),
    },
    body: `${clef}\n`,
  }).catch(() => undefined)
}

export const logger = {
  info: (message: string, properties: LogProperties = {}) =>
    write('Information', message, properties),
  warn: (message: string, properties: LogProperties = {}) =>
    write('Warning', message, properties),
  error: (message: string, properties: LogProperties = {}) =>
    write('Error', message, properties),
}
