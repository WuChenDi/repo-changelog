<script setup lang="ts">
import { formatTimeAgo } from '@vueuse/core'
import type { GithubRepo, RepoApiResponse, ReposApiResponse, SearchResult } from '~~/shared/types/releases'

const route = useRoute()
const router = useRouter()

const selectedRepos = ref<string[]>([])
const searchQuery = ref<string>('')
const searchError = ref<string>('')
const isLoading = ref<boolean>(false)
const searchResults = ref<SearchResult[]>([])
const showResults = ref<boolean>(false)

const hasRepoQuery = computed(() => {
  return !!(route.query.repos && route.query.repos !== '')
})

const apiUrl = computed(() => {
  if (!hasRepoQuery.value) return null

  const repos = Array.isArray(route.query.repos)
    ? route.query.repos.join(',')
    : route.query.repos as string
  return `/api/releases?repos=${encodeURIComponent(repos)}`
})

const { data: releases } = await useFetch(apiUrl, {
  key: () => route.fullPath,
  transform: releases => releases?.map((release: any) => ({
    ...release,
    open: false
  })) || [],
  deep: true,
  server: false
})

// Helper function to convert GithubRepo to SearchResult
function convertToSearchResult(repo: GithubRepo): SearchResult {
  return {
    id: repo.id,
    name: repo.name,
    repo: repo.repo,
    description: repo.description || 'No description available',
    stars: repo.stars,
    forks: repo.forks
  }
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
    const response = await $fetch<RepoApiResponse>(`https://ungh.cc/repos/${repoName}`)

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
      response = await $fetch<ReposApiResponse>(`https://ungh.cc/orgs/${owner}/repos`)
    } catch {
      response = await $fetch<ReposApiResponse>(`https://ungh.cc/users/${owner}/repos`)
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
    class="max-w-4xl mx-auto"
  >
    <div class="mb-8">
      <h3 class="text-xl font-semibold mb-4 flex items-center gap-2">
        <UIcon
          name="i-lucide-search"
          class="w-5 h-5"
        />
        Search Repositories
      </h3>
      <div class="space-y-4">
        <div class="flex gap-3">
          <UInput
            v-model="searchQuery"
            placeholder="Enter repository, username, or organization (e.g., vuejs/core, antfu, vercel)"
            class="flex-1"
            :color="searchError ? 'error' : 'primary'"
            :disabled="isLoading"
            @keyup.enter="searchRepositories"
          />
          <UButton
            icon="i-lucide-search"
            :loading="isLoading"
            :disabled="!searchQuery.trim()"
            @click="searchRepositories"
          >
            {{ isLoading ? 'Searching...' : 'Search' }}
          </UButton>
        </div>

        <div class="text-sm text-muted-foreground bg-muted/30 rounded-lg p-4">
          <p class="font-medium mb-2">
            💡 Search Tips:
          </p>
          <ul class="space-y-1">
            <li>• <code class="bg-muted px-2 py-1 rounded text-xs">vuejs/core</code> - Search specific repository</li>
            <li>• <code class="bg-muted px-2 py-1 rounded text-xs">antfu</code> - Search all repositories by user</li>
            <li>• <code class="bg-muted px-2 py-1 rounded text-xs">vercel</code> - Search all repositories by organization</li>
          </ul>
        </div>

        <p
          v-if="searchError"
          class="text-red-500 text-sm flex items-center gap-2"
        >
          <UIcon
            name="i-lucide-alert-circle"
            class="w-4 h-4"
          />
          {{ searchError }}
        </p>
      </div>
    </div>

    <div
      v-if="showResults"
      class="mb-8"
    >
      <h3 class="text-xl font-semibold mb-4 flex items-center gap-2">
        <UIcon
          name="i-lucide-package-2"
          class="w-5 h-5"
        />
        Search Results
        <UBadge
          variant="outline"
          color="primary"
        >
          {{ searchResults.length }}
        </UBadge>
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <div
          v-for="repo in searchResults"
          :key="repo.id"
          class="p-4 border border-default rounded-lg transition-all"
          :class="{
            'border-green-200 bg-green-50/50': selectedRepos.includes(repo.repo),
            'hover:border-primary hover:bg-primary/5 cursor-pointer': !selectedRepos.includes(repo.repo),
            'cursor-default': selectedRepos.includes(repo.repo)
          }"
          @click="!selectedRepos.includes(repo.repo) && addSelectedRepository(repo.repo)"
        >
          <div class="flex flex-col h-full">
            <div class="flex items-start justify-between mb-2">
              <h4 class="font-medium truncate flex-1 min-w-0 pr-2">
                {{ repo.repo }}
              </h4>
              <UBadge
                v-if="selectedRepos.includes(repo.repo)"
                variant="solid"
                size="xs"
                color="primary"
                class="shrink-0"
              >
                <UIcon
                  name="i-lucide-check"
                  class="w-3 h-3 mr-1"
                />
                Added
              </UBadge>
            </div>
            <p class="text-sm text-muted-foreground mb-3 flex-1 line-clamp-3">
              {{ repo.description }}
            </p>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3 text-xs text-muted-foreground">
                <div class="flex items-center gap-1">
                  <UIcon
                    name="i-lucide-star"
                    class="w-3 h-3"
                  />
                  {{ repo.stars.toLocaleString() }}
                </div>
                <div class="flex items-center gap-1">
                  <UIcon
                    name="i-lucide-git-fork"
                    class="w-3 h-3"
                  />
                  {{ repo.forks.toLocaleString() }}
                </div>
              </div>
              <UButton
                v-if="!selectedRepos.includes(repo.repo)"
                size="xs"
                icon="i-lucide-plus"
                color="primary"
                @click.stop="addSelectedRepository(repo.repo)"
              >
                Add
              </UButton>
              <UButton
                v-else
                size="xs"
                icon="i-lucide-check"
                color="primary"
                variant="soft"
                disabled
              >
                Added
              </UButton>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="selectedRepos.length > 0"
      class="mb-8"
    >
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-xl font-semibold flex items-center gap-2">
          <UIcon
            name="i-lucide-bookmark"
            class="w-5 h-5"
          />
          Selected Repositories
          <UBadge
            variant="solid"
            color="primary"
          >
            {{ selectedRepos.length }}
          </UBadge>
        </h3>
        <UButton
          variant="ghost"
          size="sm"
          icon="i-lucide-trash-2"
          color="error"
          @click="clearAllSelections"
        >
          Clear All
        </UButton>
      </div>

      <div class="flex flex-wrap gap-2 mb-6">
        <UBadge
          v-for="repo in selectedRepos"
          :key="repo"
          variant="outline"
          size="md"
          class="cursor-pointer hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors px-3 py-1.5"
          @click="removeRepository(repo)"
        >
          <UIcon
            name="i-lucide-github"
            class="w-3 h-3 mr-1"
          />
          {{ repo }}
          <UIcon
            name="i-lucide-x"
            class="ml-1 w-3 h-3"
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
          @click="viewReleases"
        >
          {{ isLoading ? 'Loading...' : `View Changelog (${selectedRepos.length} repositories)` }}
        </UButton>
      </div>
    </div>

    <div
      v-else
      class="text-center py-12"
    >
      <div class="text-muted-foreground mb-4">
        <UIcon
          name="i-lucide-package-search"
          class="w-16 h-16 mx-auto mb-4 opacity-50"
        />
        <p class="text-lg font-medium mb-2">
          No repositories selected yet
        </p>
        <p class="text-sm">
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
      root: 'py-16 sm:py-24 lg:py-32',
      indicator: 'inset-y-0'
    }"
  >
    <div class="mb-8">
      <UButton
        variant="ghost"
        icon="i-lucide-arrow-left"
        size="sm"
        @click="$router.push('/')"
      >
        Back to Repository Selection
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
        header: 'border-b border-default pb-4',
        title: 'text-3xl',
        date: 'text-xs/9 text-highlighted font-mono',
        indicator: 'sticky top-0 pt-16 -mt-16 sm:pt-24 sm:-mt-24 lg:pt-32 lg:-mt-32'
      }"
    >
      <template #body>
        <div
          class="relative"
          :class="{
            'h-auto min-h-[200px]': release.open,
            'h-[200px] overflow-y-hidden': !release.open && release.body.children.length > 4
          }"
        >
          <MDCRenderer
            v-if="release.body"
            :body="release.body"
            style="zoom: 0.85"
          />
          <div
            v-if="!release.open && release.body.children.length > 4"
            class="h-16 absolute inset-x-0 bottom-0 flex items-end justify-center"
            :class="{ 'bg-gradient-to-t from-default to-default/50': !release.open }"
          >
            <UButton
              size="sm"
              icon="i-lucide-chevron-down"
              color="neutral"
              variant="outline"
              :data-state="release.open ? 'open' : 'closed'"
              :label="release.open ? 'Collapse release' : 'Expand release'"
              class="group"
              :ui="{ leadingIcon: 'group-data-[state=open]:rotate-180' }"
              @click="release.open = !release.open"
            />
          </div>
        </div>
      </template>
    </UChangelogVersion>
  </UChangelogVersions>
</template>
