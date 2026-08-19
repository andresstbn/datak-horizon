<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { PriorityLevel } from '~~/shared/types/initiative'
import { priorityBadge } from '~~/shared/utils/initiatives'

const props = withDefaults(
  defineProps<{
    priority: PriorityLevel
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
  updated: [newPriority: PriorityLevel]
}>()

const { updateInitiative } = useInitiatives()
const toast = useToast()
const isSubmitting = ref(false)

const ALL_PRIORITIES: PriorityLevel[] = ['low', 'medium', 'high']

const priorityMenuItems = computed<DropdownMenuItem[][]>(() => [
  [
    {
      label: 'Cambiar prioridad:',
      type: 'label'
    }
  ],
  ALL_PRIORITIES.map(p => ({
    label: priorityBadge(p).label,
    icon: p === props.priority ? 'i-lucide-check' : 'i-lucide-circle',
    disabled: p === props.priority,
    onSelect: () => handleSelectPriority(p)
  }))
])

async function handleSelectPriority(newPriority: PriorityLevel) {
  if (newPriority === props.priority || isSubmitting.value) return

  isSubmitting.value = true
  try {
    const res = await updateInitiative(props.initiativeId, { priority: newPriority })
    if (res) {
      toast.add({
        title: 'Prioridad actualizada',
        description: `La prioridad cambió a "${priorityBadge(newPriority).label}".`,
        icon: 'i-lucide-check'
      })
      emit('updated', newPriority)
    } else {
      toast.add({
        title: 'Error',
        description: 'No se pudo actualizar la prioridad.',
        color: 'error',
        icon: 'i-lucide-triangle-alert'
      })
    }
  } catch (error) {
    console.error('Error updating priority:', error)
    toast.add({
      title: 'Error',
      description: 'Ocurrió un error inesperado al actualizar la prioridad.',
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
  UDropdownMenu(v-if="editable" :items="priorityMenuItems")
    UBadge(
      :color="priorityBadge(priority).color"
      :label="priorityBadge(priority).label"
      size="sm"
      variant="subtle"
      class="cursor-pointer transition hover:opacity-80"
      trailing-icon="i-lucide-chevron-down"
    )

  //- Readonly Badge
  UBadge(
    v-else
    :color="priorityBadge(priority).color"
    :label="priorityBadge(priority).label"
    size="sm"
    variant="subtle"
  )
</template>
