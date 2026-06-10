<script setup lang="ts">
import { useRequirements } from '~/composables/useRequirements'
import { useConversations } from '~/composables/useConversations'
import { priorityBadge } from '~~/shared/utils/initiatives'

const props = defineProps<{
  initiativeId: string
}>()

const {
  requirements,
  isLoading,
  errorMessage,
  fetchRequirements,
  createRequirement,
  updateRequirementStatus
} = useRequirements(props.initiativeId)

const {
  conversations,
  fetchConversations
} = useConversations(props.initiativeId)

const createOpen = ref(false)
const isSubmitting = ref(false)

const newReq = ref({
  title: '',
  description: '',
  priority: 'must' as any,
  sourceConversationId: null as string | null
})

const priorityOptions = [
  { label: 'Must (Obligatorio)', value: 'must' },
  { label: 'Should (Deseable)', value: 'should' },
  { label: 'Could (Podría ser)', value: 'could' },
  { label: 'Wont (No por ahora)', value: 'wont' }
]

const statusOptions = [
  { label: 'Borrador', value: 'draft' },
  { label: 'En Refinamiento', value: 'refining' },
  { label: 'Listo para Desarrollo', value: 'ready' },
  { label: 'Implementado', value: 'implemented' },
  { label: 'Archivado', value: 'archived' }
]

const conversationOptions = computed(() => [
  { label: 'Ninguna (Creación manual)', value: null },
  ...conversations.value.map(c => ({
    label: c.title,
    value: c.id
  }))
])

function getPriorityLabel(pri: string): string {
  switch (pri) {
    case 'must': return 'Must'
    case 'should': return 'Should'
    case 'could': return 'Could'
    case 'wont': return "Won't"
    default: return pri
  }
}

function getStatusLabel(stat: string): string {
  switch (stat) {
    case 'draft': return 'Borrador'
    case 'refining': return 'Refinando'
    case 'ready': return 'Listo'
    case 'implemented': return 'Implementado'
    case 'archived': return 'Archivado'
    default: return stat
  }
}

function getStatusColor(stat: string): 'neutral' | 'primary' | 'success' | 'warning' | 'error' {
  switch (stat) {
    case 'draft': return 'neutral'
    case 'refining': return 'primary'
    case 'ready': return 'success'
    case 'implemented': return 'success'
    case 'archived': return 'neutral'
    default: return 'neutral'
  }
}

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

async function handleCreateReq() {
  if (!newReq.value.title.trim() || !newReq.value.description.trim()) return
  isSubmitting.value = true
  try {
    await createRequirement(
      newReq.value.title.trim(),
      newReq.value.description.trim(),
      newReq.value.priority,
      newReq.value.sourceConversationId
    )
    createOpen.value = false
    newReq.value = { title: '', description: '', priority: 'must', sourceConversationId: null }
  } finally {
    isSubmitting.value = false
  }
}

async function handleStatusChange(reqId: string, status: any) {
  await updateRequirementStatus(reqId, status)
}

onMounted(() => {
  fetchRequirements()
  fetchConversations()
})
</script>

<template lang="pug">
.space-y-4
  .flex.items-center.justify-between.gap-4
    div
      h3.text-sm.font-semibold.text-muted Requerimientos Funcionales
      p.text-xs.text-dimmed Requerimientos derivados de los hilos de conversación de negocio.
    UButton(
      icon="i-lucide-plus"
      label="Registrar Requerimiento"
      color="primary"
      size="sm"
      @click="createOpen = true"
    )

  .flex.items-center.justify-center.py-12(v-if="isLoading")
    UIcon.size-6.animate-spin.text-muted(name="i-lucide-loader-circle")

  template(v-else)
    UAlert(
      v-if="errorMessage"
      color="error"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      :title="errorMessage"
    )

    .text-center.py-16.border.border-dashed.border-default.rounded-xl(v-if="requirements.length === 0")
      UIcon.size-8.text-dimmed(name="i-lucide-list-todo")
      p.text-sm.text-dimmed.mt-2 Aún no se han registrado requerimientos para esta iniciativa.
      UButton.mt-4(
        color="primary"
        variant="outline"
        size="sm"
        label="Crear el primero"
        @click="createOpen = true"
      )

    .grid.grid-cols-1.gap-4(v-else class="md:grid-cols-2")
      UPageCard(v-for="req in requirements" :key="req.id")
        template(#header)
          .flex.items-start.justify-between.gap-3.w-full
            .min-w-0
              h4.font-bold.text-sm.truncate {{ req.title }}
              p.text-muted(class="text-[11px]" v-if="req.sourceConversationTitle")
                | Conversación origen: 
                span.font-medium {{ req.sourceConversationTitle }}
            .flex.items-center.gap-2.shrink-0
              UBadge(
                :color="priorityBadge(req.priority).color"
                :label="getPriorityLabel(req.priority)"
                size="sm"
                variant="subtle"
              )

        .text-sm.text-muted.my-2.prose(class="dark:prose-invert" v-html="renderMarkdown(req.description)")

        template(#footer)
          .flex.items-center.justify-between.gap-4.w-full
            span.text-dimmed(class="text-[10px]") Creado {{ formatRelativeTime(req.createdAt) }}
            .flex.items-center.gap-2
              span.text-xs.text-muted Estado:
              USelect(
                :model-value="req.status"
                :items="statusOptions"
                size="xs"
                class="w-[140px]"
                @update:model-value="handleStatusChange(req.id, $event)"
              )

  //- Create Requirement Slideover
  USlideover(v-model:open="createOpen" title="Nuevo Requerimiento")
    template(#body)
      form.space-y-4(@submit.prevent="handleCreateReq")
        UFormField(label="Título del Requerimiento" name="title" required)
          UInput(
            v-model="newReq.title"
            placeholder="Ej. Detector de código BIN"
            autofocus
            class="w-full"
          )
        
        UFormField(label="Conversación de Origen" name="sourceConversationId")
          USelect(
            v-model="newReq.sourceConversationId"
            :items="conversationOptions"
            class="w-full"
          )

        UFormField(label="Prioridad" name="priority")
          USelect(
            v-model="newReq.priority"
            :items="priorityOptions"
            class="w-full"
          )

        UFormField(label="Descripción y Alcance (Markdown)" name="description" required)
          UTextarea(
            v-model="newReq.description"
            placeholder="Describe el requerimiento técnico o funcional..."
            :rows="6"
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
            label="Registrar Requerimiento"
            color="primary"
            :loading="isSubmitting"
          )
</template>
