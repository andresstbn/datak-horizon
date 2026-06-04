import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import 'dotenv/config'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

/**
 * Standalone migration runner. Applies every pending SQL migration found in
 * `server/db/migrations`. Run with `pnpm db:migrate`.
 */
async function main() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set.')
  }

  const migrationsFolder = resolve(
    dirname(fileURLToPath(import.meta.url)),
    'migrations'
  )

  // A dedicated single-connection client is recommended for migrations.
  const client = postgres(connectionString, { max: 1 })
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
