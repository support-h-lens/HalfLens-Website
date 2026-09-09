import assert from 'node:assert/strict'
import { createServer } from 'vite'

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
try {
  const { safeWorkLink, workLinkPoster, validateArchiveWork, mapArchiveWork } = await server.ssrLoadModule('/src/lib/archiveWorks.ts')
  const { createPublicWebsiteContent, fallbackPublicWebsiteContent } = await server.ssrLoadModule('/src/lib/cmsContent.ts')
  const row = { id: 'test', work_type: 'photography', title: '  صورة  ', client: 'عميل', project_year: 2026, link_url: 'https://example.com/gallery' }
  assert.equal(mapArchiveWork(row).title, 'صورة')
  assert.equal(mapArchiveWork(row).workType, 'photography')
  for (const link of ['javascript:alert(1)', 'data:text/html,hi', '//evil.test', 'https://user:password@example.com', 'https://', 'https://example.com/a b', 'https:\\example.com', 'file:///test']) {
    assert.equal(safeWorkLink(link), null, link)
    assert.throws(() => validateArchiveWork({ ...row, link_url: link }))
    assert.equal(mapArchiveWork({ ...row, link_url: link }), null)
  }
  for (const patch of [{ title: ' ' }, { client: ' ' }, { project_year: NaN }, { project_year: 2026.5 }, { project_year: 0 }, { work_type: 'unknown' }]) assert.throws(() => validateArchiveWork({ ...row, ...patch }))
  for (const link of ['https://youtu.be/ZlY0tDv5sSY', 'https://www.youtube.com/watch?v=ZlY0tDv5sSY', 'https://www.youtube.com/shorts/ZlY0tDv5sSY', 'https://www.youtube-nocookie.com/embed/ZlY0tDv5sSY']) assert.equal(workLinkPoster(link), 'https://i.ytimg.com/vi/ZlY0tDv5sSY/hqdefault.jpg')
  for (const link of ['https://youtube.com.evil.test/watch?v=ZlY0tDv5sSY', 'https://youtube.com/watch?v=../../attack', 'https://vimeo.com/123', 'https://example.com/gallery']) assert.equal(workLinkPoster(link), undefined)
  assert.deepEqual(createPublicWebsiteContent([], [], [], []).archiveWorks, [])
  assert.equal(createPublicWebsiteContent([], [], []).archiveWorks, fallbackPublicWebsiteContent.archiveWorks)
  const independent = createPublicWebsiteContent([], [], [], [row])
  assert.equal(independent.archiveWorks.length, 1)
  assert.equal(independent.projects, fallbackPublicWebsiteContent.projects)
  assert.equal(independent.archiveWorks[0].link, row.link_url)
  assert.deepEqual(createPublicWebsiteContent([], [], [], [{ ...row, link_url: 'javascript:bad' }]).archiveWorks, [])
  console.log('PASS archive validation, safe URLs, thumbnail hosts, category/year validation, empty-vs-unavailable content, independent homepage data')
} finally { await server.close() }
