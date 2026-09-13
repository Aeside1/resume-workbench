import { describe, expect, it } from 'vitest'
import { liveParser, markdownToHtml, serializeMarkdown } from './liveMarkdown'

describe('工作记录 Markdown 往返', () => {
  it.each([
    '**技术方案** 与 ==核心优势==',
    '==高亮中的 **重点**== 与 **粗体中的 ==高亮==**',
    '~~已废弃旧方案~~ 与 **粗体**',
    '`==原始代码==` 和 `**不加粗**`',
    '- 第一项\n- 第二项\n  - 子项',
    '第一行\n第二行\n\n新段落',
    '1. 有序条目\n2. 后续条目',
    '> 引用 **重点**\n\n## 标题',
    '\\==保留符号\\== 和 \\*\\*原文\\*\\*',
  ])('保存重开不改变内容与格式：%s', content => {
    const doc = liveParser.parse(content)
    expect(liveParser.parse(serializeMarkdown(doc)).toJSON()).toEqual(doc.toJSON())
  })

  it('代码中的语法保持原文，嵌套格式真正生成节点', () => {
    expect(markdownToHtml('`==原始代码==`')).toBe('<p><code>==原始代码==</code></p>')
    expect(markdownToHtml('~~已删除文本~~')).toContain('<s>已删除文本</s>')
    const content = document.createElement('div')
    content.innerHTML = markdownToHtml('==高亮中的 **重点**==')
    expect(content.querySelector('strong mark, mark strong')?.textContent).toBe('重点')
  })

  it('用户 HTML 与危险链接不会变成可执行内容', () => {
    const html = markdownToHtml('<img src=x onerror=alert(1)> [链接](javascript:alert(1))')
    expect(html).not.toContain('<img')
    expect(html).not.toContain('href="javascript:')
  })

  it('支持各类 # 标题的正确解析与渲染（包含各级标题与行首无空格容错）', () => {
    expect(markdownToHtml('# 一级标题')).toContain('<h1>一级标题</h1>')
    expect(markdownToHtml('## 二级标题')).toContain('<h2>二级标题</h2>')
    expect(markdownToHtml('### 三级标题')).toContain('<h3>三级标题</h3>')
    expect(markdownToHtml('#无空格标题')).toContain('<h1>无空格标题</h1>')
    expect(markdownToHtml('###技术方案')).toContain('<h3>技术方案</h3>')
  })
})

