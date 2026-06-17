import { createError, defineEventHandler, getQuery } from 'h3'
import { requireAuth } from '../../utils/auth'

interface ConfluenceContentResponse {
  title: string
  space?: {
    key?: string
    name?: string
  }
  history?: {
    createdDate?: string
    createdBy?: {
      displayName?: string
    }
    lastUpdated?: {
      by?: {
        displayName?: string
      }
      when?: string
    }
  }
}

interface PreviewResponse {
  status: 'success' | 'unconfigured' | 'error'
  title: string
  spaceName?: string | null
  spaceKey?: string | null
  lastUpdatedBy?: string | null
  lastUpdatedAt?: string | null
  url: string
}

function extractPageId(urlStr: string): string | null {
  try {
    const url = new URL(urlStr)
    // viewpage.action?pageId=123
    const pageIdParam = url.searchParams.get('pageId')
    if (pageIdParam && /^\d+$/.test(pageIdParam)) {
      return pageIdParam
    }

    // /wiki/spaces/SP/pages/12345/Title
    // or /wiki/spaces/SP/pages/12345
    const pathMatch = url.pathname.match(/\/wiki\/spaces\/[^/]+\/pages\/(\d+)/)
    if (pathMatch && pathMatch[1]) {
      return pathMatch[1]
    }

    // /wiki/pages/12345
    const pathMatch2 = url.pathname.match(/\/wiki\/pages\/(\d+)/)
    if (pathMatch2 && pathMatch2[1]) {
      return pathMatch2[1]
    }

    // /wiki/spaces/SP/blog/2023/10/11/12345/Title
    const blogMatch = url.pathname.match(/\/wiki\/spaces\/[^/]+\/blog\/\d+\/\d+\/\d+\/(\d+)/)
    if (blogMatch && blogMatch[1]) {
      return blogMatch[1]
    }

    return null
  } catch {
    return null
  }
}

function extractFallbackTitle(urlStr: string): string {
  try {
    const url = new URL(urlStr)
    const segments = url.pathname.split('/').filter(Boolean)
    if (segments.length > 0) {
      const lastSegment = segments[segments.length - 1]
      if (lastSegment && /^\d+$/.test(lastSegment) && segments.length > 1) {
        const prevSegment = segments[segments.length - 2]
        if (prevSegment) {
          return decodeURIComponent(prevSegment.replace(/\+/g, ' '))
        }
      }
      if (lastSegment) {
        return decodeURIComponent(lastSegment.replace(/\+/g, ' '))
      }
    }
    return url.hostname
  } catch {
    return urlStr
  }
}

export default defineEventHandler(async (event): Promise<PreviewResponse> => {
  await requireAuth(event)

  const query = getQuery(event)
  const urlParam = query.url

  if (typeof urlParam !== 'string' || !urlParam.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: 'El parámetro "url" es requerido.'
    })
  }

  const cleanUrl = urlParam.trim()
  const fallbackTitle = extractFallbackTitle(cleanUrl)

  const config = useRuntimeConfig()
  const domain = config.confluenceDomain
  const email = config.confluenceEmail
  const apiToken = config.confluenceApiToken

  if (!domain || !email || !apiToken) {
    return {
      status: 'unconfigured',
      title: fallbackTitle,
      url: cleanUrl
    }
  }

  const pageId = extractPageId(cleanUrl)
  if (!pageId) {
    return {
      status: 'unconfigured',
      title: fallbackTitle,
      url: cleanUrl
    }
  }

  try {
    const authString = Buffer.from(`${email}:${apiToken}`).toString('base64')
    const confluenceDomainClean = domain.replace(/^https?:\/\//, '').split('/')[0]
    const apiUrl = `https://${confluenceDomainClean}/wiki/rest/api/content/${pageId}?expand=space,history`

    const response = await $fetch<ConfluenceContentResponse>(apiUrl, {
      headers: {
        Authorization: `Basic ${authString}`,
        Accept: 'application/json'
      }
    })

    if (!response || !response.title) {
      throw new Error('Confluence API returned an empty or invalid response')
    }

    return {
      status: 'success',
      title: response.title,
      spaceName: response.space?.name || null,
      spaceKey: response.space?.key || null,
      lastUpdatedBy: response.history?.lastUpdated?.by?.displayName || response.history?.createdBy?.displayName || null,
      lastUpdatedAt: response.history?.lastUpdated?.when || response.history?.createdDate || null,
      url: cleanUrl
    }
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error('Error fetching Confluence page preview:', errMsg)
    return {
      status: 'error',
      title: fallbackTitle,
      url: cleanUrl
    }
  }
})
