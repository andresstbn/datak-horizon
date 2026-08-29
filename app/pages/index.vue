<script setup lang="ts">
import type { Conversation } from '~~/shared/types/conversation'
import type { Requirement } from '~~/shared/types/requirement'
import type { InitiativeStatus, PriorityLevel } from '~~/shared/types/initiative'
import {
  statusBadge,
  healthBadge,
  priorityBadge,
  formatInitiativeDate,
  filterActiveInitiatives
} from '~~/shared/utils/initiatives'
import { conversationService } from '~/services/conversationService'
import { requirementService } from '~/services/requirementService'
import { initiativeService } from '~/services/initiativeService'

definePageMeta({ pageTitle: 'Horizon Dashboard' })

const { isAuthenticated, isAuthorized, isAccessDenied, deniedEmail, isReady, getIdToken, logout } = useAuth()
const {
  isLoading: isInitiativesLoading,
  errorMessage: initiativesError,
  users,
  fetchInitiatives,
  fetchUsers,
  items: initiativesList
} = useInitiatives()

const dashboardSubTab = useState<'initiatives' | 'conversations' | 'requirements'>('home:dashboardSubTab', () => 'initiatives')
const createOpen = ref(false)
const isSubmitting = ref(false)
const initiativeSearch = ref('')

const newInitiative = ref({
  title: '',
  description: ''
})

const recentConversations = ref<(Conversation & { initiativeTitle?: string })[]>([])
const refiningRequirements = ref<(Requirement & { initiativeTitle?: string })[]>([])
const isDashboardLoading = ref(false)
const toast = useToast()

const ALL_STATUS_OPTIONS: { label: string, value: InitiativeStatus }[] = [
  { label: 'Descubrimiento', value: 'discovery' },
  { label: 'Refinamiento', value: 'refinement' },
  { label: 'Listo', value: 'ready' },
  { label: 'En desarrollo', value: 'in_development' },
  { label: 'QA', value: 'qa' },
  { label: 'Bloqueado', value: 'blocked' },
  { label: 'Desplegado', value: 'released' },
  { label: 'Cancelado', value: 'cancelled' }
]

const ALL_PRIORITY_OPTIONS: { label: string, value: PriorityLevel, badge: ReturnType<typeof priorityBadge> }[] = [
  { label: 'Alta', value: 'high', badge: priorityBadge('high') },
  { label: 'Media', value: 'medium', badge: priorityBadge('medium') },
  { label: 'Baja', value: 'low', badge: priorityBadge('low') }
]

// Exclude 'ready' by default so ready initiatives are hidden unless toggled
const DEFAULT_ACTIVE_STATUSES: InitiativeStatus[] = [
  'discovery',
  'refinement',
  'in_development',
  'qa',
  'blocked'
]

const selectedStatuses = useState<InitiativeStatus[]>(
  'dashboard:selectedStatuses',
  () => [...DEFAULT_ACTIVE_STATUSES]
)

const selectedTechnicalOwners = useState<string[]>('dashboard:selectedTechnicalOwners', () => [])
const selectedPriorities = useState<PriorityLevel[]>('dashboard:selectedPriorities', () => [])

const isReadyShown = computed({
  get: () => selectedStatuses.value.includes('ready'),
  set: (show: boolean) => {
    if (show && !selectedStatuses.value.includes('ready')) {
      selectedStatuses.value = [...selectedStatuses.value, 'ready']
    } else if (!show && selectedStatuses.value.includes('ready')) {
      selectedStatuses.value = selectedStatuses.value.filter(s => s !== 'ready')
    }
  }
})

function toggleReadyStatus() {
  isReadyShown.value = !isReadyShown.value
}

function selectAllStatuses() {
  selectedStatuses.value = ALL_STATUS_OPTIONS.map(opt => opt.value)
}

function selectDefaultActive() {
  selectedStatuses.value = [...DEFAULT_ACTIVE_STATUSES]
}

function toggleStatus(status: InitiativeStatus) {
  if (selectedStatuses.value.includes(status)) {
    selectedStatuses.value = selectedStatuses.value.filter(s => s !== status)
  } else {
    selectedStatuses.value = [...selectedStatuses.value, status]
  }
}

function togglePriority(priority: PriorityLevel) {
  if (selectedPriorities.value.includes(priority)) {
    selectedPriorities.value = selectedPriorities.value.filter(p => p !== priority)
  } else {
    selectedPriorities.value = [...selectedPriorities.value, priority]
  }
}

function toggleTechnicalOwner(ownerId: string) {
  if (selectedTechnicalOwners.value.includes(ownerId)) {
    selectedTechnicalOwners.value = selectedTechnicalOwners.value.filter(id => id !== ownerId)
  } else {
    selectedTechnicalOwners.value = [...selectedTechnicalOwners.value, ownerId]
  }
}

const statusCounts = computed(() => {
  const counts: Record<InitiativeStatus, number> = {
    discovery: 0,
    refinement: 0,
    ready: 0,
    in_development: 0,
    qa: 0,
    released: 0,
    blocked: 0,
    cancelled: 0
  }
  for (const item of initiativesList.value) {
    if (item.status in counts) {
      counts[item.status]++
    }
  }
  return counts
})

const priorityCounts = computed(() => {
  const counts: Record<PriorityLevel, number> = { high: 0, medium: 0, low: 0 }
  for (const item of initiativesList.value) {
    if (item.priority in counts) {
      counts[item.priority]++
    }
  }
  return counts
})

const technicalOwnersList = computed(() => {
  const map = new Map<string, { id: string, name: string, photoUrl: string | null }>()
  for (const u of users.value) {
    map.set(u.id, {
      id: u.id,
      name: u.displayName || u.email,
      photoUrl: u.photoUrl
    })
  }
  for (const item of initiativesList.value) {
    if (item.technicalOwner && !map.has(item.technicalOwner.id)) {
      map.set(item.technicalOwner.id, {
        id: item.technicalOwner.id,
        name: item.technicalOwner.displayName || item.technicalOwner.email,
        photoUrl: item.technicalOwner.photoUrl
      })
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
})

const technicalOwnerCounts = computed(() => {
  const counts: Record<string, number> = { unassigned: 0 }
  for (const item of initiativesList.value) {
    if (item.technicalOwner) {
      counts[item.technicalOwner.id] = (counts[item.technicalOwner.id] || 0) + 1
    } else {
      counts.unassigned = (counts.unassigned ?? 0) + 1
    }
  }
  return counts
})

function getOwnerName(ownerId: string): string {
  if (ownerId === 'unassigned') return 'Sin asignar'
  const found = technicalOwnersList.value.find(u => u.id === ownerId)
  return found ? found.name : ownerId
}

function selectAllTechnicalOwners() {
  selectedTechnicalOwners.value = ['unassigned', ...technicalOwnersList.value.map(o => o.id)]
}

const isStatusFiltered = computed(() => {
  if (selectedStatuses.value.length !== DEFAULT_ACTIVE_STATUSES.length) return true
  return !DEFAULT_ACTIVE_STATUSES.every(s => selectedStatuses.value.includes(s))
})

const hasActiveFilters = computed(() => {
  return (
    initiativeSearch.value.trim() !== ''
    || isStatusFiltered.value
    || selectedTechnicalOwners.value.length > 0
    || selectedPriorities.value.length > 0
  )
})

function resetAllFilters() {
  initiativeSearch.value = ''
  selectedStatuses.value = [...DEFAULT_ACTIVE_STATUSES]
  selectedTechnicalOwners.value = []
  selectedPriorities.value = []
}

// Filtered active initiatives based on selected statuses, search term, technical owners, and priorities
const activeInitiatives = computed(() =>
  filterActiveInitiatives(
    initiativesList.value,
    selectedStatuses.value,
    initiativeSearch.value,
    selectedTechnicalOwners.value,
    selectedPriorities.value
  )
)

const dashboardTabItems = computed(() => [
  {
    label: `Iniciativas Activas (${activeInitiatives.value.length})`,
    value: 'initiatives',
    icon: 'i-lucide-rocket'
  },
  {
    label: `Conversaciones Recientes (${recentConversations.value.length})`,
    value: 'conversations',
    icon: 'i-lucide-messages-square'
  },
  {
    label: `Requerimientos en Refinamiento (${refiningRequirements.value.length})`,
    value: 'requirements',
    icon: 'i-lucide-list-todo'
  }
])

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

async function handleCopyLink(id: string) {
  try {
    const url = `${window.location.origin}/iniciativas/${id}`
    await navigator.clipboard.writeText(url)
    toast.add({
      title: 'Enlace copiado',
      description: 'El enlace de la iniciativa se copió al portapapeles.',
      icon: 'i-lucide-check'
    })
  } catch {
    toast.add({
      title: 'Error',
      description: 'No se pudo copiar el enlace al portapapeles.',
      color: 'error',
      icon: 'i-lucide-triangle-alert'
    })
  }
}

watch(
  () => isAuthorized.value,
  async (authorized) => {
    if (authorized) {
      await Promise.all([
        fetchInitiatives(),
        fetchUsers(),
        fetchDashboardData()
      ])
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

  .space-y-4(v-else-if="isAccessDenied")
    UAlert(
      color="error"
      variant="subtle"
      icon="i-lucide-shield-alert"
      title="Acceso restringido"
      :description="`Tu cuenta de Google (${deniedEmail ?? 'autenticada'}) no está autorizada para acceder a Datak Horizon. Si necesitas acceso, solicita autorización al equipo de administración.`"
    )
    .flex.justify-start
      UButton(
        icon="i-lucide-log-out"
        label="Cerrar sesión"
        color="neutral"
        variant="outline"
        @click="logout"
      )

  template(v-else-if="isAuthorized")
    //- Top Navigation and Actions
    .flex.flex-wrap.items-center.justify-between.gap-4.pb-4.border-b.border-default
      .space-y-1
        h1.text-3xl.font-bold.tracking-tight Datak Horizon
        p.text-sm.text-muted Plataforma de refinamiento colaborativo y preparación para IA.

      .flex.items-center.gap-3
        UButton(
          icon="i-lucide-plus"
          label="Nueva Iniciativa"
          color="primary"
          @click="createOpen = true"
        )

    .space-y-4
      //- Main horizontal tabs for dashboard sections
      UTabs(
        v-model="dashboardSubTab"
        :items="dashboardTabItems"
        variant="link"
        :ui="{ root: 'gap-4' }"
      )

      //- TAB 1: INICIATIVAS ACTIVAS (Full Width)
      template(v-if="dashboardSubTab === 'initiatives'")
        UPageCard
          template(#header)
            //- Toolbar / Barrita de tareas
            .flex.flex-col.gap-3.w-full
              .flex.flex-wrap.items-center.justify-between.gap-3.w-full
                .flex.flex-wrap.items-center.gap-2
                  //- Search box
                  UInput(
                    v-model="initiativeSearch"
                    placeholder="Buscar iniciativa..."
                    icon="i-lucide-search"
                    size="sm"
                    class="w-56 sm:w-64"
                  )

                  //- Show/Hide Ready (Listas) Toolbar Action Button
                  UButton(
                    :icon="isReadyShown ? 'i-lucide-eye' : 'i-lucide-eye-off'"
                    :label="isReadyShown ? 'Ocultar listas' : 'Mostrar listas'"
                    :color="isReadyShown ? 'primary' : 'neutral'"
                    :variant="isReadyShown ? 'subtle' : 'outline'"
                    size="sm"
                    @click="toggleReadyStatus"
                  )
                    template(#trailing)
                      UBadge(
                        :label="String(statusCounts.ready || 0)"
                        size="xs"
                        :color="isReadyShown ? 'primary' : 'neutral'"
                        variant="subtle"
                      )

                  //- Reset Filters Button (visible when filters are active)
                  UButton(
                    v-if="hasActiveFilters"
                    icon="i-lucide-rotate-ccw"
                    label="Restablecer filtros"
                    color="neutral"
                    variant="ghost"
                    size="sm"
                    @click="resetAllFilters"
                  )

                .flex.items-center.gap-2.text-xs.text-muted
                  span Mostrando {{ activeInitiatives.length }} de {{ initiativesList.length }} iniciativas

              //- Active filter chips row
              .flex.flex-wrap.items-center.pt-1.border-t.border-default(v-if="hasActiveFilters" class="gap-1.5")
                span.text-xs.text-muted.font-medium Filtros activos:

                //- Priority Chips
                UBadge(
                  v-for="p in selectedPriorities"
                  :key="`prio-${p}`"
                  size="xs"
                  color="primary"
                  variant="subtle"
                  class="gap-1 cursor-pointer"
                  @click="togglePriority(p)"
                )
                  span Prioridad: {{ priorityBadge(p).label }}
                  UIcon.size-3(name="i-lucide-x")

                //- Technical Owner Chips
                UBadge(
                  v-for="ownerId in selectedTechnicalOwners"
                  :key="`owner-${ownerId}`"
                  size="xs"
                  color="primary"
                  variant="subtle"
                  class="gap-1 cursor-pointer"
                  @click="toggleTechnicalOwner(ownerId)"
                )
                  span Resp: {{ getOwnerName(ownerId) }}
                  UIcon.size-3(name="i-lucide-x")

                //- Status Chip (if modified from default active)
                UBadge(
                  v-if="isStatusFiltered"
                  size="xs"
                  color="primary"
                  variant="subtle"
                  class="gap-1 cursor-pointer"
                  @click="selectDefaultActive"
                )
                  span Estados ({{ selectedStatuses.length }})
                  UIcon.size-3(name="i-lucide-x")

                //- Search Chip
                UBadge(
                  v-if="initiativeSearch.trim()"
                  size="xs"
                  color="primary"
                  variant="subtle"
                  class="gap-1 cursor-pointer"
                  @click="initiativeSearch = ''"
                )
                  span "{{ initiativeSearch }}"
                  UIcon.size-3(name="i-lucide-x")

          //- Initiatives list body
          .space-y-4
            .flex.items-center.justify-center.py-12(v-if="isInitiativesLoading")
              UIcon.size-6.animate-spin.text-muted(name="i-lucide-loader-circle")

            .text-center.py-12.space-y-3(v-else-if="activeInitiatives.length === 0")
              UIcon.size-8.text-muted.mx-auto(name="i-lucide-folder-search")
              p.text-sm.text-dimmed No hay iniciativas con los filtros aplicados.
              .flex.items-center.justify-center.gap-2
                UButton(
                  v-if="!isReadyShown && statusCounts.ready > 0"
                  label="Mostrar iniciativas listas"
                  icon="i-lucide-eye"
                  size="xs"
                  color="primary"
                  variant="soft"
                  @click="toggleReadyStatus"
                )
                UButton(
                  label="Restablecer filtros"
                  size="xs"
                  color="neutral"
                  variant="outline"
                  @click="resetAllFilters"
                )

            //- Columnar Table Layout for Active Initiatives
            .overflow-x-auto(v-else)
              .min-w-full.inline-block.align-middle
                .border.border-default.rounded-lg.overflow-hidden
                  //- Table Header
                  .grid.items-center.gap-3.px-4.py-2.bg-muted.border-b.border-default.text-xs.font-semibold.text-muted(
                    class="bg-opacity-40 min-w-[760px] grid-cols-[1fr_120px_170px_140px_100px_70px]"
                  )
                    span Iniciativa

                    //- Prioridad Column Header Filter
                    .flex.justify-center
                      UPopover
                        button.flex.items-center.gap-1.transition.rounded(
                          type="button"
                          class="px-1.5 py-0.5"
                          :class="selectedPriorities.length > 0 ? 'text-primary font-bold bg-primary/10' : 'text-muted hover:text-foreground hover:bg-elevated/60'"
                        )
                          span Prioridad
                          UBadge(
                            v-if="selectedPriorities.length > 0"
                            :label="String(selectedPriorities.length)"
                            size="xs"
                            color="primary"
                            variant="subtle"
                          )
                          UIcon.size-3(
                            :name="selectedPriorities.length > 0 ? 'i-lucide-filter' : 'i-lucide-chevron-down'"
                            :class="selectedPriorities.length > 0 ? 'text-primary' : 'text-dimmed'"
                          )
                        template(#content)
                          .p-3.space-y-3.w-56
                            .flex.items-center.justify-between.border-b.border-default.pb-2
                              span.text-xs.font-semibold Filtrar prioridad
                              .flex.items-center.gap-1
                                UButton(v-if="selectedPriorities.length > 0" label="Limpiar" size="xs" variant="ghost" color="neutral" @click="selectedPriorities = []")
                                UButton(v-else label="Todas" size="xs" variant="ghost" color="neutral" @click="selectedPriorities = ALL_PRIORITY_OPTIONS.map(p => p.value)")

                            .space-y-2
                              .flex.items-center.justify-between(v-for="p in ALL_PRIORITY_OPTIONS" :key="p.value")
                                UCheckbox(
                                  :model-value="selectedPriorities.includes(p.value)"
                                  size="sm"
                                  @update:model-value="togglePriority(p.value)"
                                )
                                  template(#label)
                                    UBadge(:color="p.badge.color" :label="p.badge.label" size="xs" variant="subtle")
                                span.text-xs.text-muted {{ priorityCounts[p.value] || 0 }}

                    //- Resp. Técnico Column Header Filter
                    .flex.justify-start
                      UPopover
                        button.flex.items-center.gap-1.transition.rounded(
                          type="button"
                          class="px-1.5 py-0.5"
                          :class="selectedTechnicalOwners.length > 0 ? 'text-primary font-bold bg-primary/10' : 'text-muted hover:text-foreground hover:bg-elevated/60'"
                        )
                          span Resp. Técnico
                          UBadge(
                            v-if="selectedTechnicalOwners.length > 0"
                            :label="String(selectedTechnicalOwners.length)"
                            size="xs"
                            color="primary"
                            variant="subtle"
                          )
                          UIcon.size-3(
                            :name="selectedTechnicalOwners.length > 0 ? 'i-lucide-filter' : 'i-lucide-chevron-down'"
                            :class="selectedTechnicalOwners.length > 0 ? 'text-primary' : 'text-dimmed'"
                          )
                        template(#content)
                          .p-3.space-y-3.w-72.max-h-80.overflow-y-auto
                            .flex.items-center.justify-between.border-b.border-default.pb-2
                              span.text-xs.font-semibold Filtrar resp. técnico
                              .flex.items-center.gap-1
                                UButton(v-if="selectedTechnicalOwners.length > 0" label="Limpiar" size="xs" variant="ghost" color="neutral" @click="selectedTechnicalOwners = []")
                                UButton(v-else label="Todos" size="xs" variant="ghost" color="neutral" @click="selectAllTechnicalOwners")

                            .space-y-2
                              //- Sin asignar
                              .flex.items-center.justify-between
                                UCheckbox(
                                  :model-value="selectedTechnicalOwners.includes('unassigned')"
                                  size="sm"
                                  @update:model-value="toggleTechnicalOwner('unassigned')"
                                )
                                  template(#label)
                                    .flex.items-center(class="gap-1.5")
                                      UIcon.text-muted(name="i-lucide-user-x" class="size-3.5")
                                      span.text-xs Sin asignar
                                span.text-xs.text-muted {{ technicalOwnerCounts.unassigned || 0 }}

                              .border-t.border-default.my-1(v-if="technicalOwnersList.length > 0")

                              //- Users
                              .flex.items-center.justify-between(v-for="owner in technicalOwnersList" :key="owner.id")
                                UCheckbox(
                                  :model-value="selectedTechnicalOwners.includes(owner.id)"
                                  size="sm"
                                  @update:model-value="toggleTechnicalOwner(owner.id)"
                                )
                                  template(#label)
                                    .flex.items-center.min-w-0(class="gap-1.5")
                                      UAvatar(
                                        :src="owner.photoUrl ?? undefined"
                                        :alt="owner.name"
                                        size="2xs"
                                      )
                                      span.text-xs.truncate(class="max-w-[140px]") {{ owner.name }}
                                span.text-xs.text-muted {{ technicalOwnerCounts[owner.id] || 0 }}

                    //- Estado Column Header Filter
                    .flex.justify-center
                      UPopover
                        button.flex.items-center.gap-1.transition.rounded(
                          type="button"
                          class="px-1.5 py-0.5"
                          :class="isStatusFiltered ? 'text-primary font-bold bg-primary/10' : 'text-muted hover:text-foreground hover:bg-elevated/60'"
                        )
                          span Estado
                          UBadge(
                            v-if="selectedStatuses.length !== ALL_STATUS_OPTIONS.length"
                            :label="String(selectedStatuses.length)"
                            size="xs"
                            color="primary"
                            variant="subtle"
                          )
                          UIcon.size-3(
                            :name="isStatusFiltered ? 'i-lucide-filter' : 'i-lucide-chevron-down'"
                            :class="isStatusFiltered ? 'text-primary' : 'text-dimmed'"
                          )
                        template(#content)
                          .p-3.space-y-3.w-64
                            .flex.items-center.justify-between.border-b.border-default.pb-2
                              span.text-xs.font-semibold Filtrar estados
                              .flex.items-center.gap-1
                                UButton(label="Sin Listas" size="xs" variant="ghost" color="neutral" @click="selectDefaultActive")
                                UButton(label="Todos" size="xs" variant="ghost" color="neutral" @click="selectAllStatuses")

                            .space-y-2
                              .flex.items-center.justify-between(v-for="opt in ALL_STATUS_OPTIONS" :key="opt.value")
                                UCheckbox(
                                  :model-value="selectedStatuses.includes(opt.value)"
                                  :label="opt.label"
                                  size="sm"
                                  @update:model-value="toggleStatus(opt.value)"
                                )
                                UBadge(
                                  :color="statusBadge(opt.value).color"
                                  :label="String(statusCounts[opt.value] || 0)"
                                  size="xs"
                                  variant="subtle"
                                )

                    span.text-center Salud
                    span

                  //- Table Rows
                  ul.divide-y.divide-default(class="min-w-[760px]")
                    li.transition(
                      class="hover:bg-elevated/40 px-4 py-3"
                      v-for="item in activeInitiatives"
                      :key="item.id"
                    )
                      .grid.items-center.gap-3(class="grid-cols-[1fr_120px_170px_140px_100px_70px]")
                        //- Iniciativa Column
                        .min-w-0.pr-2(class="space-y-0.5")
                          .flex.items-center.gap-2.flex-wrap
                            ULink.font-semibold.text-sm.text-foreground(
                              class="hover:underline hover:text-primary"
                              :to="`/iniciativas/${item.id}`"
                            ) {{ item.title }}
                            span.text-xs.text-dimmed(v-if="item.createdAt") · Creada el {{ formatInitiativeDate(item.createdAt) }}

                          p.text-xs.text-muted.line-clamp-1(v-if="item.description") {{ item.description }}

                        //- Prioridad Column
                        .flex.justify-center
                          InitiativePriorityBadge(
                            :priority="item.priority"
                            :initiative-id="item.id"
                          )

                        //- Resp. Técnico Column (Technical Owner)
                        .flex.justify-start
                          InitiativeOwnerSelect(
                            :owner="item.technicalOwner"
                            :initiative-id="item.id"
                            field="technicalOwnerId"
                          )

                        //- Estado Column
                        .flex.justify-center
                          InitiativeStatusBadge(
                            :status="item.status"
                            :initiative-id="item.id"
                            :initiative-title="item.title"
                            @updated="fetchDashboardData"
                          )

                        //- Salud Column
                        .flex.justify-center
                          UBadge(
                            :color="healthBadge(item.health).color"
                            :label="healthBadge(item.health).label"
                            size="sm"
                            variant="subtle"
                          )

                        //- Acción Column
                        .flex.items-center.justify-end.gap-1
                          UButton(
                            icon="i-lucide-link"
                            color="neutral"
                            variant="ghost"
                            size="xs"
                            aria-label="Copiar enlace"
                            @click="handleCopyLink(item.id)"
                          )
                          UButton(
                            icon="i-lucide-chevron-right"
                            color="neutral"
                            variant="ghost"
                            size="xs"
                            :to="`/iniciativas/${item.id}`"
                            aria-label="Ver iniciativa"
                          )

      //- TAB 2: CONVERSACIONES RECIENTES (Full Width)
      template(v-else-if="dashboardSubTab === 'conversations'")
        UPageCard(title="Conversaciones Recientes")
          template(#description)
            p.text-xs.text-muted Historial de hilos de discusión y acuerdos en todas las iniciativas.

          .space-y-4
            .flex.items-center.justify-center.py-12(v-if="isDashboardLoading")
              UIcon.size-6.animate-spin.text-muted(name="i-lucide-loader-circle")

            p.text-sm.text-dimmed.text-center.py-12(v-else-if="recentConversations.length === 0") Sin conversaciones registradas.

            ul.divide-y.divide-default(v-else)
              li.transition(
                class="py-3.5 first:pt-0 last:pb-0 hover:bg-elevated/40 rounded-lg px-2"
                v-for="conv in recentConversations"
                :key="conv.id"
              )
                .flex.items-center.justify-between.gap-3
                  .min-w-0.space-y-1.flex-1
                    .flex.items-center.gap-2.flex-wrap
                      ULink.font-semibold.text-base.text-foreground(
                        class="hover:underline hover:text-primary"
                        :to="`/iniciativas/${conv.initiativeId}?tab=conversations`"
                      ) {{ conv.title }}
                      UBadge(color="neutral" variant="subtle" size="xs") {{ conv.source }}
                    p.text-xs.text-muted
                      | Iniciativa:
                      span.font-medium.text-foreground {{ ` ${conv.initiativeTitle || '—'} ` }}

                  UButton(
                    icon="i-lucide-arrow-right"
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    :to="`/iniciativas/${conv.initiativeId}?tab=conversations`"
                  )

      //- TAB 3: REQUERIMIENTOS EN REFINAMIENTO (Full Width)
      template(v-else-if="dashboardSubTab === 'requirements'")
        UPageCard(title="Requerimientos en Refinamiento")
          template(#description)
            p.text-xs.text-muted Tareas y funcionalidades pendientes de maduración técnica y funcional.

          .space-y-4
            .flex.items-center.justify-center.py-12(v-if="isDashboardLoading")
              UIcon.size-6.animate-spin.text-muted(name="i-lucide-loader-circle")

            p.text-sm.text-dimmed.text-center.py-12(v-else-if="refiningRequirements.length === 0") Sin requerimientos en refinamiento.

            ul.divide-y.divide-default(v-else)
              li.transition(
                class="py-3.5 first:pt-0 last:pb-0 hover:bg-elevated/40 rounded-lg px-2"
                v-for="req in refiningRequirements"
                :key="req.id"
              )
                .flex.items-center.justify-between.gap-3
                  .min-w-0.space-y-1.flex-1
                    .flex.items-center.gap-2.flex-wrap
                      ULink.font-semibold.text-base.text-foreground(
                        class="hover:underline hover:text-primary"
                        :to="`/iniciativas/${req.initiativeId}?tab=requirements`"
                      ) {{ req.title }}
                    p.text-xs.text-muted
                      | Iniciativa:
                      span.font-medium.text-foreground {{ ` ${req.initiativeTitle || '—'} ` }}

                  .flex.items-center.gap-3.shrink-0
                    UBadge(
                      :color="priorityBadge(req.priority).color"
                      :label="priorityBadge(req.priority).label"
                      size="sm"
                      variant="subtle"
                    )
                    UButton(
                      icon="i-lucide-arrow-right"
                      color="neutral"
                      variant="ghost"
                      size="xs"
                      :to="`/iniciativas/${req.initiativeId}?tab=requirements`"
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
