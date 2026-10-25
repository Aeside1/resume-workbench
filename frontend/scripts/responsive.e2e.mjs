/**
 * 自适应与弹性布局的证伪用例（issue #19 / ADR 010）。
 *
 * 为什么必须是真浏览器：本票的验收断言的是「真实排版结果」——
 * `documentElement.scrollWidth === innerWidth`、正文列不窄于 320、触控目标 ≥ 44×44、
 * 常显的铅笔图标、手机上替代拖拽的上下移按钮。这些在 jsdom 里没有布局，量不出来。
 *
 * 四档宽度各跑一遍「经历列表 → 经历画布（含亮点抽屉）→ 简历方案列表 → 方案编辑器（含历史版本面板）」，
 * 每档逐步断言「不能左右滑」并留截图。断言失败时把越界的元素一起打印出来，便于定位。
 *
 * 不传 RESPONSIVE_BASE_URL 时自带给一台 vite dev server，保证固定关卡一条命令跑完。
 * 环境变量：RESPONSIVE_BASE_URL / RESPONSIVE_PORT（默认 5283）/ RESPONSIVE_ARTIFACTS / EDGE_PATH。
 */
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import puppeteer from 'puppeteer-core'

const artifacts = path.resolve(process.env.RESPONSIVE_ARTIFACTS || '../.worktrees/responsive-artifacts')
await mkdir(artifacts, { recursive: true })

let devServer = null
let baseUrl = process.env.RESPONSIVE_BASE_URL
if (!baseUrl) {
  const { createServer } = await import('vite')
  devServer = await createServer({
    logLevel: 'error',
    server: { host: '127.0.0.1', port: Number(process.env.RESPONSIVE_PORT || 5283) }
  })
  await devServer.listen()
  const address = devServer.httpServer.address()
  assert.ok(address && typeof address === 'object', 'vite dev server 未能监听 TCP 端口')
  baseUrl = `http://127.0.0.1:${address.port}`
}

/** 四档宽度：手机竖屏 / 手机横屏与平板竖屏 / 笔记本拖窄 / 桌面 */
const TIERS = [
  { name: '390', width: 390, height: 844 },
  { name: '768', width: 768, height: 1024 },
  { name: '1024', width: 1024, height: 768 },
  { name: '1440', width: 1440, height: 900 }
]

/** 一段没有任何可断点的长串：粘进正文 / 预览时不得撑破卡片 */
const LONG_TOKEN =
  'https://example.test/very/long/path/that/never/breaks/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa?token=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'

const group = {
  id: 10,
  name: '自适应布局验证分组',
  type: 'project',
  organization: '本地测试',
  start_date: '2024-01-01',
  end_date: null,
  description: '用来在四种宽度下检查卡片排版与长串断行的示例分组。',
  archived: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
}
const secondGroup = {
  ...group,
  id: 11,
  name: '第二个分组：名字很长很长很长很长很长很长很长很长很长很长',
  organization: '另一个归属：一个同样很长的组织名称用来挤压卡片',
  description: `长串测试：${LONG_TOKEN}`
}

const makeItem = (id, title, record, position) => ({
  id,
  experience_group_id: 10,
  title,
  detailed_record: record,
  technical_materials: '',
  result_data: '',
  supplementary_notes: '',
  position,
  archived: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
})

let contents = buildContents()

function buildContents() {
  return [
    makeItem(20, '第一项工作内容', `正文里粘了一段长链接：${LONG_TOKEN}`, 0),
    makeItem(21, '第二项工作内容', '第二条正文', 1),
    makeItem(22, '第三项工作内容', '第三条正文', 2)
  ]
}

const highlight = {
  id: 30,
  work_content_id: 20,
  label: '技术深度版：一个相当长的亮点名称用来检查版本行是否换行',
  content: `把长串写进简历亮点：${LONG_TOKEN}`,
  position: 0,
  archived: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
}

const plan = {
  id: 1,
  user_id: 1,
  name: '自适应验证方案',
  purpose: '检查窄屏下的编排与历史版本面板',
  archived: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
}

const planBlock = {
  id: 40,
  plan_id: 1,
  experience_group_id: 10,
  position: 0,
  show_work_content_titles: true,
  name: '自适应布局验证分组',
  type: 'project',
  organization: '本地测试',
  start_date: '2024-01-01',
  end_date: null,
  items: [
    {
      id: 50,
      plan_experience_group_id: 40,
      work_content_id: 20,
      resume_description_id: 30,
      position: 0,
      work_content_title: '第一项工作内容',
      highlight_label: '技术深度版：一个相当长的亮点名称用来检查条目行是否换行',
      highlight_content: `条目正文同样带长串：${LONG_TOKEN}`,
      status: 'ok'
    }
  ]
}

const planDetail = { ...plan, experience_groups: [planBlock] }
const planDocument = {
  markdown: `# 自适应验证方案\n\n- 第一项工作内容：${LONG_TOKEN}\n`,
  outline: { name: plan.name, purpose: plan.purpose, sections: [{ section: 'project', title: '项目经历', blocks: [planBlock] }] }
}
const planArchives = [
  { id: 60, plan_id: 1, source: 'revision', summary: '添加经历块「自适应布局验证分组」', created_at: '2024-01-02T09:30:00Z' },
  { id: 61, plan_id: 1, source: 'revision', summary: '调整条目顺序', created_at: '2024-01-02T10:15:00Z' }
]

const browser = await puppeteer.launch({
  executablePath: process.env.EDGE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  args: ['--edge-skip-compat-layer-relaunch'],
  defaultViewport: { width: TIERS[0].width, height: TIERS[0].height }
})

const errors = []
const results = []
const reorderRequests = []
/** 四档宽度的实测数字（交付时回填到 issue，不靠记忆） */
const measurements = []

/** 全局只开一个页面：每档宽度前重置 localStorage 与视口 */
const page = await browser.newPage()
page.setDefaultTimeout(15000)
page.on('pageerror', (error) => errors.push(error.message))

await page.setRequestInterception(true)
page.on('request', async (request) => {
  const url = new URL(request.url())
  if (!url.pathname.startsWith('/api/')) return request.continue()
  const headers = {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': '*',
    'access-control-allow-methods': '*'
  }
  if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers })

  const json = (body) => request.respond({ status: 200, contentType: 'application/json', headers, body: JSON.stringify(body) })
  const method = request.method()
  const p = url.pathname

  if (p === '/api/auth/me') return json({ id: 1, email: 'responsive@example.test' })
  if (p === '/api/experience-groups') return json([group, secondGroup])
  if (p === '/api/experience-groups/10/work-contents' && method === 'GET') return json(contents)
  if (p === '/api/experience-groups/10/work-contents/reorder' && method === 'POST') {
    const ids = JSON.parse(request.postData()).work_content_ids
    reorderRequests.push(ids)
    const byId = new Map(contents.map((item) => [item.id, item]))
    contents = ids.map((id) => byId.get(id))
    return json(contents)
  }
  if (/^\/api\/experience-groups\/\d+\/work-contents$/.test(p)) return json([])
  // 亮点按工作项 id 回一段同构数据：任何一张卡片点开抽屉都能看到版本行
  const highlightMatch = p.match(/^\/api\/work-contents\/(\d+)\/resume-descriptions$/)
  if (highlightMatch) return json([{ ...highlight, work_content_id: Number(highlightMatch[1]) }])
  if (p === '/api/resume-plans') return json([plan])
  if (p === '/api/resume-plans/1') return json(planDetail)
  if (p === '/api/resume-plans/1/document') return json(planDocument)
  if (p === '/api/resume-plans/1/archives') return json(planArchives)
  if (p === '/api/resume-plans/1/candidates') return json({ experience_groups: [] })

  errors.push('未配置测试请求：' + method + ' ' + p)
  return request.respond({ status: 500, headers })
})

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * 滚动到元素并直接触发它的 click（React 的 onClick / HeroUI onPress 都会收到）。
 *
 * 不用 `page.click` 的原因：顶部条是 sticky 的，坐标命中会把点击送给顶部条；
 * 而卡片重排后还有 framer-motion 的布局动画，坐标会漂。本探针验的是排版，
 * 真指针交互留给 `reorder.e2e.mjs`（那里专验拖拽）。
 */
async function clickElement(selector) {
  const clicked = await page.evaluate((target) => {
    const el = document.querySelector(target)
    if (!el) return false
    el.scrollIntoView({ block: 'center' })
    el.click()
    return true
  }, selector)
  assert.ok(clicked, `找不到可点击元素：${selector}`)
  await pause(200)
}

/** 收集横向越界的元素（排查用）：右沿超出视口，或自身内容宽度超过容器 */
const measureOverflow = () =>
  page.evaluate(() => {
    const offenders = []
    for (const el of document.querySelectorAll('body *')) {
      const rect = el.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) continue
      if (rect.right > window.innerWidth + 1 || rect.left < -1) {
        offenders.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)} right=${Math.round(rect.right)}`)
      }
    }
    return {
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      clientWidth: document.documentElement.clientWidth,
      offenders: offenders.slice(0, 6)
    }
  })

async function assertNoHorizontalScroll(label) {
  const result = await measureOverflow()
  measurements.push({
    step: label,
    scrollWidth: result.scrollWidth,
    innerWidth: result.innerWidth,
    clientWidth: result.clientWidth
  })
  assert.ok(
    result.scrollWidth <= result.innerWidth,
    `${label}：出现横向滚动（scrollWidth=${result.scrollWidth} > innerWidth=${result.innerWidth}）；越界元素：${result.offenders.join(' | ') || '无'}`
  )
  return result
}

const visible = async (selector) =>
  page.$eval(
    selector,
    (el) => {
      const rect = el.getBoundingClientRect()
      const style = getComputedStyle(el)
      return {
        width: rect.width,
        height: rect.height,
        display: style.display,
        visibility: style.visibility,
        opacity: Number(style.opacity),
        top: rect.top,
        right: rect.right
      }
    },
    selector
  )

async function check(name, run) {
  try {
    await run()
    results.push({ name, passed: true })
    console.log('PASS ' + name)
  } catch (error) {
    results.push({ name, passed: false, message: error.message })
    console.error('FAIL ' + name + ': ' + error.message)
    await page
      .screenshot({ path: path.join(artifacts, 'failure-' + String(results.length).padStart(2, '0') + '.png'), fullPage: true })
      .catch(() => {})
  }
}

/** 回到「经历内容」列表：窄屏侧栏是滑出面板，先点顶部条菜单按钮 */
async function openNavPanelIfNeeded() {
  const menu = await page.$('.app-topbar button[aria-label="打开导航菜单"]')
  if (menu) {
    await menu.click()
    await pause(250)
  }
}

/** 按可见文字点一个按钮（预览 / 返回编排这类没有 aria-label 的按钮） */
async function clickButtonByText(text) {
  const found = await page.evaluate((label) => {
    const button = [...document.querySelectorAll('button')].find((el) => (el.textContent || '').trim().startsWith(label))
    if (!button) return false
    button.scrollIntoView({ block: 'center' })
    button.click()
    return true
  }, text)
  assert.ok(found, `找不到文字为「${text}」的按钮`)
  await pause(150)
}

async function goToPlans() {
  await openNavPanelIfNeeded()
  await clickButtonByLabel('简历方案')
  await page.waitForSelector('.plan-card-grid')
}

async function goToExperiences() {
  await openNavPanelIfNeeded()
  await clickButtonByLabel('经历内容')
  await page.waitForSelector('.group-card-clickable-area')
}

/** 按 aria-label 点一个按钮（窄屏面板开合后按钮可能不在视口中央，统一居中再点） */
async function clickButtonByLabel(label) {
  const found = await page.evaluate((name) => {
    const button = [...document.querySelectorAll('button')].find((el) => el.getAttribute('aria-label') === name)
    if (!button) return false
    button.scrollIntoView({ block: 'center' })
    button.click()
    return true
  }, label)
  assert.ok(found, `找不到 aria-label 为「${label}」的按钮`)
  await pause(150)
}

try {
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem(
      'resume-session',
      JSON.stringify({ token: 'responsive-test', user: { id: 1, email: 'responsive@example.test' } })
    )
  })

  for (const tier of TIERS) {
    const prefix = `${tier.name}`
    // 每档从同一份初始顺序开跑：上一档点过「下移」后顺序会被换掉
    contents = buildContents()
    await page.setViewport({ width: tier.width, height: tier.height })
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.group-card-clickable-area')
    await pause(200)

    /* ---------------- 1. 经历列表 ---------------- */
    await check(`${prefix} 经历列表：不左右滑，卡片不越界`, async () => {
      await assertNoHorizontalScroll(`${prefix} 经历列表`)
      const card = await page.$eval('.experience-group-card', (el) => el.getBoundingClientRect().right)
      assert.ok(card <= tier.width + 1, `卡片右沿 ${Math.round(card)} 超出视口 ${tier.width}`)
      await page.screenshot({ path: path.join(artifacts, `${prefix}-01-experiences.png`), fullPage: true })
    })

    /* ---------------- 2. 经历画布 ---------------- */
    await check(`${prefix} 经历画布：不左右滑，正文列 ≥ 320`, async () => {
      await clickElement('.group-card-clickable-area')
      await page.waitForSelector('.work-content-card')
      await pause(250)
      await assertNoHorizontalScroll(`${prefix} 经历画布`)
      const main = await page.$eval('.focus-canvas-main-col', (el) => el.getBoundingClientRect().width)
      assert.ok(main >= 320, `正文列只有 ${Math.round(main)}px，小于 320`)
      measurements.push({ step: `${prefix} 经历画布正文列宽`, mainColumnWidth: Math.round(main) })
      const card = await page.$eval('.work-content-card', (el) => ({
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth
      }))
      assert.ok(
        card.scrollWidth <= card.clientWidth + 1,
        `工作内容卡片内容宽 ${card.scrollWidth} 超出自身 ${card.clientWidth}（长串没断行）`
      )
      await page.screenshot({ path: path.join(artifacts, `${prefix}-02-canvas.png`), fullPage: true })
    })

    await check(`${prefix} 大纲栏：窄屏落到正文下方，宽屏并排`, async () => {
      const layout = await page.$eval('.focus-canvas-layout', (el) => getComputedStyle(el).flexDirection)
      const bodyWidth = await page.$eval('.focus-canvas-main-col', (el) => el.getBoundingClientRect().width)
      const sideBox = await page.$eval('.focus-canvas-side-col', (el) => {
        const rect = el.getBoundingClientRect()
        return { width: rect.width, position: getComputedStyle(el).position }
      })
      if (tier.width <= 1024) {
        assert.notEqual(layout, 'row', `${prefix}：内容区不足 1024 时大纲栏不该还并排`)
        assert.equal(sideBox.position, 'static', `${prefix}：大纲栏落到正文下方后不该还是 sticky`)
      } else {
        assert.equal(layout, 'row', `${prefix}：桌面应保持左右双栏`)
        assert.ok(sideBox.width < bodyWidth, `${prefix}：大纲栏不该比正文还宽`)
      }
    })

    await check(`${prefix} 排序入口：手机上给上下移按钮，桌面只有拖拽手柄`, async () => {
      const moveButton = await page.$('.work-content-card .work-content-move-actions button')
      const handle = await page.$('.work-content-card .work-content-drag-handle')
      const mainWidth = await page.$eval('.focus-canvas-main-col', (el) => el.getBoundingClientRect().width)
      assert.ok(handle, '拖拽手柄必须始终存在（桌面拖拽保留）')
      // 判据是「正文列还剩多少」，不是窗口多宽（ADR 010）
      if (mainWidth < 640) {
        assert.ok(moveButton, `${prefix}：正文列 ${Math.round(mainWidth)}px 时手机上必须能用按钮排序`)
        const box = await (await page.$('.work-content-card .work-content-move-actions button')).boundingBox()
        assert.ok(box && box.width >= 44 && box.height >= 44, `${prefix}：上移按钮 ${JSON.stringify(box)} 小于 44×44`)
        // 真的能用：点「下移」后顺序翻转，并且排序请求带着完整新顺序
        const before = await page.$$eval('.work-content-card', (els) => els.map((el) => el.id))
        await pause(400)
        await clickElement('.work-content-card .work-content-move-actions button[aria-label="下移工作内容"]')
        await page.waitForFunction(
          (expected) => [...document.querySelectorAll('.work-content-card')].map((el) => el.id).join() === expected,
          { timeout: 5000 },
          [before[1], before[0], ...before.slice(2)].join()
        )
        assert.deepEqual(reorderRequests.at(-1), contents.map((item) => item.id), '排序请求必须带着完整的新顺序')
      } else {
        const display = await page.$eval('.work-content-card .work-content-move-actions', (el) => getComputedStyle(el).display)
        assert.equal(display, 'none', `${prefix}：桌面不该显示排序按钮（拖拽已够用）`)
      }
    })

    await check(`${prefix} 简历亮点抽屉：不越界、版本行不撑破、铅笔常显`, async () => {
      try {
        await clickElement('#work-content-20 .resume-desc-trigger-btn')
        await page.waitForSelector('.resume-drawer-panel')
        // 亮点是抽屉挂载后才拉的，等卡片真的渲染出来再量（否则量的是空态）
        await page.waitForSelector('.resume-version-card')
        await pause(200)
        await assertNoHorizontalScroll(`${prefix} 亮点抽屉`)
        const panel = await page.$eval('.resume-drawer-panel', (el) => {
          const rect = el.getBoundingClientRect()
          return { left: rect.left, right: rect.right, width: rect.width }
        })
        assert.ok(panel.right <= tier.width + 1 && panel.left >= -1, `抽屉面板越界：${JSON.stringify(panel)}`)
        const row = await page.$eval('.resume-version-card-header', (el) => ({ scrollWidth: el.scrollWidth, clientWidth: el.clientWidth }))
        assert.ok(row.scrollWidth <= row.clientWidth + 1, `版本行内容宽 ${row.scrollWidth} 超出自身 ${row.clientWidth}`)
        if (tier.width <= 1024) {
          const pencil = await page.$eval('.edit-pencil-icon', (el) => Number(getComputedStyle(el).opacity))
          assert.equal(pencil, 1, `${prefix}：窄屏不该靠悬停才显示改名铅笔`)
        }
        await page.screenshot({ path: path.join(artifacts, `${prefix}-03-drawer.png`), fullPage: true })
      } finally {
        // 抽屉是模态的：无论断言成败都要关掉，否则后面的导航全被 inert 挡住
        await page.keyboard.press('Escape')
        await pause(400)
      }
    })

    /* ---------------- 3. 方案列表 + 方案编辑器 ---------------- */
    await check(`${prefix} 简历方案列表：不左右滑`, async () => {
      await goToPlans()
      await pause(250)
      await assertNoHorizontalScroll(`${prefix} 简历方案列表`)
      await page.screenshot({ path: path.join(artifacts, `${prefix}-04-plans.png`), fullPage: true })
    })

    await check(`${prefix} 方案编辑器：不左右滑，条目行不撑破`, async () => {
      await clickElement('.plan-card-clickable-area')
      await page.waitForSelector('.plan-block-card')
      await pause(250)
      await assertNoHorizontalScroll(`${prefix} 方案编辑器`)
      const row = await page.$eval('.plan-item-row', (el) => ({ scrollWidth: el.scrollWidth, clientWidth: el.clientWidth }))
      assert.ok(row.scrollWidth <= row.clientWidth + 1, `条目行内容宽 ${row.scrollWidth} 超出自身 ${row.clientWidth}`)
      await page.screenshot({ path: path.join(artifacts, `${prefix}-05-plan-editor.png`), fullPage: true })
    })

    await check(`${prefix} 历史版本面板：窄屏浮层不越界，宽屏并排一栏`, async () => {
      await clickButtonByLabel('历史版本')
      await page.waitForSelector('.plan-history-panel')
      await pause(250)
      await assertNoHorizontalScroll(`${prefix} 历史版本面板`)
      const panel = await page.$eval('.plan-history-panel', (el) => {
        const rect = el.getBoundingClientRect()
        return { position: getComputedStyle(el).position, width: rect.width, right: rect.right, height: rect.height }
      })
      if (tier.width <= 1024) {
        assert.notEqual(panel.position, 'sticky', `${prefix}：窄屏历史版本应改成滑出浮层`)
        assert.ok(panel.right <= tier.width + 1, `历史版本浮层右沿 ${Math.round(panel.right)} 越界`)
      } else {
        assert.equal(panel.position, 'sticky', `${prefix}：桌面历史版本应与编排区并排`)
      }
      await page.screenshot({ path: path.join(artifacts, `${prefix}-06-plan-history.png`), fullPage: true })
    })

    await check(`${prefix} 文稿预览：长串不撑破`, async () => {
      await clickButtonByText('预览')
      await page.waitForSelector('.plan-document-view')
      await pause(250)
      await assertNoHorizontalScroll(`${prefix} 文稿预览`)
      const view = await page.$eval('.plan-document-view', (el) => ({ scrollWidth: el.scrollWidth, clientWidth: el.clientWidth }))
      assert.ok(view.scrollWidth <= view.clientWidth + 1, `预览内容宽 ${view.scrollWidth} 超出自身 ${view.clientWidth}`)
      await page.screenshot({ path: path.join(artifacts, `${prefix}-07-preview.png`), fullPage: true })
      await clickButtonByText('返回编排')
      await pause(200)
    })

    /* ---------------- 4. 手指尺寸（只有手机档要求） ---------------- */
    if (tier.width <= 640) {
      await check(`${prefix} 触控目标：可见按钮不小于 44×44`, async () => {
        const small = await page.evaluate(() => {
          const offenders = []
          for (const el of document.querySelectorAll('.app-main button, .app-topbar button')) {
            const rect = el.getBoundingClientRect()
            const style = getComputedStyle(el)
            if (rect.width <= 0 || rect.height <= 0) continue
            if (style.visibility === 'hidden' || Number(style.opacity) === 0) continue
            if (rect.width < 43.5 || rect.height < 43.5) {
              offenders.push(`${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 24)} ${Math.round(rect.width)}x${Math.round(rect.height)}`)
            }
          }
          return offenders
        })
        assert.deepEqual(small, [], `小于 44×44 的可见按钮：${small.join(' | ')}`)
      })

      await check(`${prefix} 页面高度：底部内容可达（画布页可滚到底）`, async () => {
        await goToExperiences()
        await clickElement('.group-card-clickable-area')
        await page.waitForSelector('.work-content-card')
        await pause(200)
        const reachable = await page.evaluate(async () => {
          window.scrollTo(0, document.documentElement.scrollHeight)
          await new Promise((resolve) => setTimeout(resolve, 200))
          const addButton = document.querySelector('.add-content-dashed-btn')
          if (!addButton) return { ok: false, reason: '找不到底部「添加具体工作内容」按钮' }
          const rect = addButton.getBoundingClientRect()
          return { ok: rect.bottom <= window.innerHeight + 1 && rect.top >= -1, rect: { top: rect.top, bottom: rect.bottom }, innerHeight: window.innerHeight }
        })
        assert.ok(reachable.ok, `画布底部的「添加具体工作内容」滚到底也够不到：${JSON.stringify(reachable)}`)
        await page.screenshot({ path: path.join(artifacts, `${prefix}-08-bottom.png`), fullPage: false })
      })
    }

    await check(`${prefix} 无浏览器运行错误`, async () => assert.deepEqual(errors, []))
  }
} finally {
  await writeFile(
    path.join(artifacts, 'results.json'),
    JSON.stringify(
      { baseUrl, browser: await browser.version(), tiers: TIERS, results, measurements, errors, reorderRequests },
      null,
      2
    )
  )
  await browser.close()
  if (devServer) await devServer.close()
}

const failed = results.filter((result) => !result.passed)
if (failed.length) {
  console.error(`响应式验收失败 ${failed.length} 项：` + path.join(artifacts, 'results.json'))
  process.exitCode = 1
} else {
  console.log(`响应式验收通过（${TIERS.length} 档宽度）：` + path.join(artifacts, 'results.json'))
}
