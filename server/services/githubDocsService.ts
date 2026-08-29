import { createError } from 'h3'
import type { DocDetail, DocIndexItem, DocType } from '~~/shared/types/doc'
import { parseFrontmatter } from '~~/shared/utils/frontmatter'

interface GitHubBlob {
  text?: string
}

interface GitHubTreeEntry {
  name: string
  object?: GitHubBlob | null
}

interface GitHubTree {
  entries?: GitHubTreeEntry[]
}

interface GitHubGraphQLResponse {
  data?: {
    repository?: {
      rf?: GitHubTree | null
      specs?: GitHubTree | null
    } | null
  }
  errors?: Array<{ message: string }>
}

interface RawDocsCache {
  rf: Array<{ name: string, text: string }>
  specs: Array<{ name: string, text: string }>
}

interface CachedAsset {
  base64: string
  contentType: string
}

const GITHUB_GRAPHQL_ENDPOINT = 'https://api.github.com/graphql'
const GITHUB_REPO_OWNER = 'Datak-SAS'
const GITHUB_REPO_NAME = 'datak'
const GITHUB_BRANCH = 'main'

/**
 * Nitro cached function to fetch all docs in a single GraphQL query.
 * Cached for 5 minutes (TTL 300s).
 */
const fetchRawDocsTreeCached = defineCachedFunction(
  async (token: string): Promise<RawDocsCache> => {
    const query = `
      query GetMonorepoDocsTree($owner: String!, $name: String!) {
        repository(owner: $owner, name: $name) {
          rf: object(expression: "${GITHUB_BRANCH}:docs/rf") {
            ... on Tree {
              entries {
                name
                object {
                  ... on Blob {
                    text
                  }
                }
              }
            }
          }
          specs: object(expression: "${GITHUB_BRANCH}:docs/specs") {
            ... on Tree {
              entries {
                name
                object {
                  ... on Blob {
                    text
                  }
                }
              }
            }
          }
        }
      }
    `

    const response = await $fetch<GitHubGraphQLResponse>(GITHUB_GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Datak-Horizon-Docs-Viewer'
      },
      body: {
        query,
        variables: {
          owner: GITHUB_REPO_OWNER,
          name: GITHUB_REPO_NAME
        }
      }
    })

    if (response.errors && response.errors.length > 0) {
      const msg = response.errors.map(e => e.message).join(', ')
      if (msg.includes('Resource not accessible by personal access token')) {
        throw new Error(
          'El token de GitHub no tiene permisos de lectura sobre el contenido (Contents: Read-only) o requiere aprobación del administrador en Datak-SAS.'
        )
      }
      throw new Error(`GitHub GraphQL error: ${msg}`)
    }

    const rfEntries = response.data?.repository?.rf?.entries ?? []
    const specsEntries = response.data?.repository?.specs?.entries ?? []

    const rf = rfEntries
      .filter(e => e.name.endsWith('.md') && e.object?.text)
      .map(e => ({ name: e.name, text: e.object!.text! }))

    const specs = specsEntries
      .filter(e => e.name.endsWith('.md') && e.object?.text)
      .map(e => ({ name: e.name, text: e.object!.text! }))

    return { rf, specs }
  },
  {
    maxAge: 60 * 5, // 5 minutes
    name: 'githubDocsTree',
    getKey: () => `${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/docs-tree`
  }
)

/**
 * Nitro cached function to proxy and cache asset image binaries from GitHub.
 * Cached for 1 hour.
 */
const fetchAssetCached = defineCachedFunction(
  async (token: string, pageId: string, name: string): Promise<CachedAsset> => {
    const url = `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/contents/docs/assets/${encodeURIComponent(pageId)}/${encodeURIComponent(name)}?ref=${GITHUB_BRANCH}`

    const rawBuffer = await $fetch<ArrayBuffer>(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.raw',
        'User-Agent': 'Datak-Horizon-Docs-Viewer'
      },
      responseType: 'arrayBuffer'
    })

    const buffer = Buffer.from(rawBuffer)
    const ext = name.split('.').pop()?.toLowerCase() ?? ''
    const mimeTypes: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      svg: 'image/svg+xml',
      webp: 'image/webp',
      ico: 'image/x-icon'
    }

    return {
      base64: buffer.toString('base64'),
      contentType: mimeTypes[ext] || 'application/octet-stream'
    }
  },
  {
    maxAge: 60 * 60, // 1 hour
    name: 'githubDocsAsset',
    getKey: (_token, pageId, name) => `${pageId}/${name}`
  }
)

function getGitHubToken(): string {
  const config = useRuntimeConfig()
  const token = (config.githubToken as string) || process.env.NUXT_GITHUB_TOKEN
  if (!token) {
    throw createError({
      statusCode: 503,
      statusMessage: 'GitHub token no configurado (NUXT_GITHUB_TOKEN)'
    })
  }
  return token
}

function buildIndexFromCategory(
  entries: Array<{ name: string, text: string }>,
  tipo: DocType
): DocIndexItem[] {
  return entries.map((entry) => {
    const { frontmatter } = parseFrontmatter(entry.text)
    const id = frontmatter.id ? String(frontmatter.id) : entry.name.replace(/\.md$/, '')
    const titulo = frontmatter.titulo ? String(frontmatter.titulo) : id
    const estado = frontmatter.estado ? String(frontmatter.estado) : ''
    const fecha = frontmatter.fecha ? String(frontmatter.fecha) : undefined
    const autores = Array.isArray(frontmatter.autores)
      ? frontmatter.autores.join(', ')
      : (frontmatter.autores ? String(frontmatter.autores) : undefined)

    return {
      id,
      titulo,
      estado,
      fecha,
      autores,
      tipo,
      filename: entry.name
    }
  })
}

export const githubDocsService = {
  /**
   * Retrieves the combined index of RF and SPEC documents.
   */
  async listDocs(): Promise<DocIndexItem[]> {
    const token = getGitHubToken()
    const raw = await fetchRawDocsTreeCached(token)

    const rfDocs = buildIndexFromCategory(raw.rf, 'rf')
    const specsDocs = buildIndexFromCategory(raw.specs, 'specs')

    const combined = [...rfDocs, ...specsDocs]

    // Sort by id naturally (e.g. RF-001, RF-002, SPEC-001)
    return combined.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))
  },

  /**
   * Retrieves a single document by type ('rf' | 'specs') and filename.
   */
  async getDoc(tipo: DocType, filename: string): Promise<DocDetail | null> {
    const token = getGitHubToken()
    const raw = await fetchRawDocsTreeCached(token)

    const categoryEntries = tipo === 'rf' ? raw.rf : raw.specs
    const entry = categoryEntries.find(e => e.name === filename || e.name === `${filename}.md`)

    if (!entry) {
      return null
    }

    const { frontmatter, content } = parseFrontmatter(entry.text)

    return {
      frontmatter,
      content,
      tipo,
      filename: entry.name
    }
  },

  /**
   * Retrieves a private image asset binary.
   */
  async getAsset(pageId: string, name: string): Promise<CachedAsset | null> {
    const token = getGitHubToken()
    try {
      return await fetchAssetCached(token, pageId, name)
    } catch (err) {
      console.error(`Error loading doc asset ${pageId}/${name}:`, err)
      return null
    }
  }
}
