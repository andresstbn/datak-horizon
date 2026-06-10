import process from 'node:process'
import 'dotenv/config'
import { closeDb, getDb } from './client'
import {
  aiArtifacts,
  conversationMessages,
  conversations,
  insights,
  initiatives,
  requirements,
  users
} from './schema'

/**
 * Idempotent-ish development seed. Clears the domain tables and inserts a small
 * but representative dataset so the app has something to render locally.
 *
 * Run with `pnpm db:seed`.
 */
function first<T>(rows: T[], label: string): T {
  const row = rows[0]
  if (!row) {
    throw new Error(`Seed expected at least one ${label} row.`)
  }
  return row
}

async function main() {
  const db = getDb()

  console.log('Clearing existing data…')
  // Order matters because of FK constraints (children first).
  await db.delete(aiArtifacts)
  await db.delete(requirements)
  await db.delete(insights)
  await db.delete(conversationMessages)
  await db.delete(conversations)
  await db.delete(initiatives)
  await db.delete(users)

  console.log('Inserting users…')
  const seedUsers = await db
    .insert(users)
    .values([
      {
        firebaseUid: 'seed-ana',
        email: 'ana@datak.example',
        displayName: 'Ana García',
        role: 'admin'
      },
      {
        firebaseUid: 'seed-luis',
        email: 'luis@datak.example',
        displayName: 'Luis Romero',
        role: 'member'
      },
      {
        firebaseUid: 'seed-marta',
        email: 'marta@datak.example',
        displayName: 'Marta Ortega',
        role: 'member'
      }
    ])
    .returning()
  const ana = first(seedUsers, 'user')
  const luis = seedUsers[1] ?? ana
  const marta = seedUsers[2] ?? ana

  console.log('Inserting initiatives…')
  const seedInitiatives = await db
    .insert(initiatives)
    .values([
      {
        title: 'IVA diferencial',
        slug: 'iva-diferencial',
        description: 'Refinamiento colaborativo del impuesto IVA diferencial para servicios digitales y plataformas SaaS.',
        status: 'refinement',
        priority: 'high',
        risk: 'medium',
        health: 'on_track',
        functionalOwnerId: ana.id,
        technicalOwnerId: luis.id,
        createdById: ana.id,
        targetDate: new Date('2026-09-30'),
        committedDate: new Date('2026-08-31'),
        estimatedDate: new Date('2026-09-15')
      },
      {
        title: 'Portal único de clientes',
        slug: 'portal-unico-clientes',
        description: 'Unificar el acceso de clientes a documentos, facturas y soporte en un único portal.',
        status: 'in_development',
        priority: 'medium',
        risk: 'low',
        health: 'at_risk',
        functionalOwnerId: marta.id,
        technicalOwnerId: luis.id,
        createdById: marta.id,
        targetDate: new Date('2026-07-15'),
        committedDate: new Date('2026-07-15'),
        delayReason: 'Dependencia técnica en SSO'
      }
    ])
    .returning()
  const iva = first(seedInitiatives, 'initiative')
  const portal = seedInitiatives[1] ?? iva

  console.log('Inserting conversations…')
  const seedConversations = await db
    .insert(conversations)
    .values([
      {
        initiativeId: iva.id,
        title: 'Discusión inicial de alcance',
        source: 'manual',
        createdById: marta.id
      },
      {
        initiativeId: iva.id,
        title: 'Preguntas del equipo de ingeniería',
        source: 'slack_import',
        createdById: luis.id
      },
      {
        initiativeId: portal.id,
        title: 'Soporte para clientes externos',
        source: 'meeting',
        createdById: ana.id
      }
    ])
    .returning()
  const conv1 = first(seedConversations, 'conversation')
  const conv2 = seedConversations[1] ?? conv1
  const conv3 = seedConversations[2] ?? conv1

  console.log('Inserting conversation messages…')
  await db
    .insert(conversationMessages)
    .values([
      {
        conversationId: conv1.id,
        authorId: marta.id,
        role: 'user',
        contentType: 'markdown',
        body: 'Hola a todos. Iniciamos la conversación para definir el alcance del **IVA diferencial** para la venta de servicios SaaS en el mercado local.'
      },
      {
        conversationId: conv1.id,
        authorId: luis.id,
        role: 'assistant',
        contentType: 'markdown',
        body: 'Entendido. Según las normativas tributarias recientes, el IVA diferencial aplica a tasas del **10%** en comparación con la tasa general del **19%**.'
      },
      {
        conversationId: conv1.id,
        authorId: marta.id,
        role: 'user',
        contentType: 'markdown',
        body: '¿Necesitamos diferenciar esto por país de facturación o es a nivel nacional?'
      },
      {
        conversationId: conv1.id,
        authorId: luis.id,
        role: 'assistant',
        contentType: 'markdown',
        body: 'Es a nivel nacional, pero debemos validar la dirección de facturación y el emisor del medio de pago para aplicar el impuesto correcto.'
      },
      {
        conversationId: conv2.id,
        authorId: luis.id,
        role: 'user',
        contentType: 'markdown',
        body: '¿Cómo implementaremos el validador del país del emisor? ¿Con un servicio externo?'
      },
      {
        conversationId: conv2.id,
        authorId: ana.id,
        role: 'assistant',
        contentType: 'markdown',
        body: 'Podemos usar una base de datos local de prefijos BIN de tarjetas. No es necesario realizar llamadas externas en tiempo de pago.'
      },
      {
        conversationId: conv3.id,
        authorId: ana.id,
        role: 'user',
        contentType: 'markdown',
        body: '¿El portal de clientes debe soportar autenticación por email/password clásica o solo Google?'
      }
    ])

  console.log('Inserting insights…')
  await db
    .insert(insights)
    .values([
      {
        initiativeId: iva.id,
        sourceConversationId: conv1.id,
        type: 'constraint',
        body: 'El IVA diferencial aplica únicamente a servicios SaaS facturados localmente con tarjeta emitida en el país.',
        source: 'manual',
        confidence: 0.95,
        authorId: marta.id
      },
      {
        initiativeId: iva.id,
        sourceConversationId: conv2.id,
        type: 'decision',
        body: 'Adoptar una base de datos local de prefijos BIN (como MaxMind o similar) para resolver el país del emisor de forma offline y rápida.',
        source: 'ai_extracted',
        confidence: 0.88,
        authorId: luis.id
      },
      {
        initiativeId: iva.id,
        sourceConversationId: conv1.id,
        type: 'rule',
        body: 'Si el emisor de la tarjeta es internacional, se aplica la tasa de IVA estándar del 19% por defecto.',
        source: 'manual',
        confidence: 1.0,
        authorId: ana.id
      }
    ])

  console.log('Inserting requirements…')
  const reqs = await db
    .insert(requirements)
    .values([
      {
        initiativeId: iva.id,
        sourceConversationId: conv2.id,
        title: 'Detector de BIN de tarjeta',
        description: 'Implementar un módulo local para verificar el código BIN de la tarjeta bancaria de entrada y mapear su país de origen.',
        priority: 'must',
        status: 'refining',
        createdById: luis.id
      },
      {
        initiativeId: iva.id,
        sourceConversationId: conv1.id,
        title: 'Cálculo dinámico en checkout',
        description: 'Integrar el cálculo de la tasa (10% vs 19%) dinámicamente en el frontend antes de la confirmación final de pago.',
        priority: 'must',
        status: 'draft',
        createdById: marta.id
      }
    ])
    .returning()
  const req1 = first(reqs, 'requirement')

  console.log('Inserting AI artifacts…')
  await db
    .insert(aiArtifacts)
    .values([
      {
        initiativeId: iva.id,
        sourceConversationId: conv1.id,
        type: 'refinement_questions',
        title: 'Preguntas de refinamiento sobre pasarela',
        content: '### Preguntas Clave\n\n1. ¿Qué pasarelas de pago se soportarán en la primera fase?\n2. ¿Qué hacer si hay discrepancia entre la IP y la tarjeta?\n3. ¿Se requiere reporte de conciliación de impuestos?',
        status: 'accepted',
        createdById: ana.id
      },
      {
        initiativeId: iva.id,
        requirementId: req1.id,
        type: 'technical_plan',
        title: 'Plan de integración de cálculo dinámico',
        content: '### Plan Técnico\n\n- **Checkout API**: Recibe BIN e IP.\n- **Cache**: Mapea BIN a país en Redis.\n- **Resultado**: Retorna desglose de tasa a aplicar.',
        status: 'draft',
        createdById: luis.id
      }
    ])

  console.log('Seed completed successfully.')
}

main()
  .catch((error) => {
    console.error('Seed failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await closeDb()
  })
