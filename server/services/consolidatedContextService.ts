import { initiativeRepository } from '../repositories/initiativeRepository'
import { conversationRepository } from '../repositories/conversationRepository'
import { conversationMessageRepository } from '../repositories/conversationMessageRepository'
import { insightRepository } from '../repositories/insightRepository'
import { requirementRepository } from '../repositories/requirementRepository'
import { aiArtifactRepository } from '../repositories/aiArtifactRepository'

export const consolidatedContextService = {
  async generateMarkdown(initiativeId: string): Promise<string> {
    const initiative = await initiativeRepository.findById(initiativeId)
    if (!initiative) {
      throw new Error('Initiative not found')
    }

    const conversations = await conversationRepository.listByInitiative(initiativeId)
    const insights = await insightRepository.listByInitiative(initiativeId)
    const requirements = await requirementRepository.listByInitiative(initiativeId)
    const artifacts = await aiArtifactRepository.listByInitiative(initiativeId)

    // Build the Markdown context
    let md = `# Contexto Consolidado: ${initiative.title}\n\n`

    md += `## 📋 Resumen Ejecutivo\n`
    md += `- **Descripción**: ${initiative.description || 'Sin descripción todavía.'}\n`
    md += `- **Estado**: ${initiative.status}\n`
    md += `- **Salud (Health)**: ${initiative.health}\n`
    md += `- **Prioridad**: ${initiative.priority}\n`
    md += `- **Riesgo**: ${initiative.risk}\n`
    md += `- **Responsable Funcional**: ${initiative.functionalOwner?.displayName || initiative.functionalOwner?.email || 'No asignado'}\n`
    md += `- **Responsable Técnico**: ${initiative.technicalOwner?.displayName || initiative.technicalOwner?.email || 'No asignado'}\n`
    
    const formatDate = (d: Date | null) => d ? d.toISOString().split('T')[0] : 'No definida'
    md += `- **Fecha Objetivo**: ${formatDate(initiative.targetDate)}\n`
    md += `- **Fecha Comprometida**: ${formatDate(initiative.committedDate)}\n`
    md += `- **Fecha Estimada**: ${formatDate(initiative.estimatedDate)}\n`
    if (initiative.delayReason) {
      md += `- **Motivo de Retraso**: ${initiative.delayReason}\n`
    }
    md += `\n---\n\n`

    md += `## 💬 Conversaciones de Refinamiento\n\n`
    if (conversations.length === 0) {
      md += `No se registran conversaciones para esta iniciativa.\n\n`
    } else {
      for (const conv of conversations) {
        md += `### 🗣️ Hilo: ${conv.title} (Origen: ${conv.source})\n`
        md += `*Creado por: ${conv.createdBy?.displayName || conv.createdBy?.email || 'Sistema'}*\n\n`

        const messages = await conversationMessageRepository.listByConversation(conv.id)
        if (messages.length === 0) {
          md += `*Sin mensajes.*\n\n`
        } else {
          for (const msg of messages) {
            const authorName = msg.author?.displayName || msg.author?.email || 'Usuario'
            md += `**[${msg.role}] ${authorName}** (${msg.contentType}):\n${msg.body}\n\n`
          }
        }
        md += `---\n\n`
      }
    }

    md += `## 💡 Insights y Reglas de Negocio\n\n`
    if (insights.length === 0) {
      md += `No se registran insights todavía.\n\n`
    } else {
      for (const ins of insights) {
        md += `- **[${ins.type.toUpperCase()}]**: ${ins.body}\n`
        md += `  *(Origen: ${ins.source} | Confianza: ${ins.confidence !== null ? ins.confidence : 'N/A'})*\n`
        if (ins.sourceConversation) {
          md += `  *(Derivado de la conversación: "${ins.sourceConversation.title}")*\n`
        }
        md += `\n`
      }
      md += `\n`
    }
    md += `---\n\n`

    md += `## 🎯 Requerimientos Refinados\n\n`
    if (requirements.length === 0) {
      md += `No se registran requerimientos todavía.\n\n`
    } else {
      for (const req of requirements) {
        md += `### 📌 ${req.title}\n`
        md += `- **Prioridad**: ${req.priority} | **Estado**: ${req.status}\n`
        md += `- **Descripción**:\n${req.description}\n\n`
        if (req.sourceConversation) {
          md += `*(Origen: Conversación "${req.sourceConversation.title}")*\n\n`
        }
      }
    }
    md += `---\n\n`

    md += `## 📂 Artefactos Técnicos y Funcionales\n\n`
    if (artifacts.length === 0) {
      md += `No hay artefactos asociados.\n\n`
    } else {
      for (const art of artifacts) {
        md += `### 📄 ${art.title} (Tipo: ${art.type} | Estado: ${art.status})\n`
        if (art.requirement) {
          md += `*Asociado al requerimiento: "${art.requirement.title}"*\n\n`
        }
        md += `\`\`\`markdown\n${art.content}\n\`\`\`\n\n`
      }
    }

    return md
  }
}
