import { conversationService } from '~/services/conversationService'
import type { Conversation, ConversationMessage, ConversationSource, MessageRole } from '~~/shared/types/conversation'

export function useConversations(initiativeId: string) {
  const { getIdToken } = useAuth()

  const conversations = useState<Conversation[]>(`convs:${initiativeId}`, () => [])
  const activeMessages = useState<ConversationMessage[]>(`convs:${initiativeId}:messages`, () => [])
  const selectedConversationId = useState<string | null>(`convs:${initiativeId}:selectedId`, () => null)
  const isLoading = useState<boolean>(`convs:${initiativeId}:loading`, () => false)
  const isMessagesLoading = useState<boolean>(`convs:${initiativeId}:msgLoading`, () => false)
  const errorMessage = useState<string | null>(`convs:${initiativeId}:error`, () => null)

  async function fetchConversations() {
    const token = await getIdToken()
    if (!token) return
    isLoading.value = true
    errorMessage.value = null
    try {
      conversations.value = await conversationService.list(token, initiativeId)
      // Auto-select first conversation if none is selected
      if (conversations.value.length > 0 && !selectedConversationId.value) {
        await selectConversation(conversations.value[0]!.id)
      }
    } catch {
      errorMessage.value = 'Error al cargar las conversaciones.'
    } finally {
      isLoading.value = false
    }
  }

  async function selectConversation(id: string) {
    selectedConversationId.value = id
    const token = await getIdToken()
    if (!token) return
    isMessagesLoading.value = true
    try {
      activeMessages.value = await conversationService.listMessages(token, id)
    } catch {
      errorMessage.value = 'Error al cargar los mensajes.'
    } finally {
      isMessagesLoading.value = false
    }
  }

  async function createConversation(title: string, source: ConversationSource): Promise<Conversation | null> {
    const token = await getIdToken()
    if (!token) return null
    errorMessage.value = null
    try {
      const created = await conversationService.create(token, initiativeId, { title, source })
      conversations.value = [created, ...conversations.value]
      await selectConversation(created.id)
      return created
    } catch {
      errorMessage.value = 'Error al crear la conversación.'
      return null
    }
  }

  async function postMessage(body: string, role: MessageRole = 'user'): Promise<boolean> {
    const convId = selectedConversationId.value
    if (!convId) return false
    const token = await getIdToken()
    if (!token) return false
    try {
      const msg = await conversationService.createMessage(token, convId, {
        role,
        contentType: 'markdown',
        body
      })
      activeMessages.value = [...activeMessages.value, msg]
      return true
    } catch {
      errorMessage.value = 'Error al enviar el mensaje.'
      return false
    }
  }

  return {
    conversations,
    activeMessages,
    selectedConversationId,
    isLoading,
    isMessagesLoading,
    errorMessage,
    fetchConversations,
    selectConversation,
    createConversation,
    postMessage
  }
}
