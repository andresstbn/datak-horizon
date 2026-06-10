<script setup lang="ts">
import { statusBadge, healthBadge, priorityBadge } from '~~/shared/utils/initiatives'
import { conversationService } from '~/services/conversationService'
import { requirementService } from '~/services/requirementService'
import { initiativeService } from '~/services/initiativeService'

definePageMeta({ pageTitle: 'Horizon Dashboard' })

const { isAuthenticated, isReady, getIdToken } = useAuth()
const {
  isLoading: isInitiativesLoading,
  errorMessage: initiativesError,
  filters,
  page,
  filtered,
  paginated,
  owners,
  fetchInitiatives,
  items: initiativesList
} = useInitiatives()

const activeTab = useState<'dashboard' | 'roadmap'>('home:activeTab', () => 'dashboard')
const createOpen = ref(false)
const isSubmitting = ref(false)

const newInitiative = ref({
  title: '',
  description: ''
})

const recentConversations = ref<any[]>([])
const refiningRequirements = ref<any[]>([])
const isDashboardLoading = ref(false)
const toast = useToast()

async function fetchDashboardData() {
  const token = await getIdToken()
  if (!token) return
  isDashboardLoading.value = true
  try {
    const [convs, reqs] = await Promise.all([
      conversationService.listRecent(token),
      requirementService.listRefining(token)
    ])
    recentConversations.value = convs
    refiningRequirements.value = reqs
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
  } finally {
    isDashboardLoading.value = false
  }
}

// Active initiatives helper
const activeInitiatives = computed(() => {
  return initiativesList.value.filter(
    (item) => !['released', 'cancelled'].includes(item.status)
  )
})

async function handleCreate() {
  if (!newInitiative.value.title.trim()) {
    toast.add({
      title: 'Validación',
      description: 'El título es obligatorio.',
      color: 'error',
      icon: 'i-lucide-triangle-alert'
    })
    return
  }

  const token = await getIdToken()
  if (!token) return

  isSubmitting.value = true
  try {
    await initiativeService.create(token, {
      title: newInitiative.value.title.trim(),
      description: newInitiative.value.description.trim() || null
    })
    toast.add({
      title: 'Iniciativa creada',
      description: 'La iniciativa se ha registrado exitosamente.',
      icon: 'i-lucide-check'
    })
    createOpen.value = false
    newInitiative.value = { title: '', description: '' }
    
    // Refresh lists
    await fetchInitiatives()
    await fetchDashboardData()
  } catch (error) {
    toast.add({
      title: 'Error',
      description: 'No se pudo crear la iniciativa.',
      color: 'error',
      icon: 'i-lucide-triangle-alert'
    })
  } finally {
    isSubmitting.value = false
  }
}

watch(
  () => isAuthenticated.value,
  async (authed) => {
    if (authed) {
      await fetchInitiatives()
      await fetchDashboardData()
    }
  },
  { immediate: true }
)
</script>

<template lang="pug">
.space-y-6
  //- Loader while auth state is resolving
  .flex.items-center.justify-center.py-16(v-if="!isReady")
    UIcon.size-6.animate-spin.text-muted(name="i-lucide-loader-circle")

  UAlert(
    v-else-if="!isAuthenticated"
    color="neutral"
    variant="subtle"
    icon="i-lucide-lock"
    title="Inicia sesión"
    description="Entra con tu cuenta de Google para acceder a Datak Horizon."
  )

  template(v-else)
    //- Top Navigation and Actions
    .flex.flex-wrap.items-center.justify-between.gap-4.pb-4.border-b.border-default
      .space-y-1
        h1.text-3xl.font-bold.tracking-tight Datak Horizon
        p.text-sm.text-muted Plataforma de refinamiento colaborativo y preparación para IA.

      .flex.items-center.gap-3
        UFieldGroup(size="sm")
          UButton(
            icon="i-lucide-layout-dashboard"
            label="Dashboard"
            :color="activeTab === 'dashboard' ? 'primary' : 'neutral'"
            :variant="activeTab === 'dashboard' ? 'solid' : 'outline'"
            @click="activeTab = 'dashboard'"
          )
          UButton(
            icon="i-lucide-map"
            label="Roadmap"
            :color="activeTab === 'roadmap' ? 'primary' : 'neutral'"
            :variant="activeTab === 'roadmap' ? 'solid' : 'outline'"
            @click="activeTab = 'roadmap'"
          )

        UButton(
          icon="i-lucide-plus"
          label="Nueva Iniciativa"
          color="primary"
          @click="createOpen = true"
        )

    //- 1. DASHBOARD VIEW
    template(v-if="activeTab === 'dashboard'")
      .grid.grid-cols-1.gap-6(class="lg:grid-cols-3")
        //- Column 1: Active Initiatives
        UPageCard(title="Iniciativas Activas")
          template(#description)
            p.text-xs.text-muted Esfuerzos en curso (excluye completados/cancelados).
          
          .space-y-4
            .flex.items-center.justify-center.py-8(v-if="isInitiativesLoading")
              UIcon.size-5.animate-spin.text-muted(name="i-lucide-loader-circle")
            
            p.text-sm.text-dimmed(v-else-if="activeInitiatives.length === 0") Sin iniciativas activas.
            
            ul.divide-y.divide-default(v-else)
              li.py-3(class="first:pt-0 last:pb-0" v-for="item in activeInitiatives" :key="item.id")
                .flex.items-start.justify-between.gap-3
                  .min-w-0.space-y-1
                    ULink.font-semibold.text-sm(class="hover:underline" :to="`/iniciativas/${item.id}`") {{ item.title }}
                    p.text-xs.text-muted.truncate(v-if="item.description") {{ item.description }}
                  .flex.flex-col.items-end.gap-1.shrink-0
                    UBadge(
                      :color="statusBadge(item.status).color"
                      :label="statusBadge(item.status).label"
                      size="sm"
                      variant="subtle"
                    )
                    UBadge(
                      :color="healthBadge(item.health).color"
                      :label="healthBadge(item.health).label"
                      size="sm"
                      variant="subtle"
                    )

        //- Column 2: Recent Conversations
        UPageCard(title="Conversaciones Recientes")
          template(#description)
            p.text-xs.text-muted Los hilos de discusión más recientes.
          
          .space-y-4
            .flex.items-center.justify-center.py-8(v-if="isDashboardLoading")
              UIcon.size-5.animate-spin.text-muted(name="i-lucide-loader-circle")
            
            p.text-sm.text-dimmed(v-else-if="recentConversations.length === 0") Sin conversaciones registradas.
            
            ul.divide-y.divide-default(v-else)
              li.py-3(class="first:pt-0 last:pb-0" v-for="conv in recentConversations" :key="conv.id")
                .space-y-1
                  .flex.items-center.justify-between.gap-2
                    ULink.font-semibold.text-sm(class="hover:underline" :to="`/iniciativas/${conv.initiativeId}?tab=conversations`") {{ conv.title }}
                    UBadge(color="neutral" variant="subtle" size="sm") {{ conv.source }}
                  p.text-xs.text-muted
                    | Iniciativa: 
                    span.font-medium {{ conv.initiativeTitle || '—' }}

        //- Column 3: Requirements in Refinement
        UPageCard(title="Requerimientos en Refinamiento")
          template(#description)
            p.text-xs.text-muted Tareas y funcionalidades pendientes de maduración.
          
          .space-y-4
            .flex.items-center.justify-center.py-8(v-if="isDashboardLoading")
              UIcon.size-5.animate-spin.text-muted(name="i-lucide-loader-circle")
            
            p.text-sm.text-dimmed(v-else-if="refiningRequirements.length === 0") Sin requerimientos en refinamiento.
            
            ul.divide-y.divide-default(v-else)
              li.py-3(class="first:pt-0 last:pb-0" v-for="req in refiningRequirements" :key="req.id")
                .flex.items-start.justify-between.gap-3
                  .min-w-0.space-y-1
                    ULink.font-semibold.text-sm(class="hover:underline" :to="`/iniciativas/${req.initiativeId}?tab=requirements`") {{ req.title }}
                    p.text-xs.text-muted
                      | Iniciativa: 
                      span.font-medium {{ req.initiativeTitle || '—' }}
                  .flex.flex-col.items-end.gap-1.shrink-0
                    UBadge(
                      :color="priorityBadge(req.priority).color"
                      :label="priorityBadge(req.priority).label"
                      size="sm"
                      variant="subtle"
                    )

    //- 2. ROADMAP VIEW
    template(v-else)
      RoadmapView(
        v-model:filters="filters"
        v-model:page="page"
        :filtered="filtered"
        :paginated="paginated"
        :owners="owners"
        :loading="isInitiativesLoading"
        :error-message="initiativesError"
      )

    //- Create Initiative Slideover
    USlideover(v-model:open="createOpen" title="Nueva Iniciativa")
      template(#body)
        form.space-y-4(@submit.prevent="handleCreate")
          UFormField(label="Título" name="title" required)
            UInput(
              v-model="newInitiative.title"
              placeholder="Ej. IVA diferencial"
              autofocus
              class="w-full"
            )
          
          UFormField(label="Descripción" name="description")
            UTextarea(
              v-model="newInitiative.description"
              placeholder="Detalla el alcance general de esta iniciativa..."
              :rows="4"
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
              label="Crear Iniciativa"
              color="primary"
              :loading="isSubmitting"
            )
</template>
