<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { OwnerRef } from '~~/shared/types/initiative'

const props = withDefaults(
  defineProps<{
    owner: OwnerRef | null
    initiativeId: string
    field?: 'functionalOwnerId' | 'technicalOwnerId'
    editable?: boolean
  }>(),
  {
    field: 'functionalOwnerId',
    editable: true
  }
)

const emit = defineEmits<{
  updated: [newOwnerId: string | null]
}>()

const { users, fetchUsers, updateInitiative } = useInitiatives()
const toast = useToast()
const isSubmitting = ref(false)

onMounted(() => {
  if (users.value.length === 0) {
    fetchUsers()
  }
})

const isTechnical = computed(() => props.field === 'technicalOwnerId')

const ownerMenuItems = computed<DropdownMenuItem[][]>(() => {
  const items: DropdownMenuItem[] = [
    {
      label: 'Sin asignar',
      icon: props.owner === null ? 'i-lucide-check' : 'i-lucide-user-x',
      disabled: props.owner === null,
      onSelect: () => handleSelectOwner(null)
    }
  ]

  for (const u of users.value) {
    items.push({
      label: u.displayName || u.email,
      icon: props.owner?.id === u.id ? 'i-lucide-check' : 'i-lucide-user',
      avatar: u.photoUrl ? { src: u.photoUrl } : undefined,
      disabled: props.owner?.id === u.id,
      onSelect: () => handleSelectOwner(u.id)
    })
  }

  return [
    [
      {
        label: isTechnical.value ? 'Asignar resp. técnico:' : 'Asignar responsable:',
        type: 'label'
      }
    ],
    items
  ]
})

async function handleSelectOwner(userId: string | null) {
  if (props.owner?.id === userId || isSubmitting.value) return

  isSubmitting.value = true
  try {
    const res = await updateInitiative(props.initiativeId, { [props.field]: userId })
    if (res) {
      const assignedUser = users.value.find(u => u.id === userId)
      const name = assignedUser ? (assignedUser.displayName || assignedUser.email) : 'Sin asignar'
      toast.add({
        title: isTechnical.value ? 'Resp. técnico actualizado' : 'Responsable actualizado',
        description: `Asignado a: ${name}.`,
        icon: 'i-lucide-check'
      })
      emit('updated', userId)
    } else {
      toast.add({
        title: 'Error',
        description: 'No se pudo actualizar el responsable.',
        color: 'error',
        icon: 'i-lucide-triangle-alert'
      })
    }
  } catch (error) {
    console.error('Error updating owner:', error)
    toast.add({
      title: 'Error',
      description: 'Ocurrió un error inesperado al asignar el responsable.',
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
  UDropdownMenu(v-if="editable" :items="ownerMenuItems")
    button.flex.items-center.gap-1.text-xs.rounded.text-muted.transition(
      type="button"
      class="px-2 py-1 hover:bg-elevated hover:text-foreground border border-transparent hover:border-default max-w-[165px]"
      :class="{ 'opacity-50 cursor-not-allowed': isSubmitting }"
      :disabled="isSubmitting"
    )
      template(v-if="owner")
        UAvatar(
          :src="owner.photoUrl ?? undefined"
          :alt="owner.displayName ?? owner.email"
          size="2xs"
        )
        span.truncate.text-foreground {{ owner.displayName ?? owner.email }}
      template(v-else)
        UIcon.size-3.text-muted(name="i-lucide-user")
        span.text-dimmed {{ isTechnical ? 'Sin asignar' : 'Sin asignar' }}
      UIcon.size-3.text-muted.shrink-0(name="i-lucide-chevron-down")

  .flex.items-center.gap-1.text-xs(v-else)
    template(v-if="owner")
      UAvatar(
        :src="owner.photoUrl ?? undefined"
        :alt="owner.displayName ?? owner.email"
        size="2xs"
      )
      span.text-foreground {{ owner.displayName ?? owner.email }}
    span.text-dimmed(v-else) —
</template>
