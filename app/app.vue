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
      },
      {
        label: 'Documentation',
        icon: 'i-lucide-book-open',
        variant: 'outline',
        size: 'md',
        to: '/docs'
      }
    ]
  },
  meta: {
    favicon: 'https://notes-wudi.pages.dev/images/logo.png',
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

const showSidebar = computed(() => {
  return !!(route.query.repos && route.query.repos !== '')
})

const selectedRepos = computed(() => {
  if (!route.query.repos) return []

  const repos = Array.isArray(route.query.repos)
    ? route.query.repos
    : [route.query.repos]

  return repos.flatMap(repo =>
    typeof repo === 'string' ? repo.split(',') : []
  ).filter(Boolean)
})

const sidebarTitle = computed(() => {
  const repoCount = selectedRepos.value.length
  if (repoCount === 0) return 'Changelog'
  if (repoCount === 1) return `${selectedRepos.value[0]} Changelog`
  return `Changelog (${repoCount} repositories)`
})

const sidebarDescription = computed(() => {
  const repoCount = selectedRepos.value.length
  if (repoCount === 0) return siteConfig.description
  if (repoCount === 1) return `Latest releases and updates for ${selectedRepos.value[0]}`
  return `Latest releases and updates for ${repoCount} selected repositories`
})
</script>

<template>
  <UApp>
    <div
      v-if="showSidebar"
      class="min-h-screen xl:grid xl:grid-cols-2"
    >
      <UPageSection
        :title="sidebarTitle"
        :description="sidebarDescription"
        orientation="vertical"
        :links="siteConfig.navigation.links"
        :ui="{
          root: 'border-b border-default xl:border-b-0 xl:sticky xl:inset-y-0 xl:h-screen overflow-hidden',
          container: 'h-full items-center justify-center',
          wrapper: 'flex flex-col',
          headline: 'mb-6',
          title: 'text-left text-4xl',
          description: 'text-left max-w-lg',
          links: 'gap-1 justify-start -ms-2.5'
        }"
      >
        <template #top>
          <SkyBg />
          <div class="absolute -right-1/2 z-[-1] rounded-full bg-primary blur-[300px] size-60 sm:size-100 transform -translate-y-1/2 top-1/2" />
        </template>

        <template #default>
          <div
            v-if="selectedRepos.length > 0"
            class="mt-6 p-4 bg-muted/30 rounded-lg"
          >
            <p class="text-sm font-medium text-muted-foreground mb-2">
              Tracking {{ selectedRepos.length }} {{ selectedRepos.length === 1 ? 'repository' : 'repositories' }}:
            </p>
            <div class="flex flex-wrap gap-1">
              <UBadge
                v-for="repo in selectedRepos.slice(0, 5)"
                :key="repo"
                variant="outline"
                size="xs"
              >
                {{ repo }}
              </UBadge>
              <UBadge
                v-if="selectedRepos.length > 5"
                variant="outline"
                size="xs"
                color="gray"
              >
                +{{ selectedRepos.length - 5 }} more
              </UBadge>
            </div>
          </div>
        </template>
      </UPageSection>

      <section class="px-4 sm:px-6 xl:px-0 xl:-ms-30 xl:flex-1">
        <UColorModeButton class="fixed top-4 right-4 z-10" />
        <NuxtPage />
      </section>
    </div>

    <div
      v-else
      class="min-h-screen w-full relative bg-black "
    >
      <UPageSection
        :title="siteConfig.title"
        :description="siteConfig.description"
        :links="siteConfig.navigation.links"
        orientation="vertical"
        icon="i-lucide-rocket"
        class="relative overflow-hidden"
      >
        <template #top>
          <SkyBg />
          <div class="absolute -right-1/2 z-[-1] rounded-full bg-primary blur-[300px] size-60 sm:size-100 transform -translate-y-1/2 top-1/2" />
        </template>
      </UPageSection>

      <main class="px-4 sm:px-6 py-16">
        <UColorModeButton class="fixed top-4 right-4 z-10" />
        <NuxtPage />
      </main>
    </div>
  </UApp>
</template>
