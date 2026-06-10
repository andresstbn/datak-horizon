import { describe, expect, it, vi, beforeEach } from 'vitest'

// Mock the repositories using inline factories to avoid Vitest hoisting errors
vi.mock('../../server/repositories/initiativeRepository', () => ({
  initiativeRepository: {
    create: vi.fn(),
    findById: vi.fn(),
    update: vi.fn()
  }
}))

vi.mock('../../server/repositories/conversationRepository', () => ({
  conversationRepository: {
    listByInitiative: vi.fn(),
    listRecent: vi.fn(),
    findById: vi.fn(),
    create: vi.fn()
  }
}))

vi.mock('../../server/repositories/conversationMessageRepository', () => ({
  conversationMessageRepository: {
    listByConversation: vi.fn(),
    create: vi.fn()
  }
}))

vi.mock('../../server/repositories/insightRepository', () => ({
  insightRepository: {
    listByInitiative: vi.fn(),
    create: vi.fn()
  }
}))

vi.mock('../../server/repositories/requirementRepository', () => ({
  requirementRepository: {
    listByInitiative: vi.fn(),
    listRefining: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn()
  }
}))

vi.mock('../../server/repositories/aiArtifactRepository', () => ({
  aiArtifactRepository: {
    listByInitiative: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn()
  }
}))

// Import the repositories so we can reference them in test mocks
import { initiativeRepository } from '../../server/repositories/initiativeRepository'
import { conversationRepository } from '../../server/repositories/conversationRepository'
import { conversationMessageRepository } from '../../server/repositories/conversationMessageRepository'
import { insightRepository } from '../../server/repositories/insightRepository'
import { requirementRepository } from '../../server/repositories/requirementRepository'
import { aiArtifactRepository } from '../../server/repositories/aiArtifactRepository'

// Import services to test
import { initiativeService } from '../../server/services/initiativeService'
import { conversationService } from '../../server/services/conversationService'
import { conversationMessageService } from '../../server/services/conversationMessageService'
import { insightService } from '../../server/services/insightService'
import { requirementService } from '../../server/services/requirementService'
import { consolidatedContextService } from '../../server/services/consolidatedContextService'

describe('Horizon Core Services', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('initiativeService', () => {
    it('creates an initiative and auto-generates a slug from the title', async () => {
      const input = {
        title: 'IVA Diferencial Digital',
        description: 'Testing description',
        status: 'discovery' as const,
        priority: 'high' as const,
        risk: 'medium' as const,
        health: 'on_track' as const,
        functionalOwnerId: null,
        technicalOwnerId: null,
        targetDate: null,
        committedDate: null,
        estimatedDate: null,
        delayReason: null
      }
      
      vi.mocked(initiativeRepository.create).mockResolvedValue({
        id: 'init-123',
        ...input,
        slug: 'iva-diferencial-digital-1234',
        createdAt: new Date('2026-06-04T12:00:00.000Z'),
        updatedAt: new Date('2026-06-04T12:00:00.000Z'),
        createdById: 'user-abc'
      })

      vi.mocked(initiativeRepository.findById).mockResolvedValue({
        id: 'init-123',
        ...input,
        slug: 'iva-diferencial-digital-1234',
        createdAt: new Date('2026-06-04T12:00:00.000Z'),
        updatedAt: new Date('2026-06-04T12:00:00.000Z'),
        createdById: 'user-abc',
        functionalOwner: null,
        technicalOwner: null
      })

      const result = await initiativeService.create(input, 'user-abc')
      
      expect(result.id).toBe('init-123')
      expect(initiativeRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'IVA Diferencial Digital',
          slug: expect.stringMatching(/^iva-diferencial-digital-\d{4}$/),
          createdById: 'user-abc'
        })
      )
    })
  })

  describe('conversationService', () => {
    it('creates a conversation and formats timestamps', async () => {
      const input = { title: 'Dudas tributarias', source: 'manual' as const }
      
      vi.mocked(conversationRepository.create).mockResolvedValue({
        id: 'conv-1',
        initiativeId: 'init-123',
        title: 'Dudas tributarias',
        source: 'manual',
        createdById: 'user-abc',
        createdAt: new Date('2026-06-04T12:00:00.000Z'),
        updatedAt: new Date('2026-06-04T12:00:00.000Z')
      })

      vi.mocked(conversationRepository.findById).mockResolvedValue({
        id: 'conv-1',
        initiativeId: 'init-123',
        title: 'Dudas tributarias',
        source: 'manual',
        createdById: 'user-abc',
        createdAt: new Date('2026-06-04T12:00:00.000Z'),
        updatedAt: new Date('2026-06-04T12:00:00.000Z'),
        createdBy: null
      })

      const result = await conversationService.create('init-123', input, 'user-abc')
      expect(result.id).toBe('conv-1')
      expect(result.createdAt).toBe('2026-06-04T12:00:00.000Z')
      expect(conversationRepository.create).toHaveBeenCalledWith({
        initiativeId: 'init-123',
        title: 'Dudas tributarias',
        source: 'manual',
        createdById: 'user-abc'
      })
    })
  })

  describe('conversationMessageService', () => {
    it('creates a message and queries with author details', async () => {
      vi.mocked(conversationMessageRepository.create).mockResolvedValue({
        id: 'msg-1',
        conversationId: 'conv-1',
        authorId: 'user-abc',
        role: 'user',
        contentType: 'markdown',
        body: 'Mi mensaje en markdown',
        createdAt: new Date('2026-06-04T12:00:00.000Z'),
        updatedAt: new Date('2026-06-04T12:00:00.000Z')
      })

      vi.mocked(conversationMessageRepository.listByConversation).mockResolvedValue([
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          authorId: 'user-abc',
          role: 'user',
          contentType: 'markdown',
          body: 'Mi mensaje en markdown',
          createdAt: new Date('2026-06-04T12:00:00.000Z'),
          updatedAt: new Date('2026-06-04T12:00:00.000Z'),
          author: { id: 'user-abc', displayName: 'Ana', email: 'a@x', photoUrl: null }
        }
      ])

      const result = await conversationMessageService.create('conv-1', {
        role: 'user',
        contentType: 'markdown',
        body: 'Mi mensaje en markdown'
      }, 'user-abc')

      expect(result.id).toBe('msg-1')
      expect(result.author?.displayName).toBe('Ana')
      expect(conversationMessageRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: 'conv-1',
          body: 'Mi mensaje en markdown'
        })
      )
    })
  })

  describe('insightService', () => {
    it('creates a business insight', async () => {
      vi.mocked(insightRepository.create).mockResolvedValue({
        id: 'insight-1',
        initiativeId: 'init-123',
        sourceConversationId: 'conv-1',
        type: 'constraint',
        body: 'SaaS only applies to domestic targets',
        source: 'manual',
        confidence: 0.9,
        authorId: 'user-abc',
        createdAt: new Date('2026-06-04T12:00:00.000Z'),
        updatedAt: new Date('2026-06-04T12:00:00.000Z')
      })

      vi.mocked(insightRepository.listByInitiative).mockResolvedValue([
        {
          id: 'insight-1',
          initiativeId: 'init-123',
          sourceConversationId: 'conv-1',
          type: 'constraint',
          body: 'SaaS only applies to domestic targets',
          source: 'manual',
          confidence: 0.9,
          authorId: 'user-abc',
          createdAt: new Date('2026-06-04T12:00:00.000Z'),
          updatedAt: new Date('2026-06-04T12:00:00.000Z'),
          author: { id: 'user-abc', displayName: 'Ana', email: 'a@x', photoUrl: null },
          sourceConversation: { title: 'Discusión alcance' }
        }
      ])

      const result = await insightService.create('init-123', {
        type: 'constraint',
        body: 'SaaS only applies to domestic targets',
        sourceConversationId: 'conv-1',
        confidence: 0.9
      }, 'user-abc')

      expect(result.id).toBe('insight-1')
      expect(result.sourceConversationTitle).toBe('Discusión alcance')
    })
  })

  describe('requirementService', () => {
    it('creates a development requirement', async () => {
      vi.mocked(requirementRepository.create).mockResolvedValue({
        id: 'req-1',
        initiativeId: 'init-123',
        sourceConversationId: null,
        title: 'DB mapping',
        description: 'Map tables',
        priority: 'must',
        status: 'draft',
        createdById: 'user-abc',
        createdAt: new Date('2026-06-04T12:00:00.000Z'),
        updatedAt: new Date('2026-06-04T12:00:00.000Z')
      })

      vi.mocked(requirementRepository.listByInitiative).mockResolvedValue([
        {
          id: 'req-1',
          initiativeId: 'init-123',
          sourceConversationId: null,
          title: 'DB mapping',
          description: 'Map tables',
          priority: 'must',
          status: 'draft',
          createdById: 'user-abc',
          createdAt: new Date('2026-06-04T12:00:00.000Z'),
          updatedAt: new Date('2026-06-04T12:00:00.000Z'),
          createdBy: { id: 'user-abc', displayName: 'Ana', email: 'a@x', photoUrl: null },
          sourceConversation: null
        }
      ])

      const result = await requirementService.create('init-123', {
        title: 'DB mapping',
        description: 'Map tables',
        priority: 'must'
      }, 'user-abc')

      expect(result.id).toBe('req-1')
      expect(result.priority).toBe('must')
    })
  })

  describe('consolidatedContextService', () => {
    it('generates a full markdown context summary of an initiative', async () => {
      vi.mocked(initiativeRepository.findById).mockResolvedValue({
        id: 'init-123',
        title: 'IVA diferencial',
        description: 'IVA desc',
        status: 'refinement',
        priority: 'high',
        risk: 'medium',
        health: 'on_track',
        functionalOwner: { displayName: 'Ana', id: '1', email: 'a@b', photoUrl: null },
        technicalOwner: { displayName: 'Luis', id: '2', email: 'l@b', photoUrl: null },
        targetDate: new Date('2026-09-30'),
        committedDate: null,
        estimatedDate: null,
        delayReason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: '1'
      })

      vi.mocked(conversationRepository.listByInitiative).mockResolvedValue([
        {
          id: 'conv-1',
          initiativeId: 'init-123',
          title: 'Discusión inicial',
          source: 'manual',
          createdById: '1',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: { displayName: 'Marta', id: '3', email: 'm@b', photoUrl: null }
        }
      ])

      vi.mocked(conversationMessageRepository.listByConversation).mockResolvedValue([
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          role: 'user',
          contentType: 'markdown',
          body: 'Hola',
          authorId: '3',
          createdAt: new Date(),
          updatedAt: new Date(),
          audioUrl: null,
          transcription: null,
          mediaUrl: null,
          author: { displayName: 'Marta', id: '3', email: 'm@b', photoUrl: null }
        }
      ])

      vi.mocked(insightRepository.listByInitiative).mockResolvedValue([
        {
          id: 'ins-1',
          initiativeId: 'init-123',
          sourceConversationId: 'conv-1',
          type: 'constraint',
          body: 'Domestic rules',
          source: 'manual',
          confidence: 0.95,
          authorId: '1',
          createdAt: new Date(),
          updatedAt: new Date(),
          author: { displayName: 'Ana', id: '1', email: 'a@b', photoUrl: null },
          sourceConversation: { title: 'Discusión inicial' }
        }
      ])

      vi.mocked(requirementRepository.listByInitiative).mockResolvedValue([
        {
          id: 'req-1',
          initiativeId: 'init-123',
          sourceConversationId: null,
          title: 'Detector BIN',
          priority: 'must',
          status: 'draft',
          description: 'Valida BIN',
          createdById: '2',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: { displayName: 'Luis', id: '2', email: 'l@b', photoUrl: null },
          sourceConversation: null
        }
      ])

      vi.mocked(aiArtifactRepository.listByInitiative).mockResolvedValue([
        {
          id: 'art-1',
          initiativeId: 'init-123',
          requirementId: null,
          sourceConversationId: null,
          title: 'Plan Técnico',
          type: 'technical_plan',
          status: 'accepted',
          content: '### Plan\n- Code checkout',
          promptUsed: null,
          model: null,
          createdById: '2',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: { displayName: 'Luis', id: '2', email: 'l@b', photoUrl: null },
          requirement: null,
          sourceConversation: null
        }
      ])

      const markdown = await consolidatedContextService.generateMarkdown('init-123')
      
      expect(markdown).toContain('# Contexto Consolidado: IVA diferencial')
      expect(markdown).toContain('## 📋 Resumen Ejecutivo')
      expect(markdown).toContain('IVA desc')
      expect(markdown).toContain('### 🗣️ Hilo: Discusión inicial (Origen: manual)')
      expect(markdown).toContain('**[user] Marta** (markdown):\nHola')
      expect(markdown).toContain('- **[CONSTRAINT]**: Domestic rules')
      expect(markdown).toContain('### 📌 Detector BIN')
      expect(markdown).toContain('### 📄 Plan Técnico')
      expect(markdown).toContain('### Plan\n- Code checkout')
    })
  })
})
