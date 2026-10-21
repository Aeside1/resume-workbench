/**
 * 游客工作台（未登录）真实浏览器探针 —— ADR 008。
 *
 * 这条探针**不需要后端**：游客态的读写全部落在浏览器本地草稿，
 * 因此它同时验证「未登录也能进入工作台查看与简单使用」和「游客态不出网」。
 *
 * 用法（先起前端 dev server）：
 *   npm run dev -- --port 5175
 *   GUEST_E2E_BASE_URL=http://localhost:5175 npm run test:guest:e2e
 *
 * 可用 EDGE_PATH 指定浏览器可执行文件；证据（截图 + JSON 报告）落到
 * ../.worktrees/guest-mode-artifacts 或 GUEST_E2E_ARTIFACTS 指定的目录。
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
  const text = message.text()
  // 静态资源 404 时浏览器只给一句不带 URL 的 console error，真正的失败由下面的 response 监听记录
  if (text.startsWith('Failed to load resource')) return
  pageErrors.push(`console: ${text}`)
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

const steps = []
const step = (name, detail = '') => steps.push({ name, detail })

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function bodyText() {
  return page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '))
}

async function waitForText(text, timeout = 15000) {
  await page.waitForFunction(
    (needle) => document.body.innerText.includes(needle),
    { timeout },
    text
  )
}

async function clickByText(label, selector = 'button, [role="button"], [role="tab"], a') {
  const handle = await page.evaluateHandle(
    (label, selector) => {
      const normalize = (value) => (value || '').replace(/\s+/g, ' ').trim()
      return (
        [...document.querySelectorAll(selector)].find((node) => {
          const aria = normalize(node.getAttribute('aria-label'))
          return aria === label || normalize(node.textContent) === label
        }) ?? null
      )
    },
    label,
    selector
  )
  const element = handle.asElement()
  assert.ok(element, `找不到可点击元素：${label}`)
  await element.scrollIntoViewIfNeeded?.()
  await element.click()
  await sleep(120)
}

async function guestWorkspace() {
  return page.evaluate(() => JSON.parse(localStorage.getItem('resume-guest-workspace') || 'null'))
}

const report = { baseUrl, steps, checks: [] }
const check = (name, detail = '') => report.checks.push({ name, detail })

try {
  // ---------------------------------------------------------------- 1. 落地即游客工作台
  await page.goto(baseUrl, { waitUntil: 'networkidle2' })
  await page.waitForSelector('.guest-banner')
  let text = await bodyText()
  assert.ok(text.includes('游客模式：数据只保存在这台浏览器'), '游客横幅未出现')
  assert.ok(text.includes('经历分组'), '游客工作台未渲染经历内容列表')
  assert.equal(await page.$('input#email'), null, '未登录时不应直接出现登录表单')
  assert.equal(await page.evaluate(() => localStorage.getItem('resume-session')), null)
  check('首次访问直接落到游客工作台，无登录表单')
  await page.screenshot({ path: path.join(artifacts, '01-guest-landing.png'), fullPage: true })

  // ---------------------------------------------------------------- 1.5 深浅色都成立
  const themeSwitch = await page.$('[role="switch"][aria-label="深色模式"]')
  assert.ok(themeSwitch, '侧栏缺少深色模式开关')
  await themeSwitch.click()
  await page.waitForFunction(() => document.documentElement.classList.contains('dark'))
  await page.screenshot({ path: path.join(artifacts, '02-guest-dark.png'), fullPage: true })
  await themeSwitch.click()
  await page.waitForFunction(() => !document.documentElement.classList.contains('dark'))
  check('游客工作台在深浅色两种主题下都可读（语义变量跟随主题）')

  // ---------------------------------------------------------------- 2. 载入示例内容（查看有内容）
  await clickByText('载入示例内容')
  await waitForText('示例项目：订单中台重构')
  let workspace = await guestWorkspace()
  assert.equal(workspace.groups.length, 2, '示例内容应写入 2 个经历分组')
  assert.ok(workspace.workContents.length >= 3, '示例内容应写入具体工作内容')
  assert.ok(workspace.highlights.length >= 4, '示例内容应写入简历亮点')
  assert.ok(workspace.groups.every((group) => group.name.startsWith('示例')), '示例分组应以「示例」命名')
  check('载入示例内容后经历资产可见', `${workspace.groups.length} 分组 / ${workspace.workContents.length} 工作内容 / ${workspace.highlights.length} 亮点`)
  await page.screenshot({ path: path.join(artifacts, '03-guest-sample-loaded.png'), fullPage: true })

  // ---------------------------------------------------------------- 3. 打开分组画布（查看沉淀的工作内容）
  await clickByText('示例项目：订单中台重构', 'h3')
  await page.waitForSelector('.focus-canvas-wrapper, .focus-canvas-container, .work-content-card')
  await waitForText('拆分下单与支付链路')
  text = await bodyText()
  assert.ok(text.includes('返回经历内容'), '画布页头未出现返回入口')
  check('游客可以打开经历分组画布并看到具体工作内容')
  await page.screenshot({ path: path.join(artifacts, '04-guest-canvas.png'), fullPage: true })

  // ---------------------------------------------------------------- 4. 游客自己新建分组（简单使用）
  await clickByText('返回经历内容')
  await waitForText('经历分组')
  await clickByText('新建经历分组')
  await page.waitForSelector('#experience-name')
  await page.type('#experience-name', 'E2E 游客本地草稿')
  await page.type('#experience-organization', '本地浏览器')
  await clickByText('创建经历分组')
  await page.waitForSelector('h2')
  await waitForText('E2E 游客本地草稿')
  workspace = await guestWorkspace()
  assert.equal(workspace.groups.length, 3, '新建分组应写入本地草稿')
  check('游客新建经历分组成功（写入本地草稿）')
  await page.screenshot({ path: path.join(artifacts, '05-guest-created-group.png'), fullPage: true })

  // ------------------------------------------------ 4b. 新建具体工作内容（真实画布 + Milkdown）
  await clickByText('添加具体工作内容')
  await page.waitForSelector('#new-wc-title')
  await page.type('#new-wc-title', 'E2E 工作内容')
  const editor = await page.$('.milkdown-live-content[contenteditable="true"]')
  assert.ok(editor, '新建卡片里没有富文本编辑器')
  await editor.click()
  await page.keyboard.type('E2E 草稿正文：验证游客态能真正写下内容', { delay: 5 })
  await sleep(300)
  await clickByText('添加工作内容')
  await waitForText('E2E 工作内容')
  workspace = await guestWorkspace()
  assert.ok(
    workspace.workContents.some((content) => content.title === 'E2E 工作内容'),
    '具体工作内容未写入本地草稿'
  )
  check('游客在画布新建具体工作内容成功')

  // ------------------------------------------------ 4c. 新建简历亮点（抽屉）
  await clickByText('简历亮点提炼')
  await page.waitForSelector('[aria-label="简历亮点提炼抽屉"]')
  await clickByText('新建简历亮点')
  // 新建后直接进入编辑态：标题在输入框里（不是文本节点），用卡片可访问名 + 输入框值断言
  await page.waitForSelector('[aria-label="简历亮点: 新的简历亮点"]')
  const labelValue = await page.$eval('[aria-label="新的简历亮点 名称"]', (element) => element.value)
  assert.equal(labelValue, '新的简历亮点')
  workspace = await guestWorkspace()
  assert.ok(
    workspace.highlights.some((highlight) => highlight.label === '新的简历亮点'),
    '简历亮点未写入本地草稿'
  )
  await clickByText('关闭抽屉')
  check('游客在抽屉新建简历亮点成功')
  await page.screenshot({ path: path.join(artifacts, '06-guest-highlight.png'), fullPage: true })

  // ------------------------------------------------ 5. 刷新后仍在（本地持久化）
  await page.reload({ waitUntil: 'networkidle2' })
  await page.waitForSelector('.guest-banner')
  await waitForText('E2E 游客本地草稿')
  workspace = await guestWorkspace()
  assert.ok(workspace.groups.some((group) => group.name === 'E2E 游客本地草稿'), '刷新后分组丢失')
  assert.ok(
    workspace.workContents.some((content) => content.title === 'E2E 工作内容'),
    '刷新后具体工作内容丢失'
  )
  assert.ok(workspace.highlights.some((highlight) => highlight.label === '新的简历亮点'), '刷新后简历亮点丢失')

  // UI 也要读得回来：分组 → 画布 → 抽屉
  await clickByText('E2E 游客本地草稿', 'h3')
  await waitForText('E2E 工作内容')
  await clickByText('简历亮点提炼')
  await waitForText('新的简历亮点')
  await clickByText('关闭抽屉')
  await clickByText('返回经历内容')
  await waitForText('经历分组')
  check('刷新后分组 / 工作内容 / 亮点都在，UI 也能读回')

  // ---------------------------------------------------------------- 6. 简历方案需要登录（范围门禁）
  await clickByText('简历方案')
  await waitForText('简历方案需要登录后使用')
  text = await bodyText()
  assert.ok(!text.includes('新建简历方案'), '游客态不应渲染简历方案的创建入口')
  check('简历方案在游客态只给登录引导')
  await page.screenshot({ path: path.join(artifacts, '07-guest-plans-gate.png'), fullPage: true })

  // ---------------------------------------------------------------- 7. 认证页可返回游客态
  await clickByText('登录 / 注册')
  await waitForText('登录工作台')
  check('游客可以从工作台进入认证页')
  await page.screenshot({ path: path.join(artifacts, '08-auth-page.png'), fullPage: true })
  await clickByText('先以游客身份继续')
  await page.waitForSelector('.guest-banner')
  await waitForText('经历分组')
  check('认证页可以「先以游客身份继续」返回工作台')

  // ---------------------------------------------------------------- 8. 游客态不出网
  assert.deepEqual(apiRequests, [], `游客态不应发起业务 API 请求，实际：${apiRequests.join(', ')}`)
  check('游客态没有向 /api/ 发起任何请求')

  assert.deepEqual(pageErrors, [], `页面错误：${pageErrors.join(' | ')}`)
  assert.deepEqual(resourceFailures, [], `子资源加载失败：${resourceFailures.join(' | ')}`)
  check('浏览器无未捕获异常 / console error / 子资源失败')
} catch (error) {
  report.failure = error.message
  await page.screenshot({ path: path.join(artifacts, 'failure.png'), fullPage: true }).catch(() => {})
  await writeFile(path.join(artifacts, 'guest-mode-report.json'), JSON.stringify({ ...report, pageErrors, resourceFailures, apiRequests }, null, 2))
  await browser.close()
  console.error('✗ 游客工作台探针失败：', error.message)
  process.exit(1)
}

report.pageErrors = pageErrors
report.resourceFailures = resourceFailures
report.apiRequests = apiRequests
await writeFile(path.join(artifacts, 'guest-mode-report.json'), JSON.stringify(report, null, 2))
await browser.close()

console.log('✓ 游客工作台探针通过')
for (const item of report.checks) console.log(`  · ${item.name}${item.detail ? `（${item.detail}）` : ''}`)
console.log(`证据目录：${artifacts}`)
