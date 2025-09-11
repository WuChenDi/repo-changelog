// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@nuxtjs/mdc',
    '@vueuse/nuxt'
  ],

  devtools: {
    enabled: true
  },

  devServer: {
    host: '0.0.0.0',
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

  routeRules: {
    '/': { isr: 60 }
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
