import { httpError } from './httpError'

export const GITHUB_GRAPHQL_ENDPOINT = 'https://api.github.com/graphql'
export const GITHUB_REPO_OWNER = 'Datak-SAS'
export const GITHUB_REPO_NAME = 'datak'

interface GraphQLResponse<T> {
  data?: T
  errors?: Array<{ message: string }>
}

/**
 * Resolves the GitHub PAT from runtime config, falling back to the raw env var.
 */
export function getGitHubToken(): string {
  const config = useRuntimeConfig()
  const token = (config.githubToken as string) || process.env.NUXT_GITHUB_TOKEN
  if (!token) {
    throw httpError(503, 'GitHub token no configurado (NUXT_GITHUB_TOKEN)')
  }
  return token
}

/**
 * Executes a GraphQL operation against the GitHub API and unwraps `data`.
 * Translates the two failure modes the PAT actually hits into Spanish messages.
 */
export async function githubGraphql<T>(
  token: string,
  query: string,
  variables: Record<string, unknown>
): Promise<T> {
  const response = await $fetch<GraphQLResponse<T>>(GITHUB_GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'Datak-Horizon-Docs-Viewer'
    },
    body: { query, variables }
  })

  if (response.errors && response.errors.length > 0) {
    const msg = response.errors.map(e => e.message).join(', ')
    if (msg.includes('Resource not accessible by personal access token')) {
      throw httpError(
        403,
        'El token de GitHub no tiene los permisos necesarios (Contents: Read-only y, para comentar, Pull requests: Read and write) o requiere aprobación del administrador en Datak-SAS.'
      )
    }
    throw new Error(`GitHub GraphQL error: ${msg}`)
  }

  if (!response.data) {
    throw new Error('GitHub GraphQL devolvió una respuesta vacía')
  }

  return response.data
}

/**
 * Guards a branch name coming from the query string before it reaches GitHub.
 * Branches are passed as GraphQL variables, so this is defence in depth rather
 * than the only barrier against injection.
 */
export function isValidBranchName(branch: string): boolean {
  if (!branch || branch.length > 255) return false
  if (branch.includes('..') || branch.includes('//')) return false
  if (branch.startsWith('/') || branch.endsWith('/')) return false
  if (branch.startsWith('.') || branch.endsWith('.')) return false
  return /^[\w./-]+$/.test(branch)
}
