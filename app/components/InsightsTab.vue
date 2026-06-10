<script setup lang="ts">
import { useInsights } from '~/composables/useInsights'
import { useConversations } from '~/composables/useConversations'
import { formatRelativeTime } from '~~/shared/utils/initiatives'

const props = defineProps<{
  initiativeId: string
}>()

const {
  insights,
  isLoading,
  errorMessage,
  fetchInsights,
  createInsight
} = useInsights(props.initiativeId)

const {
  conversations,
  fetchConversations
} = useConversations(props.initiativeId)

const createOpen = ref(false)
const isSubmitting = ref(false)

const newInsight = ref({
  type: 'decision' as any,
  body: '',
  sourceConversationId: null as string | null,
  confidence: 1.0
})

const typeOptions = [
  { label: 'Decisión importante', value: 'decision' },
  { label: 'Restricción de negocio', value: 'constraint' },
  { label: 'Dependencia técnica', value: 'dependency' },
  { label: 'Regla de negocio', value: 'rule' },
  { label: 'Supuesto clave', value: 'assumption' },
  { label: 'Riesgo identificado', value: 'risk' }
]

const conversationOptions = computed(() => [
  { label: 'Ninguna (Creación manual)', value: null },
  ...conversations.value.map(c => ({
    label: c.title,
    value: c.id
  }))
])

function getTypeLabel(t: string): string {
  switch (t) {
    case 'decision': return 'Decisión'
    case 'constraint': return 'Restricción'
    case 'dependency': return 'Dependencia'
    case 'rule': return 'Regla de negocio'
    case 'assumption': return 'Supuesto'
    case 'risk': return 'Riesgo'
    default: return t
  }
}

function getTypeColor(t: string): 'neutral' | 'primary' | 'success' | 'warning' | 'error' {
  switch (t) {
    case 'decision': return 'success'
    case 'constraint': return 'error'
    case 'dependency': return 'warning'
    case 'rule': return 'primary'
    case 'assumption': return 'neutral'
    case 'risk': return 'error'
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

async function handleCreateInsight() {
  if (!newInsight.value.body.trim()) return
  isSubmitting.value = true
  try {
    await createInsight(
      newInsight.value.body.trim(),
      newInsight.value.type,
      newInsight.value.sourceConversationId,
      newInsight.value.confidence ? Number(newInsight.value.confidence) : null
    )
    createOpen.value = false
    newInsight.value = { type: 'decision', body: '', sourceConversationId: null, confidence: 1.0 }
  } finally {
    isSubmitting.value = false
  }
}

onMounted(() => {
  fetchInsights()
  fetchConversations()
})
</script>

<template lang="pug">
.space-y-4
  .flex.items-center.justify-between.gap-4
    div
      h3.text-sm.font-semibold.text-muted Insights y Decisiones
      p.text-xs.text-dimmed Conocimiento clave extraído para alimentar las especificaciones.
    UButton(
      icon="i-lucide-plus"
      label="Registrar Insight"
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

    .text-center.py-16.border.border-dashed.border-default.rounded-xl(v-if="insights.length === 0")
      UIcon.size-8.text-dimmed(name="i-lucide-lightbulb")
      p.text-sm.text-dimmed.mt-2 Aún no se han registrado insights para esta iniciativa.
      UButton.mt-4(
        color="primary"
        variant="outline"
        size="sm"
        label="Registrar el primero"
        @click="createOpen = true"
      )

    .grid.grid-cols-1.gap-4(v-else class="md:grid-cols-2")
      UPageCard(v-for="ins in insights" :key="ins.id")
        template(#header)
          .flex.items-center.justify-between.gap-3.w-full
            UBadge(
              :color="getTypeColor(ins.type)"
              :label="getTypeLabel(ins.type)"
              size="sm"
              variant="subtle"
            )
            .flex.items-center.gap-2.text-muted(class="text-[11px]" v-if="ins.confidence !== null")
              span Confianza:
              span.font-medium {{ Math.round(ins.confidence * 100) }}%

        .text-sm.text-muted.my-2(v-html="renderMarkdown(ins.body)")

        template(#footer)
          .flex.flex-wrap.items-center.justify-between.gap-2.w-full.text-dimmed(class="text-[11px]")
            span Registrado {{ formatRelativeTime(ins.createdAt) }} por {{ ins.author?.displayName || ins.author?.email || 'Sistema' }}
            span(v-if="ins.sourceConversationTitle") Derivado de: {{ ins.sourceConversationTitle }}

  //- Create Insight Slideover
  USlideover(v-model:open="createOpen" title="Registrar Insight / Decisión")
    template(#body)
      form.space-y-4(@submit.prevent="handleCreateInsight")
        UFormField(label="Tipo de Conocimiento" name="type" required)
          USelect(
            v-model="newInsight.type"
            :items="typeOptions"
            class="w-full"
          )

        UFormField(label="Conversación de Origen" name="sourceConversationId")
          USelect(
            v-model="newInsight.sourceConversationId"
            :items="conversationOptions"
            class="w-full"
          )

        UFormField(label="Confianza / Seguridad" name="confidence")
          .flex.items-center.gap-3
            input.flex-1(
              v-model="newInsight.confidence"
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
            )
            span.text-xs.font-mono.w-12.text-right {{ Math.round(newInsight.confidence * 100) }}%

        UFormField(label="Descripción del Insight" name="body" required)
          UTextarea(
            v-model="newInsight.body"
            placeholder="Escribe la regla descubierta, restricción o decisión formal tomada..."
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
            label="Guardar Insight"
            color="primary"
            :loading="isSubmitting"
          )
</template>
