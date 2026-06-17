<script setup lang="ts">
import { ref } from 'vue'
import { useInitiative } from '~/composables/useInitiative'
import type { InitiativeDetail } from '~~/shared/types/initiative'
import {
  formatInitiativeDate,
  priorityBadge,
  riskBadge,
  healthBadge
} from '~~/shared/utils/initiatives'

const props = defineProps<{
  initiative: InitiativeDetail
}>()

const emit = defineEmits<{
  (e: 'updated'): void
}>()

const { updateInitiative } = useInitiative(props.initiative.id)

const isEditing = ref(false)
const editDesc = ref('')
const isSaving = ref(false)

function startEdit() {
  editDesc.value = props.initiative.description || ''
  isEditing.value = true
}

function cancelEdit() {
  isEditing.value = false
}

async function saveEdit() {
  isSaving.value = true
  try {
    const success = await updateInitiative({ description: editDesc.value.trim() || null })
    if (success) {
      isEditing.value = false
      emit('updated')
    }
  } finally {
    isSaving.value = false
  }
}
</script>

<template lang="pug">
.grid.gap-6(class="lg:grid-cols-[1.65fr_1fr]")
  //- Left column: description and scope.
  .space-y-6
    UPageCard
      template(#header)
        .flex.items-center.justify-between.w-full
          h3.text-sm.font-semibold.text-muted Descripción de la Iniciativa
          UButton(
            v-if="!isEditing"
            icon="i-lucide-pencil"
            size="xs"
            variant="ghost"
            color="primary"
            label="Editar"
            @click="startEdit"
          )

      div(v-if="isEditing" class="space-y-4")
        UTextarea(
          v-model="editDesc"
          placeholder="Escribe la descripción de la iniciativa..."
          class="w-full"
          :rows="6"
        )
        .flex.items-center.justify-end.gap-2
          UButton(
            label="Cancelar"
            color="neutral"
            variant="ghost"
            size="xs"
            @click="cancelEdit"
          )
          UButton(
            label="Guardar"
            color="primary"
            size="xs"
            :loading="isSaving"
            @click="saveEdit"
          )
      div(v-else)
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
