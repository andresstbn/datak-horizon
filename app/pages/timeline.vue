<script setup lang="ts">
import { useInitiatives } from '~/composables/useInitiatives'
import { formatInitiativeDate, statusBadge, healthBadge } from '~~/shared/utils/initiatives'

definePageMeta({ pageTitle: 'Línea de Tiempo' })

const { isReady, isAuthenticated } = useAuth()
const { items: initiatives, isLoading, errorMessage, fetchInitiatives } = useInitiatives()

// Controles superiores (visuales)
const groupByOptions = [{ label: 'Mes', value: 'month' }, { label: 'Trimestre', value: 'quarter' }, { label: 'Año', value: 'year' }]
const selectedGroupBy = ref('month')

const scaleOptions = [{ label: 'Mes', value: 'month' }, { label: 'Trimestre', value: 'quarter' }]
const selectedScale = ref('month')

const currentYear = new Date().getFullYear()
const yearOptions = [
  { label: `${currentYear - 1}`, value: currentYear - 1 },
  { label: `${currentYear}`, value: currentYear },
  { label: `${currentYear + 1}`, value: currentYear + 1 }
]
const selectedYear = ref(currentYear)

// Límites de tiempo
const earliestDate = computed(() => {
  if (!initiatives.value.length) return new Date()
  let min = new Date(initiatives.value[0].createdAt)
  for (const item of initiatives.value) {
    const d = new Date(item.createdAt)
    if (d < min) min = d
  }
  return min
})

const latestDate = computed(() => {
  if (!initiatives.value.length) return new Date(Date.now() + 90 * 24 * 3600 * 1000)
  let max = new Date(initiatives.value[0].createdAt)
  for (const item of initiatives.value) {
    for (const dStr of [item.committedDate, item.estimatedDate, item.targetDate]) {
      if (dStr) {
        const d = new Date(dStr)
        if (d > max) max = d
      }
    }
  }
  return max
})

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d.setDate(diff))
  monday.setHours(0, 0, 0, 0)
  return monday
}

// Columnas de semanas (área de cuadrícula)
const timelineWeeks = computed(() => {
  const start = getMonday(earliestDate.value)
  const end = new Date(latestDate.value)
  end.setHours(23, 59, 59, 999)
  
  // Garantizar un rango mínimo visual (ej. 12 semanas)
  const diffTime = end.getTime() - start.getTime()
  if (diffTime < 12 * 7 * 24 * 3600 * 1000) {
    end.setTime(start.getTime() + 12 * 7 * 24 * 3600 * 1000)
  }

  const weeks = []
  let current = new Date(start)
  while (current <= end) {
    weeks.push({
      date: new Date(current),
      label: current.getDate() + ' ' + current.toLocaleDateString('es-ES', { month: 'short' }),
      month: current.getMonth(),
      year: current.getFullYear()
    })
    current.setDate(current.getDate() + 7)
  }
  return weeks
})

// Meses agrupando las semanas generadas
const timelineMonths = computed(() => {
  const months = []
  let currentM: any = null
  for (const w of timelineWeeks.value) {
    const mLabel = new Date(w.year, w.month, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
    if (!currentM || currentM.rawLabel !== mLabel) {
      if (currentM) months.push(currentM)
      const capLabel = mLabel.charAt(0).toUpperCase() + mLabel.slice(1)
      currentM = { rawLabel: mLabel, label: capLabel, weeksCount: 1 }
    } else {
      currentM.weeksCount++
    }
  }
  if (currentM) months.push(currentM)
  return months
})

// Función auxiliar para convertir fecha a % (left, width)
const totalDays = computed(() => {
  if (!timelineWeeks.value.length) return 1
  const start = timelineWeeks.value[0].date
  const lastWeek = timelineWeeks.value[timelineWeeks.value.length - 1].date
  const end = new Date(lastWeek)
  end.setDate(end.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
})

function getPercent(date: Date | string) {
  const d = new Date(date)
  const start = timelineWeeks.value[0].date
  const elapsed = (d.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  return Math.max(0, Math.min(100, (elapsed / totalDays.value) * 100))
}

// Inicializamos el badge "Hoy"
const hoyPercent = computed(() => {
  return getPercent(new Date())
})

// Procesamos las iniciativas con las métricas de % 
const processedInitiatives = computed(() => {
  return initiatives.value.map(item => {
    const start = new Date(item.createdAt)
    const committed = item.committedDate ? new Date(item.committedDate) : new Date(start.getTime() + 30 * 24 * 3600 * 1000)
    
    const left = getPercent(start)
    const committedRight = getPercent(committed)
    const width = Math.max(0.5, committedRight - left) // Ancho barra base
    
    let delayWidth = 0
    if (item.estimatedDate && item.committedDate) {
      const est = new Date(item.estimatedDate)
      if (est > committed) {
        const estRight = getPercent(est)
        delayWidth = Math.max(0, estRight - committedRight)
      }
    }
    
    return {
      ...item,
      barLeft: left,
      barWidth: width,
      delayLeft: committedRight,
      delayWidth,
      targetPercent: item.targetDate ? getPercent(item.targetDate) : null,
      statusBadgeInfo: statusBadge(item.status),
      healthBadgeInfo: healthBadge(item.health)
    }
  })
})

function getHealthColorClass(health: string) {
  switch (health) {
    case 'on_track': return 'bg-[#E6EDE6] border-[#5E7A63]'
    case 'at_risk': return 'bg-[#F2E9D8] border-[#B5894E]'
    case 'off_track': return 'bg-[#F0E2DE] border-[#A24B43]'
    default: return 'bg-[#F3EFE6] border-[#9C6B4E]' // clay base
  }
}

watch(
  () => isAuthenticated.value,
  (authed) => {
    if (authed) {
      fetchInitiatives()
    }
  },
  { immediate: true }
)
</script>

<template lang="pug">
.space-y-6
  //- Loader auth
  .flex.items-center.justify-center.py-16(v-if="!isReady")
    UIcon.text-muted(class="size-6 animate-spin" name="i-lucide-loader-circle")

  UAlert(
    v-else-if="!isAuthenticated"
    color="neutral"
    variant="subtle"
    icon="i-lucide-lock"
    title="Inicia sesión"
    description="Entra con tu cuenta de Google para acceder a Datak Horizon."
  )

  template(v-else)
    //- Top Navigation & Controls
    .flex.flex-col.gap-4.pb-4.border-b.border-default(class="md:flex-row md:items-center md:justify-between")
      .space-y-1
        h1.font-bold.tracking-tight(class="text-3xl") Línea de Tiempo (Gantt)
        p.text-sm.text-muted Cronograma ejecutivo de iniciativas, hitos comerciales y salud.

      //- Barra de herramientas
      .flex.items-center.gap-3.flex-wrap
        UFieldGroup
          UButton(label="Tabla" color="neutral" variant="subtle" @click="navigateTo('/')")
          UButton(label="Línea de tiempo" color="primary" variant="solid")
        
        .h-6.w-px.bg-gray-200(class="dark:bg-gray-800")
        
        USelect(v-model="selectedGroupBy" :options="groupByOptions" size="sm" icon="i-lucide-layers")
        USelect(v-model="selectedScale" :options="scaleOptions" size="sm" icon="i-lucide-calendar")
        USelect(v-model="selectedYear" :options="yearOptions" size="sm" icon="i-lucide-calendar-days")

    .flex.items-center.justify-center.py-16(v-if="isLoading")
      UIcon.text-muted(class="size-6 animate-spin" name="i-lucide-loader-circle")

    UAlert(
      v-else-if="errorMessage"
      color="error"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      :title="errorMessage"
    )

    .text-center.border.border-dashed.border-default.rounded-xl(class="py-16" v-else-if="processedInitiatives.length === 0")
      UIcon.text-dimmed(class="size-8" name="i-lucide-calendar")
      p.text-sm.text-dimmed.mt-2 No hay iniciativas para mostrar en el cronograma.

    //- Gantt view container
    .flex.border.border-default.rounded-xl.overflow-hidden.bg-white(v-else class="max-w-full")
      //- Columna Izquierda: Etiquetas de fila
      .shrink-0.border-r.border-default.bg-white.z-10.flex.flex-col(class="w-72 md:w-80")
        //- Cabecera vacía de la izquierda
        .border-b.border-default.flex.items-center.px-4.text-xs.font-semibold.text-muted.bg-white(class="h-16")
          span Iniciativa y Estado
        
        //- Lista de iniciativas
        .divide-y.divide-default.flex-1.bg-white
          .flex.items-center.px-4(
            v-for="item in processedInitiatives"
            :key="item.id"
            class="h-14 bg-white"
          )
            .flex.flex-col.overflow-hidden.w-full
              ULink.truncate(
                class="hover:underline hover:text-[#9C6B4E] dark:hover:text-[#9C6B4E] block w-full text-left font-medium text-sm text-gray-900 dark:text-gray-100"
                :to="`/iniciativas/${item.id}`"
              ) {{ item.title }}
              .flex.items-center.gap-2.mt-1
                UBadge(
                  :color="item.statusBadgeInfo.color"
                  variant="subtle"
                  size="xs"
                  class="py-0 px-1.5 text-[10px]"
                ) {{ item.statusBadgeInfo.label }}
                UBadge(
                  :color="item.healthBadgeInfo.color"
                  variant="soft"
                  size="xs"
                  class="py-0 px-1.5 text-[10px]"
                ) {{ item.healthBadgeInfo.label }}

      //- Columna Derecha: Área temporal (Gantt grid)
      .flex-1.overflow-x-auto(class="scrollbar-thin")
        //- Cabecera Multinivel
        .sticky.top-0.z-20.bg-white(
          class="h-16 border-b border-default flex flex-col"
          :style="`width: ${timelineWeeks.length * 80}px;`"
        )
          //- Fila Superior: Meses
          .flex.h-8.border-b.border-default
            .flex.items-center.justify-center.border-r.border-default.text-xs.font-bold.text-gray-700(
              v-for="(m, index) in timelineMonths"
              :key="index"
              :style="`width: ${m.weeksCount * 80}px;`"
            ) {{ m.label }}
            
          //- Fila Inferior: Semanas
          .flex.h-8
            .flex.items-center.justify-center.border-r.border-default.text-xs.text-muted(
              v-for="w in timelineWeeks"
              :key="w.label + w.year"
              class="w-[80px]"
            ) {{ w.label }}
            
        //- Carriles del Gantt
        .divide-y.divide-default.relative(
          class="w-max"
          :style="`width: ${timelineWeeks.length * 80}px;`"
        )
          //- Línea "Hoy"
          .absolute.top-0.bottom-0.w-px.border-l-2.border-dashed.z-10.pointer-events-none(
            class="border-[#9C6B4E]"
            v-if="hoyPercent >= 0 && hoyPercent <= 100"
            :style="`left: ${hoyPercent}%;`"
          )
            .absolute.-top-5.text-white.font-bold.rounded.shadow.z-20.flex.items-center.justify-center(
              class="bg-[#9C6B4E] -translate-x-1/2 text-[9px] px-1.5 py-0.5"
            ) Hoy

          //- Fila de cada iniciativa
          .grid.relative(
            v-for="item in processedInitiatives"
            :key="item.id"
            class="h-14 hover:bg-gray-50/50"
            :style="`grid-template-columns: repeat(${timelineWeeks.length}, 80px);`"
          )
            //- Líneas verticales finas de semanas
            .border-r.border-default.h-full.opacity-30(
              v-for="w in timelineWeeks"
              :key="'div-'+w.label+w.year"
            )
            
            //- Barra comprometida
            .absolute.top-3.pointer-events-auto.border(
              v-if="item.barWidth > 0"
              :style="`left: ${item.barLeft}%; width: ${item.barWidth}%;`"
              :class="[getHealthColorClass(item.health), 'h-7 rounded-full z-0']"
            )
              UTooltip(
                :text="`Rango Comprometido: ${item.healthBadgeInfo.label}`"
                class="w-full h-full block"
                :delay-duration="0"
              )
                .w-full.h-full.rounded-full

            //- Tramo de retraso (si existe)
            .absolute.top-3.pointer-events-auto(
              v-if="item.delayWidth > 0"
              :style="`left: ${item.delayLeft}%; width: ${item.delayWidth}%; background: repeating-linear-gradient(45deg, rgba(0,0,0,0.05), rgba(0,0,0,0.05) 4px, transparent 4px, transparent 8px);`"
              class="h-7 z-0 border-y border-r border-dashed border-[#A24B43] rounded-r-full"
            )
              UTooltip(
                :text="`Retraso Estimado`"
                class="w-full h-full block"
                :delay-duration="0"
              )
                .w-full.h-full

            //- Hito de Fecha Objetivo (Rombo)
            .absolute.top-4.z-10.pointer-events-auto(
              v-if="item.targetPercent !== null && item.targetPercent >= 0 && item.targetPercent <= 100"
              :style="`left: ${item.targetPercent}%;`"
              class="-translate-x-1/2"
            )
              UTooltip(
                :text="`Hito / Fecha Objetivo: ${item.targetDate ? formatInitiativeDate(item.targetDate) : ''}`"
                :delay-duration="0"
              )
                .rotate-45.border-2.bg-white.shadow-sm.cursor-help.transition-transform(
                  class="w-4 h-4 border-[#9C6B4E] hover:scale-110"
                )
</template>
