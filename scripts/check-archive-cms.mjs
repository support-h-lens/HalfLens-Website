import assert from 'node:assert/strict'
import { loadEnv } from 'vite'
import { mkdir } from 'node:fs/promises'
import { chromium } from '../../pw-diag/node_modules/playwright/index.mjs'

// Opt-in integration test against the configured project. Never store a password or session.
const env = { ...loadEnv('development', process.cwd(), ''), ...process.env }
if (!env.HLENS_TEST_EMAIL || !env.HLENS_TEST_PASSWORD) throw new Error('Set HLENS_TEST_EMAIL and HLENS_TEST_PASSWORD for this test only.')
const base = env.HLENS_BENCH_URL || 'http://127.0.0.1:5189'
const api = `${env.VITE_SUPABASE_URL}/rest/v1`
const publicHeaders = { apikey: env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${env.VITE_SUPABASE_ANON_KEY}` }
const read = async (path, headers = publicHeaders) => {
  const response = await fetch(`${api}/${path}`, { headers })
  assert.ok(response.ok, `${path}: ${response.status}`)
  return response.json()
}
const before = await read('website_projects?select=*&order=id.asc')
const archiveBefore = await read('website_archive_works?select=id&status=eq.published')
const title = `QA archive ${crypto.randomUUID()}`
const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
const page = await context.newPage()
let testId, ownerHeaders
const errors = []
page.on('pageerror', error => errors.push(error.message))
await mkdir('artifacts/archive-cms', { recursive: true })
try {
  await page.goto(`${base}/admin/`)
  await page.getByLabel('البريد الإلكتروني', { exact: true }).fill(env.HLENS_TEST_EMAIL)
  await page.getByLabel('كلمة المرور', { exact: true }).fill(env.HLENS_TEST_PASSWORD)
  await page.getByRole('button', { name: 'دخول آمن' }).click()
  await page.locator('.admin-sidebar nav').waitFor()
  // Credential remains inside this test process, never logged or written to artifacts.
  const token = await page.evaluate(() => JSON.parse(localStorage.getItem('h-lens-website-admin-auth')).access_token)
  ownerHeaders = { ...publicHeaders, Authorization: `Bearer ${token}` }
  await page.locator('.admin-sidebar nav button').filter({ hasText: 'كل الأعمال' }).click()
  await page.getByRole('button', { name: 'إضافة جديد' }).click()
  const dialog = page.getByRole('dialog')
  assert.equal(await dialog.locator('input,select,textarea').count(), 5)
  await dialog.getByLabel('نوع العمل').selectOption('photography')
  await dialog.getByLabel('اسم العمل', { exact: true }).fill(title)
  await dialog.getByLabel('العميل', { exact: true }).fill('QA client')
  await dialog.getByLabel('السنة', { exact: true }).fill('2026')
  await dialog.getByLabel('رابط العمل', { exact: true }).fill('https://youtu.be/ZlY0tDv5sSY')
  await dialog.getByRole('button', { name: 'حفظ المسودة' }).click()
  await dialog.waitFor({ state: 'hidden' })
  const rows = await read(`website_archive_works?select=*&title=eq.${encodeURIComponent(title)}`, ownerHeaders)
  assert.equal(rows.length, 1)
  testId = rows[0].id
  assert.equal(rows[0].status, 'draft')
  assert.equal(rows[0].published_at, null)
  assert.equal((await read(`website_archive_works?select=*&id=eq.${testId}`)).length, 0)
  const record = page.locator('.admin-archive article').filter({ hasText: title })
  await record.getByRole('button', { name: 'تحرير', exact: true }).click()
  await dialog.getByLabel('العميل', { exact: true }).fill('QA updated client')
  await dialog.getByRole('button', { name: 'حفظ التعديلات' }).click()
  await dialog.waitFor({ state: 'hidden' })
  await record.getByRole('button', { name: 'نشر', exact: true }).click()
  await record.getByRole('button', { name: 'إرجاع لمسودة' }).waitFor()
  const published = await read(`website_archive_works?select=*&id=eq.${testId}`)
  assert.equal(published[0].client, 'QA updated client')
  assert.ok(published[0].published_at)
  const publicPage = await context.newPage()
  // Production HTML was built BEFORE this record: live archive refresh must find it.
  await publicPage.goto(`${base}/work/`)
  await publicPage.getByRole('link', { name: `${title} — يفتح في تبويب جديد` }).waitFor()
  await publicPage.locator('[data-category="photography"]').click()
  assert.equal(await publicPage.locator('.project-index__row').count(), 1)
  assert.equal(await publicPage.locator('.project-index__row').getAttribute('href'), 'https://youtu.be/ZlY0tDv5sSY')
  await record.getByRole('button', { name: 'أرشفة', exact: true }).click()
  await record.locator('.status-badge--archived').waitFor()
  await publicPage.reload()
  await publicPage.locator('[data-category="photography"]').click()
  await publicPage.locator('.work-results__empty').waitFor()
  assert.equal((await read(`website_archive_works?select=*&id=eq.${testId}`)).length, 0)
  assert.deepEqual(await read('website_projects?select=*&order=id.asc'), before)
  // Only delete the one record this test created.
  page.once('dialog', confirmation => confirmation.accept())
  await record.getByRole('button', { name: 'حذف', exact: true }).click()
  await record.waitFor({ state: 'hidden' })
  assert.equal((await read(`website_archive_works?select=*&id=eq.${testId}`, ownerHeaders)).length, 0)
  testId = undefined
  assert.equal((await read('website_archive_works?select=id&status=eq.published')).length, archiveBefore.length)
  await page.screenshot({ path: 'artifacts/archive-cms/desktop.png', fullPage: true })
  await page.getByRole('button', { name: 'إضافة جديد' }).click()
  await page.waitForFunction(() => getComputedStyle(document.querySelector('.admin-modal__panel')).opacity === '1')
  assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden')
  const lastButton = dialog.getByRole('button', { name: 'إلغاء', exact: true })
  await lastButton.focus()
  await page.keyboard.press('Tab')
  assert.ok(await dialog.evaluate(element => element.contains(document.activeElement)))
  await page.screenshot({ path: 'artifacts/archive-cms/editor-desktop.png' })
  await page.keyboard.press('Escape')
  await dialog.waitFor({ state: 'hidden' })
  assert.notEqual(await page.evaluate(() => document.body.style.overflow), 'hidden')
  assert.ok(await page.getByRole('button', { name: 'إضافة جديد' }).evaluate(element => element === document.activeElement))
  await page.setViewportSize({ width: 390, height: 844 })
  await page.locator('.admin-mobile-nav').selectOption('projects')
  assert.equal(await page.locator('.admin-project-row').count(), before.length)
  await page.locator('.admin-mobile-nav').selectOption('archive')
  await page.getByRole('button', { name: 'إضافة جديد' }).click()
  await page.waitForFunction(() => getComputedStyle(document.querySelector('.admin-modal__panel')).opacity === '1')
  assert.equal(await dialog.locator('input,select,textarea').count(), 5)
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
  await page.screenshot({ path: 'artifacts/archive-cms/editor-phone.png' })
  await page.keyboard.press('Escape')
  assert.deepEqual(errors, [])
  console.log('PASS real owner login; exactly five fields; create draft, edit, publish, filter, archive, delete; homepage unchanged; desktop/mobile; no browser errors. Test record removed.')
  await publicPage.close()
} finally {
  if (testId && ownerHeaders) {
    const cleanup = await fetch(`${api}/website_archive_works?id=eq.${testId}`, { method: 'DELETE', headers: ownerHeaders })
    if (!cleanup.ok) console.error(`Cleanup failed for test record ${testId}: ${cleanup.status}`)
  }
  await context.close()
  await browser.close()
}
