import type { DocBranch, DocDetail, DocIndexItem, DocType } from '~~/shared/types/doc'
import { parseFrontmatter } from '~~/shared/utils/frontmatter'
import {
  DEFAULT_DOC_BRANCH,
  pickBranchesWithDocChanges,
  type RefDocTrees
} from '~~/shared/utils/docs'
import {
  GITHUB_REPO_NAME,
  GITHUB_REPO_OWNER,
  getGitHubToken,
  githubGraphql
} from '../utils/githubGraphql'
import { httpError } from '../utils/httpError'

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

interface DocsTreeData {
  repository?: {
    rf?: GitHubTree | null
    specs?: GitHubTree | null
  } | null
}

interface RawDocsCache {
  rf: Array<{ name: string, text: string }>
  specs: Array<{ name: string, text: string }>
}

interface CachedAsset {
  base64: string
  contentType: string
}

interface BranchesData {
  repository?: {
    mainRf?: { oid?: string } | null
    mainSpecs?: { oid?: string } | null
    refs?: {
      nodes?: Array<{
        name: string
        target?: {
          rf?: { oid?: string } | null
          specs?: { oid?: string } | null
        } | null
        associatedPullRequests?: {
          nodes?: Array<{ number: number, title: string }>
        } | null
      }>
    } | null
  } | null
}

const DOCS_TREE_QUERY = `
  query GetMonorepoDocsTree($owner: String!, $name: String!, $rfExpr: String!, $specsExpr: String!) {
    repository(owner: $owner, name: $name) {
      rf: object(expression: $rfExpr) {
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
      specs: object(expression: $specsExpr) {
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

const BRANCHES_QUERY = `
  query GetDocsBranches($owner: String!, $name: String!, $mainRfExpr: String!, $mainSpecsExpr: String!) {
    repository(owner: $owner, name: $name) {
      mainRf: object(expression: $mainRfExpr) {
        ... on Tree { oid }
      }
      mainSpecs: object(expression: $mainSpecsExpr) {
        ... on Tree { oid }
      }
      refs(refPrefix: "refs/heads/", first: 30, orderBy: { field: TAG_COMMIT_DATE, direction: DESC }) {
        nodes {
          name
          target {
            ... on Commit {
              rf: file(path: "docs/rf") { oid }
              specs: file(path: "docs/specs") { oid }
            }
          }
          associatedPullRequests(first: 1, states: OPEN) {
            nodes {
              number
              title
            }
          }
        }
      }
    }
  }
`

/**
 * Fetches every RF and SPEC body for a branch in a single GraphQL round trip.
 * The trailing `force` argument is unused here: it only drives
 * `shouldInvalidateCache` on the cached wrapper below.
 */
async function fetchRawDocsTree(token: string, branch: string, _force: boolean): Promise<RawDocsCache> {
  const data = await githubGraphql<DocsTreeData>(token, DOCS_TREE_QUERY, {
    owner: GITHUB_REPO_OWNER,
    name: GITHUB_REPO_NAME,
    rfExpr: `${branch}:docs/rf`,
    specsExpr: `${branch}:docs/specs`
  })

  const rfTree = data.repository?.rf
  const specsTree = data.repository?.specs

  // GitHub answers a missing ref (or a missing folder) with a null object rather
  // than an error, which would otherwise surface as a silently empty list.
  if (!rfTree && !specsTree) {
    throw httpError(404, `La rama "${branch}" no existe o no tiene documentos.`)
  }

  const toEntries = (tree?: GitHubTree | null) =>
    (tree?.entries ?? [])
      .filter(e => e.name.endsWith('.md') && e.object?.text)
      .map(e => ({ name: e.name, text: e.object!.text! }))

  return { rf: toEntries(rfTree), specs: toEntries(specsTree) }
}

/**
 * Nitro cached function to fetch all docs in a single GraphQL query.
 * Cached for 5 minutes (TTL 300s), keyed per branch.
 */
const fetchRawDocsTreeCached = defineCachedFunction(
  fetchRawDocsTree,
  {
    maxAge: 60 * 5, // 5 minutes
    name: 'githubDocsTree',
    // `force` is deliberately absent from the key: a forced refresh must replace
    // the shared entry, not create a parallel one.
    getKey: (_token: string, branch: string, _force: boolean) =>
      `${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/${branch}/docs-tree`,
    shouldInvalidateCache: (_token: string, _branch: string, force: boolean) => force
  }
)

/**
 * Nitro cached function to proxy and cache asset image binaries from GitHub.
 * Cached for 1 hour, keyed per branch.
 */
const fetchAssetCached = defineCachedFunction(
  async (token: string, branch: string, pageId: string, name: string): Promise<CachedAsset> => {
    const url = `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/contents/docs/assets/${encodeURIComponent(pageId)}/${encodeURIComponent(name)}?ref=${encodeURIComponent(branch)}`

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
    getKey: (_token: string, branch: string, pageId: string, name: string) =>
      `${branch}/${pageId}/${name}`
  }
)

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

function sortDocsRecentFirst(a: DocIndexItem, b: DocIndexItem): number {
  if (a.fecha && b.fecha) {
    const dateDiff = b.fecha.localeCompare(a.fecha)
    if (dateDiff !== 0) return dateDiff
  } else if (a.fecha && !b.fecha) {
    return -1
  } else if (!a.fecha && b.fecha) {
    return 1
  }

  // Fallback: natural sort by id descending (e.g. RF-010 before RF-002)
  return b.id.localeCompare(a.id, undefined, { numeric: true })
}

const listBranchesCached = defineCachedFunction(
  async (token: string): Promise<DocBranch[]> => {
    const data = await githubGraphql<BranchesData>(token, BRANCHES_QUERY, {
      owner: GITHUB_REPO_OWNER,
      name: GITHUB_REPO_NAME,
      mainRfExpr: `${DEFAULT_DOC_BRANCH}:docs/rf`,
      mainSpecsExpr: `${DEFAULT_DOC_BRANCH}:docs/specs`
    })

    const repo = data.repository
    const main = {
      rfOid: repo?.mainRf?.oid ?? null,
      specsOid: repo?.mainSpecs?.oid ?? null
    }

    const refs: RefDocTrees[] = (repo?.refs?.nodes ?? []).map((node) => {
      const pr = node.associatedPullRequests?.nodes?.[0]
      return {
        name: node.name,
        rfOid: node.target?.rf?.oid ?? null,
        specsOid: node.target?.specs?.oid ?? null,
        ...(pr ? { prNumber: pr.number, prTitle: pr.title } : {})
      }
    })

    return pickBranchesWithDocChanges(main, refs)
  },
  {
    maxAge: 60 * 5, // 5 minutes
    name: 'githubDocsBranches',
    getKey: () => `${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/branches`
  }
)

export const githubDocsService = {
  /**
   * Lists the branches whose product docs differ from the default branch.
   */
  async listBranches(): Promise<DocBranch[]> {
    return listBranchesCached(getGitHubToken())
  },

  /**
   * Retrieves the combined index of RF and SPEC documents, ordered most recent first.
   * @param force If true, invalidates and refreshes the cached tree for this branch.
   */
  async listDocs(branch: string = DEFAULT_DOC_BRANCH, force = false): Promise<DocIndexItem[]> {
    const raw = await fetchRawDocsTreeCached(getGitHubToken(), branch, force)

    const rfDocs = buildIndexFromCategory(raw.rf, 'rf').sort(sortDocsRecentFirst)
    const specsDocs = buildIndexFromCategory(raw.specs, 'specs').sort(sortDocsRecentFirst)

    return [...rfDocs, ...specsDocs]
  },

  /**
   * Retrieves a single document by type ('rf' | 'specs') and filename.
   * @param force If true, invalidates and refreshes the cached tree for this branch.
   */
  async getDoc(
    tipo: DocType,
    filename: string,
    branch: string = DEFAULT_DOC_BRANCH,
    force = false
  ): Promise<DocDetail | null> {
    const raw = await fetchRawDocsTreeCached(getGitHubToken(), branch, force)

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
   * Retrieves a private image asset binary from a given branch.
   */
  async getAsset(branch: string, pageId: string, name: string): Promise<CachedAsset | null> {
    try {
      return await fetchAssetCached(getGitHubToken(), branch, pageId, name)
    } catch (err) {
      console.error(`Error loading doc asset ${branch}/${pageId}/${name}:`, err)
      return null
    }
  }
}
