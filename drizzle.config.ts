import process from 'node:process'
import { defineConfig } from 'drizzle-kit'

const DATABASE_URL
  = process.env.DATABASE_URL
    ?? 'postgresql://horizon:horizon@localhost:5432/datak_horizon'

export default defineConfig({
  schema: './server/db/schema.ts',
  out: './server/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: DATABASE_URL
  },
  strict: true,
  verbose: true
})
