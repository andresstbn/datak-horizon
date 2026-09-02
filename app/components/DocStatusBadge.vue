<script setup lang="ts">
import { docStatusBadge } from '~~/shared/utils/docs'

const props = withDefaults(
  defineProps<{
    status?: string | null
    size?: 'xs' | 'sm' | 'md' | 'lg'
    variant?: 'subtle' | 'solid' | 'outline' | 'soft'
  }>(),
  {
    status: '',
    size: 'sm',
    variant: 'subtle'
  }
)

const badge = computed(() => docStatusBadge(props.status))
</script>

<template lang="pug">
UBadge(
  :color="badge.color"
  :label="badge.label"
  :size="size"
  :variant="variant"
)
</template>
