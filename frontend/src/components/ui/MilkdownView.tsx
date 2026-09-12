import { useLayoutEffect, useMemo, useRef } from 'react'
import { EditorView } from '@milkdown/prose/view'
import { liveParser, markdownToHtml, serializeMarkdown } from './liveMarkdown'
import { createLiveEditorState } from './liveEditorState'
import '@milkdown/prose/view/style/prosemirror.css'

export { markdownToHtml } from './liveMarkdown'

export interface MilkdownViewProps {
  content?: string | null
  className?: string
  placeholder?: string
}

export function MilkdownView({
  content,
  className = '',
  placeholder = '暂无记录内容',
}: MilkdownViewProps) {
  const html = useMemo(() => markdownToHtml(content || ''), [content])
  if (!content?.trim()) return <p className="typography-text text-muted">{placeholder}</p>
  return <div className={'milkdown-view-container markdown-body-render ' + className}
    dangerouslySetInnerHTML={{ __html: html }} />
}

export interface MilkdownEditorProps {
  value: string
  onChange: (val: string) => void
  placeholder?: string
  rows?: number
  className?: string
  id?: string
}

/** React 只拥有宿主节点；编辑 DOM、选区、输入法与撤销栈由 ProseMirror 管理。 */
export function MilkdownEditor({
  value,
  onChange,
  placeholder = '在此输入工作内容...',
  rows = 3,
  className = '',
  id,
}: MilkdownEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const changeRef = useRef(onChange)
  const initialValueRef = useRef(value)
  const publishedRef = useRef(value)

  useLayoutEffect(() => { changeRef.current = onChange }, [onChange])

  useLayoutEffect(() => {
    let completionTimer: ReturnType<typeof setTimeout> | undefined
    const publish = (view: EditorView) => {
      if (view.isDestroyed || view.composing) return
      const markdown = serializeMarkdown(view.state.doc)
      if (markdown !== publishedRef.current) {
        publishedRef.current = markdown
        changeRef.current(markdown)
      }
    }
    const publishAfterComposition = (view: EditorView) => {
      clearTimeout(completionTimer)
      // 等待浏览器的最终 input 与 ProseMirror 的 compositionend 输入规则完成。
      completionTimer = setTimeout(() => publish(view), 0)
      return false
    }
    const view = new EditorView(hostRef.current!, {
      state: createLiveEditorState(initialValueRef.current),
      dispatchTransaction(transaction) {
        view.updateState(view.state.apply(transaction))
        if (transaction.docChanged) publish(view)
      },
      handleDOMEvents: {
        compositionend: publishAfterComposition,
        blur: publishAfterComposition,
      },
      handlePaste(view, event) {
        const markdown = event.clipboardData?.getData('text/plain')
        if (!markdown || event.clipboardData?.getData('text/html') || view.composing) return false
        // 在代码块内保持原文；其他纯文本粘贴按同一 Markdown 规则解析。
        if (view.state.selection.$from.parent.type.spec.code) return false
        view.dispatch(view.state.tr.replaceSelection(
          liveParser.parse(markdown).slice(0, undefined, true),
        ).scrollIntoView())
        return true
      },
    })
    viewRef.current = view
    return () => {
      clearTimeout(completionTimer)
      viewRef.current = null
      view.destroy()
    }
  }, [])

  useLayoutEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.setProps({ attributes: state => ({
      id: id || '',
      role: 'textbox',
      'aria-multiline': 'true',
      ...(id ? { 'aria-labelledby': id + '-label' } : { 'aria-label': placeholder }),
      'data-placeholder': placeholder,
      'data-empty': String(state.doc.childCount === 1 && state.doc.firstChild?.type.name === 'paragraph' && state.doc.firstChild.content.size === 0),
      class: 'milkdown-live-content markdown-body-render',
      style: 'min-height: ' + rows * 28 + 'px',
    }) })
    const label = id ? document.getElementById(id + '-label') : null
    const focus = () => view.focus()
    label?.addEventListener('click', focus)
    return () => label?.removeEventListener('click', focus)
  }, [id, placeholder, rows])

  useLayoutEffect(() => {
    const view = viewRef.current
    // 父表单回传本次输入只作确认，不回写 DOM；聚焦/组词中的本地草稿优先。
    if (!view || value === publishedRef.current || view.hasFocus() || view.composing) return
    const doc = liveParser.parse(value)
    publishedRef.current = value
    if (!doc.eq(view.state.doc)) view.updateState(createLiveEditorState(doc))
  }, [value])

  return <div ref={hostRef} className={'milkdown-live-editor ' + className} />
}
