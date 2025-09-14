const defaultApiUrl = 'https://unghs.vercel.app' // 'https://ungh.cc'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  // sourcemap: {
  //   server: false,
  //   client: false,
  // },
  // ssr: false,

  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@nuxtjs/mdc',
    '@vueuse/nuxt'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  mdc: {
    highlight: {
      langs: ['diff', 'ts', 'vue', 'css', 'sh', 'js']
    }
  },

  ui: {
    theme: {
      defaultVariants: {
        color: 'neutral'
      }
    }
  },
  runtimeConfig: {
    apiUrl: process.env.API_URL || defaultApiUrl,
    public: {
      apiUrl: process.env.API_URL || defaultApiUrl
    }
  },

  routeRules: {
    '/': { isr: 60 }
  },

  devServer: {
    host: '0.0.0.0'
  },

  compatibilityDate: '2025-06-01',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
