import {
  applicationDefault,
  getApps,
  initializeApp,
  type App
} from 'firebase-admin/app'
import { getAuth, type Auth } from 'firebase-admin/auth'

/**
 * Isolated Firebase Admin bootstrap. Initialised once per server process using
 * Application Default Credentials (GOOGLE_APPLICATION_CREDENTIALS locally, or the
 * ambient service account when running on GCP).
 */
let app: App | undefined

function getAdminApp(): App {
  if (app) {
    return app
  }

  // Reuse an already-initialised app during HMR / multiple imports.
  const existing = getApps()
  if (existing.length > 0) {
    app = existing[0]!
    return app
  }

  app = initializeApp({
    credential: applicationDefault()
  })

  return app
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp())
}
