<script setup lang="ts">
import { useInitiatives } from '~/composables/useInitiatives'
import { formatInitiativeDate, statusBadge, healthBadge } from '~~/shared/utils/initiatives'

definePageMeta({ pageTitle: 'Línea de Tiempo' })

const { isReady, isAuthenticated, isAuthorized, isAccessDenied, deniedEmail, logout } = useAuth()
const { items: initiatives, isLoading, errorMessage, fetchInitiatives } = useInitiatives()

interface Week {
  monday: Date
  label: string
}

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
  if (initiatives.value.length === 0) {
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

  const parsedItems = initiatives.value.map((item) => {
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
  (authorized) => {
    if (authorized) {
      fetchInitiatives()
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

    .flex.items-center.justify-center.py-16(v-if="isLoading")
      UIcon.size-6.animate-spin.text-muted(name="i-lucide-loader-circle")

    UAlert(
      v-else-if="errorMessage"
      color="error"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      :title="errorMessage"
    )

    .text-center.py-16.border.border-dashed.border-default.rounded-xl(v-else-if="processedInitiatives.length === 0")
      UIcon.size-8.text-dimmed(name="i-lucide-calendar")
      p.text-sm.text-dimmed.mt-2 No hay iniciativas para mostrar en la línea de tiempo.

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
