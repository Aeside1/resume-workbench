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
  marks: commonmarkSchema.spec.marks.addBefore('code', 'highlight', {
    parseDOM: [{ tag: 'mark' }],
    toDOM: () => ['mark', { class: 'md-highlight' }, 0],
  }),
})

const tokenizer = new MarkdownIt('commonmark', { html: false, breaks: true }).use(markdownItMark)
export const liveParser = new MarkdownParser(liveSchema, tokenizer, {
  ...defaultMarkdownParser.tokens,
  mark: { mark: 'highlight' },
  // 工作记录既有内容中的单换行仍然按可见换行处理。
  softbreak: { node: 'hard_break' },
})
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
}, { escapeExtraCharacters: /=/g })

export function serializeMarkdown(doc: ProseNode): string {
  return liveSerializer.serialize(doc)
}

export function markdownToHtml(markdown: string): string {
  const container = document.createElement('div')
  container.append(DOMSerializer.fromSchema(liveSchema).serializeFragment(liveParser.parse(markdown).content))
  return container.innerHTML
}
