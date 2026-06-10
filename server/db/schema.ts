import { relations } from 'drizzle-orm'
import {
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  doublePrecision
} from 'drizzle-orm/pg-core'

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const userRole = pgEnum('user_role', ['admin', 'member', 'viewer'])

export const initiativeStatus = pgEnum('initiative_status', [
  'discovery',
  'refinement',
  'ready',
  'in_development',
  'qa',
  'released',
  'blocked',
  'cancelled'
])

export const priorityLevel = pgEnum('priority_level', ['low', 'medium', 'high'])

export const riskLevel = pgEnum('risk_level', ['low', 'medium', 'high'])

export const healthLevel = pgEnum('health_level', ['on_track', 'at_risk', 'off_track'])

export const conversationSource = pgEnum('conversation_source', [
  'manual',
  'whatsapp_import',
  'slack_import',
  'voice',
  'meeting'
])

export const messageRole = pgEnum('message_role', ['user', 'assistant', 'system'])

export const messageContentType = pgEnum('message_content_type', [
  'markdown',
  'text',
  'audio',
  'image',
  'document'
])

export const insightType = pgEnum('insight_type', [
  'constraint',
  'dependency',
  'decision',
  'rule',
  'assumption',
  'risk'
])

export const insightSource = pgEnum('insight_source', ['manual', 'ai_extracted'])

export const requirementPriority = pgEnum('requirement_priority', [
  'must',
  'should',
  'could',
  'wont'
])

export const requirementStatus = pgEnum('requirement_status', [
  'draft',
  'refining',
  'ready',
  'implemented',
  'archived'
])

export const artifactType = pgEnum('artifact_type', [
  'refinement_questions',
  'functional_specification',
  'technical_plan',
  'implementation_prompt',
  'qa_checklist',
  'consolidated_context'
])

export const artifactStatus = pgEnum('artifact_status', [
  'draft',
  'accepted',
  'archived'
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
    status: initiativeStatus('status').default('discovery').notNull(),
    priority: priorityLevel('priority').default('medium').notNull(),
    risk: riskLevel('risk').default('low').notNull(),
    health: healthLevel('health').default('on_track').notNull(),
    functionalOwnerId: uuid('functional_owner_id').references(() => users.id, {
      onDelete: 'set null'
    }),
    technicalOwnerId: uuid('technical_owner_id').references(() => users.id, {
      onDelete: 'set null'
    }),
    targetDate: timestamp('target_date', { withTimezone: true }),
    committedDate: timestamp('committed_date', { withTimezone: true }),
    estimatedDate: timestamp('estimated_date', { withTimezone: true }),
    delayReason: text('delay_reason'),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
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
// Conversations — where knowledge starts.
// ---------------------------------------------------------------------------

export const conversations = pgTable(
  'conversations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    initiativeId: uuid('initiative_id')
      .notNull()
      .references(() => initiatives.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    source: conversationSource('source').default('manual').notNull(),
    createdById: uuid('created_by_id').references(() => users.id, {
      onDelete: 'set null'
    }),
    ...timestamps
  },
  table => [index('conversations_initiative_idx').on(table.initiativeId)]
)

// ---------------------------------------------------------------------------
// ConversationMessage — messages within a conversation (supports markdown).
// ---------------------------------------------------------------------------

export const conversationMessages = pgTable(
  'conversation_messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id').references(() => users.id, {
      onDelete: 'set null'
    }),
    role: messageRole('role').default('user').notNull(),
    contentType: messageContentType('content_type').default('markdown').notNull(),
    body: text('body').notNull(),
    audioUrl: text('audio_url'),
    transcription: text('transcription'),
    mediaUrl: text('media_url'),
    ...timestamps
  },
  table => [index('messages_conversation_idx').on(table.conversationId)]
)

// ---------------------------------------------------------------------------
// Insight — persistent knowledge extracted from discussions.
// ---------------------------------------------------------------------------

export const insights = pgTable(
  'insights',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    initiativeId: uuid('initiative_id')
      .notNull()
      .references(() => initiatives.id, { onDelete: 'cascade' }),
    sourceConversationId: uuid('source_conversation_id').references(() => conversations.id, {
      onDelete: 'set null'
    }),
    type: insightType('type').notNull(),
    body: text('body').notNull(),
    source: insightSource('source').default('manual').notNull(),
    confidence: doublePrecision('confidence'),
    authorId: uuid('author_id').references(() => users.id, {
      onDelete: 'set null'
    }),
    ...timestamps
  },
  table => [index('insights_initiative_idx').on(table.initiativeId)]
)

// ---------------------------------------------------------------------------
// Requirement — refined implementation items.
// ---------------------------------------------------------------------------

export const requirements = pgTable(
  'requirements',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    initiativeId: uuid('initiative_id')
      .notNull()
      .references(() => initiatives.id, { onDelete: 'cascade' }),
    sourceConversationId: uuid('source_conversation_id').references(() => conversations.id, {
      onDelete: 'set null'
    }),
    title: text('title').notNull(),
    description: text('description').notNull(),
    priority: requirementPriority('priority').default('must').notNull(),
    status: requirementStatus('status').default('draft').notNull(),
    createdById: uuid('created_by_id').references(() => users.id, {
      onDelete: 'set null'
    }),
    ...timestamps
  },
  table => [index('requirements_initiative_idx').on(table.initiativeId)]
)

// ---------------------------------------------------------------------------
// AIArtifact — generated specs/plans (can also be created manually).
// ---------------------------------------------------------------------------

export const aiArtifacts = pgTable(
  'ai_artifacts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    initiativeId: uuid('initiative_id')
      .notNull()
      .references(() => initiatives.id, { onDelete: 'cascade' }),
    requirementId: uuid('requirement_id').references(() => requirements.id, {
      onDelete: 'set null'
    }),
    sourceConversationId: uuid('source_conversation_id').references(() => conversations.id, {
      onDelete: 'set null'
    }),
    type: artifactType('type').notNull(),
    title: text('title').notNull(),
    content: text('content').notNull(),
    promptUsed: text('prompt_used'),
    model: text('model'),
    status: artifactStatus('status').default('draft').notNull(),
    createdById: uuid('created_by_id').references(() => users.id, {
      onDelete: 'set null'
    }),
    ...timestamps
  },
  table => [index('artifacts_initiative_idx').on(table.initiativeId)]
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
  conversations: many(conversations),
  insights: many(insights),
  requirements: many(requirements),
  aiArtifacts: many(aiArtifacts)
}))

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  initiative: one(initiatives, {
    fields: [conversations.initiativeId],
    references: [initiatives.id]
  }),
  createdBy: one(users, {
    fields: [conversations.createdById],
    references: [users.id]
  }),
  messages: many(conversationMessages)
}))

export const conversationMessagesRelations = relations(conversationMessages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [conversationMessages.conversationId],
    references: [conversations.id]
  }),
  author: one(users, {
    fields: [conversationMessages.authorId],
    references: [users.id]
  })
}))

export const insightsRelations = relations(insights, ({ one }) => ({
  initiative: one(initiatives, {
    fields: [insights.initiativeId],
    references: [initiatives.id]
  }),
  sourceConversation: one(conversations, {
    fields: [insights.sourceConversationId],
    references: [conversations.id]
  }),
  author: one(users, {
    fields: [insights.authorId],
    references: [users.id]
  })
}))

export const requirementsRelations = relations(requirements, ({ one, many }) => ({
  initiative: one(initiatives, {
    fields: [requirements.initiativeId],
    references: [initiatives.id]
  }),
  sourceConversation: one(conversations, {
    fields: [requirements.sourceConversationId],
    references: [conversations.id]
  }),
  createdBy: one(users, {
    fields: [requirements.createdById],
    references: [users.id]
  }),
  aiArtifacts: many(aiArtifacts)
}))

export const aiArtifactsRelations = relations(aiArtifacts, ({ one }) => ({
  initiative: one(initiatives, {
    fields: [aiArtifacts.initiativeId],
    references: [initiatives.id]
  }),
  requirement: one(requirements, {
    fields: [aiArtifacts.requirementId],
    references: [requirements.id]
  }),
  sourceConversation: one(conversations, {
    fields: [aiArtifacts.sourceConversationId],
    references: [conversations.id]
  }),
  createdBy: one(users, {
    fields: [aiArtifacts.createdById],
    references: [users.id]
  })
}))

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

export type Initiative = typeof initiatives.$inferSelect
export type NewInitiative = typeof initiatives.$inferInsert

export type Conversation = typeof conversations.$inferSelect
export type NewConversation = typeof conversations.$inferInsert

export type ConversationMessage = typeof conversationMessages.$inferSelect
export type NewConversationMessage = typeof conversationMessages.$inferInsert

export type Insight = typeof insights.$inferSelect
export type NewInsight = typeof insights.$inferInsert

export type Requirement = typeof requirements.$inferSelect
export type NewRequirement = typeof requirements.$inferInsert

export type AIArtifact = typeof aiArtifacts.$inferSelect
export type NewAIArtifact = typeof aiArtifacts.$inferInsert
