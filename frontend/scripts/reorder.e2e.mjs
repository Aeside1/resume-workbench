/**
 * 拖拽排序的证伪用例（issue #9）。
 *
 * 为什么必须是真浏览器：卡片拖拽走的是 framer-motion 的指针拖拽（在 .work-content-drag-handle
 * 上 pointerdown 才启动），jsdom 里没有真实布局、没有指针捕获、getBoundingClientRect 全为 0，
 * 拖出来的顺序是假的。这里用真 Edge 打真鼠标事件，断言两件事：
 *   1. 拖完 DOM 顺序真的翻了（视觉层）；
 *   2. 排序请求带着完整新顺序落库（数据层）。
 * 任一条不成立即 FAIL —— 拖拽失效时本脚本会红，而不是像过去那样只断言「手柄存在」。
 *
 * 不传 EDITOR_BASE_URL 时自带给一台 vite dev server，保证固定关卡一条命令跑完。
 */
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import puppeteer from 'puppeteer-core'

const artifacts = path.resolve(process.env.REORDER_ARTIFACTS || '../.worktrees/reorder-artifacts')
await mkdir(artifacts, { recursive: true })

let devServer = null
let baseUrl = process.env.EDITOR_BASE_URL
if (!baseUrl) {
  const { createServer } = await import('vite')
  devServer = await createServer({
    logLevel: 'error',
    server: { host: '127.0.0.1', port: Number(process.env.REORDER_PORT || 5273) }
  })
  await devServer.listen()
  const address = devServer.httpServer.address()
  assert.ok(address && typeof address === 'object', 'vite dev server 未能监听 TCP 端口')
  baseUrl = `http://127.0.0.1:${address.port}`
}

const browser = await puppeteer.launch({
  executablePath: process.env.EDGE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  args: ['--edge-skip-compat-layer-relaunch'],
  defaultViewport: { width: 1440, height: 1100 }
})
const page = await browser.newPage()
page.setDefaultTimeout(10000)

const errors = []
const results = []
/** 排序请求的载荷：「顺序变了但没落库」等于没排，必须一起断言 */
const reorderRequests = []
page.on('pageerror', error => errors.push(error.message))

const group = { id: 10, name: '拖拽排序验证', type: 'project', organization: '本地测试', description: '', archived: false }
const makeItem = (id, title, record, position) => ({
  id,
  experience_group_id: 10,
  title,
  detailed_record: record,
  technical_materials: '',
  result_data: '',
  supplementary_notes: '',
  position,
  archived: false
})
let contents = [
  makeItem(20, '第一项', '第一条正文', 0),
  makeItem(21, '第二项', '第二条正文', 1)
]

// 只替换 /api 的响应；页面、React、framer-motion 与浏览器指针事件全部执行真实代码。
await page.setRequestInterception(true)
page.on('request', async request => {
  const url = new URL(request.url())
  if (!url.pathname.startsWith('/api/')) return request.continue()
  const headers = {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': '*',
    'access-control-allow-methods': '*'
  }
  if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers })
  let body
  if (url.pathname === '/api/auth/me') body = { id: 1, email: 'reorder@example.test' }
  else if (url.pathname === '/api/experience-groups') body = [group]
  else if (url.pathname === '/api/experience-groups/10/work-contents' && request.method() === 'GET') body = contents
  else if (url.pathname === '/api/experience-groups/10/work-contents/reorder' && request.method() === 'POST') {
    const ids = JSON.parse(request.postData()).work_content_ids
    reorderRequests.push(ids)
    const byId = new Map(contents.map(item => [item.id, item]))
    contents = ids.map(id => byId.get(id))
    body = contents
  } else {
    errors.push('未配置测试请求：' + request.method() + ' ' + url.pathname)
    return request.respond({ status: 500, headers })
  }
  await request.respond({ status: 200, contentType: 'application/json', headers, body: JSON.stringify(body) })
})

await page.evaluateOnNewDocument(() => {
  localStorage.setItem(
    'resume-session',
    JSON.stringify({ token: 'reorder-test', user: { id: 1, email: 'reorder@example.test' } })
  )
})

const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
const cardIds = () => page.$$eval('.work-content-card', els => els.map(el => el.id))

async function check(name, run) {
  try {
    await run()
    results.push({ name, passed: true })
    console.log('PASS ' + name)
  } catch (error) {
    results.push({ name, passed: false, message: error.message })
    console.error('FAIL ' + name + ': ' + error.message)
    await page.screenshot({ path: path.join(artifacts, 'failure-' + results.length + '.png'), fullPage: true })
  }
}

try {
  await page.goto(baseUrl)
  await page.waitForSelector('.group-card-clickable-area')
  await page.click('.group-card-clickable-area')
  await page.waitForSelector('.work-content-card')

  await check('拖拽排序：真指针拖动手柄后顺序翻转，并把新顺序落库', async () => {
    assert.deepEqual(await cardIds(), ['work-content-20', 'work-content-21'])
    // 两张卡片都要在视窗内：把第一张顶到上方，第二张自然落在它下面
    await page.evaluate(() => document.querySelector('#work-content-20').scrollIntoView({ block: 'start' }))
    await pause(200)
    const handleBox = await (await page.$('#work-content-21 .work-content-drag-handle')).boundingBox()
    const firstBox = await (await page.$('#work-content-20')).boundingBox()
    assert.ok(handleBox && firstBox, '手柄或目标卡片不在视窗内，无法拖动')
    const centerX = handleBox.x + handleBox.width / 2
    const centerY = handleBox.y + handleBox.height / 2
    // 真指针序列：按住手柄 → 分步上移越过第一张卡片的上沿 → 松手
    await page.mouse.move(centerX, centerY)
    await page.mouse.down()
    await page.mouse.move(centerX, firstBox.y + 8, { steps: 24 })
    await pause(120)
    await page.mouse.up()
    await page.waitForFunction(
      () =>
        [...document.querySelectorAll('.work-content-card')].map(el => el.id).join() ===
        'work-content-21,work-content-20',
      { timeout: 5000 }
    )
    assert.deepEqual(await cardIds(), ['work-content-21', 'work-content-20'])
    assert.deepEqual(reorderRequests.at(-1), [21, 20], '排序请求必须带着完整的新顺序')
    // 拖拽不该顺手把卡片带进编辑态（手柄与正文热区必须解耦）
    assert.equal(await page.$$eval('.work-content-edit-form', els => els.length), 0)
    await page.screenshot({ path: path.join(artifacts, 'reorder.png'), fullPage: true })
  })

  await check('无浏览器运行错误', async () => assert.deepEqual(errors, []))
  await writeFile(path.join(artifacts, 'reorder-after.png'), await page.screenshot({ fullPage: true }))
} finally {
  await writeFile(
    path.join(artifacts, 'results.json'),
    JSON.stringify({ baseUrl, browser: await browser.version(), results, errors, reorderRequests }, null, 2)
  )
  await browser.close()
  if (devServer) await devServer.close()
}
if (results.some(result => !result.passed)) process.exitCode = 1
else console.log('拖拽排序证伪用例通过：' + path.join(artifacts, 'results.json'))
