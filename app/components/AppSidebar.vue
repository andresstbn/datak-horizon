<script setup lang="ts">
// Collapsed icon rail. Only the roadmap exists today; the rest are flagged as
// "coming soon" (disabled) so the buttons reflect what actually works.
interface RailItem {
  icon: string
  label: string
  to?: string
  // Marks the active item by route prefix.
  match?: (path: string) => boolean
}

const items: RailItem[] = [
  {
    icon: 'i-lucide-list',
    label: 'Hoja de ruta',
    to: '/',
    match: path => path === '/' || path.startsWith('/iniciativas')
  },
  {
    icon: 'i-lucide-calendar-range',
    label: 'Línea de tiempo',
    to: '/timeline',
    match: path => path === '/timeline'
  },
  { icon: 'i-lucide-clock', label: 'Actividad (próximamente)' }
]

const route = useRoute()

function isActive(item: RailItem): boolean {
  return item.match?.(route.path) ?? false
}
</script>

<template lang="pug">
//- Arbitrary value w-[58px] must live in class="" (Pug selector chains
//- cannot parse it). Keep all utility classes in class="" to stay safe.
aside(class="flex w-[58px] shrink-0 flex-col items-center gap-2 border-r border-default bg-elevated py-3")
  UTooltip(v-for="item in items" :key="item.label" :text="item.label")
    UButton(
      :to="item.to"
      :icon="item.icon"
      :aria-label="item.label"
      :disabled="!item.to"
      :color="isActive(item) ? 'primary' : 'neutral'"
      :variant="isActive(item) ? 'solid' : 'ghost'"
      square
    )

  .mt-auto
    UTooltip(text="Ajustes (próximamente)")
      UButton(
        icon="i-lucide-settings"
        aria-label="Ajustes (próximamente)"
        color="neutral"
        variant="ghost"
        disabled
        square
      )
</template>
