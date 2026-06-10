import { aiArtifactService } from '~/services/aiArtifactService'
import type { AIArtifact, ArtifactType, ArtifactStatus } from '~~/shared/types/artifact'

export function useAIArtifacts(initiativeId: string) {
  const { getIdToken } = useAuth()

  const artifacts = useState<AIArtifact[]>(`artifactsState:${initiativeId}`, () => [])
  const isLoading = useState<boolean>(`artifactsState:${initiativeId}:loading`, () => false)
  const errorMessage = useState<string | null>(`artifactsState:${initiativeId}:error`, () => null)

  async function fetchArtifacts() {
    const token = await getIdToken()
    if (!token) return
    isLoading.value = true
    errorMessage.value = null
    try {
      artifacts.value = await aiArtifactService.list(token, initiativeId)
    } catch {
      errorMessage.value = 'Error al cargar los artefactos.'
    } finally {
      isLoading.value = false
    }
  }

  async function createArtifact(
    title: string,
    content: string,
    type: ArtifactType,
    requirementId: string | null = null,
    sourceConversationId: string | null = null,
    status: ArtifactStatus = 'draft'
  ): Promise<boolean> {
    const token = await getIdToken()
    if (!token) return false
    errorMessage.value = null
    try {
      const created = await aiArtifactService.create(token, initiativeId, {
        title,
        content,
        type,
        requirementId,
        sourceConversationId,
        status
      })
      artifacts.value = [created, ...artifacts.value]
      return true
    } catch {
      errorMessage.value = 'Error al registrar el artefacto.'
      return false
    }
  }

  return {
    artifacts,
    isLoading,
    errorMessage,
    fetchArtifacts,
    createArtifact
  }
}
