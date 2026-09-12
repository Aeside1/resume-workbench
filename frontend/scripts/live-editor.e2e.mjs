import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import puppeteer from 'puppeteer-core'

const baseUrl = process.env.EDITOR_BASE_URL || 'http://localhost:5173'
const artifacts = path.resolve(process.env.EDITOR_ARTIFACTS || '../.scratch/live-editor-artifacts')
await mkdir(artifacts, { recursive: true })
const browser = await puppeteer.launch({
  executablePath: process.env.EDGE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  args: ['--edge-skip-compat-layer-relaunch'],
  defaultViewport: { width: 1440, height: 1100 },
})
const page = await browser.newPage()
page.setDefaultTimeout(10000)
const errors = []
const results = []
const saved = []
page.on('pageerror', error => errors.push(error.message))
const group = { id: 10, name: '编辑器回归验证', type: 'project', organization: '本地测试', description: '验证工作记录的富文本编辑体验', archived: false }
let item = { id: 20, experience_group_id: 10, title: '写时渲染验收', detailed_record: '这是 ==核心优势== 与 **技术方案**', technical_materials: '- 第一项\n- 第二项', result_data: '', supplementary_notes: '', position: 0, archived: false }
let created = null

// 只替换 API 网络响应，页面、React 表单、编辑引擎及浏览器输入均执行真实代码。
await page.setRequestInterception(true)
page.on('request', async request => {
  const url = new URL(request.url())
  if (!url.pathname.startsWith('/api/')) return request.continue()
  const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' }
  if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers })
  let body
  if (url.pathname === '/api/auth/me') body = { id: 1, email: 'editor@example.test' }
  else if (url.pathname === '/api/experience-groups') body = [group]
  else if (url.pathname === '/api/experience-groups/10/work-contents') {
    if (request.method() === 'POST') {
      const payload = JSON.parse(request.postData())
      created = { ...item, ...payload, id: 21, position: 1 }
      saved.push(payload)
      body = created
    } else body = created ? [item, created] : [item]
  } else if (url.pathname === '/api/work-contents/20' && request.method() === 'PATCH') {
    const payload = JSON.parse(request.postData())
    saved.push(payload)
    item = { ...item, ...payload }
    body = item
  } else {
    errors.push('未配置测试请求：' + request.method() + ' ' + url.pathname)
    return request.respond({ status: 500, headers })
  }
  await request.respond({ status: 200, contentType: 'application/json', headers, body: JSON.stringify(body) })
})
await page.evaluateOnNewDocument(() => {
  localStorage.setItem('resume-session', JSON.stringify({ token: 'editor-test', user: { id: 1, email: 'editor@example.test' } }))
})
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
const selector = '.milkdown-live-content[contenteditable="true"]'
async function field(index = 0) { return (await page.$$(selector))[index] }
async function text(index = 0) { return (await field(index)).evaluate(el => el.textContent) }
async function shortcut(key, shift = false) {
  await page.keyboard.down('Control')
  if (shift) await page.keyboard.down('Shift')
  await page.keyboard.press(key)
  if (shift) await page.keyboard.up('Shift')
  await page.keyboard.up('Control')
}
async function replaceText(value, index = 0) {
  await (await field(index)).click()
  await shortcut('KeyA')
  await page.keyboard.press('Backspace')
  await page.keyboard.type(value, { delay: 8 })
}
async function clickButton(name, scope = '') {
  for (const button of await page.$$(scope + 'button')) {
    if (await button.evaluate((el, label) => el.textContent.trim() === label, name)) {
      await button.click()
      return
    }
  }
  throw new Error('找不到按钮：' + name)
}
async function check(name, run) {
  try { await run(); results.push({ name, passed: true }); console.log('PASS ' + name) }
  catch (error) {
    results.push({ name, passed: false, message: error.message })
    console.error('FAIL ' + name + ': ' + error.message)
    await page.screenshot({ path: path.join(artifacts, 'failure-' + results.length + '.png'), fullPage: true })
  }
}
async function enterCanvas() {
  await page.waitForSelector('.group-card-clickable-area')
  await page.click('.group-card-clickable-area')
  await page.waitForSelector('.edit-content-btn')
}
const cdp = await page.createCDPSession()
async function compose(candidates, committed) {
  for (const candidate of candidates) {
    await cdp.send('Input.imeSetComposition', { text: candidate, selectionStart: candidate.length, selectionEnd: candidate.length })
    await pause(35)
  }
  await cdp.send('Input.insertText', { text: committed })
  await pause(40)
}
try {
  await page.goto(baseUrl)
  await enterCanvas()
  // 点击前开始逐帧采样，不能先等编辑器就绪再宣称首帧通过。
  await page.evaluate(() => {
    window.editorFrames = []
    const sample = () => {
      const editors = [...document.querySelectorAll('.milkdown-live-content')]
      if (editors.length) window.editorFrames.push(editors.map(el => ({
        html: el.innerHTML, text: el.textContent, focused: el === document.activeElement,
        mark: el.querySelector('mark') && getComputedStyle(el.querySelector('mark')).backgroundColor,
      })))
      if (window.editorFrames.length < 5) requestAnimationFrame(sample)
    }
    document.querySelector('.edit-content-btn').addEventListener('click', () => requestAnimationFrame(sample), { once: true })
  })
  await page.click('.edit-content-btn')
  await page.waitForSelector(selector)
  await check('首帧无需聚焦即显示粗体和暖黄高亮', async () => {
    await page.waitForFunction(() => window.editorFrames.length > 0)
    const first = await page.evaluate(() => window.editorFrames[0][0])
    assert.equal(first.focused, false)
    assert.match(first.html, /<mark/)
    assert.match(first.html, /<strong/)
    assert.equal(first.mark, 'rgb(254, 240, 138)')
    assert.equal(first.text, '这是 核心优势 与 技术方案')
  })
  await page.screenshot({ path: path.join(artifacts, 'first-frame.png'), fullPage: true })
  await check('单一编辑面、无隐藏 textarea 或 demo 提示', async () => {
    assert.equal(await page.$$eval('.work-content-edit-form textarea', els => els.length), 0)
    assert.equal(await page.$$eval('.work-content-edit-form [role="tab"]', els => els.length), 0)
    assert.equal(await page.$$eval(selector, els => els.length), 4)
    assert.doesNotMatch(await page.$eval('.work-content-edit-form', el => el.textContent), /支持.*加粗/)
  })
  await check('字段标签将焦点放到真实编辑面', async () => {
    await page.click('#wc-20-record-label')
    assert.equal(await (await field()).evaluate(el => el === document.activeElement), true)
  })
  await check('英文连续输入与句中插入不丢字', async () => {
    await replaceText('abcdef')
    await page.keyboard.press('ArrowLeft')
    await page.keyboard.press('ArrowLeft')
    await page.keyboard.type('XYZ')
    assert.equal(await text(), 'abcdXYZef')
  })
  await check('闭合 Markdown 语法后立即渲染，并可继续输入', async () => {
    await replaceText('**bold** ==highlight== tail')
    assert.equal(await text(), 'bold highlight tail')
    const html = await (await field()).evaluate(el => el.innerHTML)
    assert.match(html, /<strong>bold<\/strong>/)
    assert.match(html, /<mark[^>]*>highlight<\/mark>/)
  })
  await check('富文本内输入中文，保留高亮与原有选区位置', async () => {
    await (await field()).evaluate(el => {
      const mark = el.querySelector('mark')
      const selection = window.getSelection()
      selection.collapse(mark.firstChild, 4)
    })
    await compose(['ti', 'ti sheng'], '提升')
    assert.equal(await text(), 'bold high提升light tail')
    assert.equal(await (await field()).$eval('mark', el => el.textContent), 'high提升light')
  })
  await check('粗体与高亮嵌套后保留正文样式', async () => {
    await replaceText('==high **bold** light== tail')
    assert.equal(await text(), 'high bold light tail')
    const style = await (await field()).evaluate(el => {
      const nested = el.querySelector('strong mark, mark strong')
      return nested && { text: nested.textContent, weight: getComputedStyle(nested).fontWeight }
    })
    assert.equal(style.text, 'bold')
    assert.ok(Number(style.weight) >= 600)
  })
  await check('IME 候选替换、父表单刷新、连续中文组词', async () => {
    await replaceText('开头结尾')
    await page.keyboard.press('ArrowLeft')
    await page.keyboard.press('ArrowLeft')
    await (await field()).evaluate(el => {
      window.compositionEvents = []
      window.compositionParagraph = el.firstChild
      for (const name of ['compositionstart', 'compositionupdate', 'compositionend']) {
        el.addEventListener(name, event => window.compositionEvents.push({ name, trusted: event.isTrusted, data: event.data }))
      }
    })
    for (const candidate of ['z', 'zhong', 'zhong wen']) {
      await cdp.send('Input.imeSetComposition', { text: candidate, selectionStart: candidate.length, selectionEnd: candidate.length })
      // 模拟同一父表单中其他字段的更新，不移动正在组词的焦点。
      await page.evaluate(() => {
        const title = document.querySelector('#wc-20-title')
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(title, '写时渲染验收')
        title.dispatchEvent(new Event('input', { bubbles: true }))
      })
      await pause(140)
      assert.equal(await (await field()).evaluate(el => el.firstChild === window.compositionParagraph), true)
    }
    await cdp.send('Input.insertText', { text: '中文' })
    await pause(50)
    assert.equal(await text(), '开头中文结尾')
    for (let i = 0; i < 8; i++) await compose(['shu', 'shu ru'], '输入')
    assert.equal(await text(), '开头中文' + '输入'.repeat(8) + '结尾')
    const events = await page.evaluate(() => window.compositionEvents)
    await writeFile(path.join(artifacts, 'composition-events.json'), JSON.stringify(events, null, 2))
    assert.ok(events.some(event => event.name === 'compositionend' && event.data === '中文'))
    // CDP 的 insertText 提交会生成非 trusted 的 compositionend；开始/候选更新由浏览器 IME 驱动。
    assert.ok(events.filter(event => event.name !== 'compositionend').every(event => event.trusted))
    assert.equal(events.filter(event => event.name === 'compositionend').length, 9)
  })
  await check('取消 IME 组词不留下拼音或吞掉正文', async () => {
    const before = await text()
    await cdp.send('Input.imeSetComposition', { text: 'qu xiao', selectionStart: 7, selectionEnd: 7 })
    await cdp.send('Input.imeSetComposition', { text: '', selectionStart: 0, selectionEnd: 0 })
    await pause(50)
    assert.equal(await text(), before)
  })
  await check('回车、退格、撤销重做及失焦后撤销', async () => {
    await replaceText('first')
    await page.keyboard.press('Enter')
    await page.keyboard.type('second')
    const before = await (await field()).evaluate(el => el.innerText)
    assert.match(before, /first\n+second/)
    // 区分输入与后续删除两个操作，避免测试依赖撤销分组的时间窗口。
    await pause(600)
    await page.keyboard.press('Backspace')
    assert.match(await (await field()).evaluate(el => el.innerText), /secon$/)
    await shortcut('KeyZ')
    assert.equal(await (await field()).evaluate(el => el.innerText), before)
    await shortcut('KeyY')
    assert.match(await (await field()).evaluate(el => el.innerText), /secon$/)
    await page.click('#wc-20-title')
    await (await field()).click()
    await shortcut('KeyZ')
    assert.equal(await (await field()).evaluate(el => el.innerText), before)
  })
  await check('列表回车续项、空项回车退出列表', async () => {
    await replaceText('- first', 1)
    await page.keyboard.press('Enter')
    await page.keyboard.type('second')
    assert.equal(await (await field(1)).$$eval('li', els => els.length), 2)
    await page.keyboard.press('Enter')
    await page.keyboard.press('Enter')
    await page.keyboard.type('outside')
    assert.equal(await (await field(1)).$$eval('li', els => els.length), 2)
    assert.match(await (await field(1)).evaluate(el => el.innerHTML), /<\/ul><p>outside<\/p>/)
  })
  await check('跨字段保存 Markdown 并重开，内容与样式保持', async () => {
    await replaceText('**技术方案** ==关键收益==')
    await replaceText('==性能提升== 42%', 2)
    await replaceText('补充：', 3)
    await compose(['zhong', 'zhong wen'], '中文')
    await page.screenshot({ path: path.join(artifacts, 'editing.png'), fullPage: true })
    await clickButton('保存', '.work-content-edit-form ')
    await page.waitForSelector('.edit-content-btn')
    const payload = saved.at(-1)
    assert.equal(payload.detailed_record, '**技术方案** ==关键收益==')
    assert.equal(payload.result_data, '==性能提升== 42%')
    assert.equal(payload.supplementary_notes, '补充：中文')
    await page.reload()
    await enterCanvas()
    await page.click('.edit-content-btn')
    await page.waitForSelector(selector)
    assert.equal(await text(), '技术方案 关键收益')
    assert.equal(await text(2), '性能提升 42%')
    assert.equal(await text(3), '补充：中文')
    assert.equal(await (await field()).$$eval('mark, strong', els => els.length), 2)
  })
  await check('空编辑器首帧占位、新建中文与换行可保存', async () => {
    // 新建路径独立从阅读态开始，避免与上一用例的退出编辑动画交叠。
    await page.reload()
    await enterCanvas()
    await page.locator('.add-content-dashed-btn').click()
    await page.waitForSelector('#new-wc-record')
    assert.equal(await page.$eval('#new-wc-record', el => el.getAttribute('data-empty')), 'true')
    assert.ok(await page.$('#new-wc-record p br'))
    await page.type('#new-wc-title', '新建验收')
    await (await field()).click()
    await compose(['xin', 'xin jian'], '新建')
    await page.keyboard.press('Enter')
    await compose(['nei', 'nei rong'], '内容')
    await clickButton('添加工作内容', '.creating-new-card ')
    await page.waitForSelector('#work-content-21 .edit-content-btn')
    assert.match(created.detailed_record, /新建\n+内容/)
  })
  await check('无浏览器运行错误', async () => assert.deepEqual(errors, []))
  await page.screenshot({ path: path.join(artifacts, 'saved.png'), fullPage: true })
} finally {
  await writeFile(path.join(artifacts, 'results.json'), JSON.stringify({ baseUrl, browser: await browser.version(), results, errors }, null, 2))
  await browser.close()
}
if (results.some(result => !result.passed)) process.exitCode = 1
