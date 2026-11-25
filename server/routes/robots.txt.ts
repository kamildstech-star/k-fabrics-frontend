import { storefrontUrl } from '~/utils/seo'

export default defineEventHandler((event) => {
  const { public: { siteUrl } } = useRuntimeConfig()
  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  setHeader(event, 'Cache-Control', 'public, max-age=3600')

  // Leave catalog/search variants crawlable so crawlers can see the noindex
  // directive. Disallow private-facing routes only; robots is not access control.
  return `User-agent: *
Allow: /
Disallow: /account
Disallow: /checkout
Disallow: /login
Disallow: /register

Sitemap: ${storefrontUrl(siteUrl, '/sitemap.xml')}
`
})
