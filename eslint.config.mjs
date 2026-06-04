// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  // Your custom configs here
  {
    // `eslint-plugin-vue` does not parse `lang="pug"` templates, so it cannot
    // see <script setup> bindings that are only referenced from the template
    // and reports them as unused. Disable the rule for SFCs while we use Pug.
    files: ['**/*.vue'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off'
    }
  }
)
