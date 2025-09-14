<script setup lang="ts">
import { formatTimeAgo } from '@vueuse/core'
import { parseMarkdown } from '@nuxtjs/mdc/runtime'

const config = useRuntimeConfig()
const route = useRoute()
const router = useRouter()

const releases = ref<any[]>([])
const releasesLoading = ref<boolean>(false)
const releasesError = ref<string>('')

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
  if (repoCount === 0) return 'Track the latest releases and changelogs'
  if (repoCount === 1) return `Latest releases and updates for ${selectedRepos.value[0]}`
  return `Latest releases and updates for ${repoCount} selected repositories`
})

function validateRepo(repo: string): boolean {
  return /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/.test(repo)
}

async function fetchRepoReleases(repo: string) {
  try {
    const response = await $fetch<{ releases: any[] }>(`${config.public.apiUrl}/repos/${repo}/releases`)
    return await Promise.all(
      response.releases
        .filter(r => r.draft === false)
        .map(async release => ({
          url: `https://github.com/${repo}/releases/tag/${release.tag}`,
          repo,
          tag: release.tag,
          title: release.name || release.tag,
          date: release.publishedAt,
          body: (await parseMarkdown(release.markdown)).body,
          open: false
        }))
    )
  } catch (error) {
    console.warn(`Failed to fetch releases for ${repo}:`, error)
    return []
  }
}

async function fetchReleases() {
  if (selectedRepos.value.length === 0) {
    router.push('/')
    return
  }

  releasesLoading.value = true
  releasesError.value = ''

  try {
    const validRepos = selectedRepos.value.filter(repo => validateRepo(repo))

    if (validRepos.length === 0) {
      releasesError.value = 'No valid repositories found'
      return
    }

    const allReleases = await Promise.all(
      validRepos.map(repo => fetchRepoReleases(repo))
    )

    releases.value = allReleases
      .flat()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 50)
      .map(release => ({
        ...release,
        open: false
      }))
  } catch (error) {
    console.error('Error fetching releases:', error)
    releasesError.value = 'Failed to fetch releases'
  } finally {
    releasesLoading.value = false
  }
}

function goBackToSelection() {
  router.push('/')
}

watch(() => route.query.repos, async () => {
  await fetchReleases()
}, { immediate: true })

onMounted(() => {
  if (selectedRepos.value.length === 0) {
    router.push('/')
  }
})
</script>

<template>
  <div class="min-h-[calc(100vh-68px)] xl:grid xl:grid-cols-2">
    <UPageSection
      :title="sidebarTitle"
      :description="sidebarDescription"
      orientation="vertical"
      :links="[
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
          to: 'https://github.com/WuChenDi/repo-changelog',
          target: '_blank'
        }
      ]"
      :ui="{
        root: 'border-b border-default xl:border-b-0 xl:sticky xl:inset-y-0 xl:h-screen overflow-hidden',
        container: 'h-full items-center justify-center',
        wrapper: 'flex flex-col',
        headline: 'mb-6',
        title: 'text-left text-4xl',
        description: 'text-left max-w-lg',
        links: 'justify-start'
      }"
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
              `radial-gradient(ellipse 100% 100% at 50% 0%, #000 90%, transparent 100%)`,
            maskImage:
              `radial-gradient(ellipse 100% 100% at 50% 0%, #000 90%, transparent 100%)`
          }"
        />
      </template>

      <template #default>
        <div class="mt-6 p-4 bg-muted/30 rounded-lg border border-border/50">
          <div class="mb-6 sm:mb-8">
            <UButton
              variant="ghost"
              icon="i-lucide-arrow-left"
              size="sm"
              class="w-full sm:w-auto justify-center"
              @click="goBackToSelection"
            >
              Back to Repository Selection
            </UButton>
          </div>

          <div v-if="selectedRepos.length > 0">
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
              >
                +{{ selectedRepos.length - 5 }} more
              </UBadge>
            </div>
          </div>
        </div>
      </template>
    </UPageSection>

    <section class="px-4 sm:px-6 xl:px-0 xl:-ms-30 xl:flex-1 bg-background">
      <UColorModeButton class="fixed top-4 right-4 z-10" />

      <UChangelogVersions
        as="main"
        :indicator-motion="false"
        :ui="{
          root: 'py-8 sm:py-16 md:py-24 lg:py-32 px-4 sm:px-6',
          indicator: 'inset-y-0'
        }"
      >
        <div
          v-if="releasesLoading"
          class="text-center py-8"
        >
          <UIcon
            name="i-lucide-loader-2"
            class="w-8 h-8 animate-spin mx-auto mb-4"
          />
          <p class="text-muted-foreground">
            Loading releases...
          </p>
        </div>

        <div
          v-else-if="releasesError"
          class="text-center py-8"
        >
          <UIcon
            name="i-lucide-alert-circle"
            class="w-8 h-8 mx-auto mb-4 text-red-500"
          />
          <p class="text-red-500 mb-4">
            {{ releasesError }}
          </p>
          <UButton
            variant="outline"
            @click="fetchReleases"
          >
            Retry
          </UButton>
        </div>

        <div
          v-else-if="releases.length === 0 && !releasesLoading"
          class="text-center py-8"
        >
          <UIcon
            name="i-lucide-package-x"
            class="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50"
          />
          <p class="text-muted-foreground mb-4">
            No releases found for the selected repositories
          </p>
          <UButton
            variant="outline"
            @click="goBackToSelection"
          >
            Select Different Repositories
          </UButton>
        </div>

        <UChangelogVersion
          v-for="release in releases"
          :key="`${release.repo}-${release.tag}`"
          :to="release.url"
          target="_blank"
          :title="release.title"
          :badge="{
            label: release.repo === 'nuxt/nuxt' ? 'nuxt' : `@${release.repo}`,
            variant: 'outline',
            color: release.repo === 'nuxt/nuxt' ? 'primary' : 'neutral'
          }"
          :date="formatTimeAgo(new Date(release.date))"
          :ui="{
            root: 'flex items-start',
            container: 'max-w-xl 2xl:mx-12 w-full',
            header: 'border-b border-default pb-3 sm:pb-4',
            title: 'text-xl sm:text-2xl lg:text-3xl',
            date: 'text-xs/6 sm:text-xs/9 text-highlighted font-mono',
            indicator: 'sticky top-0 pt-8 -mt-8 sm:pt-16 sm:-mt-16 md:pt-24 md:-mt-24 lg:pt-32 lg:-mt-32'
          }"
        >
          <template #body>
            <div
              class="relative"
              :class="{
                'h-auto min-h-[150px] sm:min-h-[200px]': release.open,
                'h-[150px] sm:h-[200px] overflow-y-hidden': !release.open && release.body.children.length > 4
              }"
            >
              <MDCRenderer
                v-if="release.body"
                :body="release.body"
                style="zoom: 0.85"
              />
              <div
                v-if="!release.open && release.body.children.length > 4"
                class="h-12 sm:h-16 absolute inset-x-0 bottom-0 flex items-end justify-center"
                :class="{ 'bg-gradient-to-t from-default to-default/50': !release.open }"
              >
                <UButton
                  size="sm"
                  icon="i-lucide-chevron-down"
                  color="neutral"
                  variant="outline"
                  :data-state="release.open ? 'open' : 'closed'"
                  :label="release.open ? 'Collapse' : 'Expand'"
                  class="group text-xs sm:text-sm"
                  :ui="{ leadingIcon: 'group-data-[state=open]:rotate-180' }"
                  @click="release.open = !release.open"
                />
              </div>
            </div>
          </template>
        </UChangelogVersion>
      </UChangelogVersions>
    </section>
  </div>
</template>
