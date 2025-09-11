import { parseMarkdown } from '@nuxtjs/mdc/runtime'

const DEFAULT_REPOS = [
  'nuxt/nuxt',
  'nuxt/image',
  'nuxt/fonts',
  'nuxt/ui',
  'nuxt/content',
  'nuxt/devtools',
  'nuxt/test-utils',
  'nuxt/scripts',
  'nuxt/eslint',
  'nuxt/icon'
]

function validateRepo(repo: string): boolean {
  return /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/.test(repo)
}

export default defineCachedEventHandler(async (event) => {
  console.log('fetching releases')

  const query = getQuery(event)
  let repos: string[] = DEFAULT_REPOS

  if (query.repos) {
    // ?repos=nuxt/nuxt,nuxt/ui
    // ?repos=nuxt/nuxt&repos=nuxt/ui
    const repoParams = Array.isArray(query.repos)
      ? query.repos
      : query.repos.toString().split(',')

    const validRepos = repoParams
      .map(repo => repo.trim())
      .filter(repo => repo && validateRepo(repo))

    if (validRepos.length > 0) {
      repos = validRepos
    }
  }

  repos = repos.slice(0, 20)

  try {
    const releases: Release[] = await Promise.all(
      repos.map(async (repo) => {
        try {
          const { releases } = await $fetch<{ releases: any[] }>(`https://ungh.cc/repos/${repo}/releases`)
          return Promise.all(
            releases
              .filter(r => r.draft === false)
              .map(async release => ({
                url: `https://github.com/${repo}/releases/tag/${release.tag}`,
                repo,
                tag: release.tag,
                title: release.name || release.tag,
                date: release.publishedAt,
                body: (await parseMarkdown(release.markdown)).body
              }))
          )
        } catch (error) {
          console.warn(`Failed to fetch releases for ${repo}:`, error)
          return []
        }
      })
    ).then(results => results.flat())

    return releases.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 50)
  } catch (error) {
    console.error('Error fetching releases:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch releases'
    })
  }
}, {
  maxAge: 60,
  getKey: (event) => {
    const query = getQuery(event)
    const repos = query.repos || 'default'
    return `releases:${Array.isArray(repos) ? repos.join(',') : repos}`
  }
})
