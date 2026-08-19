import {
  onAuthStateChanged,
  signInWithPopup,
  signOut
} from 'firebase/auth'
import { authService } from '~/services/authService'

export interface AppUser {
  id: string
  email: string
  displayName: string | null
  photoUrl: string | null
  role: string
}

// Module-level guard so the Firebase listener is registered exactly once,
// regardless of how many components call `useAuth().init()`.
let listenerRegistered = false

/**
 * Basic authentication composable. Orchestrates the Firebase client auth state
 * and the application profile. UI components only talk to this composable.
 *
 * Only serializable values live in `useState` (the Firebase `User` object is not
 * serializable, so we keep the `uid` instead). This keeps the auth state shared
 * across every component and consistent between SSR payload and client.
 */
export function useAuth() {
  const { $firebaseAuth, $googleProvider } = useNuxtApp()

  const uid = useState<string | null>('auth:uid', () => null)
  const profile = useState<AppUser | null>('auth:profile', () => null)
  const isAccessDenied = useState<boolean>('auth:isAccessDenied', () => false)
  const deniedEmail = useState<string | null>('auth:deniedEmail', () => null)

  // `isReady` flips to true once Firebase has resolved the initial auth state.
  const isReady = useState<boolean>('auth:isReady', () => false)
  const isLoading = useState<boolean>('auth:isLoading', () => false)

  const isAuthenticated = computed(() => !!uid.value)
  const isAuthorized = computed(() => !!profile.value && !isAccessDenied.value)

  /** Retrieve the current Firebase ID token, if signed in. */
  async function getIdToken(): Promise<string | null> {
    return (await $firebaseAuth?.currentUser?.getIdToken()) ?? null
  }

  /** Fetch the application profile from the protected endpoint. */
  async function fetchProfile(): Promise<void> {
    const token = await getIdToken()
    if (!token) {
      profile.value = null
      isAccessDenied.value = false
      deniedEmail.value = null
      return
    }
    try {
      profile.value = await authService.fetchMe(token)
      isAccessDenied.value = false
      deniedEmail.value = null
    } catch (error: unknown) {
      // Only a 403 means the account is not allowlisted. Any other failure
      // (network blip, 5xx, cold start) must not tell a legitimate user that
      // their access was revoked.
      profile.value = null
      const status = (error as { statusCode?: number })?.statusCode
      isAccessDenied.value = status === 403
      deniedEmail.value = status === 403
        ? ($firebaseAuth?.currentUser?.email ?? null)
        : null
    }
  }

  /**
   * Start listening to Firebase auth state. Safe to call multiple times; the
   * listener is only attached once. Must run on the client.
   */
  function init(): void {
    if (listenerRegistered || !$firebaseAuth) {
      return
    }
    listenerRegistered = true

    onAuthStateChanged($firebaseAuth, async (user) => {
      uid.value = user?.uid ?? null
      if (user) {
        await fetchProfile()
      } else {
        profile.value = null
        isAccessDenied.value = false
        deniedEmail.value = null
      }
      isReady.value = true
    })
  }

  async function loginWithGoogle(): Promise<void> {
    isLoading.value = true
    try {
      await signInWithPopup($firebaseAuth, $googleProvider)
      // onAuthStateChanged updates uid + profile, but refresh eagerly so the
      // UI reacts immediately after the popup closes.
      uid.value = $firebaseAuth.currentUser?.uid ?? null
      await fetchProfile()
    } finally {
      isLoading.value = false
    }
  }

  async function logout(): Promise<void> {
    await signOut($firebaseAuth)
    uid.value = null
    profile.value = null
    isAccessDenied.value = false
    deniedEmail.value = null
  }

  return {
    uid,
    profile,
    isReady,
    isLoading,
    isAuthenticated,
    isAuthorized,
    isAccessDenied,
    deniedEmail,
    init,
    getIdToken,
    fetchProfile,
    loginWithGoogle,
    logout
  }
}
