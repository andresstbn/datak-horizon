import type { InitiativeDetail } from '../../shared/types/initiative'
import type { Requirement } from '../../shared/types/requirement'
import type { Insight } from '../../shared/types/insight'
import type { Conversation } from '../../shared/types/conversation'
import type { AIArtifact } from '../../shared/types/artifact'

async function sendSlackMessage(blocks: unknown[], fallbackText: string) {
  try {
    const config = useRuntimeConfig()
    const webhookUrl = config.slackWebhookUrl
    if (!webhookUrl) {
      console.warn('Slack Webhook URL not configured. Skipping notification.')
      return
    }

    const payload = {
      text: fallbackText,
      blocks
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Failed to send Slack notification: ${response.status} - ${errorText}`)
    }
  } catch (error) {
    console.error('Error sending Slack notification:', error)
  }
}

export const slackService = {
  async notifyInitiativeCreated(initiative: InitiativeDetail, creatorName?: string) {
    const config = useRuntimeConfig()
    const baseUrl = config.appBaseUrl || 'http://localhost:3000'
    const link = `${baseUrl}/iniciativas/${initiative.id}`
    const fallbackText = `Nueva iniciativa creada: ${initiative.title}`

    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🚀 Nueva Iniciativa Creada',
          emoji: true
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Título:* ${initiative.title}\n*Creado por:* ${creatorName || 'Sistema'}\n*Estado:* \`${initiative.status}\`\n*Prioridad:* \`${initiative.priority}\``
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Descripción:*\n${initiative.description || '_Sin descripción._'}`
        }
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '👀 Ver Iniciativa',
              emoji: true
            },
            url: link,
            action_id: 'view_initiative'
          }
        ]
      }
    ]

    // Send asynchronously to not block response
    sendSlackMessage(blocks, fallbackText)
  },

  async notifyRequirementCreated(initiativeTitle: string, requirement: Requirement, creatorName?: string) {
    const config = useRuntimeConfig()
    const baseUrl = config.appBaseUrl || 'http://localhost:3000'
    const link = `${baseUrl}/iniciativas/${requirement.initiativeId}?tab=requirements`
    const fallbackText = `Nuevo requerimiento añadido a "${initiativeTitle}": ${requirement.title}`

    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '📝 Nuevo Requerimiento Añadido',
          emoji: true
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Iniciativa:* ${initiativeTitle}\n*Requerimiento:* ${requirement.title}\n*Creado por:* ${creatorName || 'Sistema'}\n*Prioridad:* \`${requirement.priority}\`\n*Estado:* \`${requirement.status}\``
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Descripción:*\n${requirement.description || '_Sin descripción._'}`
        }
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '👀 Ver Requerimientos',
              emoji: true
            },
            url: link,
            action_id: 'view_requirements'
          }
        ]
      }
    ]

    sendSlackMessage(blocks, fallbackText)
  },

  async notifyInsightCreated(initiativeTitle: string, insight: Insight, creatorName?: string) {
    const config = useRuntimeConfig()
    const baseUrl = config.appBaseUrl || 'http://localhost:3000'
    const link = `${baseUrl}/iniciativas/${insight.initiativeId}?tab=insights`
    const fallbackText = `Nuevo insight añadido a "${initiativeTitle}": ${insight.body.substring(0, 50)}...`

    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '💡 Nuevo Insight Extraído',
          emoji: true
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Iniciativa:* ${initiativeTitle}\n*Creado por:* ${creatorName || 'Sistema'}\n*Tipo:* \`${insight.type}\`\n*Origen:* \`${insight.source}\``
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Insight:*\n${insight.body}`
        }
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '👀 Ver Insights',
              emoji: true
            },
            url: link,
            action_id: 'view_insights'
          }
        ]
      }
    ]

    sendSlackMessage(blocks, fallbackText)
  },

  async notifyConversationCreated(initiativeTitle: string, conversation: Conversation, creatorName?: string) {
    const config = useRuntimeConfig()
    const baseUrl = config.appBaseUrl || 'http://localhost:3000'
    const link = `${baseUrl}/iniciativas/${conversation.initiativeId}?tab=conversations`
    const fallbackText = `Nueva conversación añadida a "${initiativeTitle}": ${conversation.title}`

    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '💬 Nueva Conversación Registrada',
          emoji: true
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Iniciativa:* ${initiativeTitle}\n*Título:* ${conversation.title}\n*Creado por:* ${creatorName || 'Sistema'}\n*Origen:* \`${conversation.source}\``
        }
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '👀 Ver Conversaciones',
              emoji: true
            },
            url: link,
            action_id: 'view_conversations'
          }
        ]
      }
    ]

    sendSlackMessage(blocks, fallbackText)
  },

  async notifyArtifactCreated(initiativeTitle: string, artifact: AIArtifact, creatorName?: string) {
    const config = useRuntimeConfig()
    const baseUrl = config.appBaseUrl || 'http://localhost:3000'
    const link = `${baseUrl}/iniciativas/${artifact.initiativeId}?tab=artifacts`
    const fallbackText = `Nuevo artefacto generado en "${initiativeTitle}": ${artifact.title}`

    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '📦 Nuevo Artefacto Generado',
          emoji: true
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Iniciativa:* ${initiativeTitle}\n*Artefacto:* ${artifact.title}\n*Creado por:* ${creatorName || 'Sistema'}\n*Tipo:* \`${artifact.type}\`\n*Estado:* \`${artifact.status}\``
        }
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '👀 Ver Artefactos',
              emoji: true
            },
            url: link,
            action_id: 'view_artifacts'
          }
        ]
      }
    ]

    sendSlackMessage(blocks, fallbackText)
  }
}
