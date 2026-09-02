<script setup lang="ts">
import type { DocType } from '~~/shared/types/doc'
import { docTypeBadge } from '~~/shared/utils/docs'

const props = withDefaults(
  defineProps<{
    tipo: DocType
    size?: 'xs' | 'sm' | 'md'
    variant?: 'subtle' | 'solid' | 'outline' | 'soft'
  }>(),
  {
    size: 'sm',
    variant: 'subtle'
  }
)

const badge = computed(() => docTypeBadge(props.tipo))
</script>

<template lang="pug">
UTooltip(:text="badge.description")
  UBadge(
    :color="badge.color"
    :label="badge.label"
    :size="size"
    :variant="variant"
  )
</template>
