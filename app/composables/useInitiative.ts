import { initiativeService } from '~/services/initiativeService'
import type { InitiativeDetail } from '~~/shared/types/initiative'

/**
 * Detail orchestration for a single initiative. Owns the fetch lifecycle and
 * delegates the HTTP call to the service. UI components only talk to this.
 */
export function useInitiative(id: string) {
  const { getIdToken } = useAuth()

  const initiative = useState<InitiativeDetail | null>(
    `initiative:${id}`,
    () => null
  )
  const isLoading = useState<boolean>(`initiative:${id}:loading`, () => false)
  const errorMessage = useState<string | null>(`initiative:${id}:error`, () => null)

  async function fetchInitiative(): Promise<void> {
    const token = await getIdToken()
    if (!token) {
      initiative.value = null
      return
    }

    isLoading.value = true
    errorMessage.value = null
    try {
      initiative.value = await initiativeService.getById(token, id)
    } catch (error: unknown) {
      const status = (error as { statusCode?: number })?.statusCode
      errorMessage.value
        = status === 404
          ? 'La iniciativa no existe o fue eliminada.'
          : 'No se pudo cargar la iniciativa.'
      initiative.value = null
    } finally {
      isLoading.value = false
    }
  }

  return {
    initiative,
    isLoading,
    errorMessage,
    fetchInitiative
  }
}
