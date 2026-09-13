import { baseKeymap, chainCommands, exitCode, setBlockType, toggleMark } from '@milkdown/prose/commands'
import { history, redo, undo } from '@milkdown/prose/history'
import { InputRule, inputRules, textblockTypeInputRule, undoInputRule, wrappingInputRule } from '@milkdown/prose/inputrules'
import { keymap } from '@milkdown/prose/keymap'
import { liftListItem, sinkListItem, splitListItem } from '@milkdown/prose/schema-list'
import { EditorState, type Command } from '@milkdown/prose/state'
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

const exitCodeBlockToParagraph: Command = (state, dispatch) => {
  const { $from, empty } = state.selection
  if (empty && $from.parent.type === liveSchema.nodes.code_block) {
    // 空代码块，或者在代码块首字符处按键，直接还原为普通段落
    if ($from.parent.content.size === 0 || $from.parentOffset === 0) {
      return setBlockType(liveSchema.nodes.paragraph)(state, dispatch)
    }
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
        Backspace: chainCommands(undoInputRule, exitCodeBlockToParagraph),
        Enter: chainCommands(
          splitListItem(nodes.list_item),
          exitCodeBlockToParagraph
        ),
        'Shift-Enter': chainCommands(exitCode, insertBreak),
        Tab: sinkListItem(nodes.list_item),
        'Shift-Tab': liftListItem(nodes.list_item),
      }),
      keymap(baseKeymap),
      history(),
    ],
  })
}
