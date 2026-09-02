<script setup lang="ts">
import { useInitiatives } from '~/composables/useInitiatives'
import type { InitiativeStatus, PriorityLevel } from '~~/shared/types/initiative'
import {
  formatInitiativeDate,
  statusBadge,
  healthBadge,
  priorityBadge,
  filterActiveInitiatives
} from '~~/shared/utils/initiatives'

definePageMeta({ pageTitle: 'Línea de Tiempo' })

const { isReady, isAuthenticated, isAuthorized, isAccessDenied, deniedEmail, logout } = useAuth()
const { items: initiatives, users, isLoading, errorMessage, fetchInitiatives, fetchUsers } = useInitiatives()

interface Week {
  monday: Date
  label: string
}

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

const DEFAULT_ACTIVE_STATUSES: InitiativeStatus[] = [
  'discovery',
  'refinement',
  'in_development',
  'qa',
  'blocked'
]

const initiativeSearch = ref('')
const selectedStatuses = useState<InitiativeStatus[]>(
  'timeline:selectedStatuses',
  () => [...DEFAULT_ACTIVE_STATUSES]
)
const selectedTechnicalOwners = useState<string[]>('timeline:selectedTechnicalOwners', () => [])
const selectedPriorities = useState<PriorityLevel[]>('timeline:selectedPriorities', () => [])

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
  for (const item of initiatives.value) {
    if (item.status in counts) {
      counts[item.status]++
    }
  }
  return counts
})

const priorityCounts = computed(() => {
  const counts: Record<PriorityLevel, number> = { high: 0, medium: 0, low: 0 }
  for (const item of initiatives.value) {
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
  for (const item of initiatives.value) {
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
  for (const item of initiatives.value) {
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

const filteredInitiatives = computed(() =>
  filterActiveInitiatives(
    initiatives.value,
    selectedStatuses.value,
    initiativeSearch.value,
    selectedTechnicalOwners.value,
    selectedPriorities.value
  )
)

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // adjust when day is sunday
  const monday = new Date(d.setDate(diff))
  monday.setHours(0, 0, 0, 0)
  return monday
}

// Generates the weeks between start date and end date
function generateWeeks(start: Date, end: Date): Week[] {
  const weeks: Week[] = []
  const current = getMonday(start)
  const last = getMonday(end)

  // Guard against infinite loop
  let safety = 0
  while (current <= last && safety < 104) {
    safety++
    const monday = new Date(current)
    const label = monday.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })
    weeks.push({ monday, label })
    current.setDate(current.getDate() + 7)
  }
  return weeks
}

// Compute the global timeline dates and values
const timelineData = computed(() => {
  if (filteredInitiatives.value.length === 0) {
    const start = getMonday(new Date())
    const end = new Date(start.getTime() + 12 * 7 * 24 * 60 * 60 * 1000)
    return {
      start,
      end,
      weeks: generateWeeks(start, end),
      processed: []
    }
  }

  // Find boundaries
  let earliest = new Date()
  let latest = new Date(earliest.getTime() + 4 * 7 * 24 * 60 * 60 * 1000)
  let firstFound = false

  const parsedItems = filteredInitiatives.value.map((item) => {
    const start = new Date(item.createdAt)

    // Use committedDate, fallback to estimatedDate, then targetDate, then 4 weeks from start
    let end = item.committedDate ? new Date(item.committedDate) : null
    if (!end && item.estimatedDate) end = new Date(item.estimatedDate)
    if (!end && item.targetDate) end = new Date(item.targetDate)
    if (!end) {
      end = new Date(start.getTime() + 28 * 24 * 60 * 60 * 1000)
    }

    if (!firstFound) {
      earliest = start
      latest = end
      firstFound = true
    } else {
      if (start < earliest) earliest = start
      if (end > latest) latest = end
    }

    return {
      ...item,
      start,
      end
    }
  })

  // Ensure minimum duration (6 weeks)
  const minDuration = 6 * 7 * 24 * 60 * 60 * 1000
  const startMonday = getMonday(earliest)
  let endSunday = new Date(getMonday(latest).getTime() + 7 * 24 * 60 * 60 * 1000) // end of the week

  if (endSunday.getTime() - startMonday.getTime() < minDuration) {
    endSunday = new Date(startMonday.getTime() + minDuration)
  }

  const weeks = generateWeeks(startMonday, endSunday)
  const totalDuration = endSunday.getTime() - startMonday.getTime()

  const processed = parsedItems.map((item) => {
    const leftTime = item.start.getTime() - startMonday.getTime()
    const duration = Math.max(
      3 * 24 * 60 * 60 * 1000, // min 3 days width for visibility
      item.end.getTime() - item.start.getTime()
    )

    const left = Math.max(0, Math.min(100, (leftTime / totalDuration) * 100))
    const width = Math.max(2, Math.min(100 - left, (duration / totalDuration) * 100))

    let targetPercent: number | null = null
    if (item.targetDate) {
      const targetTime = new Date(item.targetDate).getTime()
      targetPercent = Math.max(0, Math.min(100, ((targetTime - startMonday.getTime()) / totalDuration) * 100))
    }

    return {
      id: item.id,
      title: item.title,
      health: item.health,
      statusLabel: statusBadge(item.status).label,
      healthLabel: healthBadge(item.health).label,
      committedLabel: item.committedDate ? formatInitiativeDate(item.committedDate) : 'Sin fecha comprometida',
      targetLabel: item.targetDate ? formatInitiativeDate(item.targetDate) : 'No definida',
      bar: {
        left,
        width
      },
      targetPercent
    }
  })

  return {
    start: startMonday,
    end: endSunday,
    weeks,
    processed
  }
})

const weeks = computed(() => timelineData.value.weeks)
const processedInitiatives = computed(() => timelineData.value.processed)

const hoyPercent = computed(() => {
  const { start, end } = timelineData.value
  const t_s = start.getTime()
  const t_e = end.getTime()
  const t_d = t_e - t_s
  const now = new Date().getTime()
  if (now < t_s || now > t_e) return -1
  return ((now - t_s) / t_d) * 100
})

function getHealthColorClass(health: string): string {
  switch (health) {
    case 'on_track':
      return 'bg-success-600 dark:bg-success-500 hover:bg-success-700'
    case 'at_risk':
      return 'bg-warning-500 dark:bg-warning-400 hover:bg-warning-600'
    case 'off_track':
      return 'bg-error-600 dark:bg-error-500 hover:bg-error-700'
    default:
      return 'bg-primary-600 dark:bg-primary-500 hover:bg-primary-700'
  }
}

watch(
  () => isAuthorized.value,
  async (authorized) => {
    if (authorized) {
      await Promise.all([
        fetchInitiatives(),
        fetchUsers()
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
    //- Top Navigation Header
    .flex.flex-wrap.items-center.justify-between.gap-4.pb-4.border-b.border-default
      .space-y-1
        h1.text-3xl.font-bold.tracking-tight Línea de Tiempo (Gantt)
        p.text-sm.text-muted Cronograma y salud de las iniciativas usando sus fechas comprometidas.

    //- Filter Toolbar
    .flex.flex-col.gap-3.w-full.p-4.border.border-default.rounded-xl.bg-elevated
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

          //- Show/Hide Ready Toolbar Action Button
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

          //- Status Filter Popover
          UPopover
            UButton(
              icon="i-lucide-filter"
              :label="`Estado (${selectedStatuses.length})`"
              size="sm"
              :color="isStatusFiltered ? 'primary' : 'neutral'"
              :variant="isStatusFiltered ? 'subtle' : 'outline'"
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

          //- Priority Filter Popover
          UPopover
            UButton(
              :icon="selectedPriorities.length > 0 ? 'i-lucide-filter' : 'i-lucide-chevron-down'"
              :label="selectedPriorities.length > 0 ? `Prioridad (${selectedPriorities.length})` : 'Prioridad'"
              size="sm"
              :color="selectedPriorities.length > 0 ? 'primary' : 'neutral'"
              :variant="selectedPriorities.length > 0 ? 'subtle' : 'outline'"
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

          //- Technical Owner Filter Popover
          UPopover
            UButton(
              :icon="selectedTechnicalOwners.length > 0 ? 'i-lucide-filter' : 'i-lucide-chevron-down'"
              :label="selectedTechnicalOwners.length > 0 ? `Resp. Técnico (${selectedTechnicalOwners.length})` : 'Resp. Técnico'"
              size="sm"
              :color="selectedTechnicalOwners.length > 0 ? 'primary' : 'neutral'"
              :variant="selectedTechnicalOwners.length > 0 ? 'subtle' : 'outline'"
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

          //- Reset Filters Button
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
          span Mostrando {{ filteredInitiatives.length }} de {{ initiatives.length }} iniciativas

      //- Active filter chips row
      .flex.flex-wrap.items-center.pt-2.border-t.border-default(v-if="hasActiveFilters" class="gap-1.5")
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

        //- Status Chip
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

    .flex.items-center.justify-center.py-16(v-if="isLoading")
      UIcon.size-6.animate-spin.text-muted(name="i-lucide-loader-circle")

    UAlert(
      v-else-if="errorMessage"
      color="error"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      :title="errorMessage"
    )

    .text-center.py-16.border.border-dashed.border-default.rounded-xl.space-y-3(v-else-if="processedInitiatives.length === 0")
      UIcon.size-8.text-dimmed.mx-auto(name="i-lucide-calendar")
      p.text-sm.text-dimmed No hay iniciativas para mostrar con los filtros aplicados.
      .flex.items-center.justify-center.gap-2(v-if="hasActiveFilters")
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

    //- Gantt view container
    .flex.border.border-default.rounded-xl.overflow-hidden.bg-elevated(v-else class="max-w-full")
      //- Left Column: Initiative Titles
      .w-60.shrink-0.border-r.border-default.bg-elevated.z-10.flex.flex-col
        //- Title header
        .h-10.border-b.border-default.flex.items-center.px-4.text-xs.font-semibold.text-muted.bg-elevated Iniciativa

        //- Titles rows list
        .divide-y.divide-default.flex-1.bg-elevated
          .h-14.flex.items-center.px-4.text-sm.font-medium.bg-elevated(
            v-for="item in processedInitiatives"
            :key="item.id"
          )
            ULink.truncate(
              class="hover:underline hover:text-primary-600 dark:hover:text-primary-400 block w-full text-left"
              :to="`/iniciativas/${item.id}`"
            ) {{ item.title }}

      //- Right Column: Scrollable Timeline Grid
      .flex-1.overflow-x-auto(class="scrollbar-thin")
        //- Weeks Header
        .grid.sticky.top-0(
          class="h-10 border-b border-default text-xs font-semibold text-muted bg-elevated"
          :style="`grid-template-columns: repeat(${weeks.length}, 120px); width: ${weeks.length * 120}px;`"
        )
          .flex.items-center.justify-center.border-r.border-default.h-full(
            v-for="week in weeks"
            :key="week.label"
          )
            span {{ week.label }}

        //- Rows Grid
        .divide-y.divide-default.relative(
          class="w-max"
          :style="`width: ${weeks.length * 120}px;`"
        )
          //- Hoy vertical line
          .absolute.top-0.bottom-0.w-px.border-l-2.border-dashed.border-primary-500.z-10.pointer-events-none(
            v-if="hoyPercent >= 0 && hoyPercent <= 100"
            :style="`left: ${hoyPercent}%;`"
          )
            //- Floating "Hoy" badge
            .absolute.-top-5.bg-primary-600.text-white.font-bold.px-1.rounded.shadow.z-20(class="-translate-x-1/2 text-[9px] py-0.5")
              | Hoy

          .grid.relative(
            v-for="item in processedInitiatives"
            :key="item.id"
            class="h-14 hover:bg-default/5"
            :style="`grid-template-columns: repeat(${weeks.length}, 120px); width: ${weeks.length * 120}px;`"
          )
            //- Vertical grid dividers
            .border-r.border-default.h-full.opacity-30(
              v-for="week in weeks"
              :key="week.label"
            )

            //- Gantt Bar (wrapped in a standard div to ensure styling is applied)
            .absolute.top-3.h-8.pointer-events-auto(
              v-if="item.bar"
              :style="`left: ${item.bar.left}%; width: ${item.bar.width}%;`"
              class="z-0"
            )
              UTooltip(
                :text="`${item.title} | Fin: ${item.committedLabel} | Estado: ${item.statusLabel} | Salud: ${item.healthLabel}`"
                class="w-full h-full"
                :delay-duration="0"
              )
                ULink(
                  class="w-full h-full rounded-lg flex items-center px-3 text-xs font-semibold text-white shadow-sm hover:scale-[1.01] hover:shadow-md transition-all cursor-pointer truncate"
                  :to="`/iniciativas/${item.id}`"
                  :class="getHealthColorClass(item.health)"
                )
                  span.truncate {{ item.title }}

            //- Target Date Diamond Milestone (renders ◇ rotated square)
            .absolute.top-5.z-10.pointer-events-auto(
              v-if="item.targetPercent !== null && item.targetPercent >= 0 && item.targetPercent <= 100"
              :style="`left: ${item.targetPercent}%;`"
              class="-translate-x-1/2"
            )
              UTooltip(
                :text="`Hito / Fecha Objetivo: ${item.targetLabel}`"
                :delay-duration="0"
              )
                .w-4.h-4.rotate-45.border-2.border-primary-500.bg-white.flex.items-center.justify-center.shadow-sm.cursor-help(class="dark:bg-slate-900")
</template>
