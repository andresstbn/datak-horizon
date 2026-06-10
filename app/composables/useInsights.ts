import { insightService } from '~/services/insightService'
import type { Insight, InsightType } from '~~/shared/types/insight'

export function useInsights(initiativeId: string) {
  const { getIdToken } = useAuth()

  const insights = useState<Insight[]>(`insights:${initiativeId}`, () => [])
  const isLoading = useState<boolean>(`insights:${initiativeId}:loading`, () => false)
  const errorMessage = useState<string | null>(`insights:${initiativeId}:error`, () => null)

  async function fetchInsights() {
    const token = await getIdToken()
    if (!token) return
    isLoading.value = true
    errorMessage.value = null
    try {
      insights.value = await insightService.list(token, initiativeId)
    } catch {
      errorMessage.value = 'Error al cargar los insights.'
    } finally {
      isLoading.value = false
    }
  }

  async function createInsight(
    body: string,
    type: InsightType,
    sourceConversationId: string | null = null,
    confidence: number | null = null
  ): Promise<boolean> {
    const token = await getIdToken()
    if (!token) return false
    errorMessage.value = null
    try {
      const created = await insightService.create(token, initiativeId, {
        sourceConversationId,
        type,
        body,
        source: 'manual',
        confidence
      })
      insights.value = [created, ...insights.value]
      return true
    } catch {
      errorMessage.value = 'Error al registrar el insight.'
      return false
    }
  }

  return {
    insights,
    isLoading,
    errorMessage,
    fetchInsights,
    createInsight
  }
}
