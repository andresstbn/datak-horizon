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

const toast = useToast()

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
  { accessorKey: 'delayReason', header: 'Retraso' },
  { id: 'actions', header: '' }
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
    InitiativeStatusBadge(
      :status="row.original.status"
      :initiative-id="row.original.id"
      :initiative-title="row.original.title"
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

  template(#actions-cell="{ row }")
    .flex.items-center.justify-end.gap-1
      UButton(
        icon="i-lucide-link"
        color="neutral"
        variant="ghost"
        size="xs"
        aria-label="Copiar enlace"
        @click="handleCopyLink(row.original.id)"
      )
      UButton(
        icon="i-lucide-chevron-right"
        color="neutral"
        variant="ghost"
        size="xs"
        :to="`/iniciativas/${row.original.id}`"
        aria-label="Ver iniciativa"
      )
</template>
