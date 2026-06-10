import process from 'node:process'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

/**
 * Lazily-created singleton database client.
 *
 * The same client is reused by Nitro server handlers and by the standalone
 * scripts (migrate, seed). Connection details come from `DATABASE_URL`.
 */
let client: postgres.Sql | undefined
let database: ReturnType<typeof drizzle<typeof schema>> | undefined

export function getDbConfig(): string | Record<string, string> {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. Copy .env.example to .env and configure it.'
    )
  }

  // Handle GCP Cloud SQL Unix socket URL format (%2Fcloudsql%2F...)
  const socketMatch = url.match(/postgresql:\/\/([^:]+):([^@]+)@(%2Fcloudsql%2F[^/]+)\/(.+)/)
  if (socketMatch) {
    const [, user, password, host, database] = socketMatch
    return {
      user: user!,
      password: password!,
      host: decodeURIComponent(host!),
      database: database!
    }
  }

  return url
}

export function getDb() {
  if (!database) {
    const config = getDbConfig()
    client = typeof config === 'string' ? postgres(config) : postgres({ ...config })
    database = drizzle(client, { schema })
  }
  return database
}

/** Close the underlying connection (used by scripts so the process can exit). */
export async function closeDb() {
  await client?.end()
  client = undefined
  database = undefined
}

export { schema }
