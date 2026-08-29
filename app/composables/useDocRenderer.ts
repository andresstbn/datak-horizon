import MarkdownIt from 'markdown-it'
import type { DocType } from '~~/shared/types/doc'
import { resolveDocAsset, resolveDocLink } from '~~/shared/utils/docs'

export function useDocRenderer() {
  const { getIdToken } = useAuth()

  function createRenderer(currentTipo: DocType = 'rf', token?: string | null) {
    const md = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true
    })

    // Custom link rule
    const defaultLinkOpen = md.renderer.rules.link_open
      || function (tokens, idx, options, _env, self) {
        return self.renderToken(tokens, idx, options)
      }

    md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
      const tokenItem = tokens[idx]
      if (tokenItem) {
        const hrefIndex = tokenItem.attrIndex('href')
        if (hrefIndex >= 0) {
          const href = String(tokenItem.attrs?.[hrefIndex]?.[1] ?? '')
          if (href.startsWith('http://') || href.startsWith('https://')) {
            tokenItem.attrSet('target', '_blank')
            tokenItem.attrSet('rel', 'noopener noreferrer')
            tokenItem.attrJoin('class', 'text-primary underline font-medium')
          } else {
            const resolved = resolveDocLink(href, currentTipo)
            tokenItem.attrSet('href', resolved)
            tokenItem.attrJoin('class', 'text-primary underline font-medium cursor-pointer')
          }
        }
      }
      return defaultLinkOpen(tokens, idx, options, env, self)
    }

    // Custom image rule
    const defaultImage = md.renderer.rules.image
      || function (tokens, idx, options, _env, self) {
        return self.renderToken(tokens, idx, options)
      }

    md.renderer.rules.image = (tokens, idx, options, env, self) => {
      const tokenItem = tokens[idx]
      if (tokenItem) {
        const srcIndex = tokenItem.attrIndex('src')
        if (srcIndex >= 0) {
          const rawSrc = String(tokenItem.attrs?.[srcIndex]?.[1] ?? '')
          let resolved = resolveDocAsset(rawSrc)
          if (token && resolved.startsWith('/api/docs/assets/')) {
            resolved += `${resolved.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`
          }
          tokenItem.attrSet('src', resolved)
          tokenItem.attrJoin('class', 'my-4 max-w-full rounded-lg border border-default shadow-sm')
        }
      }
      return defaultImage(tokens, idx, options, env, self)
    }

    // Checkboxes / Task lists token rule
    md.core.ruler.after('inline', 'task-lists', (state) => {
      const tokens = state.tokens
      for (let i = 0; i < tokens.length; i++) {
        const tokenItem = tokens[i]
        if (tokenItem && tokenItem.type === 'inline' && tokenItem.children) {
          const firstChild = tokenItem.children[0]
          if (firstChild && firstChild.type === 'text') {
            const text = firstChild.content
            const match = text.match(/^\[([ xX])\]\s+(.*)$/)
            if (match && match[1] !== undefined && match[2] !== undefined) {
              const checked = match[1].toLowerCase() === 'x'
              firstChild.content = match[2]

              // Prepend checkbox html
              const checkboxToken = new state.Token('html_inline', '', 0)
              checkboxToken.content = `<input type="checkbox" disabled ${checked ? 'checked' : ''} class="mr-2 rounded border-default text-primary align-middle inline-block" />`
              tokenItem.children.unshift(checkboxToken)

              // Mark parent list item
              if (i > 0) {
                const parent = tokens[i - 1]
                if (parent && parent.type === 'paragraph_open' && i > 1) {
                  const listItem = tokens[i - 2]
                  if (listItem && listItem.type === 'list_item_open') {
                    listItem.attrJoin('class', 'list-none')
                  }
                }
              }
            }
          }
        }
      }
      return true
    })

    return md
  }

  async function renderMarkdown(
    content: string,
    currentTipo: DocType = 'rf'
  ): Promise<string> {
    if (!content) return ''
    const token = await getIdToken().catch(() => null)
    const md = createRenderer(currentTipo, token)
    return md.render(content)
  }

  return {
    createRenderer,
    renderMarkdown
  }
}
