import { initiativeService } from '~/services/initiativeService'
import {
  createDefaultFilters,
  type InitiativeFilters,
  type InitiativeListItem,
  type OwnerRef
} from '~~/shared/types/initiative'
import { filterInitiatives, paginate } from '~~/shared/utils/initiatives'

const PER_PAGE = 8

/**
 * Roadmap orchestration. Owns the list state, filters and pagination, delegates
 * the HTTP call to the service and the filtering/paging math to pure helpers.
 */
export function useInitiatives() {
  const { getIdToken } = useAuth()

  const items = useState<InitiativeListItem[]>('initiatives:items', () => [])
  const isLoading = useState<boolean>('initiatives:loading', () => false)
  const errorMessage = useState<string | null>('initiatives:error', () => null)
  const filters = useState<InitiativeFilters>('initiatives:filters', createDefaultFilters)
  const page = useState<number>('initiatives:page', () => 1)

  async function fetchInitiatives(): Promise<void> {
    const token = await getIdToken()
    if (!token) {
      items.value = []
      return
    }

    isLoading.value = true
    errorMessage.value = null
    try {
      items.value = await initiativeService.list(token)
    } catch {
      errorMessage.value = 'No se pudieron cargar las iniciativas.'
      items.value = []
    } finally {
      isLoading.value = false
    }
  }

  const filtered = computed(() => filterInitiatives(items.value, filters.value))
  const paginated = computed(() => paginate(filtered.value, page.value, PER_PAGE))

  // Unique owners (functional + technical) for the "Responsable" filter.
  const owners = computed<OwnerRef[]>(() => {
    const byId = new Map<string, OwnerRef>()
    for (const item of items.value) {
      for (const owner of [item.functionalOwner, item.technicalOwner]) {
        if (owner && !byId.has(owner.id)) {
          byId.set(owner.id, owner)
        }
      }
    }
    return [...byId.values()]
  })

  // Reset to the first page whenever the filters change.
  watch(filters, () => {
    page.value = 1
  }, { deep: true })

  return {
    items,
    isLoading,
    errorMessage,
    filters,
    page,
    perPage: PER_PAGE,
    filtered,
    paginated,
    owners,
    fetchInitiatives
  }
}
