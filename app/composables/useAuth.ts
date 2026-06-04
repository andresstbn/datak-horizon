import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User as FirebaseUser
} from 'firebase/auth'
import { authService } from '~/services/authService'

export interface AppUser {
  id: string
  email: string
  displayName: string | null
  photoUrl: string | null
  role: string
}

/**
 * Basic authentication composable. Orchestrates the Firebase client auth state
 * and the application profile. UI components only talk to this composable.
 */
export function useAuth() {
  const { $firebaseAuth, $googleProvider } = useNuxtApp()

  const firebaseUser = shallowRef<FirebaseUser | null>(null)
  const profile = useState<AppUser | null>('auth:profile', () => null)
  const isReady = useState<boolean>('auth:isReady', () => false)
  const isLoading = useState<boolean>('auth:isLoading', () => false)

  const isAuthenticated = computed(() => !!firebaseUser.value)

  /** Retrieve the current Firebase ID token, if signed in. */
  async function getIdToken(): Promise<string | null> {
    return (await $firebaseAuth.currentUser?.getIdToken()) ?? null
  }

  /** Fetch the application profile from the protected endpoint. */
  async function fetchProfile(): Promise<void> {
    const token = await getIdToken()
    if (!token) {
      profile.value = null
      return
    }

    profile.value = await authService.fetchMe(token)
  }

  /** Start listening to Firebase auth state (call once on app start). */
  function init(): void {
    onAuthStateChanged($firebaseAuth, async (user) => {
      firebaseUser.value = user
      if (user) {
        await fetchProfile()
      } else {
        profile.value = null
      }
      isReady.value = true
    })
  }

  async function loginWithGoogle(): Promise<void> {
    isLoading.value = true
    try {
      await signInWithPopup($firebaseAuth, $googleProvider)
      await fetchProfile()
    } finally {
      isLoading.value = false
    }
  }

  async function logout(): Promise<void> {
    await signOut($firebaseAuth)
    profile.value = null
  }

  return {
    firebaseUser,
    profile,
    isReady,
    isLoading,
    isAuthenticated,
    init,
    getIdToken,
    fetchProfile,
    loginWithGoogle,
    logout
  }
}
