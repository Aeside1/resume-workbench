import { baseKeymap, chainCommands, exitCode, setBlockType, toggleMark } from '@milkdown/prose/commands'
import { history, redo, undo } from '@milkdown/prose/history'
import { InputRule, inputRules, textblockTypeInputRule, undoInputRule, wrappingInputRule } from '@milkdown/prose/inputrules'
import { keymap } from '@milkdown/prose/keymap'
import { liftListItem, sinkListItem, splitListItem } from '@milkdown/prose/schema-list'
import { EditorState, Selection, type Command } from '@milkdown/prose/state'
import type { MarkType, Node as ProseNode } from '@milkdown/prose/model'
import { liveParser, liveSchema } from './liveMarkdown'

function markRule(pattern: RegExp, type: MarkType, delimiterLength: number) {
  return new InputRule(pattern, (state, match, start, end) => {
    const from = start + match[1].length
    const text = match[2]
    const to = from + text.length
    // 保留正文节点及其已有 mark，只删除两侧语法符号，避免破坏嵌套样式。
    return state.tr
      .delete(from + delimiterLength + text.length, end)
      .delete(from, from + delimiterLength)
      .addMark(from, to, type.create())
      .removeStoredMark(type)
  }, { inCodeMark: false })
}

const insertBreak: Command = (state, dispatch) => {
  if (dispatch) dispatch(state.tr.replaceSelectionWith(liveSchema.nodes.hard_break.create()).scrollIntoView())
  return true
}

// 当代码块内容为空时，按 Backspace 或 Enter 直接还原为普通段落
const exitEmptyCodeBlock: Command = (state, dispatch) => {
  const { $from, empty } = state.selection
  if (empty && $from.parent.type === liveSchema.nodes.code_block) {
    if ($from.parent.content.size === 0) {
      return setBlockType(liveSchema.nodes.paragraph)(state, dispatch)
    }
  }
  return false
}

// 在非空代码块末尾连续按回车（即末尾为空行时），退出代码块并在下方插入新段落
const exitCodeBlockOnDoubleEnter: Command = (state, dispatch) => {
  const { $from, empty } = state.selection
  if (!empty || $from.parent.type !== liveSchema.nodes.code_block) return false
  if ($from.parent.content.size === 0) {
    return setBlockType(liveSchema.nodes.paragraph)(state, dispatch)
  }

  const text = $from.parent.textContent
  if ($from.parentOffset === $from.parent.content.size && text.endsWith('\n')) {
    if (dispatch) {
      const codeBlockEnd = $from.after()
      const tr = state.tr.delete($from.pos - 1, $from.pos)
      const newPara = liveSchema.nodes.paragraph.createAndFill()!
      tr.insert(codeBlockEnd - 1, newPara)
      tr.setSelection(Selection.near(tr.doc.resolve(codeBlockEnd)))
      dispatch(tr.scrollIntoView())
    }
    return true
  }
  return false
}

export function createLiveEditorState(content: string | ProseNode) {
  const { nodes, marks } = liveSchema
  return EditorState.create({
    schema: liveSchema,
    doc: typeof content === 'string' ? liveParser.parse(content) : content,
    plugins: [
      inputRules({ rules: [
        markRule(/(^|[^\\])\*\*(\S(?:.*?\S)?)\*\*$/, marks.strong, 2),
        markRule(/(^|[^\\])==(\S(?:.*?\S)?)==$/, marks.highlight, 2),
        markRule(/(^|[^\\])~~(\S(?:.*?\S)?)~~$/, marks.strikethrough, 2),
        markRule(/(^|[^\\])`([^`]+)`$/, marks.code, 1),
        wrappingInputRule(/^\s*[-+*]\s$/, nodes.bullet_list, { tight: true }),
        wrappingInputRule(/^(\d+)\.\s$/, nodes.ordered_list, match => ({ order: +match[1], tight: true }),
          (match, node) => node.childCount + node.attrs.order === +match[1]),
        wrappingInputRule(/^>\s$/, nodes.blockquote),
        textblockTypeInputRule(/^(#{1,6})\s$/, nodes.heading, match => ({ level: match[1].length })),
      ] }),
      keymap({
        'Mod-z': undo,
        'Mod-Shift-z': redo,
        'Mod-y': redo,
        'Mod-b': toggleMark(marks.strong),
        'Mod-i': toggleMark(marks.em),
        'Mod-Shift-h': toggleMark(marks.highlight),
        'Mod-Shift-x': toggleMark(marks.strikethrough),
        'Mod-Shift-s': toggleMark(marks.strikethrough),
        Backspace: chainCommands(undoInputRule, exitEmptyCodeBlock),
        Enter: chainCommands(
          splitListItem(nodes.list_item),
          exitCodeBlockOnDoubleEnter
        ),
        'Mod-Enter': exitCode,
        'Shift-Enter': chainCommands(exitCode, insertBreak),
        Tab: sinkListItem(nodes.list_item),
        'Shift-Tab': liftListItem(nodes.list_item),
      }),
      keymap(baseKeymap),
      history(),
    ],
  })
}
