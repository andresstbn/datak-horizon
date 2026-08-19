import { initiativeService } from '~/services/initiativeService'
import { userService } from '~/services/userService'
import {
  createDefaultFilters,
  type InitiativeDetail,
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
  const users = useState<OwnerRef[]>('workspace:users', () => [])
  const isUsersLoading = useState<boolean>('workspace:usersLoading', () => false)
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

  // Every owner dropdown asks for the list on mount, so guard it: one request
  // per session instead of one per rendered row.
  async function fetchUsers(): Promise<void> {
    if (users.value.length > 0 || isUsersLoading.value) return

    const token = await getIdToken()
    if (!token) return

    isUsersLoading.value = true
    try {
      users.value = await userService.list(token)
    } catch (err) {
      console.error('Error loading users:', err)
    } finally {
      isUsersLoading.value = false
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

  async function updateInitiative(
    id: string,
    patch: Partial<InitiativeDetail>
  ): Promise<InitiativeDetail | null> {
    const token = await getIdToken()
    if (!token) return null

    try {
      const updated = await initiativeService.update(token, id, patch)
      const index = items.value.findIndex(item => item.id === id)
      const currentItem = items.value[index]
      if (index !== -1 && currentItem) {
        items.value[index] = {
          ...currentItem,
          ...updated
        }
      }
      return updated
    } catch (error) {
      console.error('Error updating initiative:', error)
      return null
    }
  }

  async function updateInitiativeStatus(id: string, newStatus: InitiativeListItem['status']): Promise<boolean> {
    const result = await updateInitiative(id, { status: newStatus })
    return result !== null
  }

  return {
    items,
    users,
    isLoading,
    errorMessage,
    filters,
    page,
    perPage: PER_PAGE,
    filtered,
    paginated,
    owners,
    fetchInitiatives,
    fetchUsers,
    updateInitiative,
    updateInitiativeStatus
  }
}
