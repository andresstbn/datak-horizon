<script setup lang="ts">
import type { InitiativeDetail } from '~~/shared/types/initiative'
import {
  formatInitiativeDate,
  priorityBadge,
  riskBadge,
  healthBadge
} from '~~/shared/utils/initiatives'

defineProps<{
  initiative: InitiativeDetail
}>()
</script>

<template lang="pug">
.grid.gap-6(class="lg:grid-cols-[1.65fr_1fr]")
  //- Left column: description only.
  .space-y-6
    UPageCard(title="Descripción de la Iniciativa")
      p.text-sm.text-muted.whitespace-pre-wrap(v-if="initiative.description") {{ initiative.description }}
      p.text-sm.text-dimmed(v-else) Sin descripción todavía.

  //- Right column: details panel.
  UPageCard(title="Detalles de Roadmap")
    dl.divide-y.divide-default
      .flex.items-center.justify-between.gap-4.py-2
        dt.text-sm.text-muted Salud (Health)
        dd
          UBadge(
            :color="healthBadge(initiative.health).color"
            :label="healthBadge(initiative.health).label"
            variant="subtle"
          )
      .flex.items-center.justify-between.gap-4.py-2
        dt.text-sm.text-muted Prioridad
        dd
          UBadge(
            :color="priorityBadge(initiative.priority).color"
            :label="priorityBadge(initiative.priority).label"
            variant="subtle"
          )
      .flex.items-center.justify-between.gap-4.py-2
        dt.text-sm.text-muted Riesgo
        dd
          UBadge(
            :color="riskBadge(initiative.risk).color"
            :label="riskBadge(initiative.risk).label"
            variant="subtle"
          )
      .flex.items-center.justify-between.gap-4.py-2
        dt.text-sm.text-muted Responsable funcional
        dd.flex.items-center.gap-2(v-if="initiative.functionalOwner")
          UAvatar(
            :src="initiative.functionalOwner.photoUrl ?? undefined"
            :alt="initiative.functionalOwner.displayName ?? initiative.functionalOwner.email"
            size="2xs"
          )
          span.text-sm {{ initiative.functionalOwner.displayName ?? initiative.functionalOwner.email }}
        dd.text-sm.text-dimmed(v-else) —
      .flex.items-center.justify-between.gap-4.py-2
        dt.text-sm.text-muted Responsable técnico
        dd.flex.items-center.gap-2(v-if="initiative.technicalOwner")
          UAvatar(
            :src="initiative.technicalOwner.photoUrl ?? undefined"
            :alt="initiative.technicalOwner.displayName ?? initiative.technicalOwner.email"
            size="2xs"
          )
          span.text-sm {{ initiative.technicalOwner.displayName ?? initiative.technicalOwner.email }}
        dd.text-sm.text-dimmed(v-else) —
      .flex.items-center.justify-between.gap-4.py-2
        dt.text-sm.text-muted Fecha objetivo
        dd.text-sm {{ formatInitiativeDate(initiative.targetDate) }}
      .flex.items-center.justify-between.gap-4.py-2
        dt.text-sm.text-muted Fecha comprometida
        dd.text-sm {{ formatInitiativeDate(initiative.committedDate) }}
      .flex.items-center.justify-between.gap-4.py-2
        dt.text-sm.text-muted Fecha estimada
        dd.text-sm {{ formatInitiativeDate(initiative.estimatedDate) }}
      .space-y-1.py-2
        dt.text-sm.text-muted Motivo del retraso
        dd.text-sm(v-if="initiative.delayReason") {{ initiative.delayReason }}
        dd.text-sm.text-dimmed(v-else) —
</template>
