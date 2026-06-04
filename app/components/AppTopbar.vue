<script setup lang="ts">
defineProps<{
  // Current page title shown after the wordmark.
  pageTitle?: string
}>()

const { profile, isAuthenticated, isLoading, loginWithGoogle, logout } = useAuth()

const accountItems = computed(() => [
  [
    {
      label: profile.value?.displayName ?? profile.value?.email ?? 'Cuenta',
      type: 'label' as const
    }
  ],
  [
    {
      label: 'Cerrar sesión',
      icon: 'i-lucide-log-out',
      onSelect: () => logout()
    }
  ]
])
</script>

<template lang="pug">
//- Arbitrary value h-[60px] kept in class="" (Pug-safe).
header(class="flex h-[60px] shrink-0 items-center gap-3 border-b border-default px-6")
  span.font-semibold Datak Horizon
  template(v-if="pageTitle")
    span.text-muted /
    span.font-semibold {{ pageTitle }}

  .ml-auto.flex.items-center.gap-2
    UColorModeButton

    UDropdownMenu(v-if="isAuthenticated" :items="accountItems")
      UAvatar(
        :src="profile?.photoUrl ?? undefined"
        :alt="profile?.displayName ?? profile?.email ?? 'Cuenta'"
        size="sm"
      )

    UButton(
      v-else
      icon="i-simple-icons-google"
      :loading="isLoading"
      label="Entrar con Google"
      color="primary"
      @click="loginWithGoogle"
    )
</template>
