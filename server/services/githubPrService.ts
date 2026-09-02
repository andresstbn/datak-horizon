import type { DocComment, DocCommentThread, DocType } from '~~/shared/types/doc'
import { docCommentMarker, stripDocCommentMarker } from '~~/shared/utils/docs'
import {
  GITHUB_REPO_NAME,
  GITHUB_REPO_OWNER,
  getGitHubToken,
  githubGraphql
} from '../utils/githubGraphql'
import { httpError } from '../utils/httpError'

interface RawComment {
  id: string
  body: string
  createdAt: string
  url: string
  author?: { login?: string, avatarUrl?: string } | null
}

interface PullRequestNode {
  id: string
  number: number
  title: string
  url: string
  comments?: { nodes?: RawComment[] } | null
}

interface BranchPrData {
  repository?: {
    ref?: {
      associatedPullRequests?: { nodes?: PullRequestNode[] } | null
    } | null
  } | null
}

interface AddCommentData {
  addComment?: {
    commentEdge?: { node?: RawComment } | null
  } | null
}

// ponytail: the last 100 comments of the PR are filtered in memory by the doc
// marker. Paginate `comments` only if a PR ever outgrows that.
const BRANCH_PR_QUERY = `
  query GetBranchPullRequest($owner: String!, $name: String!, $qualifiedName: String!) {
    repository(owner: $owner, name: $name) {
      ref(qualifiedName: $qualifiedName) {
        associatedPullRequests(first: 1, states: OPEN) {
          nodes {
            id
            number
            title
            url
            comments(last: 100) {
              nodes {
                id
                body
                createdAt
                url
                author {
                  login
                  avatarUrl
                }
              }
            }
          }
        }
      }
    }
  }
`

const ADD_COMMENT_MUTATION = `
  mutation AddDocComment($subjectId: ID!, $body: String!) {
    addComment(input: { subjectId: $subjectId, body: $body }) {
      commentEdge {
        node {
          id
          body
          createdAt
          url
          author {
            login
            avatarUrl
          }
        }
      }
    }
  }
`

async function fetchBranchPullRequest(token: string, branch: string): Promise<PullRequestNode | null> {
  const data = await githubGraphql<BranchPrData>(token, BRANCH_PR_QUERY, {
    owner: GITHUB_REPO_OWNER,
    name: GITHUB_REPO_NAME,
    qualifiedName: `refs/heads/${branch}`
  })

  return data.repository?.ref?.associatedPullRequests?.nodes?.[0] ?? null
}

function toDocComment(raw: RawComment): DocComment {
  return {
    id: raw.id,
    body: stripDocCommentMarker(raw.body),
    createdAt: raw.createdAt,
    url: raw.url,
    authorLogin: raw.author?.login ?? 'desconocido',
    ...(raw.author?.avatarUrl ? { authorAvatarUrl: raw.author.avatarUrl } : {})
  }
}

export const githubPrService = {
  /**
   * Lists the comments written from Horizon about one document, taken from the
   * open PR of its branch. A branch without an open PR simply has no thread.
   */
  async listComments(branch: string, tipo: DocType, filename: string): Promise<DocCommentThread> {
    const pr = await fetchBranchPullRequest(getGitHubToken(), branch)
    if (!pr) {
      return { comments: [] }
    }

    const marker = docCommentMarker(tipo, filename)
    const comments = (pr.comments?.nodes ?? [])
      .filter(c => c.body?.includes(marker))
      .map(toDocComment)

    return {
      prNumber: pr.number,
      prTitle: pr.title,
      prUrl: pr.url,
      comments
    }
  },

  /**
   * Publishes a comment about one document into the conversation of the open PR
   * of its branch. `authorName` is the Horizon user, resolved server-side.
   */
  async addComment(
    branch: string,
    tipo: DocType,
    filename: string,
    body: string,
    authorName: string,
    docUrl: string
  ): Promise<DocComment> {
    const token = getGitHubToken()
    const pr = await fetchBranchPullRequest(token, branch)
    if (!pr) {
      throw httpError(409, `La rama "${branch}" no tiene un PR abierto donde publicar el comentario.`)
    }

    const composed = [
      `**${authorName}** comentó desde Horizon sobre **${tipo}/${filename}**:`,
      '',
      body.trim(),
      '',
      `↗ [Ver el documento en Horizon](${docUrl})`,
      docCommentMarker(tipo, filename)
    ].join('\n')

    const data = await githubGraphql<AddCommentData>(token, ADD_COMMENT_MUTATION, {
      subjectId: pr.id,
      body: composed
    })

    const node = data.addComment?.commentEdge?.node
    if (!node) {
      throw httpError(502, 'GitHub aceptó la petición pero no devolvió el comentario creado.')
    }

    return toDocComment(node)
  }
}
