<script setup>
const route = useRoute()

const siteConfig = {
  title: 'Repository Changelog',
  description: 'Track the latest releases and changelogs from your favorite open source repositories',
  url: 'https://repo-changelog.vercel.app/',
  image: 'https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/repo-changelog/index.png',
  author: {
    name: 'wudi',
    twitter: '@wuchendi96'
  },
  navigation: {
    links: [
      {
        label: 'GitHub',
        icon: 'i-simple-icons-github',
        variant: 'outline',
        size: 'md',
        to: 'https://github.com/WuChenDi/repo-changelog',
        target: '_blank'
      }
      // {
      //   label: 'More',
      //   icon: 'i-lucide-external-link',
      //   variant: 'outline',
      //   size: 'md',
      //   to: 'https://notes-wudi.pages.dev/projects',
      //   target: '_blank'
      // }
    ]
  },
  meta: {
    favicon: '/logo.svg',
    lang: 'en',
    keywords: [
      'repository changelog',
      'github releases',
      'open source',
      'version tracking',
      'release notes',
      'git changelog',
      'software updates',
      'developer tools',
      'project tracking',
      'changelog generator'
    ]
  }
}

useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    { name: 'keywords', content: siteConfig.meta.keywords.join(', ') },
    { name: 'referrer', content: 'no-referrer-when-downgrade' },
    { name: 'author', content: siteConfig.author.name },
    { name: 'robots', content: 'index, follow' },

    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:site', content: siteConfig.author.twitter },
    { name: 'twitter:creator', content: siteConfig.author.twitter },
    { name: 'twitter:title', content: siteConfig.title },
    { name: 'twitter:description', content: siteConfig.description },
    { name: 'twitter:image', content: siteConfig.image }
  ],
  link: [
    { rel: 'icon', href: siteConfig.meta.favicon },
    { rel: 'canonical', href: siteConfig.url }
  ],
  htmlAttrs: {
    lang: siteConfig.meta.lang
  }
})

useSeoMeta({
  title: siteConfig.title,
  description: siteConfig.description,

  ogTitle: siteConfig.title,
  ogDescription: siteConfig.description,
  ogUrl: siteConfig.url,
  ogSiteName: siteConfig.title,
  ogImage: siteConfig.image,
  ogImageAlt: 'Repository Changelog - Track releases and changelogs',
  ogLocale: 'en_US',
  ogType: 'website',

  twitterTitle: siteConfig.title,
  twitterDescription: siteConfig.description,
  twitterImage: siteConfig.image,
  twitterCard: 'summary_large_image'
})

const isReposPage = computed(() => {
  return route.name === 'repos'
})

const isHomePage = computed(() => {
  return route.name === 'index'
})
</script>

<template>
  <UApp>
    <div
      v-if="isReposPage"
      class="min-h-[calc(100vh-68px)]"
    >
      <UColorModeButton class="fixed top-4 right-4 z-10" />
      <NuxtPage />
    </div>

    <div
      v-else-if="isHomePage"
      class="min-h-[calc(100vh-68px)] w-full relative bg-background dark:bg-black"
    >
      <UPageSection
        :title="siteConfig.title"
        :description="siteConfig.description"
        :links="siteConfig.navigation.links"
        orientation="vertical"
        class="relative overflow-hidden"
      >
        <template #top>
          <SkyBg />
          <div
            class="absolute inset-0 z-[-1]"
            :style="{
              backgroundImage: `
                  linear-gradient(to right, rgba(99, 102, 241, 0.4) 0%, transparent 1px),
                  linear-gradient(to bottom, rgba(181, 184, 208, 0.3) 0%, transparent 1px)
                `,
              backgroundSize: `40px 40px`,
              WebkitMaskImage:
                `radial-gradient(ellipse 100% 90% at 50% 0%, #000 90%, transparent 100%)`,
              maskImage:
                `radial-gradient(ellipse 100% 90% at 50% 0%, #000 90%, transparent 100%)`
            }"
          />
        </template>
      </UPageSection>

      <main class="px-4 sm:px-6 pb-16 bg-background/50 dark:bg-transparent">
        <UColorModeButton class="fixed top-4 right-4 z-10 backdrop-blur-sm bg-background/80 dark:bg-gray-900/80 rounded-full p-2" />
        <NuxtPage />
      </main>
    </div>

    <div
      v-else
      class="min-h-[calc(100vh-68px)] w-full"
    >
      <UColorModeButton class="fixed top-4 right-4 z-10" />
      <NuxtPage />
    </div>

    <Fotter />
  </UApp>
</template>
