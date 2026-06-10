import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import {
  browserLocalPersistence,
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  type Auth
} from 'firebase/auth'

/**
 * Client-only Firebase bootstrap. Initialises the Firebase app and auth from the
 * public runtime config and exposes them through the Nuxt injection container.
 */
export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const firebaseConfig = config.public.firebase

  const existingApps = getApps()
  const app: FirebaseApp = existingApps[0]
    ?? initializeApp({
      apiKey: firebaseConfig.apiKey,
      authDomain: firebaseConfig.authDomain,
      projectId: firebaseConfig.projectId,
      appId: firebaseConfig.appId
    })

  const auth: Auth = getAuth(app)
  // Persist the session across reloads (IndexedDB). Default for web, set
  // explicitly so the login survives a refresh deterministically.
  setPersistence(auth, browserLocalPersistence).catch(() => {})

  const googleProvider = new GoogleAuthProvider()

  return {
    provide: {
      firebaseApp: app,
      firebaseAuth: auth,
      googleProvider
    }
  }
})
