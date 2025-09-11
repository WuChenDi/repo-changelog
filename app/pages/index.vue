<script setup lang="ts">
import { formatTimeAgo } from '@vueuse/core'

const route = useRoute()

const apiUrl = computed(() => {
  if (route.query.repos) {
    const repos = Array.isArray(route.query.repos)
      ? route.query.repos.join(',')
      : route.query.repos
    return `/api/releases?repos=${encodeURIComponent(repos)}`
  }
  return '/api/releases'
})

const { data: releases } = await useFetch(apiUrl, {
  transform: releases => releases.map((release: Release) => ({
    ...release,
    open: false
  })),
  deep: true
})
</script>

<template>
  <UChangelogVersions
    as="main"
    :indicator-motion="false"
    :ui="{
      root: 'py-16 sm:py-24 lg:py-32',
      indicator: 'inset-y-0'
    }"
  >
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
              :label="release.open ? 'Collpase release' : 'Expand release'"
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
