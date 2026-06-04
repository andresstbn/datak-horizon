<script setup lang="ts">
// Collapsed icon rail. Navigation is placeholder-only at this foundation stage.
interface RailItem {
  icon: string
  label: string
  to: string
}

const items: RailItem[] = [
  { icon: 'i-lucide-list', label: 'Hoja de ruta', to: '/' },
  { icon: 'i-lucide-layout-grid', label: 'Línea de tiempo', to: '/' },
  { icon: 'i-lucide-clock', label: 'Actividad', to: '/' }
]

const route = useRoute()
</script>

<template lang="pug">
//- Arbitrary value w-[58px] must live in class="" (Pug selector chains
//- cannot parse it). Keep all utility classes in class="" to stay safe.
aside(class="flex w-[58px] shrink-0 flex-col items-center gap-2 border-r border-default bg-elevated py-3")
  UButton(
    v-for="item in items"
    :key="item.label"
    :to="item.to"
    :icon="item.icon"
    :aria-label="item.label"
    :color="route.path === item.to ? 'primary' : 'neutral'"
    :variant="route.path === item.to ? 'solid' : 'ghost'"
    square
  )

  .mt-auto
    UButton(
      icon="i-lucide-settings"
      aria-label="Ajustes"
      color="neutral"
      variant="ghost"
      square
    )
</template>
