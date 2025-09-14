<script setup lang="ts">
import { formatTimeAgo } from '@vueuse/core'
import { parseMarkdown } from '@nuxtjs/mdc/runtime'
import type { GithubRepo, RepoApiResponse, ReposApiResponse, SearchResult } from '~~/shared/types/releases'

const config = useRuntimeConfig()

const route = useRoute()
const router = useRouter()

const selectedRepos = ref<string[]>([])
const searchQuery = ref<string>('')
const searchError = ref<string>('')
const isLoading = ref<boolean>(false)
const searchResults = ref<SearchResult[]>([])
const showResults = ref<boolean>(false)
const sortBy = ref<'stars' | 'forks' | 'name' | 'updated'>('stars')
const sortOrder = ref<'asc' | 'desc'>('desc')

const releases = ref<any[]>([])
const releasesLoading = ref<boolean>(false)
const releasesError = ref<string>('')

const hasRepoQuery = computed(() => {
  return !!(route.query.repos && route.query.repos !== '')
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
  if (!hasRepoQuery.value) return

  releasesLoading.value = true
  releasesError.value = ''

  try {
    let repos: string[] = []

    if (route.query.repos) {
      const repoParams = Array.isArray(route.query.repos)
        ? route.query.repos
        : route.query.repos.toString().split(',')

      const validRepos = repoParams
        .map(repo => repo?.trim())
        .filter((repo): repo is string => repo != null && validateRepo(repo))

      if (validRepos?.length > 0) {
        repos = validRepos
      }
    }

    const allReleases = await Promise.all(
      repos.map(repo => fetchRepoReleases(repo))
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

watch(() => route.query.repos, async () => {
  if (hasRepoQuery.value) {
    await fetchReleases()
  }
}, { immediate: true })

// Helper function to convert GithubRepo to SearchResult
function convertToSearchResult(repo: GithubRepo): SearchResult {
  return {
    id: repo.id,
    name: repo.name,
    repo: repo.repo,
    description: repo.description || 'No description available',
    stars: repo.stars,
    forks: repo.forks,
    updatedAt: repo.updatedAt
  }
}

const sortOptions = [
  { value: 'stars', label: 'Stars', icon: 'i-lucide-star' },
  { value: 'forks', label: 'Forks', icon: 'i-lucide-git-fork' },
  { value: 'name', label: 'Name', icon: 'i-lucide-type' },
  { value: 'updated', label: 'Updated', icon: 'i-lucide-calendar' }
]

const sortedSearchResults = computed(() => {
  if (!searchResults.value.length) return []

  const results = [...searchResults.value]

  return results.sort((a, b) => {
    let comparison = 0

    switch (sortBy.value) {
      case 'stars':
        comparison = a.stars - b.stars
        break
      case 'forks':
        comparison = a.forks - b.forks
        break
      case 'name':
        comparison = a.repo.toLowerCase().localeCompare(b.repo.toLowerCase())
        break
      case 'updated':
        comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
        break
    }

    return sortOrder.value === 'desc' ? -comparison : comparison
  })
})

function toggleSortOrder() {
  sortOrder.value = sortOrder.value === 'desc' ? 'asc' : 'desc'
}

function validateRepoFormat(repo: string): boolean {
  return /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/.test(repo)
}

function validateOwnerFormat(owner: string): boolean {
  return /^[a-zA-Z0-9._-]+$/.test(owner)
}

async function searchRepositories() {
  searchError.value = ''
  searchResults.value = []
  showResults.value = false

  if (!searchQuery.value.trim()) {
    searchError.value = 'Please enter a repository name, username, or organization name'
    return
  }

  const input = searchQuery.value.trim()
  isLoading.value = true

  try {
    if (input.includes('/')) {
      if (!validateRepoFormat(input)) {
        searchError.value = 'Invalid format. Please use: owner/repository'
        return
      }
      await searchSingleRepository(input)
    } else {
      if (!validateOwnerFormat(input)) {
        searchError.value = 'Please enter a valid username or organization name'
        return
      }
      await searchOwnerRepositories(input)
    }
  } catch (error) {
    console.error('Search error:', error)
    searchError.value = 'Search failed. Please try again.'
  } finally {
    isLoading.value = false
  }
}

async function searchSingleRepository(repoName: string) {
  try {
    const response = await $fetch<RepoApiResponse>(`${config.public.apiUrl}/repos/${repoName}`)

    if (response?.error) {
      searchError.value = 'Repository not found or inaccessible'
      return
    }

    if (response?.repo) {
      searchResults.value = [convertToSearchResult(response.repo)]
      showResults.value = true
    } else {
      searchError.value = 'Repository not found'
    }
  } catch (error) {
    console.error('Single repository search error:', error)
    searchError.value = 'Repository not found or inaccessible'
  }
}

async function searchOwnerRepositories(owner: string) {
  try {
    let response: ReposApiResponse

    try {
      response = await $fetch<ReposApiResponse>(`${config.public.apiUrl}/orgs/${owner}/repos`)
    } catch {
      response = await $fetch<ReposApiResponse>(`${config.public.apiUrl}/users/${owner}/repos`)
    }

    if (response?.error) {
      searchError.value = 'User or organization not found'
      return
    }

    if (response?.repos && Array.isArray(response.repos) && response.repos.length > 0) {
      searchResults.value = response.repos.map(convertToSearchResult)
      showResults.value = true
    } else {
      searchError.value = 'No repositories found'
    }
  } catch (error) {
    console.error('Owner repositories search error:', error)
    searchError.value = 'User or organization not found'
  }
}

function toggleRepository(repoName: string) {
  if (selectedRepos.value.includes(repoName)) {
    removeRepository(repoName)
  } else {
    addSelectedRepository(repoName)
  }
}

function addSelectedRepository(repoName: string) {
  if (!selectedRepos.value.includes(repoName)) {
    selectedRepos.value.push(repoName)
  }
}

function removeRepository(repo: string) {
  const index = selectedRepos.value.indexOf(repo)
  if (index !== -1) {
    selectedRepos.value.splice(index, 1)
  }
}

async function viewReleases() {
  if (selectedRepos.value.length === 0) {
    return
  }

  isLoading.value = true

  try {
    await router.push({
      query: {
        repos: selectedRepos.value.join(',')
      }
    })
  } finally {
    isLoading.value = false
  }
}

function clearAllSelections() {
  selectedRepos.value = []
}
</script>

<template>
  <div
    v-if="!hasRepoQuery"
    class="max-w-4xl mx-auto px-4 sm:px-6"
  >
    <div class="mb-6 sm:mb-8">
      <h3 class="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 flex items-center gap-2">
        <UIcon
          name="i-lucide-search"
          class="w-4 h-4 sm:w-5 sm:h-5"
        />
        Search Repositories
      </h3>
      <div class="space-y-3 sm:space-y-4">
        <div class="flex items-center gap-2">
          <UInput
            v-model="searchQuery"
            :loading="isLoading"
            placeholder="Enter repository, username, or organization"
            class="flex-1 text-sm sm:text-base"
            icon="i-lucide-search"
            :color="searchError ? 'error' : 'primary'"
            :disabled="isLoading"
            @keyup.enter="searchRepositories"
          >
            <template
              v-if="searchQuery?.length"
              #trailing
            >
              <UButton
                color="neutral"
                variant="link"
                size="sm"
                icon="i-lucide-circle-x"
                aria-label="Clear input"
                @click="searchQuery = ''"
              />
            </template>
          </UInput>
          <UButton
            icon="i-lucide-search"
            :loading="isLoading"
            :disabled="!searchQuery.trim()"
            size="sm"
            @click="searchRepositories"
          >
            {{ isLoading ? 'Searching...' : 'Search' }}
          </UButton>
        </div>

        <p
          v-if="searchError"
          class="text-red-500 text-xs sm:text-sm flex items-start gap-2"
        >
          <UIcon
            name="i-lucide-alert-circle"
            class="w-4 h-4 mt-0.5 flex-shrink-0"
          />
          <span>{{ searchError }}</span>
        </p>
      </div>
    </div>

    <div
      v-if="showResults"
      class="mb-6 sm:mb-8"
    >
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h3 class="text-lg sm:text-xl font-semibold flex items-center gap-2">
          <UIcon
            name="i-lucide-package-2"
            class="w-4 h-4 sm:w-5 sm:h-5"
          />
          Search Results
          <UBadge
            variant="outline"
            color="primary"
            size="sm"
          >
            {{ searchResults.length }}
          </UBadge>
        </h3>

        <div class="flex items-center gap-2 sm:gap-3">
          <div class="text-xs text-muted-foreground">
            Sort by:
          </div>

          <div class="sm:flex items-center gap-1 border border-default rounded-lg p-1">
            <UButton
              v-for="option in sortOptions"
              :key="option.value"
              :icon="option.icon"
              size="xs"
              :variant="sortBy === option.value ? 'solid' : 'ghost'"
              :color="sortBy === option.value ? 'primary' : 'neutral'"
              class="text-xs"
              @click="sortBy = option.value as 'stars' | 'forks' | 'name' | 'updated'"
            >
              <span class="hidden lg:inline">{{ option.label }}</span>
            </UButton>
          </div>

          <UButton
            class="p-2"
            :icon="sortOrder === 'desc' ? 'i-lucide-arrow-down' : 'i-lucide-arrow-up'"
            size="xs"
            variant="outline"
            color="neutral"
            :title="`Sort ${sortOrder === 'desc' ? 'Descending' : 'Ascending'}`"
            @click="toggleSortOrder"
          />
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
        <div
          v-for="repo in sortedSearchResults"
          :key="repo.id"
          class="group relative p-3 sm:p-4 border rounded-lg transition-all duration-300 cursor-pointer overflow-hidden"
          :class="{
            'border-primary bg-primary/5 shadow-md transform scale-[1.02] ring-2 ring-primary/20': selectedRepos.includes(repo.repo),
            'border-default hover:border-primary/50 hover:bg-primary/5 hover:shadow-sm': !selectedRepos.includes(repo.repo)
          }"
          @click="toggleRepository(repo.repo)"
        >
          <div
            v-if="selectedRepos.includes(repo.repo)"
            class="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent pointer-events-none"
          />

          <div
            v-if="selectedRepos.includes(repo.repo)"
            class="absolute -top-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-primary rounded-full flex items-center justify-center shadow-lg transform rotate-12 animate-pulse"
          >
            <UIcon
              name="i-lucide-check"
              class="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white"
            />
          </div>

          <div class="relative z-10 flex flex-col h-full">
            <div class="flex items-start justify-between mb-2">
              <h4
                class="font-medium text-sm sm:text-base truncate flex-1 min-w-0 pr-2 transition-colors duration-200"
                :class="{
                  'text-primary': selectedRepos.includes(repo.repo),
                  'group-hover:text-primary': !selectedRepos.includes(repo.repo)
                }"
              >
                <UIcon
                  name="i-lucide-github"
                  class="w-3 h-3 sm:w-4 sm:h-4 inline mr-1 sm:mr-2 opacity-60"
                />
                <span class="break-all">{{ repo.repo }}</span>
              </h4>
            </div>
            <p class="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3 flex-1 line-clamp-2 sm:line-clamp-3">
              {{ repo.description }}
            </p>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2 sm:gap-4 text-xs text-muted-foreground">
                <div
                  class="flex items-center gap-1 transition-colors duration-200"
                  :class="{
                    'text-primary': selectedRepos.includes(repo.repo),
                    'text-yellow-600 font-medium': sortBy === 'stars' && !selectedRepos.includes(repo.repo)
                  }"
                >
                  <UIcon
                    name="i-lucide-star"
                    class="w-3 h-3 flex-shrink-0"
                  />
                  <span class="text-xs">{{ repo.stars > 999 ? (repo.stars/1000).toFixed(1) + 'k' : repo.stars }}</span>
                </div>
                <div
                  class="flex items-center gap-1 transition-colors duration-200"
                  :class="{
                    'text-primary': selectedRepos.includes(repo.repo),
                    'text-blue-600 font-medium': sortBy === 'forks' && !selectedRepos.includes(repo.repo)
                  }"
                >
                  <UIcon
                    name="i-lucide-git-fork"
                    class="w-3 h-3 flex-shrink-0"
                  />
                  <span class="text-xs">{{ repo.forks > 999 ? (repo.forks/1000).toFixed(1) + 'k' : repo.forks }}</span>
                </div>
                <div
                  class="hidden sm:flex items-center gap-1 transition-colors duration-200"
                  :class="{
                    'text-primary': selectedRepos.includes(repo.repo),
                    'text-green-600 font-medium': sortBy === 'updated' && !selectedRepos.includes(repo.repo)
                  }"
                >
                  <UIcon
                    name="i-lucide-calendar"
                    class="w-3 h-3 flex-shrink-0"
                  />
                  <span class="text-xs">{{ formatTimeAgo(new Date(repo.updatedAt)) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="selectedRepos.length > 0"
      class="mb-6 sm:mb-8"
    >
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h3 class="text-lg sm:text-xl font-semibold flex items-center gap-2">
          <UIcon
            name="i-lucide-bookmark"
            class="w-4 h-4 sm:w-5 sm:h-5"
          />
          Selected Repositories
          <UBadge
            variant="solid"
            color="primary"
            size="sm"
            class="animate-pulse"
          >
            {{ selectedRepos.length }}
          </UBadge>
        </h3>
        <UButton
          variant="ghost"
          size="sm"
          icon="i-lucide-trash-2"
          color="error"
          class="w-full sm:w-auto justify-center"
          @click="clearAllSelections"
        >
          Clear All
        </UButton>
      </div>

      <div class="flex flex-wrap gap-1.5 sm:gap-2 mb-4 sm:mb-6">
        <UBadge
          v-for="repo in selectedRepos"
          :key="repo"
          variant="outline"
          size="sm"
          class="group cursor-pointer hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all duration-200 px-2 sm:px-3 py-1 sm:py-1.5 animate-in slide-in-from-bottom-2"
          @click="removeRepository(repo)"
        >
          <UIcon
            name="i-lucide-github"
            class="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1"
          />
          <span class="text-xs sm:text-sm break-all">{{ repo }}</span>
          <UIcon
            name="i-lucide-x"
            class="ml-1 sm:ml-2 w-2.5 h-2.5 sm:w-3 sm:h-3 opacity-50 group-hover:opacity-100 transition-opacity duration-200"
          />
        </UBadge>
      </div>

      <div class="text-center">
        <UButton
          :loading="isLoading && selectedRepos.length > 0"
          :disabled="isLoading"
          size="lg"
          icon="i-lucide-rocket"
          color="primary"
          class="w-full sm:w-auto animate-pulse shadow-lg hover:shadow-xl transition-shadow duration-300"
          @click="viewReleases"
        >
          <span class="hidden sm:inline">
            {{ isLoading ? 'Loading...' : `View Changelog (${selectedRepos.length} repositories)` }}
          </span>
          <span class="sm:hidden">
            {{ isLoading ? 'Loading...' : `View Changelog (${selectedRepos.length})` }}
          </span>
        </UButton>
      </div>
    </div>

    <div
      v-else
      class="text-center py-8 sm:py-12"
    >
      <div class="text-muted-foreground mb-4">
        <UIcon
          name="i-lucide-package-search"
          class="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 opacity-50"
        />
        <p class="text-base sm:text-lg font-medium mb-2">
          No repositories selected yet
        </p>
        <p class="text-sm px-4">
          Search and add the open source projects you want to track
        </p>
      </div>
    </div>
  </div>

  <UChangelogVersions
    v-else
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

    <UChangelogVersion
      v-for="release in releases"
      :key="release.tag"
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
</template>
