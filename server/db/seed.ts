import process from 'node:process'
import 'dotenv/config'
import { eq } from 'drizzle-orm'
import { closeDb, getDb } from './client'
import {
  comments,
  decisions,
  initiativeActivity,
  initiatives,
  specifications,
  specificationVersions,
  users
} from './schema'

/**
 * Idempotent-ish development seed. Clears the domain tables and inserts a small
 * but representative dataset so the app has something to render locally.
 *
 * Run with `pnpm db:seed`.
 */
/** Assert that an inserted row exists (returning() yields a possibly-empty array). */
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
  await db.delete(initiativeActivity)
  await db.delete(comments)
  await db.delete(decisions)
  await db.delete(specificationVersions)
  await db.delete(specifications)
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
        title: 'Portal único de clientes',
        slug: 'portal-unico-clientes',
        description:
          'Unificar el acceso de clientes a documentos, facturas y soporte en un único portal.',
        status: 'in_progress',
        priority: 'high',
        risk: 'medium',
        functionalOwnerId: ana.id,
        technicalOwnerId: luis.id,
        createdById: ana.id,
        targetDate: new Date('2026-09-30'),
        committedDate: new Date('2026-08-31'),
        estimatedDate: new Date('2026-10-15'),
        isDelayed: true,
        delayReason: 'Dependencia pendiente del proveedor de identidad.'
      },
      {
        title: 'Rediseño del flujo de facturación',
        slug: 'rediseno-flujo-facturacion',
        description:
          'Simplificar la generación y el envío de facturas para reducir errores manuales.',
        status: 'in_review',
        priority: 'medium',
        risk: 'low',
        functionalOwnerId: marta.id,
        technicalOwnerId: luis.id,
        createdById: marta.id,
        targetDate: new Date('2026-07-15'),
        committedDate: new Date('2026-07-15')
      }
    ])
    .returning()
  const portal = first(seedInitiatives, 'initiative')
  const billing = seedInitiatives[1] ?? portal

  console.log('Inserting specifications…')
  const portalSpec = first(
    await db.insert(specifications).values({ initiativeId: portal.id }).returning(),
    'specification'
  )

  const portalVersions = await db
    .insert(specificationVersions)
    .values([
      {
        specificationId: portalSpec.id,
        version: 1,
        status: 'archived',
        authorId: ana.id,
        summary: 'Versión inicial de la especificación.',
        sections: {
          contexto: 'Los clientes acceden hoy a la información por canales dispersos.',
          problema: 'No existe un punto único de acceso.',
          objetivo: 'Centralizar el acceso en un portal.'
        }
      },
      {
        specificationId: portalSpec.id,
        version: 2,
        status: 'approved',
        authorId: ana.id,
        approvedById: ana.id,
        approvedAt: new Date('2026-05-20'),
        summary: 'Se añade el alcance de autenticación SSO.',
        sections: {
          contexto: 'Los clientes acceden hoy a la información por canales dispersos.',
          problema: 'No existe un punto único de acceso ni autenticación unificada.',
          objetivo: 'Centralizar el acceso y ofrecer SSO.',
          alcance: 'Documentos, facturas y soporte.',
          fueraDeAlcance: 'Pagos en línea (fase futura).'
        }
      }
    ])
    .returning()
  // version 2 is the approved version (index 1 of the inserted rows).
  const portalV2 = portalVersions[1] ?? first(portalVersions, 'specification version')

  // The approved version is the current source of truth.
  await db
    .update(specifications)
    .set({ currentVersionId: portalV2.id })
    .where(eq(specifications.id, portalSpec.id))

  await db
    .insert(specifications)
    .values({ initiativeId: billing.id })
    .returning()

  console.log('Inserting decisions…')
  await db.insert(decisions).values([
    {
      initiativeId: portal.id,
      title: 'Usar Firebase Authentication como proveedor de identidad',
      status: 'accepted',
      context: 'Necesitamos autenticación con Google para usuarios internos.',
      alternatives: 'Auth0, Keycloak autohospedado, solución propia.',
      decision: 'Adoptar Firebase Authentication con el proveedor de Google.',
      rationale: 'Menor coste operativo y rápida integración con el stack actual.',
      consequences: 'Dependencia del ecosistema Firebase para identidad.',
      authorId: luis.id
    }
  ])

  console.log('Inserting comments…')
  const question = first(
    await db
      .insert(comments)
      .values({
        initiativeId: portal.id,
        authorId: marta.id,
        body: '¿El portal debe soportar también clientes sin cuenta de Google?',
        isQuestion: true
      })
      .returning(),
    'comment'
  )

  await db.insert(comments).values({
    initiativeId: portal.id,
    parentId: question.id,
    authorId: luis.id,
    body: 'De momento solo cuentas corporativas con Google.'
  })

  console.log('Inserting activity…')
  await db.insert(initiativeActivity).values([
    {
      initiativeId: portal.id,
      actorId: ana.id,
      action: 'spec.approved',
      detail: 'Aprobada la versión 2 de la especificación.'
    },
    {
      initiativeId: portal.id,
      actorId: luis.id,
      action: 'initiative.delayed',
      detail: 'Marcada como retrasada por dependencia externa.'
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
