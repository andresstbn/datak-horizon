<script setup lang="ts">
import { useConversations } from '~/composables/useConversations'
import { formatRelativeTime } from '~~/shared/utils/initiatives'

const props = defineProps<{
  initiativeId: string
}>()

const {
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
} = useConversations(props.initiativeId)

const currentConversation = computed(() => {
  return conversations.value.find(c => c.id === selectedConversationId.value)
})

const createOpen = ref(false)
const isSubmitting = ref(false)
const newMessageBody = ref('')
const newConv = ref({
  title: '',
  source: 'manual' as any
})

const sourceOptions = [
  { label: 'Manual', value: 'manual' },
  { label: 'Slack', value: 'slack_import' },
  { label: 'WhatsApp', value: 'whatsapp_import' },
  { label: 'Grabación de voz', value: 'voice' },
  { label: 'Reunión', value: 'meeting' }
]

function getSourceLabel(src: string): string {
  switch (src) {
    case 'manual': return 'Manual'
    case 'slack_import': return 'Slack'
    case 'whatsapp_import': return 'WhatsApp'
    case 'voice': return 'Voz'
    case 'meeting': return 'Reunión'
    default: return src
  }
}

// Simple client-side Markdown rendering helper
function renderMarkdown(text: string): string {
  if (!text) return ''
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  
  html = html.replace(/^### (.*$)/gim, '<h3 class="font-bold text-base mt-2 mb-1 text-foreground">$1</h3>')
  html = html.replace(/^## (.*$)/gim, '<h2 class="font-bold text-lg mt-3 mb-1 text-foreground">$1</h2>')
  html = html.replace(/^# (.*$)/gim, '<h1 class="font-bold text-xl mt-4 mb-2 text-foreground">$1</h1>')
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
  html = html.replace(/^\s*-\s+(.*$)/gim, '<li class="ml-4 list-disc">$1</li>')
  html = html.replace(/\n/g, '<br>')
  return html
}

async function handleCreateConv() {
  if (!newConv.value.title.trim()) return
  isSubmitting.value = true
  try {
    await createConversation(newConv.value.title.trim(), newConv.value.source)
    createOpen.value = false
    newConv.value = { title: '', source: 'manual' }
  } finally {
    isSubmitting.value = false
  }
}

async function handleSendMessage() {
  if (!newMessageBody.value.trim()) return
  const sent = await postMessage(newMessageBody.value.trim(), 'user')
  if (sent) {
    newMessageBody.value = ''
  }
}

onMounted(fetchConversations)
</script>

<template lang="pug">
.grid.grid-cols-1.gap-6(class="md:grid-cols-[260px_1fr]")
  //- Left sidebar: Conversations list
  .space-y-4
    .flex.items-center.justify-between.gap-2
      h3.text-sm.font-semibold.text-muted Hilos de refinamiento
      UButton(
        icon="i-lucide-plus"
        size="xs"
        variant="ghost"
        color="primary"
        label="Nuevo"
        @click="createOpen = true"
      )

    .flex.items-center.justify-center.py-8(v-if="isLoading")
      UIcon.size-5.animate-spin.text-muted(name="i-lucide-loader-circle")

    .text-center.py-8.border.border-dashed.border-default.rounded-lg(v-else-if="conversations.length === 0")
      p.text-xs.text-dimmed Sin conversaciones.
      UButton.mt-2(
        size="xs"
        variant="link"
        label="Comenzar una"
        @click="createOpen = true"
      )

    .space-y-1(v-else)
      UButton.justify-start.w-full(
        v-for="conv in conversations"
        :key="conv.id"
        :color="selectedConversationId === conv.id ? 'primary' : 'neutral'"
        :variant="selectedConversationId === conv.id ? 'solid' : 'ghost'"
        block
        @click="selectConversation(conv.id)"
      )
        .flex.flex-col.items-start.min-w-0.text-left.w-full
          span.font-medium.text-sm.truncate.w-full {{ conv.title }}
          .flex.items-center.justify-between.w-full.mt-1
            span(class="text-[10px] opacity-75") {{ getSourceLabel(conv.source) }}
            span(class="text-[9px] opacity-60") {{ formatRelativeTime(conv.createdAt) }}

  //- Right pane: Chat Messages
  UPageCard(class="flex flex-col h-[550px] p-0 overflow-hidden")
    template(#header)
      .flex.items-center.justify-between.gap-4.w-full(v-if="currentConversation")
        .min-w-0
          h3.font-semibold.text-sm.truncate {{ currentConversation.title }}
          p.text-xs.text-muted
            | Iniciada por {{ currentConversation.createdBy?.displayName || currentConversation.createdBy?.email || 'Sistema' }} · {{ formatRelativeTime(currentConversation.createdAt) }}
        UBadge(color="neutral" variant="subtle" size="sm") {{ getSourceLabel(currentConversation.source) }}
      .w-full(v-else)
        h3.font-semibold.text-sm Selecciona una conversación

    .flex-1.flex.flex-col.p-4.overflow-y-auto.space-y-4
      .flex.items-center.justify-center.h-full(v-if="isMessagesLoading")
        UIcon.size-6.animate-spin.text-muted(name="i-lucide-loader-circle")
      
      template(v-else-if="selectedConversationId")
        p.text-xs.text-center.text-dimmed.my-2 Comienzo del hilo de refinamiento.

        .flex.gap-3(
          v-for="msg in activeMessages"
          :key="msg.id"
          :class="msg.role === 'user' ? 'justify-start' : 'justify-start md:pl-8'"
        )
          UAvatar(
            :src="msg.author?.photoUrl ?? undefined"
            :alt="msg.author?.displayName ?? 'Sistema'"
            size="xs"
            class="mt-1"
          )
          .flex-1.min-w-0
            .flex.items-baseline.gap-2
              span.text-xs.font-semibold {{ msg.author?.displayName ?? 'Sistema' }}
              span.text-muted(class="text-[10px]") {{ formatRelativeTime(msg.createdAt) }}
            .text-sm.text-muted.mt-1.bg-default.p-3.rounded-lg.border.border-default(
              v-html="renderMarkdown(msg.body)"
            )
      
      .flex.flex-col.items-center.justify-center.h-full.text-center.text-dimmed(v-else)
        UIcon.size-8.text-dimmed(name="i-lucide-message-square")
        p.text-sm.mt-2 Selecciona una conversación de la izquierda o crea una nueva para ver los mensajes.

    //- Message input box
    template(#footer v-if="selectedConversationId")
      form.flex.items-center.gap-2(@submit.prevent="handleSendMessage")
        UInput(
          v-model="newMessageBody"
          placeholder="Escribe un mensaje en markdown..."
          class="flex-1"
          autocomplete="off"
        )
        UButton(
          type="submit"
          icon="i-lucide-send"
          color="primary"
          aria-label="Enviar mensaje"
        )

  //- Slideover to Create Conversation
  USlideover(v-model:open="createOpen" title="Nueva Conversación")
    template(#body)
      form.space-y-4(@submit.prevent="handleCreateConv")
        UFormField(label="Título del Hilo" name="title" required)
          UInput(
            v-model="newConv.title"
            placeholder="Ej. Alcance de facturas electrónicas"
            autofocus
            class="w-full"
          )
        
        UFormField(label="Origen de la Discusión" name="source")
          USelect(
            v-model="newConv.source"
            :items="sourceOptions"
            class="w-full"
          )

        .flex.items-center.justify-end.gap-3.pt-4
          UButton(
            label="Cancelar"
            color="neutral"
            variant="ghost"
            @click="createOpen = false"
          )
          UButton(
            type="submit"
            label="Comenzar Hilo"
            color="primary"
            :loading="isSubmitting"
          )
</template>
