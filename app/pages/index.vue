<script setup lang="ts">
definePageMeta({ pageTitle: 'Hoja de ruta' })

// The roadmap table is part of a later increment; this is the shell placeholder.
const { isAuthenticated, profile } = useAuth()
</script>

<template lang="pug">
.mx-auto.max-w-3xl.space-y-4
  UPageCard(
    title="Bienvenido a Datak Horizon"
    description="La fuente única de verdad para las iniciativas de producto e ingeniería."
  )

  UAlert(
    v-if="!isAuthenticated"
    color="neutral"
    variant="subtle"
    icon="i-lucide-lock"
    title="Inicia sesión"
    description="Entra con tu cuenta de Google para acceder a tu perfil."
  )

  UAlert(
    v-else
    color="primary"
    variant="subtle"
    icon="i-lucide-circle-check"
    :title="`Sesión iniciada como ${profile?.displayName ?? profile?.email}`"
    description="Las vistas de iniciativas se construirán en los siguientes incrementos."
  )
</template>
