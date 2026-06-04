<script setup lang="ts">
// Application shell: collapsed sidebar rail + topbar + main content slot.
// The page title is read from the route meta (`definePageMeta({ pageTitle })`).
const route = useRoute()
const pageTitle = computed(() => route.meta.pageTitle as string | undefined)
</script>

<template lang="pug">
.flex.h-screen.w-full.overflow-hidden.bg-default
  AppSidebar

  .flex.min-w-0.flex-1.flex-col
    AppTopbar(:page-title="pageTitle")

    main.flex-1.overflow-auto.p-6
      slot
</template>
