<script setup lang="ts">
import { initiativeService } from '~/services/initiativeService'
import type { InitiativeDetail } from '~~/shared/types/initiative'

const props = defineProps<{
  initiative: InitiativeDetail
}>()

const emit = defineEmits<{
  updated: []
}>()

const { getIdToken } = useAuth()
const toast = useToast()
const usersList = ref<any[]>([])
const isSubmitting = ref(false)

const form = ref({
  status: props.initiative.status,
  priority: props.initiative.priority,
  risk: props.initiative.risk,
  health: props.initiative.health,
  functionalOwnerId: props.initiative.functionalOwner?.id || null,
  technicalOwnerId: props.initiative.technicalOwner?.id || null,
  targetDate: toLocalDateString(props.initiative.targetDate),
  committedDate: toLocalDateString(props.initiative.committedDate),
  estimatedDate: toLocalDateString(props.initiative.estimatedDate),
  delayReason: props.initiative.delayReason || ''
})

const statusOptions = [
  { label: 'Descubrimiento', value: 'discovery' },
  { label: 'Refinamiento', value: 'refinement' },
  { label: 'Listo', value: 'ready' },
  { label: 'En desarrollo', value: 'in_development' },
  { label: 'QA', value: 'qa' },
  { label: 'Desplegado', value: 'released' },
  { label: 'Bloqueado', value: 'blocked' },
  { label: 'Cancelado', value: 'cancelled' }
]

const priorityOptions = [
  { label: 'Baja', value: 'low' },
  { label: 'Media', value: 'medium' },
  { label: 'Alta', value: 'high' }
]

const riskOptions = [
  { label: 'Bajo', value: 'low' },
  { label: 'Medio', value: 'medium' },
  { label: 'Alto', value: 'high' }
]

const healthOptions = [
  { label: 'Al día (On Track)', value: 'on_track' },
  { label: 'En riesgo (At Risk)', value: 'at_risk' },
  { label: 'Retrasado (Off Track)', value: 'off_track' }
]

const ownerOptions = computed(() => [
  { label: 'Sin asignar', value: null },
  ...usersList.value.map(u => ({
    label: u.displayName || u.email,
    value: u.id
  }))
])

function toLocalDateString(isoStr: string | null): string {
  if (!isoStr) return ''
  const date = new Date(isoStr)
  if (Number.isNaN(date.getTime())) return ''
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

async function fetchUsers() {
  const token = await getIdToken()
  if (!token) return
  try {
    usersList.value = await $fetch('/api/users', {
      headers: { Authorization: `Bearer ${token}` }
    })
  } catch (error) {
    console.error('Error fetching users:', error)
  }
}

async function handleSubmit() {
  const token = await getIdToken()
  if (!token) return

  isSubmitting.value = true
  try {
    const payload = {
      status: form.value.status,
      priority: form.value.priority,
      risk: form.value.risk,
      health: form.value.health,
      functionalOwnerId: form.value.functionalOwnerId,
      technicalOwnerId: form.value.technicalOwnerId,
      targetDate: form.value.targetDate ? new Date(form.value.targetDate).toISOString() : null,
      committedDate: form.value.committedDate ? new Date(form.value.committedDate).toISOString() : null,
      estimatedDate: form.value.estimatedDate ? new Date(form.value.estimatedDate).toISOString() : null,
      delayReason: form.value.delayReason.trim() || null
    }

    await initiativeService.update(token, props.initiative.id, payload)
    toast.add({
      title: 'Roadmap actualizado',
      description: 'Los metadatos se guardaron exitosamente.',
      icon: 'i-lucide-check'
    })
    emit('updated')
  } catch (error) {
    toast.add({
      title: 'Error',
      description: 'No se pudieron guardar los cambios.',
      color: 'error',
      icon: 'i-lucide-triangle-alert'
    })
  } finally {
    isSubmitting.value = false
  }
}

onMounted(fetchUsers)
</script>

<template lang="pug">
UPageCard(title="Metadatos de Hoja de Ruta" class="max-w-2xl mx-auto")
  template(#description)
    p.text-xs.text-muted Actualiza los estados, dueños y fechas que alimentan la vista ejecutiva.

  form.space-y-4(@submit.prevent="handleSubmit")
    .grid.grid-cols-1.gap-4(class="sm:grid-cols-2")
      UFormField(label="Estado de la Iniciativa" name="status")
        USelect(v-model="form.status" :items="statusOptions" class="w-full")

      UFormField(label="Salud del Esfuerzo (Health)" name="health")
        USelect(v-model="form.health" :items="healthOptions" class="w-full")

      UFormField(label="Prioridad" name="priority")
        USelect(v-model="form.priority" :items="priorityOptions" class="w-full")

      UFormField(label="Riesgo" name="risk")
        USelect(v-model="form.risk" :items="riskOptions" class="w-full")

      UFormField(label="Responsable Funcional" name="functionalOwnerId")
        USelect(v-model="form.functionalOwnerId" :items="ownerOptions" class="w-full")

      UFormField(label="Responsable Técnico" name="technicalOwnerId")
        USelect(v-model="form.technicalOwnerId" :items="ownerOptions" class="w-full")
      UFormField(name="targetDate")
        template(#label)
          .flex.items-center.gap-1
            span Fecha Objetivo
            UTooltip(text="La fecha deseada por el negocio para que la iniciativa esté disponible." :delay-duration="0")
              span.inline-flex.items-center.text-muted(class="pointer-events-auto cursor-help")
                UIcon(name="i-lucide-info" class="size-4")
        UInput(v-model="form.targetDate" type="date" class="w-full")

      UFormField(name="committedDate")
        template(#label)
          .flex.items-center.gap-1
            span Fecha Comprometida
            UTooltip(text="La fecha acordada formalmente entre el equipo técnico y de negocio tras el refinamiento." :delay-duration="0")
              span.inline-flex.items-center.text-muted(class="pointer-events-auto cursor-help")
                UIcon(name="i-lucide-info" class="size-4")
        UInput(v-model="form.committedDate" type="date" class="w-full")

      UFormField(name="estimatedDate")
        template(#label)
          .flex.items-center.gap-1
            span Fecha Estimada
            UTooltip(text="La proyección realista actual del equipo técnico basada en el avance real." :delay-duration="0")
              span.inline-flex.items-center.text-muted(class="pointer-events-auto cursor-help")
                UIcon(name="i-lucide-info" class="size-4")
        UInput(v-model="form.estimatedDate" type="date" class="w-full")

    UFormField(label="Motivo del Retraso" name="delayReason")
      UTextarea(
        v-model="form.delayReason"
        placeholder="Ej. Esperando definición del módulo de facturación de impuestos..."
        :rows="3"
        class="w-full"
      )

    .flex.items-center.justify-end.gap-3.pt-4.border-t.border-default
      UButton(
        type="submit"
        label="Guardar Cambios"
        color="primary"
        :loading="isSubmitting"
      )
</template>
