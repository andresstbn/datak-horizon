// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/ui', '@nuxt/test-utils'],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    authAllowlist: '',
    slackWebhookUrl: '',
    siteUrl: 'http://localhost:3000',
    confluenceDomain: '',
    confluenceEmail: '',
    confluenceApiToken: '',
    githubToken: '',
    public: {
      // Exposed Firebase client config.
      firebase: {
        apiKey: '',
        authDomain: '',
        projectId: '',
        appId: ''
      }
    }
  },

  compatibilityDate: '2025-01-15',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
