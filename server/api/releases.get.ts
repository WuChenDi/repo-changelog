import { parseMarkdown } from '@nuxtjs/mdc/runtime'

function validateRepo(repo: string): boolean {
  return /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/.test(repo)
}

export default defineCachedEventHandler(async (event) => {
  console.log('fetching releases')

  const config = useRuntimeConfig()
  const query = getQuery(event)

  if (!query.repos) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No repositories specified'
    })
  }

  // Parse repository parameters
  const repoParams = Array.isArray(query.repos)
    ? query.repos
    : query.repos.toString().split(',')

  const repos = repoParams
    .map(repo => repo.trim())
    .filter(repo => repo && validateRepo(repo))

  if (repos.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No valid repositories provided'
    })
  }

  try {
    const releases: Release[] = await Promise.all(
      repos.map(async (repo) => {
        try {
          const { releases } = await $fetch<{ releases: any[] }>(`${config.apiUrl}/repos/${repo}/releases`)
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
    const repos = query.repos
    return `releases:${Array.isArray(repos) ? repos.join(',') : repos}`
  }
})
