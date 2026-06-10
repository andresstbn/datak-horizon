<script setup lang="ts">
import type { InitiativeListItem, InitiativeFilters, OwnerRef } from '~~/shared/types/initiative'
import type { Paginated } from '~~/shared/utils/initiatives'

defineProps<{
  filtered: InitiativeListItem[]
  paginated: Paginated<InitiativeListItem>
  owners: OwnerRef[]
  isLoading: boolean
  errorMessage: string | null
}>()

const filters = defineModel<InitiativeFilters>('filters', { required: true })
const page = defineModel<number>('page', { required: true })
</script>

<template lang="pug">
.space-y-4
  RoadmapFilters(v-model="filters" :owners="owners")

  UAlert(
    v-if="errorMessage"
    color="error"
    variant="subtle"
    icon="i-lucide-triangle-alert"
    :title="errorMessage"
  )

  RoadmapTable(:rows="paginated.rows" :loading="isLoading")

  .flex.items-center.justify-between.gap-4
    p.text-sm.text-muted
      | Mostrando {{ paginated.from }}–{{ paginated.to }} de {{ paginated.total }} iniciativas
    UPagination(
      v-model:page="page"
      :total="paginated.total"
      :items-per-page="paginated.perPage"
    )
</template>
