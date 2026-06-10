<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { InitiativeListItem } from '~~/shared/types/initiative'
import {
  formatInitiativeDate,
  priorityBadge,
  riskBadge,
  statusBadge,
  healthBadge
} from '~~/shared/utils/initiatives'

defineProps<{
  rows: InitiativeListItem[]
  loading: boolean
}>()

const columns: TableColumn<InitiativeListItem>[] = [
  { accessorKey: 'title', header: 'Título' },
  { accessorKey: 'status', header: 'Estado' },
  { accessorKey: 'health', header: 'Salud' },
  { accessorKey: 'priority', header: 'Prioridad' },
  { accessorKey: 'risk', header: 'Riesgo' },
  { accessorKey: 'functionalOwner', header: 'Resp. funcional' },
  { accessorKey: 'technicalOwner', header: 'Resp. técnico' },
  { accessorKey: 'committedDate', header: 'Comprometida' },
  { accessorKey: 'estimatedDate', header: 'Estimada' },
  { accessorKey: 'delayReason', header: 'Retraso' }
]
</script>

<template lang="pug">
UTable(
  :data="rows"
  :columns="columns"
  :loading="loading"
  empty="No hay iniciativas que coincidan con los filtros."
)
  template(#title-cell="{ row }")
    ULink.font-medium(:to="`/iniciativas/${row.original.id}`") {{ row.original.title }}

  template(#status-cell="{ row }")
    UBadge(
      :color="statusBadge(row.original.status).color"
      :label="statusBadge(row.original.status).label"
      variant="subtle"
    )

  template(#health-cell="{ row }")
    UBadge(
      :color="healthBadge(row.original.health).color"
      :label="healthBadge(row.original.health).label"
      variant="subtle"
    )

  template(#priority-cell="{ row }")
    UBadge(
      :color="priorityBadge(row.original.priority).color"
      :label="priorityBadge(row.original.priority).label"
      variant="subtle"
    )

  template(#risk-cell="{ row }")
    UBadge(
      :color="riskBadge(row.original.risk).color"
      :label="riskBadge(row.original.risk).label"
      variant="subtle"
    )

  template(#functionalOwner-cell="{ row }")
    .flex.items-center.gap-2(v-if="row.original.functionalOwner")
      UAvatar(
        :src="row.original.functionalOwner.photoUrl ?? undefined"
        :alt="row.original.functionalOwner.displayName ?? row.original.functionalOwner.email"
        size="2xs"
      )
      span {{ row.original.functionalOwner.displayName ?? row.original.functionalOwner.email }}
    span.text-dimmed(v-else) —

  template(#technicalOwner-cell="{ row }")
    .flex.items-center.gap-2(v-if="row.original.technicalOwner")
      UAvatar(
        :src="row.original.technicalOwner.photoUrl ?? undefined"
        :alt="row.original.technicalOwner.displayName ?? row.original.technicalOwner.email"
        size="2xs"
      )
      span {{ row.original.technicalOwner.displayName ?? row.original.technicalOwner.email }}
    span.text-dimmed(v-else) —

  template(#committedDate-cell="{ row }")
    span.text-muted {{ formatInitiativeDate(row.original.committedDate) }}

  template(#estimatedDate-cell="{ row }")
    span.text-muted {{ formatInitiativeDate(row.original.estimatedDate) }}

  template(#delayReason-cell="{ row }")
    span.text-muted.truncate.max-w-xs(v-if="row.original.delayReason" :title="row.original.delayReason") {{ row.original.delayReason }}
    span.text-dimmed(v-else) —
</template>
