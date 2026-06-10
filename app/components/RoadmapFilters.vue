<script setup lang="ts">
import { ANY_OPTION, type InitiativeFilters, type OwnerRef } from '~~/shared/types/initiative'

const props = defineProps<{
  owners: OwnerRef[]
}>()

const filters = defineModel<InitiativeFilters>({ required: true })


const statusOptions = [
  { label: 'Todos los estados', value: ANY_OPTION },
  { label: 'Descubrimiento', value: 'discovery' },
  { label: 'Refinamiento', value: 'refinement' },
  { label: 'Listo', value: 'ready' },
  { label: 'En desarrollo', value: 'in_development' },
  { label: 'QA', value: 'qa' },
  { label: 'Desplegado', value: 'released' },
  { label: 'Bloqueado', value: 'blocked' },
  { label: 'Cancelado', value: 'cancelled' }
]

const priorityOptions = [
  { label: 'Toda prioridad', value: ANY_OPTION },
  { label: 'Alta', value: 'high' },
  { label: 'Media', value: 'medium' },
  { label: 'Baja', value: 'low' }
]

const riskOptions = [
  { label: 'Todo riesgo', value: ANY_OPTION },
  { label: 'Alto', value: 'high' },
  { label: 'Medio', value: 'medium' },
  { label: 'Bajo', value: 'low' }
]

const healthOptions = [
  { label: 'Toda salud', value: ANY_OPTION },
  { label: 'Al día', value: 'on_track' },
  { label: 'En riesgo', value: 'at_risk' },
  { label: 'Retrasado', value: 'off_track' }
]

const ownerOptions = computed(() => [
  { label: 'Todos los responsables', value: ANY_OPTION },
  ...props.owners.map(owner => ({
    label: owner.displayName ?? owner.email,
    value: owner.id
  }))
])
</script>

<template lang="pug">
.flex.flex-wrap.items-center.gap-2
  UInput(
    v-model="filters.search"
    icon="i-lucide-search"
    placeholder="Buscar iniciativas…"
    class="w-[200px]"
  )
  USelect(v-model="filters.status" :items="statusOptions")
  USelect(v-model="filters.health" :items="healthOptions")
  USelect(v-model="filters.priority" :items="priorityOptions")
  USelect(v-model="filters.risk" :items="riskOptions")
  USelect(v-model="filters.ownerId" :items="ownerOptions")

</template>
