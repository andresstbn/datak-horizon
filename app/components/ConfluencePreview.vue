<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { confluenceService, type ConfluencePreviewData } from '~/services/confluenceService'
import { formatRelativeTime } from '~~/shared/utils/initiatives'

const props = defineProps<{
  url: string
}>()

const { getIdToken } = useAuth()

const preview = ref<ConfluencePreviewData | null>(null)
const isLoading = ref(true)

async function loadPreview() {
  const token = await getIdToken()
  if (!token) {
    isLoading.value = false
    return
  }

  try {
    preview.value = await confluenceService.getPreview(token, props.url)
  } catch (err) {
    console.error('Error loading Confluence preview:', err)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadPreview()
})
</script>

<template lang="pug">
.confluence-preview
  //- Loading state
  .flex.items-center.gap-3.p-3.border.border-default.rounded-lg.bg-card.animate-pulse(v-if="isLoading")
    .size-8.rounded.bg-muted
    .flex-1.space-y-2
      .h-4.w-2/3.bg-muted.rounded
      .h-3.w-1/3.bg-muted.rounded

  //- Success preview card
  a.flex.items-start.gap-3.p-3.border.border-default.rounded-lg.bg-card.transition-colors(
    v-else-if="preview && preview.status === 'success'"
    :href="url"
    target="_blank"
    class="hover:bg-muted/30 hover:border-primary/50"
  )
    UIcon.size-5.text-primary.shrink-0(name="i-simple-icons-confluence" class="mt-0.5")
    .min-w-0.flex-1
      .flex.items-center(class="gap-1.5")
        span.font-medium.text-xs.text-foreground.line-clamp-1 {{ preview.title }}
        UIcon.size-3.text-dimmed.shrink-0(name="i-lucide-external-link")
      .flex.flex-wrap.items-center.gap-x-2.mt-1(class="gap-y-0.5 text-[10px] text-dimmed")
        span.font-medium.text-primary(v-if="preview.spaceName") {{ preview.spaceName }}
        span.text-muted-foreground(v-if="preview.spaceName && (preview.lastUpdatedBy || preview.lastUpdatedAt)") •
        span(v-if="preview.lastUpdatedBy") Actualizado por {{ preview.lastUpdatedBy }}
        span.text-muted-foreground(v-if="preview.lastUpdatedBy && preview.lastUpdatedAt") •
        span(v-if="preview.lastUpdatedAt") {{ formatRelativeTime(preview.lastUpdatedAt) }}

  //- Fallback / Unconfigured / Error card
  a.flex.items-center.gap-3.p-3.border.border-default.rounded-lg.bg-card.transition-colors(
    v-else
    :href="url"
    target="_blank"
    class="hover:bg-muted/30 hover:border-primary/50"
  )
    UIcon.size-5.text-muted.shrink-0(name="i-simple-icons-confluence")
    .min-w-0.flex-1
      .flex.items-center(class="gap-1.5")
        span.font-medium.text-xs.text-foreground.line-clamp-1 {{ preview?.title || url }}
        UIcon.size-3.text-dimmed.shrink-0(name="i-lucide-external-link")
      p(class="mt-0.5 text-[10px] text-dimmed truncate") {{ url }}
</template>
