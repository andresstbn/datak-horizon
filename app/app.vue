<script setup lang="ts">
useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' }
  ],
  htmlAttrs: {
    lang: 'es'
  }
})

const title = 'Datak Horizon'
const description
  = 'Plataforma interna de Datak: la fuente única de verdad para las iniciativas de producto e ingeniería.'

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description
})

// Start listening to Firebase auth state on the client.
const { init } = useAuth()
onMounted(() => init())
</script>

<template lang="pug">
UApp
  NuxtLayout
    NuxtPage
</template>
