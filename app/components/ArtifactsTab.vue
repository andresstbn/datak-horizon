<script setup lang="ts">
import { useAIArtifacts } from '~/composables/useAIArtifacts'
import { useConversations } from '~/composables/useConversations'
import { useRequirements } from '~/composables/useRequirements'
import { formatRelativeTime } from '~~/shared/utils/initiatives'

const props = defineProps<{
  initiativeId: string
}>()

const {
  artifacts,
  isLoading,
  errorMessage,
  fetchArtifacts,
  createArtifact
} = useAIArtifacts(props.initiativeId)

const { conversations, fetchConversations } = useConversations(props.initiativeId)
const { requirements, fetchRequirements } = useRequirements(props.initiativeId)

const createOpen = ref(false)
const viewOpen = ref(false)
const isSubmitting = ref(false)
const selectedArtifact = ref<any>(null)
const toast = useToast()

const newArt = ref({
  title: '',
  type: 'functional_specification' as any,
  content: '',
  requirementId: null as string | null,
  sourceConversationId: null as string | null,
  status: 'draft' as any
})

const typeOptions = [
  { label: 'Preguntas de Refinamiento', value: 'refinement_questions' },
  { label: 'Especificación Funcional', value: 'functional_specification' },
  { label: 'Plan Técnico de Implementación', value: 'technical_plan' },
  { label: 'Prompt de Desarrollo', value: 'implementation_prompt' },
  { label: 'Lista de Control QA (Checklist)', value: 'qa_checklist' },
  { label: 'Contexto Consolidado', value: 'consolidated_context' }
]

const statusOptions = [
  { label: 'Borrador', value: 'draft' },
  { label: 'Aceptado / Aprobado', value: 'accepted' },
  { label: 'Archivado', value: 'archived' }
]

const conversationOptions = computed(() => [
  { label: 'Ninguna', value: null },
  ...conversations.value.map(c => ({
    label: c.title,
    value: c.id
  }))
])

const requirementOptions = computed(() => [
  { label: 'Ninguno', value: null },
  ...requirements.value.map(r => ({
    label: r.title,
    value: r.id
  }))
])

function getTypeLabel(t: string): string {
  switch (t) {
    case 'refinement_questions': return 'Preguntas de Refinamiento'
    case 'functional_specification': return 'Especificación Funcional'
    case 'technical_plan': return 'Plan Técnico'
    case 'implementation_prompt': return 'Prompt de Implementación'
    case 'qa_checklist': return 'Checklist de QA'
    case 'consolidated_context': return 'Contexto Consolidado'
    default: return t
  }
}

function getStatusLabel(s: string): string {
  switch (s) {
    case 'draft': return 'Borrador'
    case 'accepted': return 'Aceptado'
    case 'archived': return 'Archivado'
    default: return s
  }
}

function getStatusColor(s: string): 'neutral' | 'primary' | 'success' | 'warning' | 'error' {
  switch (s) {
    case 'draft': return 'neutral'
    case 'accepted': return 'success'
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
  
  html = html.replace(/^### (.*$)/gim, '<h3 class="font-bold text-base mt-3 mb-1 text-foreground">$1</h3>')
  html = html.replace(/^## (.*$)/gim, '<h2 class="font-bold text-lg mt-4 mb-2 text-foreground">$1</h2>')
  html = html.replace(/^# (.*$)/gim, '<h1 class="font-bold text-xl mt-5 mb-3 text-foreground">$1</h1>')
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
  html = html.replace(/^\s*-\s+(.*$)/gim, '<li class="ml-4 list-disc">$1</li>')
  html = html.replace(/\n/g, '<br>')
  return html
}

async function handleCreateArt() {
  if (!newArt.value.title.trim() || !newArt.value.content.trim()) return
  isSubmitting.value = true
  try {
    await createArtifact(
      newArt.value.title.trim(),
      newArt.value.content,
      newArt.value.type,
      newArt.value.requirementId,
      newArt.value.sourceConversationId,
      newArt.value.status
    )
    createOpen.value = false
    newArt.value = {
      title: '',
      type: 'functional_specification',
      content: '',
      requirementId: null,
      sourceConversationId: null,
      status: 'draft'
    }
    toast.add({
      title: 'Artefacto creado',
      description: 'El documento se ha guardado con éxito.',
      icon: 'i-lucide-check'
    })
  } catch (error) {
    toast.add({
      title: 'Error',
      description: 'No se pudo guardar el artefacto.',
      color: 'error',
      icon: 'i-lucide-triangle-alert'
    })
  } finally {
    isSubmitting.value = false
  }
}

function handleView(art: any) {
  selectedArtifact.value = art
  viewOpen.value = true
}

async function handleCopy() {
  if (!selectedArtifact.value) return
  try {
    await navigator.clipboard.writeText(selectedArtifact.value.content)
    toast.add({
      title: 'Copiado al portapapeles',
      description: 'El contenido en Markdown se ha copiado con éxito.',
      icon: 'i-lucide-check'
    })
  } catch (err) {
    toast.add({
      title: 'Error',
      description: 'No se pudo copiar el texto.',
      color: 'error',
      icon: 'i-lucide-triangle-alert'
    })
  }
}

onMounted(() => {
  fetchArtifacts()
  fetchConversations()
  fetchRequirements()
})
</script>

<template lang="pug">
.space-y-4
  .flex.items-center.justify-between.gap-4
    div
      h3.text-sm.font-semibold.text-muted Artefactos de Especificación
      p.text-xs.text-dimmed Documentos estructurados en markdown para alimentar el desarrollo.
    UButton(
      icon="i-lucide-plus"
      label="Crear Artefacto"
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

    .text-center.py-16.border.border-dashed.border-default.rounded-xl(v-if="artifacts.length === 0")
      UIcon.size-8.text-dimmed(name="i-lucide-file-code")
      p.text-sm.text-dimmed.mt-2 Aún no se han generado artefactos para esta iniciativa.
      UButton.mt-4(
        color="primary"
        variant="outline"
        size="sm"
        label="Escribir el primero"
        @click="createOpen = true"
      )

    .grid.grid-cols-1.gap-4(v-else class="md:grid-cols-2")
      UPageCard(v-for="art in artifacts" :key="art.id")
        template(#header)
          .flex.items-start.justify-between.gap-3.w-full
            .min-w-0
              h4.font-bold.text-sm.truncate {{ art.title }}
              p.text-muted(class="text-[10px]") {{ getTypeLabel(art.type) }}
            UBadge(
              :color="getStatusColor(art.status)"
              :label="getStatusLabel(art.status)"
              size="sm"
              variant="subtle"
              class="shrink-0"
            )

        p.text-xs.text-dimmed.my-2.line-clamp-3 {{ art.content }}

        template(#footer)
          .flex.items-center.justify-between.gap-4.w-full
            span.text-dimmed(class="text-[10px]") Creado {{ formatRelativeTime(art.createdAt) }}
            UButton(
              size="xs"
              variant="subtle"
              color="neutral"
              label="Ver y Copiar"
              icon="i-lucide-eye"
              @click="handleView(art)"
            )

  //- Drawer to View Artifact & Copy
  USlideover(v-model:open="viewOpen" title="Ver Artefacto")
    template(#body v-if="selectedArtifact")
      .space-y-6.h-full.flex.flex-col
        .flex.items-center.justify-between.gap-4.border-b.border-default.pb-3.shrink-0
          div
            h3.font-bold.text-base {{ selectedArtifact.title }}
            p.text-xs.text-muted Tipo: {{ getTypeLabel(selectedArtifact.type) }} | Estado: {{ getStatusLabel(selectedArtifact.status) }}
          UButton(
            icon="i-lucide-copy"
            label="Copiar Markdown"
            color="primary"
            size="sm"
            @click="handleCopy"
          )
        
        .flex-1.overflow-y-auto.p-4.bg-default.rounded-xl.border.border-default
          h4.text-xs.font-semibold.text-dimmed.mb-2 VISTA PREVIA RENDERIZADA
          .text-sm.text-muted.prose(class="dark:prose-invert" v-html="renderMarkdown(selectedArtifact.content)")
          
          h4.text-xs.font-semibold.text-dimmed.mt-6.mb-2 CÓDIGO FUENTE MARKDOWN
          pre.p-3.bg-neutral-900.text-neutral-100.rounded-lg.text-xs.overflow-x-auto.whitespace-pre-wrap {{ selectedArtifact.content }}

  //- Drawer to Create Artifact
  USlideover(v-model:open="createOpen" title="Nuevo Artefacto")
    template(#body)
      form.space-y-4(@submit.prevent="handleCreateArt")
        UFormField(label="Título del Documento" name="title" required)
          UInput(
            v-model="newArt.title"
            placeholder="Ej. Especificación funcional v1"
            autofocus
            class="w-full"
          )

        UFormField(label="Tipo de Artefacto" name="type" required)
          USelect(
            v-model="newArt.type"
            :items="typeOptions"
            class="w-full"
          )

        UFormField(label="Conversación Relacionada" name="sourceConversationId")
          USelect(
            v-model="newArt.sourceConversationId"
            :items="conversationOptions"
            class="w-full"
          )

        UFormField(label="Requerimiento Relacionado" name="requirementId")
          USelect(
            v-model="newArt.requirementId"
            :items="requirementOptions"
            class="w-full"
          )

        UFormField(label="Estado" name="status")
          USelect(
            v-model="newArt.status"
            :items="statusOptions"
            class="w-full"
          )

        UFormField(label="Contenido en Markdown" name="content" required)
          UTextarea(
            v-model="newArt.content"
            placeholder="Escribe el documento en Markdown..."
            :rows="12"
            class="w-full font-mono text-xs"
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
            label="Guardar Artefacto"
            color="primary"
            :loading="isSubmitting"
          )
</template>
