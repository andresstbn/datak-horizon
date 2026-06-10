<script setup lang="ts">
import { statusBadge } from '~~/shared/utils/initiatives'
import { initiativeService } from '~/services/initiativeService'

definePageMeta({ pageTitle: 'Detalle de Iniciativa' })

const route = useRoute()
const router = useRouter()
const id = route.params.id as string

const { isReady, isAuthenticated, getIdToken } = useAuth()
const { initiative, isLoading, errorMessage, fetchInitiative } = useInitiative(id)
const toast = useToast()

const tabItems = [
  { label: 'Resumen', value: 'resumen', slot: 'resumen', icon: 'i-lucide-file-text' },
  { label: 'Conversaciones', value: 'conversations', slot: 'conversations', icon: 'i-lucide-message-square' },
  { label: 'Requerimientos', value: 'requirements', slot: 'requirements', icon: 'i-lucide-list-todo' },
  { label: 'Insights', value: 'insights', slot: 'insights', icon: 'i-lucide-lightbulb' },
  { label: 'Artefactos', value: 'artifacts', slot: 'artifacts', icon: 'i-lucide-file-code' },
  { label: 'Metadata', value: 'metadata', slot: 'metadata', icon: 'i-lucide-settings' }
]

const activeTab = ref('resumen')

// Sync route query -> activeTab
watch(
  () => route.query.tab,
  (newTab) => {
    if (newTab && tabItems.some(t => t.value === newTab)) {
      activeTab.value = String(newTab)
    } else {
      activeTab.value = 'resumen'
    }
  },
  { immediate: true }
)

// Sync activeTab -> route query
watch(activeTab, (newVal) => {
  if (newVal === 'resumen') {
    const query = { ...route.query }
    delete query.tab
    router.replace({ query })
  } else {
    router.replace({ query: { ...route.query, tab: newVal } })
  }
})

async function handleCopyContext() {
  const token = await getIdToken()
  if (!token) return

  try {
    const { markdown } = await initiativeService.getConsolidatedContext(token, id)
    await navigator.clipboard.writeText(markdown)
    toast.add({
      title: 'Contexto copiado',
      description: 'El contexto consolidado en Markdown se copió al portapapeles.',
      icon: 'i-lucide-check'
    })
  } catch (err) {
    toast.add({
      title: 'Error',
      description: 'No se pudo obtener el contexto consolidado.',
      color: 'error',
      icon: 'i-lucide-triangle-alert'
    })
  }
}

watch(
  () => isAuthenticated.value,
  (authed) => {
    if (authed) {
      fetchInitiative()
    }
  },
  { immediate: true }
)
</script>

<template lang="pug">
.space-y-4
  //- Wait for the auth state before deciding what to render.
  .flex.items-center.justify-center.py-16(v-if="!isReady")
    UIcon.size-6.animate-spin.text-muted(name="i-lucide-loader-circle")

  UAlert(
    v-else-if="!isAuthenticated"
    color="neutral"
    variant="subtle"
    icon="i-lucide-lock"
    title="Inicia sesión"
    description="Entra con tu cuenta de Google para ver la iniciativa."
  )

  template(v-else)
    UAlert(
      v-if="errorMessage"
      color="error"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      :title="errorMessage"
    )

    .flex.items-center.justify-center.py-16(v-else-if="isLoading")
      UIcon.size-6.animate-spin.text-muted(name="i-lucide-loader-circle")

    template(v-else-if="initiative")
      //- Header: back, title, status, and Copy Context button
      .flex.flex-wrap.items-center.gap-3.pb-2.border-b.border-default
        UButton(
          to="/"
          icon="i-lucide-arrow-left"
          color="neutral"
          variant="ghost"
          aria-label="Volver al dashboard"
          square
        )
        h1.text-2xl.font-semibold.truncate {{ initiative.title }}
        UBadge(
          :color="statusBadge(initiative.status).color"
          :label="statusBadge(initiative.status).label"
          variant="subtle"
        )
        
        .ml-auto
          UButton(
            icon="i-lucide-copy"
            label="Copiar Contexto"
            color="primary"
            size="sm"
            @click="handleCopyContext"
          )

      UTabs(v-model="activeTab" :items="tabItems" variant="link" :ui="{ root: 'gap-4' }")
        template(#resumen)
          InitiativeSummary(:initiative="initiative")
        
        template(#conversations)
          ConversationsTab(:initiative-id="id")
        
        template(#requirements)
          RequirementsTab(:initiative-id="id")
        
        template(#insights)
          InsightsTab(:initiative-id="id")
        
        template(#artifacts)
          ArtifactsTab(:initiative-id="id")
        
        template(#metadata)
          RoadmapMetadataTab(:initiative="initiative" @updated="fetchInitiative")
</template>
