<script setup lang="ts">
import type { DocIndexItem, DocType } from '~~/shared/types/doc'
import { docStatusBadge } from '~~/shared/utils/docs'

definePageMeta({ pageTitle: 'Documentos de Producto' })

const route = useRoute()
const router = useRouter()
const toast = useToast()

const { isReady, isAuthenticated, isAuthorized, isAccessDenied, deniedEmail, logout } = useAuth()

const {
  items,
  isLoading,
  errorMessage,
  selectedDoc,
  isDetailLoading,
  detailError,
  filters,
  filtered,
  availableStatuses,
  rfCount,
  specsCount,
  fetchDocs,
  selectDoc,
  clearSelectedDoc
} = useDocs()

const { renderMarkdown } = useDocRenderer()

const renderedHtml = ref('')
const isRendering = ref(false)

const ALL_STATUS_OPTIONS = [
  'BORRADOR',
  'EN REVISIÓN',
  'APROBADA',
  'EN IMPLEMENTACIÓN',
  'COMPLETADA'
]

// Render markdown whenever selected document changes
watch(
  () => selectedDoc.value,
  async (newDoc) => {
    if (!newDoc) {
      renderedHtml.value = ''
      return
    }
    isRendering.value = true
    try {
      renderedHtml.value = await renderMarkdown(newDoc.content, newDoc.tipo)
    } catch (err) {
      console.error('Error rendering markdown:', err)
      renderedHtml.value = '<p class="text-error">Error al renderizar el documento.</p>'
    } finally {
      isRendering.value = false
    }
  },
  { immediate: true }
)

// Sync route params to selection
async function syncFromRoute() {
  await fetchDocs()
  const qTipo = route.query.tipo as string | undefined
  const qDoc = route.query.doc as string | undefined

  if (qTipo && (qTipo === 'rf' || qTipo === 'specs') && qDoc) {
    await selectDoc(qTipo as DocType, qDoc)
  }
}

watch(
  () => [route.query.tipo, route.query.doc],
  async ([newTipo, newDoc]) => {
    if (newTipo && (newTipo === 'rf' || newTipo === 'specs') && newDoc) {
      if (
        !selectedDoc.value
        || selectedDoc.value.tipo !== newTipo
        || selectedDoc.value.filename !== newDoc
      ) {
        await selectDoc(newTipo as DocType, String(newDoc))
      }
    } else if (!newDoc && selectedDoc.value) {
      clearSelectedDoc()
    }
  }
)

watch(
  () => isAuthorized.value,
  async (authorized) => {
    if (authorized) {
      await syncFromRoute()
    }
  },
  { immediate: true }
)

function handleSelect(item: DocIndexItem) {
  router.replace({
    query: {
      ...route.query,
      tipo: item.tipo,
      doc: item.filename
    }
  })
}

function handleBackToList() {
  const query = { ...route.query }
  delete query.tipo
  delete query.doc
  router.replace({ query })
  clearSelectedDoc()
}

function getGitHubUrl(tipo: DocType, filename: string): string {
  return `https://github.com/Datak-SAS/datak/blob/main/docs/${tipo}/${filename}`
}

async function copyDocumentLink() {
  try {
    const url = window.location.href
    await navigator.clipboard.writeText(url)
    toast.add({
      title: 'Enlace copiado',
      description: 'El enlace directo al documento se copió al portapapeles.',
      icon: 'i-lucide-check'
    })
  } catch {
    toast.add({
      title: 'Error',
      description: 'No se pudo copiar el enlace al portapapeles.',
      color: 'error',
      icon: 'i-lucide-triangle-alert'
    })
  }
}

function setTipoFilter(tipo: DocType | 'all') {
  filters.value.tipo = tipo
}

function setStatusFilter(status: string | 'all') {
  filters.value.estado = status
}
</script>

<template lang="pug">
.space-y-4
  //- Wait for the auth state before deciding what to render.
  .flex.items-center.justify-center.py-16(v-if="!isReady")
    UIcon.size-6.animate-spin.text-muted(name="i-lucide-loader-circle")

  UAlert(
    v-else-if="!isAuthenticated"
    color="neutral"
    variant="subtle"
    icon="i-lucide-lock"
    title="Inicia sesión"
    description="Entra con tu cuenta de Google para ver los documentos de producto."
  )

  .space-y-4(v-else-if="isAccessDenied")
    UAlert(
      color="error"
      variant="subtle"
      icon="i-lucide-shield-alert"
      title="Acceso restringido"
      :description="`Tu cuenta de Google (${deniedEmail ?? 'autenticada'}) no está autorizada para acceder a Datak Horizon.`"
    )
    .flex.justify-start
      UButton(
        icon="i-lucide-log-out"
        label="Cerrar sesión"
        color="neutral"
        variant="outline"
        @click="logout"
      )

  .flex.w-full.gap-4.overflow-hidden(
    v-else-if="isAuthorized"
    class="h-[calc(100vh-6.5rem)]"
  )
    //- Left Master Column / Document List (hidden on small screens when doc is active)
    .flex.h-full.w-full.flex-col.overflow-hidden.rounded-xl.border.border-default.bg-elevated(
      class="md:w-80 lg:w-96 md:shrink-0"
      :class="selectedDoc ? 'hidden md:flex' : 'flex'"
    )
      //- Header & Filters
      .flex.flex-col.gap-3.border-b.border-default.p-4.shrink-0
        .flex.items-center.justify-between
          .flex.items-center.gap-2
            UIcon.size-5.text-primary(name="i-lucide-book-open")
            h2.font-semibold.text-foreground Documentos
          UBadge(color="neutral" variant="subtle" size="sm")
            | {{ `${filtered.length} / ${items.length}` }}

        //- Search Input
        UInput(
          v-model="filters.search"
          placeholder="Buscar por ID, título, autor..."
          icon="i-lucide-search"
          size="sm"
          class="w-full"
        )

        //- Type Filters
        .flex.items-center.gap-1.rounded-lg.bg-muted.p-1(class="bg-opacity-20")
          UButton(
            label="Todos"
            size="xs"
            class="flex-1 justify-center"
            :variant="filters.tipo === 'all' ? 'solid' : 'ghost'"
            :color="filters.tipo === 'all' ? 'primary' : 'neutral'"
            @click="setTipoFilter('all')"
          )
          UButton(
            :label="`RF (${rfCount})`"
            size="xs"
            class="flex-1 justify-center"
            :variant="filters.tipo === 'rf' ? 'solid' : 'ghost'"
            :color="filters.tipo === 'rf' ? 'primary' : 'neutral'"
            @click="setTipoFilter('rf')"
          )
          UButton(
            :label="`SPEC (${specsCount})`"
            size="xs"
            class="flex-1 justify-center"
            :variant="filters.tipo === 'specs' ? 'solid' : 'ghost'"
            :color="filters.tipo === 'specs' ? 'primary' : 'neutral'"
            @click="setTipoFilter('specs')"
          )

        //- Status Filter Scroll / Pills
        .flex.items-center.gap-1.overflow-x-auto.pb-1
          UButton(
            label="Todos los estados"
            size="xs"
            variant="outline"
            :color="filters.estado === 'all' ? 'primary' : 'neutral'"
            @click="setStatusFilter('all')"
          )
          UButton(
            v-for="st in ALL_STATUS_OPTIONS"
            :key="st"
            :label="docStatusBadge(st).label"
            size="xs"
            variant="outline"
            :color="filters.estado === st ? docStatusBadge(st).color : 'neutral'"
            @click="setStatusFilter(st)"
          )

      //- Documents List Container
      .flex-1.overflow-y-auto.p-2.space-y-2
        //- Loading Skeleton
        .space-y-3.p-2(v-if="isLoading && items.length === 0")
          .space-y-2.rounded-lg.border.border-default.p-3(v-for="n in 5" :key="n")
            .flex.items-center.justify-between
              USkeleton(class="h-4 w-16")
              USkeleton(class="h-4 w-20")
            USkeleton(class="h-5 w-3/4")
            USkeleton(class="h-3 w-1/2")

        //- Error Message
        .p-4.text-center(v-else-if="errorMessage")
          UIcon.size-8.text-error.mx-auto.mb-2(name="i-lucide-alert-circle")
          p.text-sm.text-error {{ errorMessage }}
          UButton.mt-3(label="Reintentar" size="xs" color="primary" @click="fetchDocs(true)")

        //- Empty State
        .p-6.text-center(v-else-if="filtered.length === 0")
          UIcon.size-8.text-muted.mx-auto.mb-2(name="i-lucide-file-x")
          p.text-sm.text-muted No se encontraron documentos.
          UButton.mt-2(
            v-if="filters.search || filters.tipo !== 'all' || filters.estado !== 'all'"
            label="Limpiar filtros"
            size="xs"
            variant="link"
            @click="filters.search = ''; filters.tipo = 'all'; filters.estado = 'all'"
          )

        //- Document Cards
        button.w-full.text-left.rounded-lg.border.p-3.transition(
          v-for="item in filtered"
          :key="`${item.tipo}-${item.filename}`"
          class="hover:border-primary/50 focus:outline-none"
          :class="selectedDoc && selectedDoc.tipo === item.tipo && selectedDoc.filename === item.filename ? 'border-primary bg-primary/5 shadow-sm' : 'border-default bg-elevated'"
          @click="handleSelect(item)"
        )
          .flex.items-center.justify-between.gap-2.mb-1
            .flex.items-center(class="gap-1.5")
              DocTypeBadge(:tipo="item.tipo" size="xs")
              span.font-mono.text-xs.font-bold.text-foreground {{ item.id }}
            DocStatusBadge(:status="item.estado" size="xs")

          h3.text-sm.font-semibold.text-foreground.line-clamp-2.mb-1
            | {{ item.titulo }}

          .flex.items-center.justify-between.text-xs.text-muted.mt-2
            span.truncate(v-if="item.autores")
              | {{ item.autores }}
            span.ml-auto(v-if="item.fecha")
              | {{ item.fecha }}

    //- Right Column / Document Reader (full width on small screens when doc is active)
    .flex.h-full.flex-1.flex-col.overflow-hidden.rounded-xl.border.border-default.bg-elevated(
      :class="selectedDoc ? 'flex' : 'hidden md:flex'"
    )
      //- Empty State (No Document Selected)
      .flex.h-full.flex-col.items-center.justify-center.p-8.text-center(v-if="!selectedDoc && !isDetailLoading")
        .rounded-full.bg-primary.p-4.mb-4(class="bg-opacity-10")
          UIcon.size-10.text-primary(name="i-lucide-file-text")
        h2.text-xl.font-bold.text-foreground Visor de Documentos de Producto
        p.text-sm.text-muted.max-w-md.mt-2
          | Selecciona un requerimiento funcional (RF) o especificación técnica (SPEC) del panel izquierdo para consultar su versión oficial en el monorepo.
        .flex.items-center.gap-2.mt-6
          UBadge(color="info" variant="subtle" size="md")
            | {{ `${rfCount} Requerimientos Funcionales` }}
          UBadge(color="primary" variant="subtle" size="md")
            | {{ `${specsCount} Especificaciones Técnicas` }}

      //- Loading Detail State
      .flex.h-full.flex-col.p-6.space-y-4(v-else-if="isDetailLoading")
        .flex.items-center.justify-between
          USkeleton(class="h-6 w-48")
          USkeleton(class="h-8 w-32")
        USkeleton(class="h-10 w-3/4")
        .flex.gap-2
          USkeleton(class="h-6 w-24")
          USkeleton(class="h-6 w-24")
        USkeleton(class="h-4 w-full mt-6")
        USkeleton(class="h-4 w-full")
        USkeleton(class="h-4 w-2/3")

      //- Error State
      .flex.h-full.flex-col.items-center.justify-center.p-8.text-center(v-else-if="detailError")
        UIcon.size-10.text-error.mb-3(name="i-lucide-alert-triangle")
        h3.text-lg.font-semibold.text-foreground Error al cargar documento
        p.text-sm.text-muted.mt-1 {{ detailError }}
        UButton.mt-4(label="Volver a la lista" color="neutral" variant="outline" @click="handleBackToList")

      //- Document View
      .flex.h-full.flex-col.overflow-hidden(v-else-if="selectedDoc")
        //- Top Navigation / Actions Bar
        .flex.items-center.justify-between.border-b.border-default.px-6.py-3.bg-elevated.shrink-0
          .flex.items-center.gap-2
            UButton(
              icon="i-lucide-arrow-left"
              label="Volver"
              size="xs"
              color="neutral"
              variant="ghost"
              class="md:hidden"
              @click="handleBackToList"
            )
            span.font-mono.text-xs.text-muted
              | {{ `docs/${selectedDoc.tipo}/${selectedDoc.filename}` }}

          .flex.items-center.gap-2
            UButton(
              icon="i-lucide-link"
              label="Copiar enlace"
              size="xs"
              color="neutral"
              variant="outline"
              @click="copyDocumentLink"
            )
            UButton(
              :to="getGitHubUrl(selectedDoc.tipo, selectedDoc.filename)"
              target="_blank"
              icon="i-simple-icons-github"
              label="Ver en GitHub"
              size="xs"
              color="primary"
              variant="solid"
            )

        //- Content Scrollable Area
        .flex-1.overflow-y-auto.px-6.py-6(class="lg:px-12")
          //- Document Metadata Header Card
          .mb-6.rounded-xl.border.border-default.bg-muted.p-5(class="bg-opacity-10")
            .flex.flex-wrap.items-center.gap-2.mb-3
              DocTypeBadge(:tipo="selectedDoc.tipo" size="sm")
              span.font-mono.text-sm.font-bold.text-foreground {{ selectedDoc.frontmatter.id || selectedDoc.filename }}
              DocStatusBadge(:status="selectedDoc.frontmatter.estado" size="sm")

            h1.text-2xl.font-bold.text-foreground.mb-4(class="lg:text-3xl")
              | {{ selectedDoc.frontmatter.titulo || selectedDoc.filename }}

            //- Metadata Grid
            .grid.grid-cols-1.gap-3.text-xs.border-t.border-default.pt-3(class="sm:grid-cols-2 lg:grid-cols-4")
              .flex.flex-col(v-if="selectedDoc.frontmatter.fecha")
                span.text-muted Fecha
                span.font-medium.text-foreground {{ selectedDoc.frontmatter.fecha }}

              .flex.flex-col(v-if="selectedDoc.frontmatter.autores")
                span.text-muted Autores
                span.font-medium.text-foreground
                  | {{ Array.isArray(selectedDoc.frontmatter.autores) ? selectedDoc.frontmatter.autores.join(', ') : selectedDoc.frontmatter.autores }}

              .flex.flex-col(v-if="selectedDoc.frontmatter.componentes")
                span.text-muted Componentes
                span.font-medium.text-foreground
                  | {{ Array.isArray(selectedDoc.frontmatter.componentes) ? selectedDoc.frontmatter.componentes.join(', ') : selectedDoc.frontmatter.componentes }}

              .flex.flex-col(v-if="selectedDoc.frontmatter.origen")
                span.text-muted Origen
                span.font-medium.text-foreground {{ selectedDoc.frontmatter.origen }}

              .flex.flex-col(v-if="selectedDoc.frontmatter.confluence")
                span.text-muted Procedencia Confluence
                a.text-primary.underline.font-medium.inline-flex.items-center.gap-1(
                  v-if="selectedDoc.frontmatter.confluence.url"
                  :href="selectedDoc.frontmatter.confluence.url"
                  target="_blank"
                  rel="noopener noreferrer"
                )
                  | {{ `Página #${selectedDoc.frontmatter.confluence.id || 'Link'}` }}
                  UIcon.size-3(name="i-lucide-external-link")
                span.font-medium.text-foreground(v-else)
                  | {{ `ID: ${selectedDoc.frontmatter.confluence.id}` }}

          //- Markdown Body Container
          .prose.prose-slate.max-w-none.text-foreground(class="dark:prose-invert")
            .space-y-4(v-if="isRendering")
              USkeleton(class="h-4 w-full")
              USkeleton(class="h-4 w-5/6")
              USkeleton(class="h-4 w-4/6")
            .doc-markdown-body(v-else v-html="renderedHtml")
</template>

<style scoped>
:deep(.doc-markdown-body h1) {
  font-size: 1.75rem;
  font-weight: 700;
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
  color: var(--ui-text-highlighted, #0f172a);
}

:deep(.doc-markdown-body h2) {
  font-size: 1.35rem;
  font-weight: 700;
  margin-top: 1.5rem;
  margin-bottom: 0.5rem;
  padding-bottom: 0.25rem;
  border-bottom: 1px solid var(--ui-border, #e2e8f0);
  color: var(--ui-text-highlighted, #0f172a);
}

:deep(.doc-markdown-body h3) {
  font-size: 1.15rem;
  font-weight: 600;
  margin-top: 1.25rem;
  margin-bottom: 0.5rem;
  color: var(--ui-text-highlighted, #0f172a);
}

:deep(.doc-markdown-body p) {
  margin-bottom: 0.85rem;
  line-height: 1.625;
}

:deep(.doc-markdown-body ul) {
  list-style-type: disc;
  padding-left: 1.5rem;
  margin-bottom: 0.85rem;
}

:deep(.doc-markdown-body ol) {
  list-style-type: decimal;
  padding-left: 1.5rem;
  margin-bottom: 0.85rem;
}

:deep(.doc-markdown-body li) {
  margin-bottom: 0.25rem;
}

:deep(.doc-markdown-body blockquote) {
  border-left: 4px solid var(--ui-primary, #3b82f6);
  padding-left: 1rem;
  margin: 1rem 0;
  font-style: italic;
  color: var(--ui-text-muted, #64748b);
}

:deep(.doc-markdown-body table) {
  width: 100%;
  border-collapse: collapse;
  margin: 1.25rem 0;
  font-size: 0.875rem;
}

:deep(.doc-markdown-body th) {
  border: 1px solid var(--ui-border, #e2e8f0);
  background-color: var(--ui-bg-elevated, #f8fafc);
  padding: 0.5rem 0.75rem;
  text-align: left;
  font-weight: 600;
}

:deep(.doc-markdown-body td) {
  border: 1px solid var(--ui-border, #e2e8f0);
  padding: 0.5rem 0.75rem;
}

:deep(.doc-markdown-body pre) {
  background-color: var(--ui-bg-elevated, #0f172a);
  color: #f8fafc;
  padding: 1rem;
  border-radius: 0.5rem;
  overflow-x: auto;
  font-family: ui-monospace, monospace;
  font-size: 0.875rem;
  margin: 1rem 0;
}

:deep(.doc-markdown-body code:not(pre code)) {
  background-color: var(--ui-bg-muted, #f1f5f9);
  padding: 0.15rem 0.35rem;
  border-radius: 0.25rem;
  font-family: ui-monospace, monospace;
  font-size: 0.875em;
}

:deep(.doc-markdown-body hr) {
  border: 0;
  border-top: 1px solid var(--ui-border, #e2e8f0);
  margin: 1.5rem 0;
}

:deep(.doc-markdown-body input[type="checkbox"]) {
  vertical-align: middle;
  margin-right: 0.5rem;
}
</style>
