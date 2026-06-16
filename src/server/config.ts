import { z } from 'zod'

const envSchema = z.object({
  SQL_SERVER: z.string().default('localhost'),
  SQL_PORT: z.coerce.number().int().positive().default(1433),
  SQL_DATABASE: z.string().default('Compete'),
  SQL_USER: z.string().default('sa'),
  SQL_PASSWORD: z.string().min(1),
  SQL_ENCRYPT: z.string().default('false'),
  SQL_TRUST_SERVER_CERTIFICATE: z.string().default('true'),
  JWT_SECRET: z.string().min(32),
  OTP_PEPPER: z.string().min(16),
  AUTH_EXPOSE_OTP: z.string().default('false'),
  OTP_DELIVERY_WEBHOOK_URL: z.string().url().optional().or(z.literal('')),
  OTP_DELIVERY_WEBHOOK_API_KEY: z.string().optional(),
  APP_ORIGIN: z.string().url().default('http://localhost:8888'),
  SEQ_URL: z.string().url().optional(),
  SEQ_API_KEY: z.string().optional(),
})

export type AppConfig = {
  sql: {
    server: string
    port: number
    database: string
    user: string
    password: string
    encrypt: boolean
    trustServerCertificate: boolean
  }
  jwtSecret: string
  otpPepper: string
  exposeOtp: boolean
  otpDeliveryWebhookUrl?: string
  otpDeliveryWebhookApiKey?: string
  appOrigin: string
  seqUrl?: string
  seqApiKey?: string
}

let cached: AppConfig | undefined

export function getConfig(): AppConfig {
  if (cached) return cached

  const env = envSchema.parse(process.env)
  cached = {
    sql: {
      server: env.SQL_SERVER,
      port: env.SQL_PORT,
      database: env.SQL_DATABASE,
      user: env.SQL_USER,
      password: env.SQL_PASSWORD,
      encrypt: env.SQL_ENCRYPT === 'true',
      trustServerCertificate: env.SQL_TRUST_SERVER_CERTIFICATE === 'true',
    },
    jwtSecret: env.JWT_SECRET,
    otpPepper: env.OTP_PEPPER,
    exposeOtp: env.AUTH_EXPOSE_OTP === 'true',
    otpDeliveryWebhookUrl: env.OTP_DELIVERY_WEBHOOK_URL || undefined,
    otpDeliveryWebhookApiKey: env.OTP_DELIVERY_WEBHOOK_API_KEY,
    appOrigin: env.APP_ORIGIN,
    seqUrl: env.SEQ_URL,
    seqApiKey: env.SEQ_API_KEY,
  }
  return cached
}
