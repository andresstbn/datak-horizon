<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { InitiativeStatus } from '~~/shared/types/initiative'
import { statusBadge } from '~~/shared/utils/initiatives'

const props = withDefaults(
  defineProps<{
    status: InitiativeStatus
    initiativeId: string
    initiativeTitle?: string
    editable?: boolean
  }>(),
  {
    initiativeTitle: 'la iniciativa',
    editable: true
  }
)

const emit = defineEmits<{
  updated: [newStatus: InitiativeStatus]
}>()

const { updateInitiativeStatus } = useInitiatives()
const toast = useToast()

const isConfirmOpen = ref(false)
const targetStatus = ref<InitiativeStatus | null>(null)
const isSubmitting = ref(false)

const ALL_STATUSES: InitiativeStatus[] = [
  'discovery',
  'refinement',
  'ready',
  'in_development',
  'qa',
  'released',
  'blocked',
  'cancelled'
]

const statusMenuItems = computed<DropdownMenuItem[][]>(() => [
  [
    {
      label: 'Cambiar estado a:',
      type: 'label'
    }
  ],
  ALL_STATUSES.map(s => ({
    label: statusBadge(s).label,
    icon: s === props.status ? 'i-lucide-check' : 'i-lucide-circle',
    disabled: s === props.status,
    onSelect: () => handleSelectStatus(s)
  }))
])

function handleSelectStatus(newStatus: InitiativeStatus) {
  if (newStatus === props.status) return
  targetStatus.value = newStatus
  isConfirmOpen.value = true
}

async function confirmStatusChange() {
  if (!targetStatus.value) return

  const newStatus = targetStatus.value
  isSubmitting.value = true

  try {
    const success = await updateInitiativeStatus(props.initiativeId, newStatus)
    if (success) {
      toast.add({
        title: 'Estado actualizado',
        description: `El estado cambió a "${statusBadge(newStatus).label}".`,
        icon: 'i-lucide-check'
      })
      emit('updated', newStatus)
      isConfirmOpen.value = false
    } else {
      toast.add({
        title: 'Error',
        description: 'No se pudo actualizar el estado de la iniciativa.',
        color: 'error',
        icon: 'i-lucide-triangle-alert'
      })
    }
  } catch (error) {
    console.error('Error in confirmStatusChange:', error)
    toast.add({
      title: 'Error',
      description: 'Ocurrió un error inesperado al actualizar el estado.',
      color: 'error',
      icon: 'i-lucide-triangle-alert'
    })
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template lang="pug">
.inline-flex.items-center
  //- Editable Dropdown
  UDropdownMenu(v-if="editable" :items="statusMenuItems")
    UBadge(
      :color="statusBadge(status).color"
      :label="statusBadge(status).label"
      size="sm"
      variant="subtle"
      class="cursor-pointer transition hover:opacity-80"
      trailing-icon="i-lucide-chevron-down"
    )

  //- Readonly Badge
  UBadge(
    v-else
    :color="statusBadge(status).color"
    :label="statusBadge(status).label"
    size="sm"
    variant="subtle"
  )

  //- Confirmation Modal
  UModal(
    v-model:open="isConfirmOpen"
    title="Confirmar cambio de estado"
    description="Se actualizará el estado de la iniciativa en el sistema."
  )
    template(#body)
      .space-y-4(v-if="targetStatus")
        p.text-sm.text-muted
          | ¿Estás seguro de que deseas cambiar el estado de
          span.font-semibold.text-foreground {{ ` "${initiativeTitle}" ` }}
          | ?

        .flex.items-center.justify-center.gap-3.py-3.border.border-default.rounded-lg.bg-muted(class="bg-opacity-10")
          UBadge(
            :color="statusBadge(status).color"
            :label="statusBadge(status).label"
            size="md"
            variant="subtle"
          )
          UIcon.size-4.text-muted(name="i-lucide-arrow-right")
          UBadge(
            :color="statusBadge(targetStatus).color"
            :label="statusBadge(targetStatus).label"
            size="md"
            variant="solid"
          )

    template(#footer)
      .flex.items-center.justify-end.gap-2.w-full
        UButton(
          label="Cancelar"
          color="neutral"
          variant="ghost"
          :disabled="isSubmitting"
          @click="isConfirmOpen = false"
        )
        UButton(
          label="Confirmar cambio"
          color="primary"
          :loading="isSubmitting"
          @click="confirmStatusChange"
        )
</template>
