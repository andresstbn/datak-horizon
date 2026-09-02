import { docService } from '~/services/docService'
import type { DocComment, DocCommentThread } from '~~/shared/types/doc'

/**
 * Comment thread of the currently selected document, backed by the open PR of
 * the branch being viewed. Reloads whenever the document or the branch changes.
 */
export function useDocComments() {
  const { getIdToken } = useAuth()
  const { selectedDoc, filters } = useDocs()

  const thread = useState<DocCommentThread>('docs:commentThread', () => ({ comments: [] }))
  const isLoading = useState<boolean>('docs:commentsLoading', () => false)
  const isPosting = useState<boolean>('docs:commentsPosting', () => false)
  const errorMessage = useState<string | null>('docs:commentsError', () => null)

  const hasOpenPr = computed(() => Boolean(thread.value.prNumber))

  function readErrorMessage(err: unknown, fallback: string): string {
    const dataMsg = (err as { data?: { statusMessage?: string, message?: string } })?.data?.statusMessage
      || (err as { statusMessage?: string })?.statusMessage
      || (err as Error)?.message
    return dataMsg || fallback
  }

  async function fetchComments(): Promise<void> {
    const doc = selectedDoc.value
    if (!doc) {
      thread.value = { comments: [] }
      return
    }

    const token = await getIdToken()
    if (!token) return

    isLoading.value = true
    errorMessage.value = null
    try {
      thread.value = await docService.listComments(token, filters.value.branch, doc.tipo, doc.filename)
    } catch (err: unknown) {
      console.error('Error fetching doc comments:', err)
      errorMessage.value = readErrorMessage(err, 'No se pudieron cargar los comentarios.')
      thread.value = { comments: [] }
    } finally {
      isLoading.value = false
    }
  }

  async function postComment(body: string): Promise<DocComment | null> {
    const doc = selectedDoc.value
    if (!doc || !body.trim()) return null

    const token = await getIdToken()
    if (!token) return null

    isPosting.value = true
    errorMessage.value = null
    try {
      const created = await docService.addComment(
        token,
        filters.value.branch,
        doc.tipo,
        doc.filename,
        body
      )
      thread.value = { ...thread.value, comments: [...thread.value.comments, created] }
      return created
    } catch (err: unknown) {
      console.error('Error posting doc comment:', err)
      errorMessage.value = readErrorMessage(err, 'No se pudo publicar el comentario en el PR.')
      return null
    } finally {
      isPosting.value = false
    }
  }

  watch(
    () => [selectedDoc.value?.tipo, selectedDoc.value?.filename, filters.value.branch],
    () => {
      void fetchComments()
    },
    { immediate: true }
  )

  return {
    thread,
    isLoading,
    isPosting,
    errorMessage,
    hasOpenPr,
    fetchComments,
    postComment
  }
}
