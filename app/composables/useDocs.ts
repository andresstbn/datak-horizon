import { docService } from '~/services/docService'
import type { DocDetail, DocFilters, DocIndexItem, DocType } from '~~/shared/types/doc'
import { filterDocs } from '~~/shared/utils/docs'

export function useDocs() {
  const { getIdToken } = useAuth()

  const items = useState<DocIndexItem[]>('docs:items', () => [])
  const isLoading = useState<boolean>('docs:loading', () => false)
  const errorMessage = useState<string | null>('docs:error', () => null)

  const selectedDoc = useState<DocDetail | null>('docs:selectedDoc', () => null)
  const isDetailLoading = useState<boolean>('docs:detailLoading', () => false)
  const detailError = useState<string | null>('docs:detailError', () => null)
  const isSyncing = useState<boolean>('docs:syncing', () => false)

  const filters = useState<DocFilters>('docs:filters', () => ({
    tipo: 'rf',
    estado: 'all',
    search: ''
  }))

  async function fetchDocs(force = false): Promise<void> {
    if (items.value.length > 0 && !force && !isLoading.value) return

    const token = await getIdToken()
    if (!token) {
      items.value = []
      return
    }

    isLoading.value = true
    errorMessage.value = null
    try {
      items.value = await docService.list(token, force)
    } catch (err: unknown) {
      console.error('Error fetching docs index:', err)
      const dataMsg = (err as { data?: { statusMessage?: string, message?: string } })?.data?.statusMessage
        || (err as { statusMessage?: string })?.statusMessage
        || (err as Error)?.message
      errorMessage.value = dataMsg || 'No se pudieron cargar los documentos del monorepo.'
      items.value = []
    } finally {
      isLoading.value = false
    }
  }

  async function syncDocs(): Promise<void> {
    const token = await getIdToken()
    if (!token) return

    isSyncing.value = true
    errorMessage.value = null
    try {
      items.value = await docService.sync(token)
      if (selectedDoc.value) {
        await selectDoc(selectedDoc.value.tipo, selectedDoc.value.filename, true)
      }
    } catch (err: unknown) {
      console.error('Error syncing docs with GitHub:', err)
      const dataMsg = (err as { data?: { statusMessage?: string, message?: string } })?.data?.statusMessage
        || (err as { statusMessage?: string })?.statusMessage
        || (err as Error)?.message
      errorMessage.value = dataMsg || 'No se pudieron sincronizar los documentos con GitHub.'
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
      const detail = await docService.getByPath(token, tipo, filename, force)
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
    availableStatuses,
    rfCount,
    specsCount,
    fetchDocs,
    syncDocs,
    selectDoc,
    clearSelectedDoc
  }
}
