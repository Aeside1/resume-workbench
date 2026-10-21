/**
 * 游客工作台（未登录只读示例内容）真实浏览器探针。
 *
 * 不需要后端：游客态只读前端内置示例内容，不落本地存储、不发业务请求。
 *
 *   npm run dev -- --port 5175
 *   GUEST_E2E_BASE_URL=http://localhost:5175 npm run test:guest:e2e
 */
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import puppeteer from 'puppeteer-core'

const baseUrl = process.env.GUEST_E2E_BASE_URL || 'http://localhost:5175'
const artifacts = path.resolve(process.env.GUEST_E2E_ARTIFACTS || '../.worktrees/guest-mode-artifacts')
await mkdir(artifacts, { recursive: true })

const browser = await puppeteer.launch({
  executablePath: process.env.EDGE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  args: ['--edge-skip-compat-layer-relaunch'],
  defaultViewport: { width: 1440, height: 1100 }
})
const page = await browser.newPage()
page.setDefaultTimeout(15000)

const pageErrors = []
const resourceFailures = []
const apiRequests = []
page.on('pageerror', (error) => pageErrors.push(error.message))
page.on('console', (message) => {
  if (message.type() !== 'error') return
  if (message.text().startsWith('Failed to load resource')) return
  pageErrors.push(`console: ${message.text()}`)
})
page.on('response', (response) => {
  if (response.status() < 400) return
  const { pathname } = new URL(response.url())
  if (pathname === '/favicon.ico') return
  resourceFailures.push(`${response.status()} ${response.request().method()} ${pathname}`)
})
page.on('request', (request) => {
  const { pathname } = new URL(request.url())
  if (pathname.startsWith('/api/')) apiRequests.push(`${request.method()} ${pathname}`)
})

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const report = { baseUrl, checks: [] }
const check = (name, detail = '') => report.checks.push({ name, detail })

async function bodyText() {
  return page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '))
}
async function waitForText(text, timeout = 15000) {
  await page.waitForFunction((needle) => document.body.innerText.includes(needle), { timeout }, text)
}
async function clickByText(label, selector = 'button, [role="button"], [role="tab"], a') {
  const handle = await page.evaluateHandle(
    (label, selector) => {
      const norm = (value) => (value || '').replace(/\s+/g, ' ').trim()
      return (
        [...document.querySelectorAll(selector)].find(
          (node) => norm(node.getAttribute('aria-label')) === label || norm(node.textContent) === label
        ) ?? null
      )
    },
    label,
    selector
  )
  const element = handle.asElement()
  assert.ok(element, `找不到可点击元素：${label}`)
  await element.scrollIntoViewIfNeeded?.()
  await element.click()
  await sleep(150)
}
async function hasButton(name) {
  return page.evaluate((name) => {
    const norm = (value) => (value || '').replace(/\s+/g, ' ').trim()
    return [...document.querySelectorAll('button, [role="button"]')].some(
      (node) => norm(node.getAttribute('aria-label')) === name || norm(node.textContent) === name
    )
  }, name)
}

try {
  // 1. 落地即游客工作台，示例内容可见
  await page.goto(baseUrl, { waitUntil: 'networkidle2' })
  await page.waitForSelector('.guest-banner')
  let text = await bodyText()
  assert.ok(text.includes('示例内容 · 只读'), '游客横幅未出现')
  assert.ok(text.includes('订单中台重构'), '示例经历分组未出现')
  assert.ok(text.includes('内容平台前端实习'), '第二个示例分组未出现')
  assert.equal(await page.$('input#email'), null, '未登录时不应直接出现登录表单')
  assert.equal(await page.$('[aria-label="拖拽调整排序"]'), null)
  check('首次访问落到游客工作台，直接看到示例内容')

  // 2. 经历分组只读：没有新建 / 编辑 / 归档入口
  assert.equal(await hasButton('新建经历分组'), false, '游客态不应有新建入口')
  assert.equal(await hasButton('编辑经历分组'), false, '游客态不应有编辑入口')
  assert.equal(await hasButton('归档经历分组'), false, '游客态不应有归档入口')
  check('经历分组只有浏览入口，没有新建 / 编辑 / 归档')
  await page.screenshot({ path: path.join(artifacts, '01-guest-landing.png'), fullPage: true })

  // 3. 深浅色都可读
  const themeSwitch = await page.$('[role="switch"][aria-label="深色模式"]')
  assert.ok(themeSwitch, '侧栏缺少深色模式开关')
  await themeSwitch.click()
  await page.waitForFunction(() => document.documentElement.classList.contains('dark'))
  await page.screenshot({ path: path.join(artifacts, '02-guest-dark.png'), fullPage: true })
  await themeSwitch.click()
  await page.waitForFunction(() => !document.documentElement.classList.contains('dark'))
  check('游客工作台在深浅色两种主题下都可读')

  // 4. 打开画布：能看内容，但没有编辑类操作
  await clickByText('订单中台重构', 'h3')
  await waitForText('拆分下单与支付链路')
  for (const label of ['添加具体工作内容', '新增工作内容', '编辑', '删除', '展开专注', '编辑经历概况']) {
    assert.equal(await hasButton(label), false, `游客态画布不应出现「${label}」`)
  }
  assert.equal(await page.$('[aria-label="拖拽调整排序"]'), null, '游客态不应可拖拽排序')
  check('画布可查看工作内容，且没有编辑 / 新建 / 专注 / 拖拽入口')
  await page.screenshot({ path: path.join(artifacts, '03-guest-canvas.png'), fullPage: true })

  // 5. 抽屉可查看简历亮点，但没有新建 / 编辑 / 复制 / 删除
  await clickByText('简历亮点提炼')
  await page.waitForSelector('[aria-label="简历亮点提炼抽屉"]')
  await waitForText('技术深度版')
  for (const label of ['新建简历亮点', '编辑 技术深度版', '复制 技术深度版', '删除 技术深度版']) {
    assert.equal(await hasButton(label), false, `游客态抽屉不应出现「${label}」`)
  }
  check('抽屉可查看简历亮点，且没有新建 / 编辑 / 复制 / 删除')
  await page.screenshot({ path: path.join(artifacts, '04-guest-highlight.png'), fullPage: true })
  await clickByText('关闭抽屉')
  await page.waitForFunction(() => !document.querySelector('[aria-label="简历亮点提炼抽屉"]'))
  await clickByText('返回经历内容')
  await waitForText('经历分组')

  // 6. 简历方案只给登录引导
  await clickByText('简历方案')
  await waitForText('简历方案需要登录后使用')
  assert.equal(await hasButton('新建简历方案'), false)
  check('简历方案只给登录引导')
  await page.screenshot({ path: path.join(artifacts, '05-guest-plans-gate.png'), fullPage: true })

  // 7. 认证页往返
  await clickByText('登录 / 注册')
  await waitForText('登录工作台')
  await clickByText('先以游客身份继续')
  await page.waitForSelector('.guest-banner')
  await waitForText('经历分组')
  check('认证页可以「先以游客身份继续」返回工作台')

  // 8. 游客态不落本地草稿、不出网；刷新后仍是同一套示例
  assert.equal(await page.evaluate(() => localStorage.getItem('resume-guest-workspace')), null, '游客态不应写本地草稿')
  assert.deepEqual(apiRequests, [], `游客态不应发起业务 API 请求，实际：${apiRequests.join(', ')}`)
  await page.reload({ waitUntil: 'networkidle2' })
  await page.waitForSelector('.guest-banner')
  await waitForText('订单中台重构')
  text = await bodyText()
  assert.ok(text.includes('示例内容 · 只读'))
  check('游客态不落本地草稿、不请求业务接口，刷新后仍是只读示例')

  assert.deepEqual(pageErrors, [], `页面错误：${pageErrors.join(' | ')}`)
  assert.deepEqual(resourceFailures, [], `子资源加载失败：${resourceFailures.join(' | ')}`)
  check('浏览器无未捕获异常 / console error / 子资源失败')
} catch (error) {
  report.failure = error.message
  await page.screenshot({ path: path.join(artifacts, 'failure.png'), fullPage: true }).catch(() => {})
  await writeFile(
    path.join(artifacts, 'guest-mode-report.json'),
    JSON.stringify({ ...report, pageErrors, resourceFailures, apiRequests }, null, 2)
  )
  await browser.close()
  console.error('✗ 游客工作台探针失败：', error.message)
  process.exit(1)
}

await writeFile(
  path.join(artifacts, 'guest-mode-report.json'),
  JSON.stringify({ ...report, pageErrors, resourceFailures, apiRequests }, null, 2)
)
await browser.close()

console.log('✓ 游客工作台探针通过')
for (const item of report.checks) console.log(`  · ${item.name}`)
console.log(`证据目录：${artifacts}`)
