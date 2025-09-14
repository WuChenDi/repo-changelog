<script setup lang="ts">
import { formatTimeAgo } from '@vueuse/core'
import type { GithubRepo, RepoApiResponse, ReposApiResponse, SearchResult } from '~~/shared/types/releases'

const config = useRuntimeConfig()
const router = useRouter()

const selectedRepos = ref<string[]>([])
const searchQuery = ref<string>('')
const searchError = ref<string>('')
const isLoading = ref<boolean>(false)
const searchResults = ref<SearchResult[]>([])
const showResults = ref<boolean>(false)
const sortBy = ref<'stars' | 'forks' | 'name' | 'updated'>('stars')
const sortOrder = ref<'asc' | 'desc'>('desc')

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
  // { value: 'name', label: 'Name', icon: 'i-lucide-type' },
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
      path: '/repos',
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
  <div class="max-w-4xl mx-auto px-4 sm:px-6">
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

    <!-- Empty State -->
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
</template>
