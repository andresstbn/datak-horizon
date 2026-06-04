import { relations } from 'drizzle-orm'
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from 'drizzle-orm/pg-core'

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const userRole = pgEnum('user_role', ['admin', 'member', 'viewer'])

export const initiativeStatus = pgEnum('initiative_status', [
  'planned',
  'in_progress',
  'in_review',
  'blocked',
  'completed'
])

export const priorityLevel = pgEnum('priority_level', ['low', 'medium', 'high'])

export const riskLevel = pgEnum('risk_level', ['low', 'medium', 'high'])

export const specStatus = pgEnum('spec_status', [
  'draft',
  'in_review',
  'approved',
  'archived'
])

export const decisionStatus = pgEnum('decision_status', [
  'proposed',
  'accepted',
  'superseded',
  'deprecated'
])

// ---------------------------------------------------------------------------
// Shared column helpers
// ---------------------------------------------------------------------------

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
}

// ---------------------------------------------------------------------------
// Users — application profile only. Authentication lives in Firebase.
// ---------------------------------------------------------------------------

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // Link to the Firebase Authentication identity.
    firebaseUid: text('firebase_uid').notNull(),
    email: text('email').notNull(),
    displayName: text('display_name'),
    photoUrl: text('photo_url'),
    role: userRole('role').default('member').notNull(),
    ...timestamps
  },
  table => [
    uniqueIndex('users_firebase_uid_idx').on(table.firebaseUid),
    uniqueIndex('users_email_idx').on(table.email)
  ]
)

// ---------------------------------------------------------------------------
// Initiatives — the central entity.
// ---------------------------------------------------------------------------

export const initiatives = pgTable(
  'initiatives',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    title: text('title').notNull(),
    slug: text('slug').notNull(),
    description: text('description'),
    status: initiativeStatus('status').default('planned').notNull(),
    priority: priorityLevel('priority').default('medium').notNull(),
    risk: riskLevel('risk').default('low').notNull(),
    functionalOwnerId: uuid('functional_owner_id').references(() => users.id, {
      onDelete: 'set null'
    }),
    technicalOwnerId: uuid('technical_owner_id').references(() => users.id, {
      onDelete: 'set null'
    }),
    targetDate: timestamp('target_date', { withTimezone: true }),
    committedDate: timestamp('committed_date', { withTimezone: true }),
    estimatedDate: timestamp('estimated_date', { withTimezone: true }),
    isDelayed: boolean('is_delayed').default(false).notNull(),
    delayReason: text('delay_reason'),
    createdById: uuid('created_by_id').references(() => users.id, {
      onDelete: 'set null'
    }),
    ...timestamps
  },
  table => [
    uniqueIndex('initiatives_slug_idx').on(table.slug),
    index('initiatives_status_idx').on(table.status)
  ]
)

// ---------------------------------------------------------------------------
// Living specification — one specification per initiative with versions.
// ---------------------------------------------------------------------------

export const specifications = pgTable(
  'specifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    initiativeId: uuid('initiative_id')
      .notNull()
      .references(() => initiatives.id, { onDelete: 'cascade' }),
    // The current approved version is the source of truth (nullable until approved).
    currentVersionId: uuid('current_version_id'),
    ...timestamps
  },
  table => [uniqueIndex('specifications_initiative_idx').on(table.initiativeId)]
)

export const specificationVersions = pgTable(
  'specification_versions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    specificationId: uuid('specification_id')
      .notNull()
      .references(() => specifications.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    status: specStatus('status').default('draft').notNull(),
    // Structured sections (contexto, problema, objetivo, alcance, …).
    sections: jsonb('sections').$type<Record<string, string>>().default({}).notNull(),
    summary: text('summary'),
    authorId: uuid('author_id').references(() => users.id, { onDelete: 'set null' }),
    approvedById: uuid('approved_by_id').references(() => users.id, {
      onDelete: 'set null'
    }),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    ...timestamps
  },
  table => [
    uniqueIndex('spec_versions_unique_idx').on(table.specificationId, table.version)
  ]
)

// ---------------------------------------------------------------------------
// Decisions — ADR-inspired records.
// ---------------------------------------------------------------------------

export const decisions = pgTable('decisions', {
  id: uuid('id').defaultRandom().primaryKey(),
  initiativeId: uuid('initiative_id')
    .notNull()
    .references(() => initiatives.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  status: decisionStatus('status').default('proposed').notNull(),
  context: text('context'),
  alternatives: text('alternatives'),
  decision: text('decision'),
  rationale: text('rationale'),
  consequences: text('consequences'),
  authorId: uuid('author_id').references(() => users.id, { onDelete: 'set null' }),
  ...timestamps
})

// ---------------------------------------------------------------------------
// Comments — threaded, can represent open questions.
// ---------------------------------------------------------------------------

export const comments = pgTable(
  'comments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    initiativeId: uuid('initiative_id')
      .notNull()
      .references(() => initiatives.id, { onDelete: 'cascade' }),
    // Self reference enables threaded replies.
    parentId: uuid('parent_id'),
    authorId: uuid('author_id').references(() => users.id, { onDelete: 'set null' }),
    body: text('body').notNull(),
    isQuestion: boolean('is_question').default(false).notNull(),
    isResolved: boolean('is_resolved').default(false).notNull(),
    resolvedById: uuid('resolved_by_id').references(() => users.id, {
      onDelete: 'set null'
    }),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    ...timestamps
  },
  table => [index('comments_initiative_idx').on(table.initiativeId)]
)

// ---------------------------------------------------------------------------
// Activity feed — recent changes shown on the initiative detail.
// ---------------------------------------------------------------------------

export const initiativeActivity = pgTable(
  'initiative_activity',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    initiativeId: uuid('initiative_id')
      .notNull()
      .references(() => initiatives.id, { onDelete: 'cascade' }),
    actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
    action: text('action').notNull(),
    detail: text('detail'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
  },
  table => [index('initiative_activity_initiative_idx').on(table.initiativeId)]
)

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const usersRelations = relations(users, ({ many }) => ({
  createdInitiatives: many(initiatives)
}))

export const initiativesRelations = relations(initiatives, ({ one, many }) => ({
  functionalOwner: one(users, {
    fields: [initiatives.functionalOwnerId],
    references: [users.id],
    relationName: 'functionalOwner'
  }),
  technicalOwner: one(users, {
    fields: [initiatives.technicalOwnerId],
    references: [users.id],
    relationName: 'technicalOwner'
  }),
  createdBy: one(users, {
    fields: [initiatives.createdById],
    references: [users.id],
    relationName: 'createdBy'
  }),
  specification: one(specifications, {
    fields: [initiatives.id],
    references: [specifications.initiativeId]
  }),
  decisions: many(decisions),
  comments: many(comments),
  activity: many(initiativeActivity)
}))

export const specificationsRelations = relations(specifications, ({ one, many }) => ({
  initiative: one(initiatives, {
    fields: [specifications.initiativeId],
    references: [initiatives.id]
  }),
  versions: many(specificationVersions)
}))

export const specificationVersionsRelations = relations(
  specificationVersions,
  ({ one }) => ({
    specification: one(specifications, {
      fields: [specificationVersions.specificationId],
      references: [specifications.id]
    }),
    author: one(users, {
      fields: [specificationVersions.authorId],
      references: [users.id]
    })
  })
)

export const decisionsRelations = relations(decisions, ({ one }) => ({
  initiative: one(initiatives, {
    fields: [decisions.initiativeId],
    references: [initiatives.id]
  }),
  author: one(users, { fields: [decisions.authorId], references: [users.id] })
}))

export const commentsRelations = relations(comments, ({ one, many }) => ({
  initiative: one(initiatives, {
    fields: [comments.initiativeId],
    references: [initiatives.id]
  }),
  author: one(users, { fields: [comments.authorId], references: [users.id] }),
  parent: one(comments, {
    fields: [comments.parentId],
    references: [comments.id],
    relationName: 'thread'
  }),
  replies: many(comments, { relationName: 'thread' })
}))

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Initiative = typeof initiatives.$inferSelect
export type NewInitiative = typeof initiatives.$inferInsert
export type Specification = typeof specifications.$inferSelect
export type SpecificationVersion = typeof specificationVersions.$inferSelect
export type Decision = typeof decisions.$inferSelect
export type Comment = typeof comments.$inferSelect
