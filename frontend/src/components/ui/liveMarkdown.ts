import MarkdownIt from 'markdown-it'
import markdownItMark from 'markdown-it-mark'
import { DOMSerializer, Schema, type Node as ProseNode } from '@milkdown/prose/model'
import {
  defaultMarkdownParser,
  defaultMarkdownSerializer,
  MarkdownParser,
  MarkdownSerializer,
  schema as commonmarkSchema,
} from 'prosemirror-markdown'

export const liveSchema = new Schema({
  nodes: commonmarkSchema.spec.nodes,
  marks: commonmarkSchema.spec.marks
    .addBefore('code', 'highlight', {
      parseDOM: [{ tag: 'mark' }],
      toDOM: () => ['mark', { class: 'md-highlight' }, 0],
    })
    .addBefore('code', 'strikethrough', {
      parseDOM: [
        { tag: 's' },
        { tag: 'del' },
        { tag: 'strike' },
        { style: 'text-decoration=line-through' },
      ],
      toDOM: () => ['s', 0],
    }),
})

const tokenizer = new MarkdownIt('commonmark', { html: false, breaks: true })
  .use(markdownItMark)
  .enable('strikethrough')

export const liveParser = new MarkdownParser(liveSchema, tokenizer, {
  ...defaultMarkdownParser.tokens,
  mark: { mark: 'highlight' },
  s: { mark: 'strikethrough' },
  // 工作记录既有内容中的单换行仍然按可见换行处理。
  softbreak: { node: 'hard_break' },
})

// 智能增强：兼容中文输入中常见的行首未空格 #标题 格式（如 #核心方案 -> # 核心方案）
const originalParse = liveParser.parse.bind(liveParser)
liveParser.parse = function (text: string) {
  const normalized = typeof text === 'string'
    ? text.replace(/^(\s*#{1,6})([^#\s])/gm, '$1 $2')
    : text
  return originalParse(normalized)
}

export const liveSerializer = new MarkdownSerializer({
  ...defaultMarkdownSerializer.nodes,
  bullet_list(state, node) {
    state.renderList(node, '  ', () => '- ')
  },
  hard_break(state) {
    state.write('\n')
  },
}, {
  ...defaultMarkdownSerializer.marks,
  highlight: { open: '==', close: '==', mixable: true, expelEnclosingWhitespace: true },
  strikethrough: { open: '~~', close: '~~', mixable: true, expelEnclosingWhitespace: true },
}, { escapeExtraCharacters: /[=~]/g })

export function serializeMarkdown(doc: ProseNode): string {
  return liveSerializer.serialize(doc)
}

export function markdownToHtml(markdown: string): string {
  const container = document.createElement('div')
  container.append(DOMSerializer.fromSchema(liveSchema).serializeFragment(liveParser.parse(markdown || '').content))
  return container.innerHTML
}

