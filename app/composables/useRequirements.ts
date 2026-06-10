import { requirementService } from '~/services/requirementService'
import type { Requirement, RequirementPriority, RequirementStatus } from '~~/shared/types/requirement'

export function useRequirements(initiativeId: string) {
  const { getIdToken } = useAuth()

  const requirements = useState<Requirement[]>(`reqs:${initiativeId}`, () => [])
  const isLoading = useState<boolean>(`reqs:${initiativeId}:loading`, () => false)
  const errorMessage = useState<string | null>(`reqs:${initiativeId}:error`, () => null)

  async function fetchRequirements() {
    const token = await getIdToken()
    if (!token) return
    isLoading.value = true
    errorMessage.value = null
    try {
      requirements.value = await requirementService.list(token, initiativeId)
    } catch {
      errorMessage.value = 'Error al cargar los requerimientos.'
    } finally {
      isLoading.value = false
    }
  }

  async function createRequirement(
    title: string,
    description: string,
    priority: RequirementPriority,
    sourceConversationId: string | null = null
  ): Promise<boolean> {
    const token = await getIdToken()
    if (!token) return false
    errorMessage.value = null
    try {
      const created = await requirementService.create(token, initiativeId, {
        title,
        description,
        priority,
        sourceConversationId,
        status: 'draft'
      })
      requirements.value = [created, ...requirements.value]
      return true
    } catch {
      errorMessage.value = 'Error al registrar el requerimiento.'
      return false
    }
  }

  async function updateRequirementStatus(reqId: string, status: RequirementStatus): Promise<boolean> {
    const token = await getIdToken()
    if (!token) return false
    try {
      const updated = await requirementService.update(token, reqId, { status })
      requirements.value = requirements.value.map(r => r.id === reqId ? updated : r)
      return true
    } catch {
      errorMessage.value = 'Error al actualizar el estado del requerimiento.'
      return false
    }
  }

  return {
    requirements,
    isLoading,
    errorMessage,
    fetchRequirements,
    createRequirement,
    updateRequirementStatus
  }
}
