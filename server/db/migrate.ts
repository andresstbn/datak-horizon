import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import 'dotenv/config'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

import { getDbConfig } from './client'

/**
 * Standalone migration runner. Applies every pending SQL migration found in
 * `server/db/migrations`. Run with `pnpm db:migrate`.
 */
async function main() {
  const config = getDbConfig()

  const migrationsFolder = resolve(
    dirname(fileURLToPath(import.meta.url)),
    'migrations'
  )

  // A dedicated single-connection client is recommended for migrations.
  const client = typeof config === 'string'
    ? postgres(config, { max: 1 })
    : postgres({ ...config, max: 1 })
  const db = drizzle(client)

  console.log('Running migrations…')
  await migrate(db, { migrationsFolder })
  console.log('Migrations applied successfully.')

  await client.end()
}

main().catch((error) => {
  console.error('Migration failed:', error)
  process.exit(1)
})
