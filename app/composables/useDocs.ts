import { docService } from '~/services/docService'
import type { DocBranch, DocDetail, DocFilters, DocIndexItem, DocType } from '~~/shared/types/doc'
import { DEFAULT_DOC_BRANCH, filterDocs } from '~~/shared/utils/docs'

export function useDocs() {
  const { getIdToken } = useAuth()

  const items = useState<DocIndexItem[]>('docs:items', () => [])
  const isLoading = useState<boolean>('docs:loading', () => false)
  const errorMessage = useState<string | null>('docs:error', () => null)

  const selectedDoc = useState<DocDetail | null>('docs:selectedDoc', () => null)
  const isDetailLoading = useState<boolean>('docs:detailLoading', () => false)
  const detailError = useState<string | null>('docs:detailError', () => null)
  const isSyncing = useState<boolean>('docs:syncing', () => false)

  const branches = useState<DocBranch[]>('docs:branches', () => [])
  const isBranchesLoading = useState<boolean>('docs:branchesLoading', () => false)

  const filters = useState<DocFilters>('docs:filters', () => ({
    tipo: 'rf',
    estado: 'all',
    search: '',
    branch: DEFAULT_DOC_BRANCH
  }))

  // Branch the cached `items` actually belong to, so switching branches cannot
  // be short-circuited by the "already loaded" guard below.
  const loadedBranch = useState<string | null>('docs:loadedBranch', () => null)

  const currentBranch = computed(() => filters.value.branch)

  const currentBranchInfo = computed<DocBranch | undefined>(() =>
    branches.value.find(b => b.name === filters.value.branch)
  )

  function readErrorMessage(err: unknown, fallback: string): string {
    const dataMsg = (err as { data?: { statusMessage?: string, message?: string } })?.data?.statusMessage
      || (err as { statusMessage?: string })?.statusMessage
      || (err as Error)?.message
    return dataMsg || fallback
  }

  async function fetchBranches(): Promise<void> {
    if (branches.value.length > 0 || isBranchesLoading.value) return

    const token = await getIdToken()
    if (!token) return

    isBranchesLoading.value = true
    try {
      branches.value = await docService.listBranches(token)
    } catch (err: unknown) {
      // A failing branch list must not block the documents themselves.
      console.error('Error fetching docs branches:', err)
      branches.value = [{ name: DEFAULT_DOC_BRANCH }]
    } finally {
      isBranchesLoading.value = false
    }
  }

  async function fetchDocs(force = false): Promise<void> {
    const branch = filters.value.branch
    if (items.value.length > 0 && loadedBranch.value === branch && !force && !isLoading.value) return

    const token = await getIdToken()
    if (!token) {
      items.value = []
      return
    }

    isLoading.value = true
    errorMessage.value = null
    try {
      items.value = await docService.list(token, branch, force)
      loadedBranch.value = branch
    } catch (err: unknown) {
      console.error('Error fetching docs index:', err)
      errorMessage.value = readErrorMessage(err, 'No se pudieron cargar los documentos del monorepo.')
      items.value = []
      loadedBranch.value = null
    } finally {
      isLoading.value = false
    }
  }

  async function syncDocs(): Promise<void> {
    const token = await getIdToken()
    if (!token) return

    const branch = filters.value.branch
    isSyncing.value = true
    errorMessage.value = null
    try {
      items.value = await docService.sync(token, branch)
      loadedBranch.value = branch
      if (selectedDoc.value) {
        await selectDoc(selectedDoc.value.tipo, selectedDoc.value.filename, true)
      }
    } catch (err: unknown) {
      console.error('Error syncing docs with GitHub:', err)
      errorMessage.value = readErrorMessage(err, 'No se pudieron sincronizar los documentos con GitHub.')
    } finally {
      isSyncing.value = false
    }
  }

  async function selectDoc(tipo: DocType, filename: string, force = false): Promise<DocDetail | null> {
    if (
      !force
      && selectedDoc.value
      && selectedDoc.value.tipo === tipo
      && selectedDoc.value.filename === filename
    ) {
      return selectedDoc.value
    }

    const token = await getIdToken()
    if (!token) {
      selectedDoc.value = null
      return null
    }

    isDetailLoading.value = true
    detailError.value = null
    try {
      const detail = await docService.getByPath(token, tipo, filename, filters.value.branch, force)
      selectedDoc.value = detail
      return detail
    } catch (err: unknown) {
      console.error(`Error loading doc detail ${tipo}/${filename}:`, err)
      detailError.value = `No se pudo cargar el documento: ${filename}`
      selectedDoc.value = null
      return null
    } finally {
      isDetailLoading.value = false
    }
  }

  function clearSelectedDoc() {
    selectedDoc.value = null
    detailError.value = null
  }

  /**
   * Switches branch: the previous branch's documents and selection are dropped
   * before reloading, since neither is valid on the new ref.
   */
  async function setBranch(branch: string): Promise<void> {
    if (branch === filters.value.branch) return

    filters.value.branch = branch
    items.value = []
    loadedBranch.value = null
    clearSelectedDoc()
    await fetchDocs()
  }

  const filtered = computed(() => filterDocs(items.value, filters.value))

  const availableStatuses = computed<string[]>(() => {
    const statuses = new Set<string>()
    for (const item of items.value) {
      if (item.estado) {
        statuses.add(item.estado)
      }
    }
    return Array.from(statuses)
  })

  const rfCount = computed(() => items.value.filter(i => i.tipo === 'rf').length)
  const specsCount = computed(() => items.value.filter(i => i.tipo === 'specs').length)

  return {
    items,
    isLoading,
    isSyncing,
    errorMessage,
    selectedDoc,
    isDetailLoading,
    detailError,
    filters,
    filtered,
    branches,
    isBranchesLoading,
    currentBranch,
    currentBranchInfo,
    availableStatuses,
    rfCount,
    specsCount,
    fetchBranches,
    fetchDocs,
    syncDocs,
    selectDoc,
    setBranch,
    clearSelectedDoc
  }
}
